import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not configured")
    }

    // Fetch program data, flavor, and avatar in parallel
    const [
      programResult,
      elementsResult,
      flavorResult,
      questionsResult,
      indicatorsResult,
      evalPlanResult,
    ] = await Promise.all([
      supabase.from("programs").select("*").eq("id", id).single(),
      supabase.from("program_elements").select("*").eq("program_id", id).order("element_type"),
      supabase
        .from("evaluation_flavors")
        .select(`
          *,
          flavor_audiences (*),
          flavor_approaches (
            *,
            avatars (
              id, name, writing_style, speaking_style, values, decision_style,
              common_phrases, vocabulary_level, sentence_complexity, use_of_metaphors,
              humor_style, background, role, expertise_areas, key_influences
            )
          ),
          funder_requirements (*)
        `)
        .eq("program_id", id)
        .maybeSingle(),
      supabase.from("evaluation_questions").select("*").eq("program_id", id).order("created_at"),
      supabase.from("indicators").select("*").eq("program_id", id).eq("is_selected", true),
      supabase.from("evaluation_plans").select("*").eq("program_id", id).maybeSingle(),
    ])

    if (!programResult.data) {
      return NextResponse.json({ error: "Program not found" }, { status: 404 })
    }

    // Find the primary guiding avatar
    const approaches = flavorResult.data?.flavor_approaches || []
    const primaryApproach = approaches.find((a: any) => a.avatars) || approaches[0]
    const avatar = primaryApproach?.avatars

    if (!avatar) {
      return NextResponse.json({
        narrative: null,
        reason: "No guiding avatar is configured in the evaluation flavor."
      })
    }

    // Build program context for AI
    const program = programResult.data
    const elements = elementsResult.data || []
    const questions = questionsResult.data || []
    const indicators = indicatorsResult.data || []
    const evalPlan = evalPlanResult.data
    const audiences = flavorResult.data?.flavor_audiences || []

    const grouped: Record<string, string[]> = {}
    for (const el of elements) {
      if (!grouped[el.element_type]) grouped[el.element_type] = []
      grouped[el.element_type].push(el.title)
    }

    const programContext = `
PROGRAM: ${program.name}
DESCRIPTION: ${program.description || "Not provided"}

PROGRAM ELEMENTS:
${Object.entries(grouped).map(([type, items]) => `- ${type}: ${items.join(", ")}`).join("\n")}

EVALUATION QUESTIONS (${questions.length} total):
${questions.slice(0, 8).map((q: any, i: number) => `${i + 1}. ${q.question}`).join("\n")}

SELECTED INDICATORS (${indicators.length} total):
${indicators.slice(0, 8).map((ind: any, i: number) => `${i + 1}. ${ind.indicator_text}`).join("\n")}

EVALUATION PLAN:
${evalPlan?.plan_data ? `Period: ${evalPlan.start_date || "TBD"} to ${evalPlan.end_date || "TBD"}, ${evalPlan.duration_months || "N/A"} months, ${evalPlan.plan_data.length} items` : "Not yet created"}

TARGET AUDIENCES:
${audiences.map((a: any) => {
  const name = a.audience_type === "custom" ? a.custom_name : a.audience_type
  return `- ${name}: prefers ${(a.preferred_evidence || []).join(", ")} evidence, ${a.reporting_style} reporting`
}).join("\n")}

EVALUATION APPROACH: ${primaryApproach?.approach_type || "Not specified"}
`

    // Build avatar style instructions from their rich profile
    const styleInstructions = `
You are writing as ${avatar.name}.
${avatar.background ? `Background: ${avatar.background}` : ""}
${avatar.role ? `Role: ${avatar.role}` : ""}
${avatar.writing_style ? `Writing style: ${avatar.writing_style}` : ""}
${avatar.speaking_style ? `Speaking style: ${avatar.speaking_style}` : ""}
${avatar.vocabulary_level ? `Vocabulary level: ${avatar.vocabulary_level}` : ""}
${avatar.sentence_complexity ? `Sentence complexity: ${avatar.sentence_complexity}` : ""}
${avatar.use_of_metaphors ? `Uses metaphors and analogies freely.` : ""}
${avatar.humor_style ? `Humor style: ${avatar.humor_style}` : ""}
${avatar.common_phrases ? `Common phrases: ${avatar.common_phrases}` : ""}
${avatar.values ? `Core values: ${avatar.values}` : ""}
${avatar.decision_style ? `Decision-making style: ${avatar.decision_style}` : ""}
${avatar.expertise_areas?.length ? `Areas of expertise: ${avatar.expertise_areas.join(", ")}` : ""}
${avatar.key_influences ? `Key influences: ${JSON.stringify(avatar.key_influences)}` : ""}
`

    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
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
            content: `You are an evaluation narrative writer. Your task is to write a 3-5 paragraph executive narrative summary of an evaluation approach.

CRITICAL: You must write this narrative in the distinctive voice and style of the guiding avatar described below. Adopt their writing style, vocabulary, sentence structure, values, and perspective. If they use metaphors, use metaphors. If they are formal, be formal. If they favor practical language, be practical. The reader should feel as though this person actually wrote the narrative.

${styleInstructions}

Write a narrative that:
1. Opens by framing why this evaluation matters, through the lens of the avatar's values
2. Summarizes the program being evaluated and its theory of change
3. Describes the evaluation approach and why it was chosen (connecting to the avatar's philosophy)
4. Highlights key evaluation questions and what the indicators will reveal
5. Closes with what the evaluation will mean for the audiences and stakeholders

Do NOT use headers or bullet points. Write in flowing narrative paragraphs. Do NOT mention that you are an AI or that you are writing "as" someone - just write naturally in their voice.`
          },
          {
            role: "user",
            content: `Write the evaluation narrative summary for the following program:\n\n${programContext}`
          },
        ],
        temperature: 0.8,
        max_tokens: 2000,
      }),
    })

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json()
      throw new Error(`OpenAI API error: ${errorData.error?.message || openaiResponse.statusText}`)
    }

    const openaiData = await openaiResponse.json()
    const narrative = openaiData.choices?.[0]?.message?.content

    return NextResponse.json({
      narrative,
      avatarName: avatar.name,
      approachType: primaryApproach?.approach_type || "evaluation",
    })
  } catch (error) {
    console.error("[v0] Error generating narrative:", error)
    return NextResponse.json(
      { error: "Failed to generate narrative", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
