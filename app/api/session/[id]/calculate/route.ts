import { NextRequest, NextResponse } from "next/server"
import { getSession, allItemsClaimed, setSessionCalculated } from "@/lib/sessionStore"
import { calculateSplitFromClaims } from "@/lib/calculations"

export async function POST(
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

  if (session.isCalculated && session.splitResults) {
    return NextResponse.json({
      success: true,
      results: session.splitResults,
      alreadyCalculated: true,
    })
  }

  if (!allItemsClaimed(session)) {
    return NextResponse.json(
      { success: false, error: "Not all items have been claimed" },
      { status: 400 }
    )
  }

  const results = calculateSplitFromClaims(session)
  await setSessionCalculated(id, results)

  return NextResponse.json({
    success: true,
    results,
    alreadyCalculated: false,
  })
}
