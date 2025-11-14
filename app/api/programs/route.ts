import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase.from("programs").select("*").order("created_at", { ascending: false })

    if (error) {
      console.error("[v0] Error fetching programs:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (error) {
    console.error("[v0] Error in programs API:", error)
    return NextResponse.json({ error: "Failed to fetch programs" }, { status: 500 })
  }
}
