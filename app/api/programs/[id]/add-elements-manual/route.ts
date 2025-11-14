import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { inputs, activities, shortTermOutcomes, midTermOutcomes, longTermOutcomes, impacts } = await request.json()

    const supabase = await createClient()

    const elementsToInsert = [
      ...inputs.map((content: string) => ({ program_id: id, element_type: "input", content })),
      ...activities.map((content: string) => ({ program_id: id, element_type: "activity", content })),
      ...shortTermOutcomes.map((content: string) => ({
        program_id: id,
        element_type: "short_term_outcome",
        content,
      })),
      ...midTermOutcomes.map((content: string) => ({ program_id: id, element_type: "mid_term_outcome", content })),
      ...longTermOutcomes.map((content: string) => ({ program_id: id, element_type: "long_term_outcome", content })),
      ...impacts.map((content: string) => ({ program_id: id, element_type: "impact", content })),
    ]

    if (elementsToInsert.length > 0) {
      const { error } = await supabase.from("program_elements").insert(elementsToInsert)
      if (error) throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error adding elements:", error)
    return NextResponse.json({ error: "Failed to add elements" }, { status: 500 })
  }
}
