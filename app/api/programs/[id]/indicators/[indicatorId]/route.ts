import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; indicatorId: string }> }) {
  try {
    const { indicatorId } = await params
    const supabase = await createClient()

    const body = await request.json()

    const { error } = await supabase.from("indicators").update(body).eq("id", indicatorId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error updating indicator:", error)
    return NextResponse.json({ error: "Failed to update indicator" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string; indicatorId: string }> }) {
  try {
    const { indicatorId } = await params
    const supabase = await createClient()

    const { error } = await supabase.from("indicators").delete().eq("id", indicatorId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error deleting indicator:", error)
    return NextResponse.json({ error: "Failed to delete indicator" }, { status: 500 })
  }
}
