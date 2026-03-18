import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, { params }: RouteParams) {
  const { id } = await params
  const supabase = await createClient()

  // Verify program exists
  const { data: program } = await supabase
    .from("programs")
    .select("id")
    .eq("id", id)
    .maybeSingle()

  if (!program) {
    return NextResponse.json({ error: "Program not found" }, { status: 404 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Read file content
    const text = await file.text()

    // Use AI to extract evaluation requirements
    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are an expert at analyzing grant RFPs (Requests for Proposals) and extracting evaluation requirements. 
          
Extract the following from the provided RFP text:
1. Evaluation requirements - specific evaluation activities, deliverables, or approaches required
2. Reporting templates - required report formats, sections, or submission schedules
3. Timeline expectations - evaluation milestones, reporting deadlines, or project phases
4. Required metrics - specific indicators, outcomes, or data points that must be tracked

Return your analysis as JSON with these exact keys:
- evaluation_requirements: string[] (list of specific requirements)
- reporting_templates: string[] (list of report format requirements)
- timeline_expectations: string (summary of timeline/deadline requirements)
- required_metrics: string[] (list of specific metrics or indicators required)`,
          },
          {
            role: "user",
            content: `Please analyze this RFP and extract evaluation requirements:\n\n${text.substring(0, 15000)}`,
          },
        ],
        response_format: { type: "json_object" },
        max_tokens: 2000,
      }),
    })

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json()
      throw new Error(`OpenAI API error: ${errorData.error?.message || openaiResponse.statusText}`)
    }

    const openaiData = await openaiResponse.json()
    const content = openaiData.choices?.[0]?.message?.content
    if (!content) {
      return NextResponse.json({ error: "Failed to analyze RFP" }, { status: 500 })
    }

    const analysis = JSON.parse(content)

    return NextResponse.json({
      evaluation_requirements: analysis.evaluation_requirements || [],
      reporting_templates: analysis.reporting_templates || [],
      timeline_expectations: analysis.timeline_expectations || null,
      required_metrics: analysis.required_metrics || [],
      raw_extraction: analysis
    })
  } catch (error) {
    console.error("Error analyzing RFP:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to analyze RFP" },
      { status: 500 }
    )
  }
}
