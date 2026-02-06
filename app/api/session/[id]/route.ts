import { NextRequest, NextResponse } from "next/server"
import { getSession, allItemsClaimed } from "@/lib/sessionStore"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  if (!id) {
    return NextResponse.json({ error: "Session ID required" }, { status: 400 })
  }

  const session = await getSession(id)

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 })
  }

  return NextResponse.json({
    session,
    allItemsClaimed: allItemsClaimed(session),
  })
}
