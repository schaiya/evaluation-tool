import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string; dataId: string }> }) {
  try {
    const { dataId } = await params
    const supabase = await createClient()

    const { error } = await supabase.from("uploaded_data").delete().eq("id", dataId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error deleting data:", error)
    return NextResponse.json({ error: "Failed to delete data" }, { status: 500 })
  }
}
