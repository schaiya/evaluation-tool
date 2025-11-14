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

    const { plan, uploadedData, questions } = await request.json()

    console.log("[v0] Conducting analysis with", uploadedData.length, "datasets")

    const dataSummaries = uploadedData.map((d: any) => ({
      file: d.file_name,
      type: d.file_type,
      structure: summarizeDataStructure(d.data_content, d.file_name, d.file_type),
    }))

    const questionTexts = questions.map((q: any) => q.question_text || q.text || String(q)).slice(0, 10)
    const methodSummaries =
      plan.methods?.map((m: any) => `${m.method_name} (${m.type}): ${m.description}`).join("\n") ||
      "No methods specified"

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
              "You are an expert data analyst conducting program evaluation analysis. Provide specific, data-driven findings with appropriate data visualizations.",
          },
          {
            role: "user",
            content: `Conduct analysis and provide findings with visualizations.

Analysis Methods:
${methodSummaries}

Evaluation Questions (${questions.length} total):
${questionTexts.map((q: string, i: number) => `${i + 1}. ${q}`).join("\n")}

Datasets (${uploadedData.length} files):
${dataSummaries.map((d: any) => `- ${d.file}: ${d.type}\n  ${d.structure}`).join("\n")}

Provide findings in JSON with visualizations:
{
  "findings": [
    {
      "title": "Finding title",
      "description": "Detailed description",
      "key_points": ["point 1", "point 2"],
      "related_questions": [0, 1],
      "evidence": "Supporting evidence",
      "visualization": {
        "type": "bar|line|pie|area",
        "title": "Chart title",
        "description": "What this chart shows",
        "data": [{"name": "Category", "value": 100}, ...],
        "xAxisKey": "name",
        "yAxisKey": "value"
      }
    }
  ],
  "summary": "Overall summary"
}

Include visualizations for quantitative findings. Use appropriate chart types based on the data structure.`,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 3000,
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

    const results = JSON.parse(content)
    console.log("[v0] Analysis complete with", results.findings?.length || 0, "findings")

    const { data: analysisResult, error } = await supabase
      .from("analysis_results")
      .insert({
        program_id: id,
        analysis_type: "Comprehensive Analysis",
        analysis_plan: plan,
        results,
      })
      .select()
      .single()

    if (error) {
      console.error("[v0] Database error:", error)
      throw error
    }

    return NextResponse.json({ analysisResult })
  } catch (error) {
    console.error("[v0] Error conducting analysis:", error)
    return NextResponse.json({ error: "Failed to conduct analysis" }, { status: 500 })
  }
}
