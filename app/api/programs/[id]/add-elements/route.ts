import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { narrativeDescription } = await request.json()

    const apiKey = process.env.OPENAI_API_KEY
    console.log("[v0] Starting AI extraction for program:", id)
    console.log("[v0] API key last 4 chars:", apiKey?.slice(-4) || "NOT FOUND")
    console.log("[v0] Narrative length:", narrativeDescription?.length || 0)

    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not configured")
    }

    const supabase = await createClient()

    console.log("[v0] Calling OpenAI API directly...")

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
            content:
              "You are a program evaluation expert. Extract program elements and return ONLY valid JSON with no additional text.",
          },
          {
            role: "user",
            content: `Extract program evaluation elements from this narrative description and return ONLY a valid JSON object.

The JSON must have this exact structure:
{
  "inputs": ["array of input resources"],
  "activities": ["array of activities"],
  "short_term_outcomes": ["array of short-term outcomes"],
  "mid_term_outcomes": ["array of mid-term outcomes"],
  "long_term_outcomes": ["array of long-term outcomes"],
  "impacts": ["array of impacts"]
}

Identify and categorize:
- inputs: Resources, materials, staff, funding needed
- activities: Actions, processes, interventions performed
- short_term_outcomes: Immediate results (0-6 months)
- mid_term_outcomes: Intermediate results (6-12 months)
- long_term_outcomes: Long-term results (1-3 years)
- impacts: Ultimate societal or systemic changes

Narrative: ${narrativeDescription}

Return ONLY the JSON object, no other text.`,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
      }),
    })

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json()
      console.error("[v0] OpenAI API error:", errorData)
      throw new Error(`OpenAI API error: ${errorData.error?.message || openaiResponse.statusText}`)
    }

    const openaiData = await openaiResponse.json()
    console.log("[v0] OpenAI response received")

    const aiText = openaiData.choices?.[0]?.message?.content
    if (!aiText) {
      throw new Error("No content in OpenAI response")
    }

    console.log("[v0] Raw AI response:", aiText)

    let extracted
    try {
      extracted = JSON.parse(aiText)
      console.log("[v0] AI extraction completed successfully")
      console.log("[v0] Extracted elements:", JSON.stringify(extracted, null, 2))
    } catch (parseError) {
      console.error("[v0] JSON parsing failed:", parseError)
      console.error("[v0] Response text:", aiText)
      throw new Error(
        `Failed to parse AI response as JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
      )
    }

    // Insert extracted elements
    const elementsToInsert = [
      ...(extracted.inputs || []).map((content: string) => ({
        program_id: id,
        element_type: "input",
        title: content.substring(0, 100), // Use first 100 chars as title
        description: content,
      })),
      ...(extracted.activities || []).map((content: string) => ({
        program_id: id,
        element_type: "activity",
        title: content.substring(0, 100),
        description: content,
      })),
      ...(extracted.short_term_outcomes || []).map((content: string) => ({
        program_id: id,
        element_type: "short_term_outcome",
        title: content.substring(0, 100),
        description: content,
      })),
      ...(extracted.mid_term_outcomes || []).map((content: string) => ({
        program_id: id,
        element_type: "mid_term_outcome",
        title: content.substring(0, 100),
        description: content,
      })),
      ...(extracted.long_term_outcomes || []).map((content: string) => ({
        program_id: id,
        element_type: "long_term_outcome",
        title: content.substring(0, 100),
        description: content,
      })),
      ...(extracted.impacts || []).map((content: string) => ({
        program_id: id,
        element_type: "impact",
        title: content.substring(0, 100),
        description: content,
      })),
    ]

    console.log("[v0] Inserting", elementsToInsert.length, "elements into database")

    if (elementsToInsert.length > 0) {
      const { error } = await supabase.from("program_elements").insert(elementsToInsert)
      if (error) throw error
    }

    console.log("[v0] Elements successfully added")
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error adding elements:", error)
    if (error instanceof Error) {
      console.error("[v0] Error message:", error.message)
      console.error("[v0] Error stack:", error.stack)
    }
    return NextResponse.json(
      {
        error: "Failed to add elements",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
