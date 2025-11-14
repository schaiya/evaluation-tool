import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const body = await request.json()

    const programName = body.name || body.programName
    const programDescription = body.description || body.programDescription || ""

    // Create program in database
    const { data: program, error: programError } = await supabase
      .from("programs")
      .insert({
        name: programName,
        description: programDescription,
      })
      .select()
      .single()

    if (programError) throw programError

    if (
      body.inputs ||
      body.activities ||
      body.shortTermOutcomes ||
      body.midTermOutcomes ||
      body.longTermOutcomes ||
      body.impacts
    ) {
      const elements = [
        ...(body.inputs || []).map((content: string) => ({
          program_id: program.id,
          element_type: "input",
          content,
        })),
        ...(body.activities || []).map((content: string) => ({
          program_id: program.id,
          element_type: "activity",
          content,
        })),
        ...(body.shortTermOutcomes || []).map((content: string) => ({
          program_id: program.id,
          element_type: "short_term_outcome",
          content,
        })),
        ...(body.midTermOutcomes || []).map((content: string) => ({
          program_id: program.id,
          element_type: "mid_term_outcome",
          content,
        })),
        ...(body.longTermOutcomes || []).map((content: string) => ({
          program_id: program.id,
          element_type: "long_term_outcome",
          content,
        })),
        ...(body.impacts || []).map((content: string) => ({
          program_id: program.id,
          element_type: "impact",
          content,
        })),
      ]

      if (elements.length > 0) {
        const { error: elementsError } = await supabase.from("program_elements").insert(elements)

        if (elementsError) throw elementsError
      }
    }

    return NextResponse.json({ id: program.id, programId: program.id })
  } catch (error) {
    console.error("[v0] Error creating program:", error)
    return NextResponse.json({ error: "Failed to create program" }, { status: 500 })
  }
}
