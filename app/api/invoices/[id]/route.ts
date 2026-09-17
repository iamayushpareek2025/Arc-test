import { NextRequest, NextResponse } from "next/server";
import { PaymentRequest } from "@/types/payment";

declare global {
  // eslint-disable-next-line no-var
  var __DINEBACK_DEV_INVOICES__: Map<string, PaymentRequest> | undefined;
}

const serverStore =
  globalThis.__DINEBACK_DEV_INVOICES__ ||
  (globalThis.__DINEBACK_DEV_INVOICES__ = new Map<string, PaymentRequest>());

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ success: false, error: "ID required" }, { status: 400 });
  }

  const invoice = serverStore.get(id);
  if (!invoice) {
    return NextResponse.json({ success: false, error: "Invoice not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, invoice });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ success: false, error: "ID required" }, { status: 400 });
  }

  const existing = serverStore.get(id);
  if (!existing) {
    return NextResponse.json({ success: false, error: "Invoice not found" }, { status: 404 });
  }

  try {
    const updates = await req.json();
    const updated = {
      ...existing,
      ...updates,
      updatedAt: Date.now(),
    };
    serverStore.set(id, updated);
    return NextResponse.json({ success: true, invoice: updated });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to update invoice" }, { status: 500 });
  }
}
