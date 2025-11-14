import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { generateText } from "ai"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const { programName, programDescription, narrativeDescription } = await request.json()

    // Use AI to extract program elements from narrative
    const { text } = await generateText({
      model: "openai/gpt-4o",
      prompt: `You are an expert in program evaluation and logic model development. 
      
Extract the following elements from this program description and return them as a JSON object:
- inputs (array of strings): Resources, materials, staff, funding, etc.
- activities (array of strings): What the program does
- short_term_outcomes (array of strings): Immediate results (0-6 months)
- mid_term_outcomes (array of strings): Intermediate results (6-12 months)
- long_term_outcomes (array of strings): Long-term results (1-3 years)
- impacts (array of strings): Ultimate societal or community-level changes

Program Description:
${narrativeDescription}

Return ONLY valid JSON with these exact keys. Each value should be an array of strings. Be specific and extract as many distinct elements as you can identify.`,
    })

    // Parse AI response
    const extracted = JSON.parse(text)

    // Create program in database
    const { data: program, error: programError } = await supabase
      .from("programs")
      .insert({
        name: programName,
        description: programDescription,
        narrative_description: narrativeDescription,
      })
      .select()
      .single()

    if (programError) throw programError

    // Insert program elements
    const elements = [
      ...extracted.inputs.map((content: string) => ({
        program_id: program.id,
        element_type: "input",
        content,
      })),
      ...extracted.activities.map((content: string) => ({
        program_id: program.id,
        element_type: "activity",
        content,
      })),
      ...extracted.short_term_outcomes.map((content: string) => ({
        program_id: program.id,
        element_type: "short_term_outcome",
        content,
      })),
      ...extracted.mid_term_outcomes.map((content: string) => ({
        program_id: program.id,
        element_type: "mid_term_outcome",
        content,
      })),
      ...extracted.long_term_outcomes.map((content: string) => ({
        program_id: program.id,
        element_type: "long_term_outcome",
        content,
      })),
      ...extracted.impacts.map((content: string) => ({
        program_id: program.id,
        element_type: "impact",
        content,
      })),
    ]

    const { error: elementsError } = await supabase.from("program_elements").insert(elements)

    if (elementsError) throw elementsError

    return NextResponse.json({ programId: program.id })
  } catch (error) {
    console.error("[v0] Error extracting program elements:", error)
    return NextResponse.json({ error: "Failed to extract program elements" }, { status: 500 })
  }
}
