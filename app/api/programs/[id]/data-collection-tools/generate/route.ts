import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const supabase = await createClient()

    const { toolType, evaluationPlan, indicators } = await request.json()

    console.log("[v0] Generating data collection tool:", toolType)

    const toolTypeNames = {
      survey: "Survey Questionnaire",
      interview: "Interview Guide",
      focus_group: "Focus Group Discussion Guide",
    }

    const toolName = toolTypeNames[toolType as keyof typeof toolTypeNames] || "Data Collection Tool"

    // Prepare evaluation plan summary
    const planSummary =
      evaluationPlan?.plan_items?.map((item: any) => `- ${item.activity} (${item.timeline})`).join("\n") ||
      "No evaluation plan provided"

    // Prepare indicators summary
    const indicatorsSummary =
      indicators
        ?.map((ind: any) => `- ${ind.indicator_text}${ind.metric ? ` (Metric: ${ind.metric})` : ""}`)
        .join("\n") || "No indicators provided"

    let prompt = ""
    let expectedStructure = ""

    if (toolType === "survey") {
      expectedStructure = `{
  "title": "Survey title",
  "introduction": "Introduction and consent text",
  "questions": [
    {
      "question": "Question text",
      "type": "multiple-choice|open-ended|rating|yes-no",
      "required": true,
      "options": ["Option 1", "Option 2"]
    }
  ]
}`
      prompt = `You are an evaluation expert. Generate a comprehensive Survey Questionnaire for a program evaluation.

EVALUATION PLAN:
${planSummary}

INDICATORS TO MEASURE:
${indicatorsSummary}

Create a survey with:
- A clear introduction explaining the purpose and obtaining consent
- 10-15 questions that measure the indicators above
- Mix of question types (multiple-choice, rating scales, open-ended)
- Clear response options for closed-ended questions

Return ONLY a JSON object with this EXACT structure:
${expectedStructure}`
    } else if (toolType === "interview") {
      expectedStructure = `{
  "title": "Interview guide title",
  "introduction": "Introduction script for the interviewer",
  "questions": [
    {
      "question": "Main question text",
      "probes": ["Probe question 1", "Probe question 2"]
    }
  ]
}`
      prompt = `You are an evaluation expert. Generate a comprehensive Interview Guide for a program evaluation.

EVALUATION PLAN:
${planSummary}

INDICATORS TO MEASURE:
${indicatorsSummary}

Create an interview guide with:
- An introduction script for building rapport
- 8-12 main questions aligned with the indicators
- 2-3 probing questions for each main question to get deeper insights
- Questions that encourage detailed responses

Return ONLY a JSON object with this EXACT structure:
${expectedStructure}`
    } else if (toolType === "focus_group") {
      expectedStructure = `{
  "title": "Focus group guide title",
  "introduction": "Facilitator introduction script",
  "ground_rules": ["Rule 1", "Rule 2", "Rule 3"],
  "questions": [
    {
      "question": "Discussion question text",
      "timing": "10 minutes",
      "follow_ups": ["Follow-up question 1", "Follow-up question 2"]
    }
  ]
}`
      prompt = `You are an evaluation expert. Generate a comprehensive Focus Group Discussion Guide for a program evaluation.

EVALUATION PLAN:
${planSummary}

INDICATORS TO MEASURE:
${indicatorsSummary}

Create a focus group guide with:
- A facilitator introduction and ground rules
- 6-10 discussion questions aligned with the indicators
- Suggested timing for each question
- Follow-up questions to deepen the discussion
- Questions that encourage group interaction and diverse perspectives

Return ONLY a JSON object with this EXACT structure:
${expectedStructure}`
    }

    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 4000,
      }),
    })

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text()
      console.error("[v0] OpenAI API error:", errorText)
      throw new Error(`OpenAI API error: ${openaiResponse.status}`)
    }

    const openaiData = await openaiResponse.json()
    console.log("[v0] OpenAI response received")

    const toolContent = JSON.parse(openaiData.choices[0].message.content)
    console.log("[v0] Parsed tool content:", JSON.stringify(toolContent, null, 2))
    console.log("[v0] Number of questions:", toolContent.questions?.length || 0)

    const { data: newTool, error: insertError } = await supabase
      .from("data_collection_tools")
      .insert({
        program_id: id,
        tool_type: toolType,
        tool_name: toolContent.title || toolName,
        tool_content: toolContent,
      })
      .select()
      .single()

    if (insertError) {
      console.error("[v0] Database insert error:", insertError)
      throw insertError
    }

    console.log("[v0] Data collection tool created successfully")

    return NextResponse.json({ tool: newTool })
  } catch (error) {
    console.error("[v0] Error generating data collection tool:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate data collection tool" },
      { status: 500 },
    )
  }
}
