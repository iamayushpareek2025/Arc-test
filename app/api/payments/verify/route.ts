import { NextRequest, NextResponse } from "next/server";
import { PaymentRequestRepository } from "@/lib/firebase/repositories/paymentRequests";
import { PaymentRepository } from "@/lib/firebase/repositories/payments";
import { verifyPaymentOnChain } from "@/lib/arc/verifyPayment";
import { PaymentReceipt } from "@/types/payment";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { paymentId, txHash } = body;

    if (!paymentId || typeof paymentId !== "string") {
      return NextResponse.json(
        { success: false, error: "paymentId is required." },
        { status: 400 }
      );
    }

    if (!txHash || typeof txHash !== "string" || !txHash.startsWith("0x")) {
      return NextResponse.json(
        { success: false, error: "Valid txHash starting with 0x is required." },
        { status: 400 }
      );
    }

    // 1. Fetch invoice from repository
    const paymentRequest = await PaymentRequestRepository.getById(paymentId);
    if (!paymentRequest) {
      return NextResponse.json(
        { success: false, error: `Invoice "${paymentId}" not found.` },
        { status: 404 }
      );
    }

    // 2. State & Expiry guard
    if (paymentRequest.status === "CANCELLED") {
      return NextResponse.json(
        { success: false, error: "This invoice was cancelled by the merchant." },
        { status: 400 }
      );
    }

    if (paymentRequest.status === "EXPIRED" || paymentRequest.expiresAt < Date.now()) {
      return NextResponse.json(
        { success: false, error: "This invoice has expired and cannot be settled." },
        { status: 400 }
      );
    }

    // 3. Idempotent check: If already marked PAID with same txHash
    if (
      paymentRequest.status === "PAID" ||
      paymentRequest.status === "REWARD_PENDING" ||
      paymentRequest.status === "COMPLETED"
    ) {
      if (paymentRequest.txHash?.toLowerCase() === txHash.toLowerCase()) {
        return NextResponse.json({
          success: true,
          alreadySettled: true,
          paymentRequest,
        });
      }
      return NextResponse.json(
        {
          success: false,
          error: "This invoice is already settled with a different transaction hash.",
        },
        { status: 400 }
      );
    }

    // 4. Authoritative on-chain transaction & event verification
    const verification = await verifyPaymentOnChain(
      txHash as `0x${string}`,
      paymentRequest
    );

    if (!verification.isValid || !verification.payer) {
      return NextResponse.json(
        {
          success: false,
          error: verification.error || "On-chain transaction verification failed.",
        },
        { status: 400 }
      );
    }

    // 5. Update Firestore PaymentRequest state to PAID
    const updatedRequest = await PaymentRequestRepository.updateStatus(
      paymentId,
      "PAID",
      {
        txHash: verification.txHash,
        blockNumber: verification.blockNumber,
        payerAddress: verification.payer,
        chainId: verification.chainId,
        confirmedAt: verification.confirmedAt,
      }
    );

    // 6. Record immutable payment receipt in payments collection
    const receipt: PaymentReceipt = {
      paymentId,
      paymentRequestId: paymentId,
      txHash: verification.txHash!,
      payer: verification.payer,
      restaurant: verification.restaurant || paymentRequest.restaurantWallet,
      amount: paymentRequest.billAmount,
      cashbackAmount: verification.cashbackAmount || 0,
      blockNumber: verification.blockNumber || 0,
      timestamp: verification.confirmedAt || Date.now(),
      status: "SUCCESS",
    };
    await PaymentRepository.record(receipt);

    return NextResponse.json({
      success: true,
      data: verification,
      paymentRequest: updatedRequest,
    });
  } catch (err: unknown) {
    console.error("Payment verification route error:", err);
    const msg = err instanceof Error ? err.message : "Internal verification error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
