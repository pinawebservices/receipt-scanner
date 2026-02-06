import { NextRequest, NextResponse } from "next/server"
import { createSession } from "@/lib/sessionStore"
import type { ParsedReceipt, CustomItem } from "@/types/receipt"

interface CreateSessionRequest {
  receipt: ParsedReceipt
  customItems: CustomItem[]
  priceOverrides: Record<number, number>
  quantityOverrides: Record<number, number>
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CreateSessionRequest
    const { receipt, customItems, priceOverrides, quantityOverrides } = body

    if (!receipt || !receipt.items) {
      return NextResponse.json({ error: "Invalid receipt data" }, { status: 400 })
    }

    const session = await createSession(
      receipt,
      customItems || [],
      priceOverrides || {},
      quantityOverrides || {}
    )

    return NextResponse.json({ success: true, sessionId: session.id })
  } catch (error) {
    console.error("Error creating session:", error)
    return NextResponse.json(
      { error: "Failed to create session" },
      { status: 500 }
    )
  }
}
