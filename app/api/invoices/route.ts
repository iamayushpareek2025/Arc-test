import { NextRequest, NextResponse } from "next/server";
import { PaymentRequest } from "@/types/payment";

// Global server-side fallback store for dev mode without Firebase
const globalInvoices = new Map<string, PaymentRequest>();

// Share across hot-reloads in Next.js development server
declare global {
  // eslint-disable-next-line no-var
  var __DINEBACK_DEV_INVOICES__: Map<string, PaymentRequest> | undefined;
}

const serverStore =
  globalThis.__DINEBACK_DEV_INVOICES__ ||
  (globalThis.__DINEBACK_DEV_INVOICES__ = globalInvoices);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const restaurantId = searchParams.get("restaurantId");

  const list = Array.from(serverStore.values())
    .filter((inv) => !restaurantId || inv.restaurantId === restaurantId)
    .sort((a, b) => b.createdAt - a.createdAt);

  return NextResponse.json({ success: true, invoices: list });
}

export async function POST(req: NextRequest) {
  try {
    const invoice = (await req.json()) as PaymentRequest;
    if (!invoice || !invoice.id) {
      return NextResponse.json(
        { success: false, error: "Invalid invoice data" },
        { status: 400 }
      );
    }

    serverStore.set(invoice.id, invoice);
    return NextResponse.json({ success: true, invoice });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: "Failed to store invoice" },
      { status: 500 }
    );
  }
}
