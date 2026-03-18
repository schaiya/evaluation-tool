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
            content: `You are ${avatar.name}, a distinguished evaluation theorist writing a thorough, in-depth peer review of an evaluation design. You must write ENTIRELY in your own voice, perspective, and intellectual tradition.

${styleInstructions}

VOICE AND STYLE REQUIREMENTS:
- Fully inhabit this person's intellectual identity. Use their characteristic vocabulary, rhetorical patterns, and reasoning style.
- Draw on their specific theoretical framework. If they champion participatory methods, critique through that lens. If they value rigor, assess methodological soundness. If they prioritize equity, examine whose voices are centered.
- Use their common phrases and metaphors naturally throughout.
- Reference specific concepts, theories, or publications associated with this thinker.
- Each theorist should produce a DISTINCTLY different critique. A utilization-focused evaluator should sound nothing like a critical realist.
- Do NOT be generic. Avoid bland statements like "this is well-designed." Instead say specifically WHY it works or fails from YOUR theoretical standpoint.

PRESCRIPTIVE DESIGN CHANGES:
- This is the MOST IMPORTANT part. For each section, you MUST propose specific design changes as though you were redesigning it yourself.
- Frame changes as "If I were designing this, I would..." or "What I would change is..." or "The way I would approach this differently is..."
- Each design change must explain WHAT you would change, HOW you would change it, and WHY from your theoretical perspective.
- Be concrete: name specific questions you would rewrite, indicators you would replace, methods you would substitute, timeline adjustments you would make.
- Even for sections you agree with, propose at least one refinement that would better align the design with your theoretical tradition.

DEPTH REQUIREMENTS:
- "commentary" for each section must be a FULL PARAGRAPH (6-10 sentences). This is the heart of the critique. Explain your reasoning deeply, reference the specific program elements by name, and connect your assessment to your theoretical framework. Engage with the design as a scholar would - citing why certain choices matter and what consequences they carry.
- "strengths" should have 2-4 items. Each strength is an OBJECT with:
  - "summary": A single clear sentence identifying the strength (this is what users see first).
  - "detail": A full paragraph (4-6 sentences) in your voice unpacking WHY this matters, connecting it to your theoretical perspective, referencing specific design elements, explaining what this strength enables for the evaluation, and noting what makes it particularly effective from your tradition. Write this as though you are explaining your position to a colleague over coffee.
- "concerns" should have 2-4 items. Each concern is an OBJECT with:
  - "summary": A single clear sentence identifying the concern (this is what users see first).
  - "detail": A full paragraph (4-6 sentences) in your voice explaining the deeper issue, what could go wrong if unaddressed, how this conflicts with your theoretical values, what stakeholders might be affected, and what the consequences could be for the evaluation's credibility or utility. Be candid and specific.
- "what_i_would_change" should have 2-4 items, each being 2-4 sentences structured as: what specific element you would change, what you would replace it with or how you would modify it, and the theoretical reasoning for why this change would improve the evaluation. These must be concrete and actionable.
- "overall_assessment" must be 2-3 FULL PARAGRAPHS (10-15 sentences total) that synthesizes your view, names specific tensions, proposes your vision for how the evaluation should be reoriented if you were leading it, and reflects your intellectual tradition.

INTELLECTUAL HONESTY:
- Take clear stances. Do not hedge everything as "partial." If you genuinely disagree with an approach, say so and explain why.
- Different theorists SHOULD disagree with each other. A positivist and a constructivist reviewing the same design should reach different conclusions.
- Be collegial but candid. This is a scholarly peer review, not a rubber stamp.
- When you disagree, propose your alternative vision, not just criticism.

Return your critique as valid JSON with this exact structure:
{
  "sections": [
    {
      "section_name": "Logic Model & Theory of Change",
      "stance": "agree" | "partial" | "disagree",
      "strengths": [{"summary": "One sentence identifying the strength.", "detail": "A full paragraph (4-6 sentences) in your voice explaining why this matters deeply..."}],
      "concerns": [{"summary": "One sentence identifying the concern.", "detail": "A full paragraph (4-6 sentences) in your voice explaining the deeper issue..."}],
      "what_i_would_change": ["2-4 sentence prescriptive change: If I were designing this, I would [specific change] because [theoretical reasoning]. This would [expected improvement]."],
      "commentary": "A full paragraph (6-10 sentences) providing deep analysis in your voice..."
    },
    {
      "section_name": "Evaluation Approach & Methodology",
      "stance": "agree" | "partial" | "disagree",
      "strengths": [],
      "concerns": [],
      "what_i_would_change": [],
      "commentary": "A full paragraph..."
    },
    {
      "section_name": "Evaluation Questions",
      "stance": "agree" | "partial" | "disagree",
      "strengths": [],
      "concerns": [],
      "what_i_would_change": [],
      "commentary": "A full paragraph..."
    },
    {
      "section_name": "Indicators & Measurement",
      "stance": "agree" | "partial" | "disagree",
      "strengths": [],
      "concerns": [],
      "what_i_would_change": [],
      "commentary": "A full paragraph..."
    },
    {
      "section_name": "Evaluation Plan & Timeline",
      "stance": "agree" | "partial" | "disagree",
      "strengths": [],
      "concerns": [],
      "what_i_would_change": [],
      "commentary": "A full paragraph..."
    }
  ],
  "overall_assessment": "2-3 full paragraphs (10-15 sentences total) synthesizing your overall view, naming specific tensions, proposing how you would reorient the evaluation if you were leading it, and reflecting your intellectual tradition.",
  "overall_stance": "agree" | "partial" | "disagree"
}`
          },
          {
            role: "user",
            content: `Please provide your critique of this evaluation design:\n\n${programContext}`
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.9,
        max_tokens: 8000,
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
      // Try to salvage truncated JSON
      try {
        const lastBrace = content.lastIndexOf('},')
        if (lastBrace > 0) {
          const salvaged = content.substring(0, lastBrace + 1) + '], "overall_assessment": "Assessment truncated due to length.", "overall_stance": "partial"}'
          critiqueData = JSON.parse(salvaged)
        } else {
          throw new Error("Cannot salvage")
        }
      } catch {
        throw new Error("Failed to parse critique response from AI")
      }
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
