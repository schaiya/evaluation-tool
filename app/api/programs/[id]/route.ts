import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const supabase = await createClient()

    // Delete the program - CASCADE will handle all related data
    const { error } = await supabase.from("programs").delete().eq("id", id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error deleting program:", error)
    return NextResponse.json({ error: "Failed to delete program" }, { status: 500 })
  }
}
