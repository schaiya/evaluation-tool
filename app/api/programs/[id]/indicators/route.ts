import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { indicator, questionId } = await request.json()

    const { data: newIndicator, error } = await supabase
      .from("indicators")
      .insert({
        program_id: id,
        question_id: questionId,
        indicator_text: indicator,
        is_ai_generated: false,
        is_selected: false,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ indicator: newIndicator })
  } catch (error) {
    console.error("[v0] Error adding indicator:", error)
    return NextResponse.json({ error: "Failed to add indicator" }, { status: 500 })
  }
}
