import { NextRequest, NextResponse } from "next/server"
import { getSession, addParticipant } from "@/lib/sessionStore"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json()
  const { name } = body

  if (!id) {
    return NextResponse.json({ error: "Session ID required" }, { status: 400 })
  }

  if (!name || typeof name !== "string" || name.trim() === "") {
    return NextResponse.json({ error: "Name is required" }, { status: 400 })
  }

  const session = await getSession(id)

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 })
  }

  if (session.isCalculated) {
    return NextResponse.json(
      { error: "Session has already been calculated" },
      { status: 400 }
    )
  }

  const success = await addParticipant(id, name.trim())

  if (!success) {
    return NextResponse.json(
      { error: "Failed to join session" },
      { status: 500 }
    )
  }

  const updatedSession = await getSession(id)

  return NextResponse.json({
    success: true,
    participants: updatedSession?.participants || [],
  })
}
