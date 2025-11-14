import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import EvaluationPlanManager from "@/components/evaluation-plan-manager"
import ModuleNavigation from "@/components/module-navigation"

export default async function EvaluationPlanPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  // Fetch program
  const { data: program } = await supabase.from("programs").select("*").eq("id", id).single()

  if (!program) {
    redirect("/")
  }

  // Fetch selected indicators with metrics and data sources
  const { data: indicators } = await supabase
    .from("indicators")
    .select("*")
    .eq("program_id", id)
    .eq("is_selected", true)

  // Fetch existing evaluation plan
  const { data: existingPlan } = await supabase.from("evaluation_plans").select("*").eq("program_id", id).maybeSingle()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <ModuleNavigation programId={id} />
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Evaluation Plan</h1>
          <p className="text-slate-600">Create a timeline for data collection based on your indicators</p>
        </div>

        <EvaluationPlanManager programId={id} indicators={indicators || []} existingPlan={existingPlan} />
      </div>
    </div>
  )
}
