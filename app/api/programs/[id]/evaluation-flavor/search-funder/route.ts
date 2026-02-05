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
    const body = await request.json()
    const { funderName } = body

    if (!funderName) {
      return NextResponse.json({ error: "Funder name is required" }, { status: 400 })
    }

    // Use AI to search for and identify funder evaluation guidelines
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
            content: `You are an expert in philanthropic and government funding organizations. 
          
Given a funder name, provide information about their evaluation requirements and guidelines.

Return JSON with:
- guidelinesUrl: string | null (URL to their evaluation guidelines page if known)
- evaluationApproach: string (description of their general approach to evaluation)
- keyRequirements: string[] (known evaluation requirements or preferences)
- reportingPreferences: string (how they prefer to receive evaluation reports)

Only include information you are confident about. Use null for guidelinesUrl if you don't know the exact URL.`,
          },
          {
            role: "user",
            content: `What are the evaluation guidelines and requirements for: ${funderName}`,
          },
        ],
        response_format: { type: "json_object" },
        max_tokens: 1000,
      }),
    })

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json()
      throw new Error(`OpenAI API error: ${errorData.error?.message || openaiResponse.statusText}`)
    }

    const openaiData = await openaiResponse.json()
    const content = openaiData.choices?.[0]?.message?.content
    if (!content) {
      return NextResponse.json({ error: "Failed to search for funder guidelines" }, { status: 500 })
    }

    const result = JSON.parse(content)

    return NextResponse.json({
      guidelinesUrl: result.guidelinesUrl || null,
      evaluationApproach: result.evaluationApproach || null,
      keyRequirements: result.keyRequirements || [],
      reportingPreferences: result.reportingPreferences || null
    })
  } catch (error) {
    console.error("Error searching for funder guidelines:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to search" },
      { status: 500 }
    )
  }
}
