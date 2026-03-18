import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { logicModel } = await request.json()

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not configured")
    }

    // Fetch program elements for context
    const { data: elements } = await supabase.from("program_elements").select("*").eq("program_id", id)

    // Fetch evaluation flavor configuration
    const { data: flavor } = await supabase
      .from("evaluation_flavors")
      .select(`
        *,
        flavor_audiences (*),
        flavor_approaches (
          *,
          avatars (id, name, values, decision_style)
        ),
        funder_requirements (*)
      `)
      .eq("program_id", id)
      .maybeSingle()

    // Fetch evaluation standards if flavor is active
    let standards: any[] = []
    if (flavor?.is_active) {
      const { data: standardsData } = await supabase
        .from("evaluation_standards")
        .select("*")
      standards = standardsData || []
    }

    const elementsByType = elements?.reduce(
      (acc, el) => {
        if (!acc[el.element_type]) acc[el.element_type] = []
        acc[el.element_type].push(el.title)
        return acc
      },
      {} as Record<string, string[]>,
    )

    const relationships =
      logicModel?.edges?.map((edge: any) => {
        const sourceNode = logicModel.nodes?.find((n: any) => n.id === edge.source)
        const targetNode = logicModel.nodes?.find((n: any) => n.id === edge.target)
        return `${sourceNode?.data?.label || edge.source} → ${targetNode?.data?.label || edge.target}`
      }) || []

    // Build flavor context for AI prompt
    let flavorContext = ""
    if (flavor?.is_active) {
      flavorContext = "\n\nEVALUATION FLAVOR CONTEXT:\n"
      
      if (flavor.flavor_audiences?.length > 0) {
        flavorContext += "\nTarget Audiences:\n"
        flavor.flavor_audiences.forEach((aud: any) => {
          const name = aud.audience_type === 'custom' ? aud.custom_name : aud.audience_type
          flavorContext += `- ${name}: prefers ${aud.preferred_evidence?.join(', ')} evidence, ${aud.preferred_methods?.join(', ')} methods, ${aud.reporting_style} reporting\n`
        })
      }

      if (flavor.flavor_approaches?.length > 0) {
        flavorContext += "\nEvaluation Approaches:\n"
        flavor.flavor_approaches.forEach((app: any) => {
          const name = app.approach_type === 'custom' ? app.custom_name : app.approach_type
          flavorContext += `- ${name}`
          if (app.avatars?.values) {
            flavorContext += ` (guided by: ${app.avatars.values.substring(0, 200)})`
          }
          flavorContext += "\n"
        })
      }

      if (flavor.funder_requirements?.[0]) {
        const req = flavor.funder_requirements[0]
        flavorContext += "\nFunder Requirements:\n"
        if (req.evaluation_requirements?.length > 0) {
          flavorContext += `- Required: ${req.evaluation_requirements.join('; ')}\n`
        }
        if (req.required_metrics?.length > 0) {
          flavorContext += `- Required metrics: ${req.required_metrics.join('; ')}\n`
        }
      }

      if (standards.length > 0) {
        flavorContext += "\nEvaluation Standards to Consider:\n"
        standards.forEach((std: any) => {
          flavorContext += `- ${std.standard_name}: ${std.content?.evidence_preferences?.join(', ') || ''}\n`
        })
      }
    }

    console.log("[v0] Generating evaluation questions with OpenAI...")

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
            content: flavor?.is_active 
              ? `You are an expert in program evaluation. Generate comprehensive evaluation questions tailored to the specified audiences, approaches, and standards. Return ONLY valid JSON.

For each question, include attribution information showing which audiences it serves, which evaluation approaches it aligns with, and which standards it relates to.`
              : "You are an expert in program evaluation. Generate comprehensive evaluation questions and return ONLY valid JSON.",
          },
          {
            role: "user",
            content: `Generate 8-12 evaluation questions for this program.

Program Components:
${Object.entries(elementsByType || {})
  .map(([type, items]) => `${type}: ${items.join(", ")}`)
  .join("\n")}

Key Relationships:
${relationships.slice(0, 15).join("\n")}
${flavorContext}

Generate questions that:
- Assess activity effectiveness
- Measure outcome achievement
- Evaluate program impact
- Explore causal relationships
${flavor?.is_active ? "- Address the needs of all specified audiences\n- Align with the specified evaluation approaches\n- Incorporate funder requirements if provided" : ""}

Return JSON format: {
  "questions": [
    {
      "question": "Question text here",
      "source_type": "ai_generated",
      "audience_tags": ["funder", "internal"],
      "approach_tags": ["utilization-focused"],
      "standard_tags": ["CDC"],
      "source_details": {"rationale": "Brief explanation of why this question was generated"}
    }
  ]
}`,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 3000,
      }),
    })

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json()
      console.error("[v0] OpenAI API error:", errorData)
      throw new Error(`OpenAI API error: ${errorData.error?.message || openaiResponse.statusText}`)
    }

    const openaiData = await openaiResponse.json()
    const aiText = openaiData.choices?.[0]?.message?.content

    if (!aiText) {
      throw new Error("No content in OpenAI response")
    }

    console.log("[v0] OpenAI response received")

    // Parse AI response
    let parsedResponse
    try {
      parsedResponse = JSON.parse(aiText)
    } catch (parseError) {
      console.error("[v0] JSON parsing failed:", parseError)
      throw new Error("Failed to parse AI response as JSON")
    }

    let generatedQuestions: any[] = []

    if (Array.isArray(parsedResponse)) {
      generatedQuestions = parsedResponse.map(q => typeof q === 'string' ? { question: q } : q)
    } else if (typeof parsedResponse === "object" && parsedResponse !== null) {
      const questionArray = parsedResponse.questions ||
        parsedResponse.evaluation_questions ||
        parsedResponse.items ||
        parsedResponse.data ||
        []
      generatedQuestions = questionArray.map((q: any) => typeof q === 'string' ? { question: q } : q)
    }

    if (generatedQuestions.length === 0) {
      throw new Error("No questions generated by AI")
    }

    // Insert questions into database with attribution
    const questionsToInsert = generatedQuestions.map((q: any) => ({
      program_id: id,
      question: q.question || q,
      is_custom: false,
      source_type: q.source_type || 'ai_generated',
      source_details: q.source_details || {},
      audience_tags: q.audience_tags || [],
      approach_tags: q.approach_tags || [],
      standard_tags: q.standard_tags || [],
    }))

    const { data: insertedQuestions, error } = await supabase
      .from("evaluation_questions")
      .insert(questionsToInsert)
      .select()

    if (error) throw error

    console.log("[v0] Successfully generated", insertedQuestions.length, "evaluation questions")

    return NextResponse.json({ questions: insertedQuestions })
  } catch (error) {
    console.error("[v0] Error generating evaluation questions:", error)
    return NextResponse.json(
      {
        error: "Failed to generate evaluation questions",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
