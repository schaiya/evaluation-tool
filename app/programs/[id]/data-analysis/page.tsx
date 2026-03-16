import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import DataAnalysisManager from "@/components/data-analysis-manager"
import ModuleNavigation from "@/components/module-navigation"

export default async function DataAnalysisPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Fetch program
  const { data: program } = await supabase.from("programs").select("*").eq("id", id).single()

  if (!program) {
    redirect("/")
  }

  // Fetch evaluation questions
  const { data: questions } = await supabase.from("evaluation_questions").select("*").eq("program_id", id)

  // Fetch uploaded data
  const { data: uploadedData } = await supabase
    .from("uploaded_data")
    .select("*")
    .eq("program_id", id)
    .order("uploaded_at", { ascending: false })

  // Fetch analysis results
  const { data: analysisResults } = await supabase
    .from("analysis_results")
    .select("*")
    .eq("program_id", id)
    .order("created_at", { ascending: false })

  // Fetch report
  const { data: report } = await supabase.from("reports").select("*").eq("program_id", id).maybeSingle()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <ModuleNavigation programId={id} />
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Data Analysis & Reporting</h1>
          <p className="text-slate-600">Upload data, conduct analysis, and generate evaluation reports</p>
        </div>

        <DataAnalysisManager
          programId={id}
          questions={questions || []}
          uploadedData={uploadedData || []}
          analysisResults={analysisResults || []}
          existingReport={report}
        />
      </div>
    </div>
  )
}
