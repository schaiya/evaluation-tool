import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("evaluation_flavors")
    .select(`
      *,
      flavor_audiences (*),
      flavor_approaches (
        *,
        avatars (id, name, role, background, values, decision_style, expertise_areas)
      ),
      funder_requirements (*)
    `)
    .eq("program_id", id)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(request: Request, { params }: RouteParams) {
  const { id } = await params
  const supabase = await createClient()
  const body = await request.json()

  const {
    is_active,
    funder_name,
    funder_guidelines_url,
    custom_notes,
    audiences,
    approaches,
    funder_requirements
  } = body

  // Check if flavor already exists
  const { data: existingFlavor } = await supabase
    .from("evaluation_flavors")
    .select("id")
    .eq("program_id", id)
    .maybeSingle()

  let flavorId: string

  if (existingFlavor) {
    // Update existing flavor
    const { error: updateError } = await supabase
      .from("evaluation_flavors")
      .update({
        is_active,
        funder_name,
        funder_guidelines_url,
        custom_notes,
        updated_at: new Date().toISOString()
      })
      .eq("id", existingFlavor.id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    flavorId = existingFlavor.id

    // Delete existing related data (will be re-inserted)
    await supabase.from("flavor_audiences").delete().eq("flavor_id", flavorId)
    await supabase.from("flavor_approaches").delete().eq("flavor_id", flavorId)
    await supabase.from("funder_requirements").delete().eq("flavor_id", flavorId)
  } else {
    // Create new flavor
    const { data: newFlavor, error: createError } = await supabase
      .from("evaluation_flavors")
      .insert({
        program_id: id,
        is_active,
        funder_name,
        funder_guidelines_url,
        custom_notes
      })
      .select()
      .single()

    if (createError || !newFlavor) {
      return NextResponse.json({ error: createError?.message || "Failed to create flavor" }, { status: 500 })
    }

    flavorId = newFlavor.id
  }

  // Insert audiences
  if (audiences && audiences.length > 0) {
    const audienceRecords = audiences.map((a: Record<string, unknown>) => ({
      flavor_id: flavorId,
      audience_type: a.audience_type,
      custom_name: a.custom_name,
      custom_description: a.custom_description,
      priority: a.priority || 1,
      preferred_evidence: a.preferred_evidence || [],
      preferred_methods: a.preferred_methods || [],
      reporting_style: a.reporting_style || 'narrative'
    }))

    const { error: audienceError } = await supabase
      .from("flavor_audiences")
      .insert(audienceRecords)

    if (audienceError) {
      console.error("Error inserting audiences:", audienceError)
    }
  }

  // Insert approaches
  if (approaches && approaches.length > 0) {
    const approachRecords = approaches.map((a: Record<string, unknown>) => ({
      flavor_id: flavorId,
      approach_type: a.approach_type,
      custom_name: a.custom_name,
      custom_description: a.custom_description,
      avatar_id: a.avatar_id || null
    }))

    const { error: approachError } = await supabase
      .from("flavor_approaches")
      .insert(approachRecords)

    if (approachError) {
      console.error("Error inserting approaches:", approachError)
    }
  }

  // Insert funder requirements
  if (funder_requirements) {
    const { error: reqError } = await supabase
      .from("funder_requirements")
      .insert({
        flavor_id: flavorId,
        source_filename: funder_requirements.source_filename,
        evaluation_requirements: funder_requirements.evaluation_requirements || [],
        reporting_templates: funder_requirements.reporting_templates || [],
        timeline_expectations: funder_requirements.timeline_expectations,
        required_metrics: funder_requirements.required_metrics || [],
        raw_extraction: funder_requirements.raw_extraction || null
      })

    if (reqError) {
      console.error("Error inserting funder requirements:", reqError)
    }
  }

  return NextResponse.json({ success: true, flavorId })
}
