import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string; toolId: string }> }) {
  try {
    const { toolId } = await params
    const supabase = await createClient()

    const { error } = await supabase.from("data_collection_tools").delete().eq("id", toolId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error deleting data collection tool:", error)
    return NextResponse.json({ error: "Failed to delete data collection tool" }, { status: 500 })
  }
}
