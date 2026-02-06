import { NextRequest, NextResponse } from "next/server"
import { getSession, claimItem, unclaimItem } from "@/lib/sessionStore"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json()
  const { itemKey, personName, quantity, action } = body

  if (!id) {
    return NextResponse.json({ error: "Session ID required" }, { status: 400 })
  }

  if (!itemKey || typeof itemKey !== "string") {
    return NextResponse.json({ error: "Item key required" }, { status: 400 })
  }

  if (!personName || typeof personName !== "string" || personName.trim() === "") {
    return NextResponse.json({ error: "Person name required" }, { status: 400 })
  }

  const session = await getSession(id)

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 })
  }

  if (session.isCalculated) {
    return NextResponse.json(
      { error: "Session has already been calculated - items are locked" },
      { status: 400 }
    )
  }

  if (action === "unclaim") {
    const result = await unclaimItem(id, itemKey, personName.trim())
    return NextResponse.json(result, {
      status: result.success ? 200 : 400,
    })
  }

  const claimQuantity = typeof quantity === "number" ? quantity : 1

  if (claimQuantity < 0) {
    return NextResponse.json(
      { error: "Quantity must be non-negative" },
      { status: 400 }
    )
  }

  const result = await claimItem(id, itemKey, personName.trim(), claimQuantity)

  if (!result.success) {
    return NextResponse.json(result, { status: 409 })
  }

  return NextResponse.json(result)
}
