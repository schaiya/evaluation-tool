import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import ProgramElementsEditor from "@/components/program-elements-editor"

export default async function ProgramDetailPage({
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

  // Fetch program elements
  const { data: elements } = await supabase
    .from("program_elements")
    .select("*")
    .eq("program_id", id)
    .order("element_type")

  const groupedElements = {
    inputs: elements?.filter((e) => e.element_type === "input") || [],
    activities: elements?.filter((e) => e.element_type === "activity") || [],
    short_term_outcomes: elements?.filter((e) => e.element_type === "short_term_outcome") || [],
    mid_term_outcomes: elements?.filter((e) => e.element_type === "mid_term_outcome") || [],
    long_term_outcomes: elements?.filter((e) => e.element_type === "long_term_outcome") || [],
    impacts: elements?.filter((e) => e.element_type === "impact") || [],
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <Link href="/" className="text-blue-600 hover:underline mb-4 inline-block">
            ← Back to Programs
          </Link>
          <h1 className="text-4xl font-bold text-slate-900 mb-2">{program.name}</h1>
          {program.description && <p className="text-slate-600">{program.description}</p>}
        </div>

        {/* Evaluation Modules card moved to the top */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Evaluation Modules</CardTitle>
            <CardDescription>Navigate through the evaluation workflow</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg bg-blue-50 border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-blue-900">1. Program Clarification</h3>
                    <p className="text-sm text-blue-700">Current page - View program elements</p>
                  </div>
                  <Badge variant="secondary" className="bg-blue-600 text-white">
                    Current
                  </Badge>
                </div>
              </div>

              <Link href={`/programs/${id}/logic-model`} className="block">
                <div className="p-4 border rounded-lg hover:bg-slate-50 transition-colors h-full">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-900">2. Logic Model</h3>
                      <p className="text-sm text-slate-600">Visual diagram of relationships</p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-slate-400" />
                  </div>
                </div>
              </Link>

              <Link href={`/programs/${id}/evaluation-questions`} className="block">
                <div className="p-4 border rounded-lg hover:bg-slate-50 transition-colors h-full">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-900">3. Evaluation Questions</h3>
                      <p className="text-sm text-slate-600">Generate key questions</p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-slate-400" />
                  </div>
                </div>
              </Link>

              <Link href={`/programs/${id}/indicators`} className="block">
                <div className="p-4 border rounded-lg hover:bg-slate-50 transition-colors h-full">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-900">4. Indicators</h3>
                      <p className="text-sm text-slate-600">Define metrics and data sources</p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-slate-400" />
                  </div>
                </div>
              </Link>

              <Link href={`/programs/${id}/evaluation-plan`} className="block">
                <div className="p-4 border rounded-lg hover:bg-slate-50 transition-colors h-full">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-900">5. Evaluation Plan</h3>
                      <p className="text-sm text-slate-600">Timeline for data collection</p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-slate-400" />
                  </div>
                </div>
              </Link>

              <Link href={`/programs/${id}/data-collection-tools`} className="block">
                <div className="p-4 border rounded-lg hover:bg-slate-50 transition-colors h-full">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-900">6. Data Collection Tools</h3>
                      <p className="text-sm text-slate-600">Surveys, interviews, focus groups</p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-slate-400" />
                  </div>
                </div>
              </Link>

              <Link href={`/programs/${id}/data-analysis`} className="block">
                <div className="p-4 border rounded-lg hover:bg-slate-50 transition-colors h-full">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-900">7. Data Analysis & Report</h3>
                      <p className="text-sm text-slate-600">Analyze data and generate report</p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-slate-400" />
                  </div>
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Add Program Elements</CardTitle>
            <CardDescription>Add more details to your program using AI extraction or manual input</CardDescription>
          </CardHeader>
          <CardContent>
            <ProgramElementsEditor programId={id} />
          </CardContent>
        </Card>

        <div className="grid gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Program Elements</CardTitle>
              <CardDescription>Extracted components of your program</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold text-lg mb-3 text-blue-900">Inputs (Resources)</h3>
                <div className="flex flex-wrap gap-2">
                  {groupedElements.inputs.map((element) => (
                    <Badge
                      key={element.id}
                      variant="secondary"
                      className="bg-blue-100 text-blue-900 px-3 py-1.5 text-sm"
                    >
                      {element.title}
                    </Badge>
                  ))}
                  {groupedElements.inputs.length === 0 && <p className="text-slate-500 text-sm">No inputs defined</p>}
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-3 text-green-900">Activities</h3>
                <div className="flex flex-wrap gap-2">
                  {groupedElements.activities.map((element) => (
                    <Badge
                      key={element.id}
                      variant="secondary"
                      className="bg-green-100 text-green-900 px-3 py-1.5 text-sm"
                    >
                      {element.title}
                    </Badge>
                  ))}
                  {groupedElements.activities.length === 0 && (
                    <p className="text-slate-500 text-sm">No activities defined</p>
                  )}
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-3 text-amber-900">Short-term Outcomes</h3>
                <div className="flex flex-wrap gap-2">
                  {groupedElements.short_term_outcomes.map((element) => (
                    <Badge
                      key={element.id}
                      variant="secondary"
                      className="bg-amber-100 text-amber-900 px-3 py-1.5 text-sm"
                    >
                      {element.title}
                    </Badge>
                  ))}
                  {groupedElements.short_term_outcomes.length === 0 && (
                    <p className="text-slate-500 text-sm">No short-term outcomes defined</p>
                  )}
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-3 text-orange-900">Mid-term Outcomes</h3>
                <div className="flex flex-wrap gap-2">
                  {groupedElements.mid_term_outcomes.map((element) => (
                    <Badge
                      key={element.id}
                      variant="secondary"
                      className="bg-orange-100 text-orange-900 px-3 py-1.5 text-sm"
                    >
                      {element.title}
                    </Badge>
                  ))}
                  {groupedElements.mid_term_outcomes.length === 0 && (
                    <p className="text-slate-500 text-sm">No mid-term outcomes defined</p>
                  )}
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-3 text-red-900">Long-term Outcomes</h3>
                <div className="flex flex-wrap gap-2">
                  {groupedElements.long_term_outcomes.map((element) => (
                    <Badge key={element.id} variant="secondary" className="bg-red-100 text-red-900 px-3 py-1.5 text-sm">
                      {element.title}
                    </Badge>
                  ))}
                  {groupedElements.long_term_outcomes.length === 0 && (
                    <p className="text-slate-500 text-sm">No long-term outcomes defined</p>
                  )}
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-3 text-purple-900">Impacts</h3>
                <div className="flex flex-wrap gap-2">
                  {groupedElements.impacts.map((element) => (
                    <Badge
                      key={element.id}
                      variant="secondary"
                      className="bg-purple-100 text-purple-900 px-3 py-1.5 text-sm"
                    >
                      {element.title}
                    </Badge>
                  ))}
                  {groupedElements.impacts.length === 0 && <p className="text-slate-500 text-sm">No impacts defined</p>}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
