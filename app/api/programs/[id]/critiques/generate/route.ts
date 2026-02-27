import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const avatarId = body.avatar_id || body.avatarId
    if (!avatarId) {
      return NextResponse.json({ error: "avatar_id is required" }, { status: 400 })
    }
    const supabase = await createClient()

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) throw new Error("OPENAI_API_KEY is not configured")

    // Fetch avatar and program data in parallel
    const [
      avatarResult,
      programResult,
      elementsResult,
      flavorResult,
      questionsResult,
      indicatorsResult,
      evalPlanResult,
    ] = await Promise.all([
      supabase.from("avatars").select("*").eq("id", avatarId).single(),
      supabase.from("programs").select("*").eq("id", id).single(),
      supabase.from("program_elements").select("*").eq("program_id", id).order("element_type"),
      supabase
        .from("evaluation_flavors")
        .select(`
          *,
          flavor_audiences (*),
          flavor_approaches (
            *,
            avatars (id, name, values)
          ),
          funder_requirements (*)
        `)
        .eq("program_id", id)
        .maybeSingle(),
      supabase.from("evaluation_questions").select("*").eq("program_id", id).order("created_at"),
      supabase.from("indicators").select("*").eq("program_id", id).eq("is_selected", true),
      supabase.from("evaluation_plans").select("*").eq("program_id", id).maybeSingle(),
    ])

    if (!avatarResult.data) {
      return NextResponse.json({ error: "Avatar not found" }, { status: 404 })
    }
    if (!programResult.data) {
      return NextResponse.json({ error: "Program not found" }, { status: 404 })
    }

    const avatar = avatarResult.data
    const program = programResult.data
    const elements = elementsResult.data || []
    const questions = questionsResult.data || []
    const indicators = indicatorsResult.data || []
    const evalPlan = evalPlanResult.data
    const flavor = flavorResult.data

    // Build grouped elements
    const grouped: Record<string, string[]> = {}
    for (const el of elements) {
      if (!grouped[el.element_type]) grouped[el.element_type] = []
      grouped[el.element_type].push(el.title)
    }

    // Identify the guiding approach
    const approaches = flavor?.flavor_approaches || []
    const approachNames = approaches.map((a: any) => {
      const name = a.approach_type === "custom" ? a.custom_name : a.approach_type
      const guideName = a.avatars?.name || "no guide"
      return `${name} (guided by ${guideName})`
    })

    const programContext = `
PROGRAM: ${program.name}
DESCRIPTION: ${program.description || "Not provided"}

PROGRAM ELEMENTS:
${Object.entries(grouped).map(([type, items]) => `- ${type}: ${items.join(", ")}`).join("\n")}

EVALUATION APPROACH(ES): ${approachNames.join(", ") || "Not specified"}

TARGET AUDIENCES:
${(flavor?.flavor_audiences || []).map((a: any) => {
  const name = a.audience_type === "custom" ? a.custom_name : a.audience_type
  return `- ${name}: prefers ${(a.preferred_evidence || []).join(", ")} evidence, ${a.reporting_style} reporting`
}).join("\n") || "None specified"}

FUNDER REQUIREMENTS:
${flavor?.funder_requirements?.[0] ? `- Required: ${(flavor.funder_requirements[0].evaluation_requirements || []).join("; ")}\n- Required metrics: ${(flavor.funder_requirements[0].required_metrics || []).join("; ")}` : "None specified"}

EVALUATION QUESTIONS (${questions.length} total):
${questions.slice(0, 10).map((q: any, i: number) => `${i + 1}. ${q.question}`).join("\n")}

SELECTED INDICATORS (${indicators.length} total):
${indicators.slice(0, 10).map((ind: any, i: number) => `${i + 1}. ${ind.indicator_text}${ind.metric ? ` [Metric: ${ind.metric}]` : ""}${ind.data_source ? ` [Source: ${ind.data_source}]` : ""}`).join("\n")}

EVALUATION PLAN:
${evalPlan?.plan_data ? `Period: ${evalPlan.start_date || "TBD"} to ${evalPlan.end_date || "TBD"}, ${evalPlan.duration_months || "N/A"} months, ${evalPlan.plan_data.length} planned items` : "Not yet created"}
`

    // Build avatar style/perspective instructions
    const styleInstructions = `
You are ${avatar.name}.
${avatar.background ? `Background: ${avatar.background}` : ""}
${avatar.role ? `Role: ${avatar.role}` : ""}
${avatar.writing_style ? `Writing style: ${avatar.writing_style}` : ""}
${avatar.speaking_style ? `Speaking style: ${avatar.speaking_style}` : ""}
${avatar.vocabulary_level ? `Vocabulary level: ${avatar.vocabulary_level}` : ""}
${avatar.sentence_complexity ? `Sentence complexity: ${avatar.sentence_complexity}` : ""}
${avatar.use_of_metaphors ? `Uses metaphors: yes` : ""}
${avatar.humor_style ? `Humor style: ${avatar.humor_style}` : ""}
${avatar.common_phrases ? `Common phrases you use: ${avatar.common_phrases}` : ""}
${avatar.values ? `Core values: ${avatar.values}` : ""}
${avatar.decision_style ? `Decision-making approach: ${avatar.decision_style}` : ""}
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
            content: `You are a distinguished evaluation theorist providing a constructive critique of an evaluation design. You must write entirely in the voice and perspective of the person described below.

${styleInstructions}

CRITICAL INSTRUCTIONS:
- Write as this person. Adopt their vocabulary, sentence style, values lens, and intellectual perspective.
- Be substantive and specific. Reference actual elements from the evaluation design.
- Be balanced. Acknowledge genuine strengths before raising concerns.
- Your critique should feel like a real peer review from this specific intellectual tradition.
- Do NOT mention you are an AI. Write as though you are this person reviewing a colleague's work.

Return your critique as valid JSON with this exact structure:
{
  "sections": [
    {
      "section_name": "Logic Model & Theory of Change",
      "stance": "agree" | "partial" | "disagree",
      "strengths": ["specific strength 1", "specific strength 2"],
      "concerns": ["specific concern 1"],
      "recommendations": ["specific recommendation 1"],
      "commentary": "A 2-3 sentence narrative in your voice explaining your overall take on this section."
    },
    {
      "section_name": "Evaluation Approach & Methodology",
      "stance": "agree" | "partial" | "disagree",
      "strengths": [],
      "concerns": [],
      "recommendations": [],
      "commentary": ""
    },
    {
      "section_name": "Evaluation Questions",
      "stance": "agree" | "partial" | "disagree",
      "strengths": [],
      "concerns": [],
      "recommendations": [],
      "commentary": ""
    },
    {
      "section_name": "Indicators & Measurement",
      "stance": "agree" | "partial" | "disagree",
      "strengths": [],
      "concerns": [],
      "recommendations": [],
      "commentary": ""
    },
    {
      "section_name": "Evaluation Plan & Timeline",
      "stance": "agree" | "partial" | "disagree",
      "strengths": [],
      "concerns": [],
      "recommendations": [],
      "commentary": ""
    }
  ],
  "overall_assessment": "A 3-4 sentence overall assessment in your voice summarizing your view of this evaluation design.",
  "overall_stance": "agree" | "partial" | "disagree"
}`
          },
          {
            role: "user",
            content: `Please provide your critique of this evaluation design:\n\n${programContext}`
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.8,
        max_tokens: 4000,
      }),
    })

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json()
      throw new Error(`OpenAI API error: ${errorData.error?.message || openaiResponse.statusText}`)
    }

    const openaiData = await openaiResponse.json()
    const content = openaiData.choices?.[0]?.message?.content

    let critiqueData
    try {
      critiqueData = JSON.parse(content)
    } catch {
      throw new Error("Failed to parse critique response from AI")
    }

    // Upsert the critique (replace if same avatar already critiqued)
    const { data: existing } = await supabase
      .from("evaluation_critiques")
      .select("id")
      .eq("program_id", id)
      .eq("avatar_id", avatarId)
      .maybeSingle()

    let savedCritique
    if (existing) {
      const { data, error } = await supabase
        .from("evaluation_critiques")
        .update({
          critique_data: critiqueData.sections,
          overall_assessment: critiqueData.overall_assessment,
          overall_stance: critiqueData.overall_stance,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select(`*, avatars (id, name, role, background, writing_style, expertise_areas, values)`)
        .single()
      if (error) throw error
      savedCritique = data
    } else {
      const { data, error } = await supabase
        .from("evaluation_critiques")
        .insert({
          program_id: id,
          avatar_id: avatarId,
          critique_data: critiqueData.sections,
          overall_assessment: critiqueData.overall_assessment,
          overall_stance: critiqueData.overall_stance,
        })
        .select(`*, avatars (id, name, role, background, writing_style, expertise_areas, values)`)
        .single()
      if (error) throw error
      savedCritique = data
    }

    return NextResponse.json(savedCritique)
  } catch (error) {
    console.error("[v0] Error generating critique:", error)
    return NextResponse.json(
      { error: "Failed to generate critique", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
