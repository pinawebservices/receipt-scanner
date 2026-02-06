import { NextRequest, NextResponse } from "next/server"
import type { ParsedReceipt } from "@/types/receipt"

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { image } = body

  if (!image) {
    return NextResponse.json({ error: "No image provided" }, { status: 400 })
  }

  const OPENAI_API_KEY = process.env.OPENAI_API_KEY

  if (!OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OpenAI API key not configured" },
      { status: 500 }
    )
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Please analyze this receipt image and extract the following information in JSON format:
{
  "restaurant_name": "name of the restaurant",
  "items": [
    {
      "name": "item name",
      "price": 0.00,
      "quantity": 1
    }
  ],
  "subtotal": 0.00,
  "tax": 0.00,
  "tip": 0.00,
  "total": 0.00
}

Important:
- Extract ALL line items from the receipt
- Prices should be numbers (not strings)
- Tip may also be referred to as "Service Charge" or "Gratuity", or any other common reference to tips
- If a field is not found, use null
- If quantity is not specified, assume 1
- Return ONLY valid JSON, no additional text`,
              },
              {
                type: "image_url",
                image_url: { url: image },
              },
            ],
          },
        ],
        max_tokens: 1000,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error("OpenAI API error:", data)
      return NextResponse.json(
        { error: data.error?.message || "Failed to parse receipt" },
        { status: response.status }
      )
    }

    const content = data.choices[0].message.content

    let parsedReceipt: ParsedReceipt
    try {
      const jsonString = content
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim()
      parsedReceipt = JSON.parse(jsonString)
    } catch (parseError) {
      console.error("JSON parse error:", parseError)
      console.error("Raw content:", content)
      return NextResponse.json(
        { error: "Failed to parse receipt data", raw_response: content },
        { status: 500 }
      )
    }

    return NextResponse.json(parsedReceipt)
  } catch (error) {
    console.error("Error parsing receipt:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
