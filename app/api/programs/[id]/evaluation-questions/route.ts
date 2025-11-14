import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { question } = await request.json()

    const { data: newQuestion, error } = await supabase
      .from("evaluation_questions")
      .insert({
        program_id: id,
        question,
        is_custom: true, // User-added questions are custom
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ question: newQuestion })
  } catch (error) {
    console.error("[v0] Error adding evaluation question:", error)
    return NextResponse.json({ error: "Failed to add evaluation question" }, { status: 500 })
  }
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: questions } = await supabase
      .from("evaluation_questions")
      .select("*")
      .eq("program_id", id)
      .order("created_at")

    return NextResponse.json({ questions })
  } catch (error) {
    console.error("[v0] Error fetching evaluation questions:", error)
    return NextResponse.json({ error: "Failed to fetch evaluation questions" }, { status: 500 })
  }
}
