import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Fetch all data in parallel
    const [
      programResult,
      elementsResult,
      logicModelResult,
      flavorResult,
      questionsResult,
      indicatorsResult,
      evalPlanResult,
    ] = await Promise.all([
      supabase.from("programs").select("*").eq("id", id).single(),
      supabase.from("program_elements").select("*").eq("program_id", id).order("element_type"),
      supabase.from("logic_models").select("*").eq("program_id", id).maybeSingle(),
      supabase
        .from("evaluation_flavors")
        .select(`
          *,
          flavor_audiences (*),
          flavor_approaches (
            *,
            avatars (id, name, values, decision_style)
          ),
          funder_requirements (*)
        `)
        .eq("program_id", id)
        .maybeSingle(),
      supabase.from("evaluation_questions").select("*").eq("program_id", id).order("created_at"),
      supabase.from("indicators").select("*").eq("program_id", id).order("created_at"),
      supabase.from("evaluation_plans").select("*").eq("program_id", id).maybeSingle(),
    ])

    if (!programResult.data) {
      return NextResponse.json({ error: "Program not found" }, { status: 404 })
    }

    // Fetch selected standards if flavor has them
    let standards: any[] = []
    if (flavorResult.data?.selected_standard_ids?.length > 0) {
      const { data: standardsData } = await supabase
        .from("evaluation_standards")
        .select("*")
        .in("id", flavorResult.data.selected_standard_ids)
      standards = standardsData || []
    }

    return NextResponse.json({
      program: programResult.data,
      elements: elementsResult.data || [],
      logicModel: logicModelResult.data?.diagram_data || null,
      flavor: flavorResult.data,
      standards,
      questions: questionsResult.data || [],
      indicators: indicatorsResult.data || [],
      evalPlan: evalPlanResult.data,
    })
  } catch (error) {
    console.error("[v0] Error fetching full report data:", error)
    return NextResponse.json(
      { error: "Failed to fetch report data" },
      { status: 500 }
    )
  }
}
