import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string; questionId: string }> }) {
  try {
    const { questionId } = await params
    const supabase = await createClient()

    const { error } = await supabase.from("evaluation_questions").delete().eq("id", questionId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error deleting evaluation question:", error)
    return NextResponse.json({ error: "Failed to delete evaluation question" }, { status: 500 })
  }
}
