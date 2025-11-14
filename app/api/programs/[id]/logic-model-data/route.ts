import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Fetch program
    const { data: program, error: programError } = await supabase.from("programs").select("*").eq("id", id).single()

    if (programError || !program) {
      return NextResponse.json({ error: "Program not found" }, { status: 404 })
    }

    // Fetch program elements
    const { data: elements } = await supabase
      .from("program_elements")
      .select("*")
      .eq("program_id", id)
      .order("element_type")

    // Fetch logic model
    const { data: logicModel } = await supabase.from("logic_models").select("*").eq("program_id", id).maybeSingle()

    return NextResponse.json({
      program,
      elements: elements || [],
      logicModel: logicModel?.diagram_data || null,
    })
  } catch (error) {
    console.error("[v0] Error fetching logic model data:", error)
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 })
  }
}
