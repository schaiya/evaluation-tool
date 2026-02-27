import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// GET: Fetch all critiques for a program
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("evaluation_critiques")
      .select(`
        *,
        avatars (id, name, role, background, writing_style, expertise_areas, values)
      `)
      .eq("program_id", id)
      .order("created_at", { ascending: false })

    if (error) throw error
    return NextResponse.json(data || [])
  } catch (error) {
    console.error("[v0] Error fetching critiques:", error)
    return NextResponse.json({ error: "Failed to fetch critiques" }, { status: 500 })
  }
}

// DELETE: Remove a specific critique
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const critiqueId = searchParams.get("critiqueId")

    const { error } = await supabase
      .from("evaluation_critiques")
      .delete()
      .eq("id", critiqueId)
      .eq("program_id", id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error deleting critique:", error)
    return NextResponse.json({ error: "Failed to delete critique" }, { status: 500 })
  }
}
