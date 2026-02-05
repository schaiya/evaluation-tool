import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { EvaluationFlavorManager } from "@/components/evaluation-flavor-manager"
import ModuleNavigation from "@/components/module-navigation"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EvaluationFlavorPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  // Fetch program
  const { data: program, error: programError } = await supabase
    .from("programs")
    .select("*")
    .eq("id", id)
    .maybeSingle()

  if (programError || !program) {
    notFound()
  }

  // Fetch existing flavor config (if any)
  const { data: flavor } = await supabase
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

  // Fetch evaluation standards
  const { data: standards } = await supabase
    .from("evaluation_standards")
    .select("*")
    .order("standard_name")

  // Fetch available avatars for selection
  const { data: avatars } = await supabase
    .from("avatars")
    .select("id, name, role, background, values, decision_style, expertise_areas")
    .order("name")

  // Fetch logic model to check if it exists (flavor comes after logic model)
  const { data: logicModel } = await supabase
    .from("logic_models")
    .select("id")
    .eq("program_id", id)
    .maybeSingle()

  return (
    <div className="container mx-auto py-8 px-4">
      <ModuleNavigation programId={id} currentModule="evaluation-flavor" />
      
      <div className="mt-8">
        <h1 className="text-3xl font-bold text-foreground">{program.name}</h1>
        <p className="text-muted-foreground mt-2">
          Configure the evaluation flavor to tailor your evaluation design to your audiences, 
          theoretical approach, and funder requirements.
        </p>
      </div>

      <EvaluationFlavorManager
        programId={id}
        initialFlavor={flavor}
        standards={standards || []}
        availableAvatars={avatars || []}
        hasLogicModel={!!logicModel}
      />
    </div>
  )
}
