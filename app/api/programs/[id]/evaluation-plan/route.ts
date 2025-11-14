import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { startDate, endDate, durationMonths, planData } = await request.json()

    // Check if plan exists
    const { data: existing } = await supabase.from("evaluation_plans").select("id").eq("program_id", id).maybeSingle()

    if (existing) {
      // Update existing
      const { error } = await supabase
        .from("evaluation_plans")
        .update({
          start_date: startDate,
          end_date: endDate,
          duration_months: durationMonths,
          plan_data: planData,
          updated_at: new Date().toISOString(),
        })
        .eq("program_id", id)

      if (error) throw error
    } else {
      // Create new
      const { error } = await supabase.from("evaluation_plans").insert({
        program_id: id,
        start_date: startDate,
        end_date: endDate,
        duration_months: durationMonths,
        plan_data: planData,
      })

      if (error) throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error saving evaluation plan:", error)
    return NextResponse.json({ error: "Failed to save evaluation plan" }, { status: 500 })
  }
}
