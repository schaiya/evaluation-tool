import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  try {
    const supabase = await createClient()
    const { uploadedData } = await request.json()

    if (!uploadedData || uploadedData.length === 0) {
      return NextResponse.json({ error: "No data provided" }, { status: 400 })
    }

    const dataSummary = uploadedData.map((data: any) => {
      const content = data.data_content
      let fields: any[] = []
      let recordCount = 0
      const fileType = data.file_name.split(".").pop()?.toLowerCase() || "unknown"

      // Analyze structure based on data type
      if (Array.isArray(content) && content.length > 0) {
        recordCount = content.length
        const firstRecord = content[0]
        fields = Object.keys(firstRecord).map((key) => {
          const values = content.map((record: any) => record[key]).filter((v: any) => v != null)
          const uniqueValues = [...new Set(values)]

          const sampleValues = uniqueValues.slice(0, 2).map((v: any) => {
            const str = String(v)
            // Skip binary/corrupted data (contains special characters)
            if (str.length > 100 || /[^\x20-\x7E\n\r\t]/.test(str)) {
              return "[binary/long data]"
            }
            return str.substring(0, 50)
          })

          return {
            name: key.substring(0, 50), // Truncate long field names
            type: typeof firstRecord[key],
            sampleValues,
            uniqueCount: uniqueValues.length,
            nullCount: content.length - values.length,
          }
        })
      } else if (typeof content === "object" && content.type === "document") {
        recordCount = 1
        fields = [
          {
            name: "Document Content",
            type: "document",
            description: "Qualitative text document (Word/PDF)",
            sampleValues: ["[Document text available for analysis]"],
          },
        ]
      }

      return {
        fileName: data.file_name,
        fileType,
        recordCount,
        fields: fields.slice(0, 20), // Limit to first 20 fields to reduce tokens
      }
    })

    console.log("[v0] Data summary for profiling:", JSON.stringify(dataSummary, null, 2))

    const apiKey = process.env.OPENAI_API_KEY || ""
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `Analyze uploaded datasets and suggest evaluation questions. Respond with JSON:
{
  "summary": "Brief data overview",
  "suggestedQuestions": [
    {
      "question": "Evaluation question",
      "relevantFields": ["field1"],
      "rationale": "Why answerable"
    }
  ]
}`,
          },
          {
            role: "user",
            content: `Dataset info:\n${JSON.stringify(dataSummary, null, 2)}\n\nSuggest 3-5 evaluation questions this data can answer.`,
          },
        ],
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error("[v0] OpenAI API error:", errorData)
      throw new Error(`OpenAI API error: ${JSON.stringify(errorData)}`)
    }

    const aiResponse = await response.json()
    console.log("[v0] OpenAI response:", JSON.stringify(aiResponse, null, 2))

    const content = aiResponse.choices[0]?.message?.content
    if (!content) {
      throw new Error("No content in AI response")
    }

    // Parse the AI response
    let profile
    try {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```\n([\s\S]*?)\n```/)
      if (jsonMatch) {
        profile = JSON.parse(jsonMatch[1])
      } else {
        profile = JSON.parse(content)
      }
    } catch (parseError) {
      console.error("[v0] Failed to parse AI response:", content)
      throw new Error("Failed to parse data profile from AI response")
    }

    return NextResponse.json({
      profile,
      success: true,
    })
  } catch (error: any) {
    console.error("[v0] Error profiling data:", error)
    return NextResponse.json({ error: error.message || "Failed to profile data" }, { status: 500 })
  }
}
