import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { nodes, edges } = await request.json()

    const { data: existing } = await supabase.from("logic_models").select("id").eq("program_id", id).maybeSingle()

    if (existing) {
      // Update existing
      const { error } = await supabase
        .from("logic_models")
        .update({
          diagram_data: { nodes, edges },
          updated_at: new Date().toISOString(),
        })
        .eq("program_id", id)

      if (error) throw error
    } else {
      // Create new
      const { error } = await supabase.from("logic_models").insert({
        program_id: id,
        diagram_data: { nodes, edges },
      })

      if (error) throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error saving logic model:", error)
    return NextResponse.json({ error: "Failed to save logic model" }, { status: 500 })
  }
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: logicModel } = await supabase.from("logic_models").select("*").eq("program_id", id).maybeSingle()

    return NextResponse.json({ logicModel })
  } catch (error) {
    console.error("[v0] Error fetching logic model:", error)
    return NextResponse.json({ error: "Failed to fetch logic model" }, { status: 500 })
  }
}
