import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    console.log("[v0] Ask-question route called")

    const resolvedParams = await params
    const programId = resolvedParams.id
    console.log("[v0] Program ID:", programId)

    if (!process.env.OPENAI_API_KEY) {
      console.error("[v0] Missing OpenAI API key")
      return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 })
    }

    const body = await request.json()
    const { question, uploadedData } = body

    console.log("[v0] Asking custom question:", question)
    console.log("[v0] Uploaded data count:", uploadedData?.length)

    if (!question || !uploadedData || uploadedData.length === 0) {
      return NextResponse.json({ error: "Question and data required" }, { status: 400 })
    }

    const dataSummaries = uploadedData.map((data: any) => {
      const content = data.data_content
      let summary = `File: ${data.file_name}\n`

      if (Array.isArray(content)) {
        const fields = content.length > 0 ? Object.keys(content[0]) : []
        summary += `Type: Tabular data\nRows: ${content.length}\nColumns: ${fields.join(", ")}\n`
        if (content.length > 0) {
          const cleanRows = content.slice(0, 3).map((row: any) => {
            const cleanRow: any = {}
            Object.entries(row).forEach(([key, value]) => {
              if (value === null || value === undefined) {
                cleanRow[key] = ""
              } else if (typeof value === "string") {
                cleanRow[key] = value.replace(/[\x00-\x1F\x7F-\x9F]/g, "").substring(0, 100)
              } else {
                cleanRow[key] = String(value).substring(0, 100)
              }
            })
            return cleanRow
          })
          summary += `Sample: ${JSON.stringify(cleanRows)}\n`
        }
      } else if (typeof content === "object") {
        if (content.type === "document") {
          summary += `Type: Document\n`
          const docText = String(content.content || "").replace(/[\x00-\x1F\x7F-\x9F]/g, " ")
          summary += `Preview: ${docText.substring(0, 500)}...\n`
        } else {
          summary += `Type: Object/Document\nKeys: ${Object.keys(content).join(", ")}\n`
        }
      } else if (typeof content === "string") {
        const cleanText = content.replace(/[\x00-\x1F\x7F-\x9F]/g, " ")
        summary += `Type: Text\nLength: ${content.length} characters\nPreview: ${cleanText.substring(0, 300)}...\n`
      }

      return summary
    })

    const combinedSummary = dataSummaries.join("\n\n")
    const truncatedSummary = combinedSummary.substring(0, 8000)

    console.log("[v0] Data summary length:", truncatedSummary.length)

    const prompt = `You are a data analyst. A user has asked the following question about their data:

Question: ${question}

Available Data:
${truncatedSummary}

Please analyze the data to answer the question. Provide a clear answer with specific insights from the data.

If appropriate, suggest a visualization. Respond ONLY with valid JSON in this exact format:
{
  "answer": "Your detailed answer",
  "visualization": null
}

Or with a visualization:
{
  "answer": "Your detailed answer",
  "visualization": {
    "type": "bar",
    "title": "Chart title",
    "description": "Brief description",
    "data": [{"name": "Category", "value": 100}],
    "xAxisKey": "name",
    "yAxisKey": "value"
  }
}`

    console.log("[v0] Calling OpenAI API via fetch...")

    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        response_format: { type: "json_object" },
        max_tokens: 1500,
      }),
    })

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text()
      console.error("[v0] OpenAI API error:", errorText)
      return NextResponse.json({ error: "AI service error" }, { status: 500 })
    }

    const openaiData = await openaiResponse.json()
    const responseContent = openaiData.choices[0]?.message?.content

    if (!responseContent) {
      console.error("[v0] No response content from OpenAI")
      return NextResponse.json({ error: "No response from AI" }, { status: 500 })
    }

    console.log("[v0] Received response, length:", responseContent.length)

    const parsed = JSON.parse(responseContent)
    console.log("[v0] Successfully parsed JSON response")

    const answer = {
      question,
      answer: parsed.answer || "Unable to generate answer",
      visualization: parsed.visualization || null,
      created_at: new Date().toISOString(),
    }

    console.log("[v0] Returning successful answer")
    return NextResponse.json({ answer })
  } catch (error: any) {
    console.error("[v0] Error in ask-question route:", error)
    console.error("[v0] Error message:", error?.message)
    console.error("[v0] Error stack:", error?.stack)

    return NextResponse.json({ error: error?.message || "Failed to analyze question" }, { status: 500 })
  }
}
