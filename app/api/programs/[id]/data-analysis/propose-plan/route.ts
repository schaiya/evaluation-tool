import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

function summarizeDataStructure(data: any, fileName: string, fileType: string): string {
  if (!data) return "Empty dataset"

  if (Array.isArray(data)) {
    if (data.length === 0) return "Empty array"

    // Get structure from first item
    const firstItem = data[0]
    const itemCount = data.length

    if (typeof firstItem === "object" && firstItem !== null) {
      const fields = Object.keys(firstItem).slice(0, 10) // Limit to 10 fields
      const fieldTypes = fields.map((field) => {
        const value = firstItem[field]
        const type = Array.isArray(value) ? "array" : typeof value
        return `${field}: ${type}`
      })
      return `Array with ${itemCount} rows. Fields: ${fieldTypes.join(", ")}`
    }

    return `Array with ${itemCount} items of type ${typeof firstItem}`
  } else if (typeof data === "object") {
    const keys = Object.keys(data).slice(0, 10)
    return `Object with keys: ${keys.join(", ")}`
  } else if (typeof data === "string") {
    const preview = data.slice(0, 100)
    return `Text content (${data.length} chars): "${preview}..."`
  }

  return `${typeof data} value`
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { uploadedData, questions } = await request.json()

    console.log("[v0] Proposing analysis plan for", uploadedData.length, "datasets")

    const dataSummaries = uploadedData.map((d: any) => ({
      file: d.file_name,
      type: d.file_type,
      structure: summarizeDataStructure(d.data_content, d.file_name, d.file_type),
    }))

    const questionTexts = questions.map((q: any) => q.question_text || q.text || String(q)).slice(0, 10)

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content:
              "You are an expert in program evaluation and data analysis. Propose appropriate analysis methods based on data structure and evaluation questions.",
          },
          {
            role: "user",
            content: `Propose analysis methods for this program evaluation.

Evaluation Questions (${questions.length} total):
${questionTexts.map((q: string, i: number) => `${i + 1}. ${q}`).join("\n")}

Uploaded Datasets (${uploadedData.length} files):
${dataSummaries.map((d: any, i: number) => `${i + 1}. ${d.file}: ${d.type}\n   Structure: ${d.structure}`).join("\n")}

Propose 3-5 analysis methods. For each method, specify:
1. method_name: Name of the analysis method
2. type: "quantitative" or "qualitative"
3. description: Brief description of what this method will do
4. evaluation_questions: Array of the actual question texts this method addresses
5. data_sources: Array of file names that will be used for this analysis
6. expected_insights: What insights this method will provide

Return JSON:
{
  "methods": [
    {
      "method_name": "Descriptive Statistics",
      "type": "quantitative",
      "description": "Calculate means, medians, frequencies for survey responses",
      "evaluation_questions": ["What was the satisfaction level?", "How effective was the training?"],
      "data_sources": ["survey_responses.csv", "training_data.xlsx"],
      "expected_insights": "Central tendencies and distributions of participant responses"
    }
  ]
}`,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 2000,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[v0] OpenAI API error:", response.status, errorText)
      throw new Error(`OpenAI API error: ${response.status}`)
    }

    const aiResponse = await response.json()
    console.log("[v0] OpenAI response received")

    const content = aiResponse.choices[0]?.message?.content
    if (!content) {
      throw new Error("No content in OpenAI response")
    }

    const plan = JSON.parse(content)
    console.log("[v0] Proposed", plan.methods?.length || 0, "analysis methods")

    return NextResponse.json({ plan })
  } catch (error) {
    console.error("[v0] Error proposing analysis plan:", error)
    return NextResponse.json({ error: "Failed to propose analysis plan" }, { status: 500 })
  }
}
