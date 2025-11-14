import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import EvaluationQuestionsManager from "@/components/evaluation-questions-manager"
import ModuleNavigation from "@/components/module-navigation"

export default async function EvaluationQuestionsPage({
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

  // Fetch logic model
  const { data: logicModel } = await supabase.from("logic_models").select("*").eq("program_id", id).maybeSingle()

  // Fetch existing evaluation questions
  const { data: questions } = await supabase
    .from("evaluation_questions")
    .select("*")
    .eq("program_id", id)
    .order("created_at")

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="mb-8">
          <ModuleNavigation programId={id} />
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Evaluation Questions</h1>
          <p className="text-slate-600">Generate questions based on your logic model or add your own</p>
        </div>

        <EvaluationQuestionsManager programId={id} logicModel={logicModel} existingQuestions={questions || []} />
      </div>
    </div>
  )
}
