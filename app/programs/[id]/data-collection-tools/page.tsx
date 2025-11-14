import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import DataCollectionToolsManager from "@/components/data-collection-tools-manager"
import ModuleNavigation from "@/components/module-navigation"

export default async function DataCollectionToolsPage({
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

  // Fetch evaluation plan
  const { data: evaluationPlan } = await supabase
    .from("evaluation_plans")
    .select("*")
    .eq("program_id", id)
    .maybeSingle()

  // Fetch indicators
  const { data: indicators } = await supabase
    .from("indicators")
    .select("*")
    .eq("program_id", id)
    .eq("is_selected", true)

  // Fetch existing tools
  const { data: existingTools } = await supabase
    .from("data_collection_tools")
    .select("*")
    .eq("program_id", id)
    .order("created_at")

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <ModuleNavigation programId={id} />
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Data Collection Tools</h1>
          <p className="text-slate-600">Generate surveys, interview guides, and other data collection instruments</p>
        </div>

        <DataCollectionToolsManager
          programId={id}
          evaluationPlan={evaluationPlan}
          indicators={indicators || []}
          existingTools={existingTools || []}
        />
      </div>
    </div>
  )
}
