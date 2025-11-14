import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

function sanitizeData(data: any): any {
  if (typeof data === "string") {
    // Remove null bytes and other problematic control characters
    return data.replace(/\u0000/g, "").replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F]/g, "")
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeData(item))
  }

  if (data && typeof data === "object") {
    const sanitized: any = {}
    for (const [key, value] of Object.entries(data)) {
      sanitized[sanitizeData(key)] = sanitizeData(value)
    }
    return sanitized
  }

  return data
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { fileName, fileType, dataContent } = await request.json()

    const sanitizedFileName = sanitizeData(fileName)
    const sanitizedDataContent = sanitizeData(dataContent)

    const { data: uploadedData, error } = await supabase
      .from("uploaded_data")
      .insert({
        program_id: id,
        file_name: sanitizedFileName,
        file_type: fileType,
        data_content: sanitizedDataContent,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ uploadedData })
  } catch (error) {
    console.error("[v0] Error uploading data:", error)
    return NextResponse.json({ error: "Failed to upload data" }, { status: 500 })
  }
}
