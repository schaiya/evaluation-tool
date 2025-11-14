"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, FileText, MessageSquare, Users, Sparkles, ArrowRight, Download, Trash2 } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface Indicator {
  id: string
  indicator_text: string
  metric: string | null
  data_source: string | null
}

interface Tool {
  id: string
  tool_type: string
  tool_name: string
  tool_content: any
  created_at: string
}

interface DataCollectionToolsManagerProps {
  programId: string
  evaluationPlan: any
  indicators: Indicator[]
  existingTools: Tool[]
}

export default function DataCollectionToolsManager({
  programId,
  evaluationPlan,
  indicators,
  existingTools,
}: DataCollectionToolsManagerProps) {
  const router = useRouter()
  const [tools, setTools] = useState<Tool[]>(existingTools)
  const [isGenerating, setIsGenerating] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleGenerateTool = async (toolType: string) => {
    setIsGenerating(toolType)
    setError(null)

    try {
      const response = await fetch(`/api/programs/${programId}/data-collection-tools/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toolType,
          evaluationPlan,
          indicators,
        }),
      })

      if (!response.ok) throw new Error("Failed to generate tool")

      const data = await response.json()
      setTools([...tools, data.tool])
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsGenerating(null)
    }
  }

  const handleDeleteTool = async (toolId: string) => {
    try {
      const response = await fetch(`/api/programs/${programId}/data-collection-tools/${toolId}`, {
        method: "DELETE",
      })

      if (!response.ok) throw new Error("Failed to delete tool")

      setTools(tools.filter((t) => t.id !== toolId))
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    }
  }

  const handleDownloadTool = (tool: Tool) => {
    const content = JSON.stringify(tool.tool_content, null, 2)
    const blob = new Blob([content], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${tool.tool_name.replace(/\s+/g, "_")}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleContinue = () => {
    router.push(`/programs/${programId}/data-analysis`)
  }

  const surveyTools = tools.filter((t) => t.tool_type === "survey")
  const interviewTools = tools.filter((t) => t.tool_type === "interview")
  const focusGroupTools = tools.filter((t) => t.tool_type === "focus_group")

  const renderToolContent = (tool: Tool) => {
    const content = tool.tool_content

    if (tool.tool_type === "survey") {
      return (
        <div className="space-y-4">
          {content.introduction && (
            <div className="p-3 bg-blue-50 rounded">
              <p className="text-sm font-semibold text-blue-900 mb-1">Introduction</p>
              <p className="text-sm text-slate-700">{content.introduction}</p>
            </div>
          )}
          <div className="space-y-3">
            <p className="font-semibold">Questions ({content.questions?.length || 0})</p>
            {content.questions?.map((q: any, index: number) => (
              <div key={index} className="p-3 bg-slate-50 rounded border border-slate-200">
                <p className="font-medium mb-1">
                  {index + 1}. {q.question}
                </p>
                <div className="flex gap-2 text-xs">
                  <Badge variant="outline">{q.type}</Badge>
                  {q.required && <Badge variant="secondary">Required</Badge>}
                </div>
                {q.options && <div className="mt-2 ml-4 text-sm text-slate-600">Options: {q.options.join(", ")}</div>}
              </div>
            ))}
          </div>
        </div>
      )
    }

    if (tool.tool_type === "interview") {
      return (
        <div className="space-y-4">
          {content.introduction && (
            <div className="p-3 bg-green-50 rounded">
              <p className="text-sm font-semibold text-green-900 mb-1">Introduction Script</p>
              <p className="text-sm text-slate-700">{content.introduction}</p>
            </div>
          )}
          <div className="space-y-3">
            <p className="font-semibold">Interview Questions ({content.questions?.length || 0})</p>
            {content.questions?.map((q: any, index: number) => (
              <div key={index} className="p-3 bg-slate-50 rounded border border-slate-200">
                <p className="font-medium mb-1">
                  {index + 1}. {q.question}
                </p>
                {q.probes && q.probes.length > 0 && (
                  <div className="mt-2 ml-4 space-y-1">
                    <p className="text-xs font-semibold text-slate-600">Probes:</p>
                    {q.probes.map((probe: string, pIndex: number) => (
                      <p key={pIndex} className="text-sm text-slate-600">
                        • {probe}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )
    }

    if (tool.tool_type === "focus_group") {
      return (
        <div className="space-y-4">
          {content.introduction && (
            <div className="p-3 bg-purple-50 rounded">
              <p className="text-sm font-semibold text-purple-900 mb-1">Facilitator Introduction</p>
              <p className="text-sm text-slate-700">{content.introduction}</p>
            </div>
          )}
          {content.ground_rules && (
            <div className="p-3 bg-amber-50 rounded">
              <p className="text-sm font-semibold text-amber-900 mb-1">Ground Rules</p>
              <ul className="text-sm text-slate-700 space-y-1">
                {content.ground_rules.map((rule: string, index: number) => (
                  <li key={index}>• {rule}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="space-y-3">
            <p className="font-semibold">Discussion Questions ({content.questions?.length || 0})</p>
            {content.questions?.map((q: any, index: number) => (
              <div key={index} className="p-3 bg-slate-50 rounded border border-slate-200">
                <p className="font-medium mb-1">
                  {index + 1}. {q.question}
                </p>
                <Badge variant="outline" className="text-xs">
                  {q.timing}
                </Badge>
                {q.follow_ups && q.follow_ups.length > 0 && (
                  <div className="mt-2 ml-4 space-y-1">
                    <p className="text-xs font-semibold text-slate-600">Follow-up questions:</p>
                    {q.follow_ups.map((followUp: string, fIndex: number) => (
                      <p key={fIndex} className="text-sm text-slate-600">
                        • {followUp}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )
    }

    return <pre className="text-xs overflow-auto">{JSON.stringify(content, null, 2)}</pre>
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Module 6: Data Collection Tool Developer</CardTitle>
          <CardDescription>
            Generate professional data collection instruments based on your evaluation plan
          </CardDescription>
        </CardHeader>
        <CardContent>
          {indicators.length === 0 && (
            <div className="text-center py-8 bg-amber-50 rounded-lg border border-amber-200">
              <p className="text-amber-800">
                No indicators selected. Please go back and select indicators to generate data collection tools.
              </p>
            </div>
          )}

          {indicators.length > 0 && (
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="border-2 hover:border-blue-300 transition-colors">
                <CardHeader>
                  <FileText className="h-8 w-8 text-blue-600 mb-2" />
                  <CardTitle className="text-lg">Survey</CardTitle>
                  <CardDescription>Generate survey questions</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={() => handleGenerateTool("survey")}
                    disabled={isGenerating === "survey"}
                    className="w-full"
                  >
                    {isGenerating === "survey" ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Generate Survey
                      </>
                    )}
                  </Button>
                  {surveyTools.length > 0 && (
                    <p className="text-xs text-slate-600 mt-2 text-center">{surveyTools.length} survey(s) created</p>
                  )}
                </CardContent>
              </Card>

              <Card className="border-2 hover:border-green-300 transition-colors">
                <CardHeader>
                  <MessageSquare className="h-8 w-8 text-green-600 mb-2" />
                  <CardTitle className="text-lg">Interview Guide</CardTitle>
                  <CardDescription>Generate interview questions</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={() => handleGenerateTool("interview")}
                    disabled={isGenerating === "interview"}
                    className="w-full"
                  >
                    {isGenerating === "interview" ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Generate Interview
                      </>
                    )}
                  </Button>
                  {interviewTools.length > 0 && (
                    <p className="text-xs text-slate-600 mt-2 text-center">{interviewTools.length} guide(s) created</p>
                  )}
                </CardContent>
              </Card>

              <Card className="border-2 hover:border-purple-300 transition-colors">
                <CardHeader>
                  <Users className="h-8 w-8 text-purple-600 mb-2" />
                  <CardTitle className="text-lg">Focus Group</CardTitle>
                  <CardDescription>Generate discussion guide</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={() => handleGenerateTool("focus_group")}
                    disabled={isGenerating === "focus_group"}
                    className="w-full"
                  >
                    {isGenerating === "focus_group" ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Generate Focus Group
                      </>
                    )}
                  </Button>
                  {focusGroupTools.length > 0 && (
                    <p className="text-xs text-slate-600 mt-2 text-center">{focusGroupTools.length} guide(s) created</p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm mt-4">{error}</div>
          )}
        </CardContent>
      </Card>

      {tools.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Your Data Collection Tools ({tools.length})</CardTitle>
            <CardDescription>Review and download your generated tools</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="survey">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="survey">Surveys ({surveyTools.length})</TabsTrigger>
                <TabsTrigger value="interview">Interviews ({interviewTools.length})</TabsTrigger>
                <TabsTrigger value="focus_group">Focus Groups ({focusGroupTools.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="survey" className="space-y-4">
                {surveyTools.length === 0 ? (
                  <p className="text-center text-slate-600 py-8">No surveys generated yet</p>
                ) : (
                  surveyTools.map((tool) => (
                    <Card key={tool.id}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg">{tool.tool_name}</CardTitle>
                            <CardDescription>Created {new Date(tool.created_at).toLocaleDateString()}</CardDescription>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => handleDownloadTool(tool)}>
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleDeleteTool(tool.id)}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>{renderToolContent(tool)}</CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>

              <TabsContent value="interview" className="space-y-4">
                {interviewTools.length === 0 ? (
                  <p className="text-center text-slate-600 py-8">No interview guides generated yet</p>
                ) : (
                  interviewTools.map((tool) => (
                    <Card key={tool.id}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg">{tool.tool_name}</CardTitle>
                            <CardDescription>Created {new Date(tool.created_at).toLocaleDateString()}</CardDescription>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => handleDownloadTool(tool)}>
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleDeleteTool(tool.id)}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>{renderToolContent(tool)}</CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>

              <TabsContent value="focus_group" className="space-y-4">
                {focusGroupTools.length === 0 ? (
                  <p className="text-center text-slate-600 py-8">No focus group guides generated yet</p>
                ) : (
                  focusGroupTools.map((tool) => (
                    <Card key={tool.id}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg">{tool.tool_name}</CardTitle>
                            <CardDescription>Created {new Date(tool.created_at).toLocaleDateString()}</CardDescription>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => handleDownloadTool(tool)}>
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleDeleteTool(tool.id)}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>{renderToolContent(tool)}</CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {tools.length > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg text-blue-900 mb-1">Next Step: Data Analysis</h3>
                <p className="text-blue-700 text-sm">
                  Upload data and conduct analysis to answer your evaluation questions
                </p>
              </div>
              <Button onClick={handleContinue}>
                Continue <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
