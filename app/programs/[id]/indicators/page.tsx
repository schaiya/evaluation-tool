import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import IndicatorsManager from "@/components/indicators-manager"
import ModuleNavigation from "@/components/module-navigation"

export default async function IndicatorsPage({
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

  // Fetch evaluation questions
  const { data: questions } = await supabase
    .from("evaluation_questions")
    .select("*")
    .eq("program_id", id)
    .order("created_at")

  // Fetch logic model
  const { data: logicModel } = await supabase.from("logic_models").select("*").eq("program_id", id).maybeSingle()

  // Fetch existing indicators
  const { data: indicators } = await supabase.from("indicators").select("*").eq("program_id", id).order("created_at")

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <ModuleNavigation programId={id} />
          <h1 className="text-4xl font-bold text-foreground mb-2">Evaluation Indicators</h1>
          <p className="text-muted-foreground">Create indicators to measure your evaluation questions</p>
        </div>

        <IndicatorsManager
          programId={id}
          questions={questions || []}
          logicModel={logicModel}
          existingIndicators={indicators || []}
        />
      </div>
    </div>
  )
}
