"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2, Plus, Trash2, Sparkles, ArrowRight, CheckCircle2 } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { exportToCSV, exportToMarkdown } from "@/lib/export-utils"
import { ExportButton } from "@/components/export-button"

interface Question {
  id: string
  question: string
}

interface Indicator {
  id: string
  question_id: string | null
  indicator_text: string
  metric: string | null
  data_source: string | null
  is_selected: boolean
  is_ai_generated: boolean
}

interface IndicatorsManagerProps {
  programId: string
  questions: Question[]
  logicModel: any
  existingIndicators: Indicator[]
}

export default function IndicatorsManager({
  programId,
  questions,
  logicModel,
  existingIndicators,
}: IndicatorsManagerProps) {
  const router = useRouter()
  const [indicators, setIndicators] = useState<Indicator[]>(existingIndicators)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isIdentifyingMetrics, setIsIdentifyingMetrics] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [newIndicator, setNewIndicator] = useState("")
  const [selectedQuestionId, setSelectedQuestionId] = useState<string>("")
  const [error, setError] = useState<string | null>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  const selectedIndicators = indicators.filter((i) => i.is_selected)

  const handleGenerateIndicators = async () => {
    setIsGenerating(true)
    setError(null)

    try {
      const response = await fetch(`/api/programs/${programId}/indicators/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questions, logicModel }),
      })

      if (!response.ok) throw new Error("Failed to generate indicators")

      const data = await response.json()
      setIndicators(data.indicators)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleAddIndicator = async () => {
    if (!newIndicator.trim()) return

    setIsAdding(true)
    setError(null)

    try {
      const response = await fetch(`/api/programs/${programId}/indicators`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          indicator: newIndicator,
          questionId: selectedQuestionId || null,
        }),
      })

      if (!response.ok) throw new Error("Failed to add indicator")

      const data = await response.json()
      setIndicators([...indicators, data.indicator])
      setNewIndicator("")
      setSelectedQuestionId("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsAdding(false)
    }
  }

  const handleToggleSelection = async (indicatorId: string, currentState: boolean) => {
    try {
      const response = await fetch(`/api/programs/${programId}/indicators/${indicatorId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_selected: !currentState }),
      })

      if (!response.ok) throw new Error("Failed to update indicator")

      setIndicators(indicators.map((i) => (i.id === indicatorId ? { ...i, is_selected: !currentState } : i)))
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    }
  }

  const handleDeleteIndicator = async (indicatorId: string) => {
    try {
      const response = await fetch(`/api/programs/${programId}/indicators/${indicatorId}`, {
        method: "DELETE",
      })

      if (!response.ok) throw new Error("Failed to delete indicator")

      setIndicators(indicators.filter((i) => i.id !== indicatorId))
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    }
  }

  const handleIdentifyMetrics = async () => {
    if (selectedIndicators.length === 0) {
      setError("Please select at least one indicator first")
      return
    }

    setIsIdentifyingMetrics(true)
    setError(null)

    try {
      const response = await fetch(`/api/programs/${programId}/indicators/identify-metrics`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          indicators: selectedIndicators,
          questions,
        }),
      })

      if (!response.ok) throw new Error("Failed to identify metrics")

      const data = await response.json()
      setIndicators(
        indicators.map((indicator) => {
          const updated = data.indicators.find((i: Indicator) => i.id === indicator.id)
          return updated || indicator
        }),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsIdentifyingMetrics(false)
    }
  }

  const handleContinue = () => {
    router.push(`/programs/${programId}/evaluation-plan`)
  }

  const getQuestionText = (questionId: string | null) => {
    if (!questionId) return null
    const question = questions.find((q) => q.id === questionId)
    return question?.question
  }

  const handleExportCSV = async () => {
    const csvData = indicators.map((indicator) => ({
      Indicator: indicator.indicator_text,
      Question: getQuestionText(indicator.question_id) || "N/A",
      Metric: indicator.metric || "Not defined",
      DataSource: indicator.data_source || "Not defined",
      Selected: indicator.is_selected ? "Yes" : "No",
      Type: indicator.is_ai_generated ? "AI Generated" : "Custom",
    }))
    exportToCSV(csvData, ["Indicator", "Question", "Metric", "DataSource", "Selected", "Type"], "evaluation-indicators")
  }

  const handleExportMarkdown = async () => {
    let markdown = `# Evaluation Indicators\n\n`
    markdown += `**Program ID:** ${programId}\n\n`
    markdown += `**Total Indicators:** ${indicators.length}\n`
    markdown += `**Selected Indicators:** ${selectedIndicators.length}\n\n`
    markdown += `---\n\n`

    indicators.forEach((indicator, index) => {
      markdown += `## ${index + 1}. ${indicator.indicator_text}\n\n`
      const questionText = getQuestionText(indicator.question_id)
      if (questionText) {
        markdown += `**Related Question:** ${questionText}\n\n`
      }
      if (indicator.metric) {
        markdown += `**Metric:** ${indicator.metric}\n\n`
      }
      if (indicator.data_source) {
        markdown += `**Data Source:** ${indicator.data_source}\n\n`
      }
      markdown += `**Status:** ${indicator.is_selected ? "✓ Selected" : "Not selected"}\n\n`
      markdown += `---\n\n`
    })

    exportToMarkdown(markdown, "evaluation-indicators")
  }

  return (
    <div className="space-y-6" ref={contentRef}>
      <div className="flex justify-end no-print">
        <ExportButton
          moduleName="Evaluation Indicators"
          programName={programId}
          contentRef={contentRef}
          onExportCSV={handleExportCSV}
          onExportWord={handleExportMarkdown}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Module 4: Evaluation Indicator Creator</CardTitle>
          <CardDescription>Generate indicators to measure your evaluation questions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {indicators.length === 0 && (
            <div className="text-center py-8">
              <p className="text-slate-600 mb-4">No indicators yet</p>
              <Button onClick={handleGenerateIndicators} disabled={isGenerating || questions.length === 0}>
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating Indicators...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Indicators with AI
                  </>
                )}
              </Button>
              {questions.length === 0 && (
                <p className="text-sm text-amber-600 mt-2">Add evaluation questions first to generate indicators</p>
              )}
            </div>
          )}

          {indicators.length > 0 && (
            <>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">
                  Your Indicators ({indicators.length})
                  {selectedIndicators.length > 0 && (
                    <span className="text-blue-600 ml-2">• {selectedIndicators.length} selected</span>
                  )}
                </h3>
                <div className="flex gap-2">
                  {questions.length > 0 && (
                    <Button variant="outline" size="sm" onClick={handleGenerateIndicators} disabled={isGenerating}>
                      {isGenerating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-4 w-4" />
                          Generate More
                        </>
                      )}
                    </Button>
                  )}
                  {selectedIndicators.length > 0 && (
                    <Button size="sm" onClick={handleIdentifyMetrics} disabled={isIdentifyingMetrics}>
                      {isIdentifyingMetrics ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Identifying...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Identify Metrics & Sources
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                {indicators.map((indicator) => {
                  const questionText = getQuestionText(indicator.question_id)
                  return (
                    <div
                      key={indicator.id}
                      className={`p-4 rounded-lg border-2 ${
                        indicator.is_selected ? "bg-blue-50 border-blue-300" : "bg-slate-50 border-slate-200"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={indicator.is_selected}
                          onCheckedChange={() => handleToggleSelection(indicator.id, indicator.is_selected)}
                          className="mt-1"
                        />
                        <div className="flex-1 space-y-2">
                          <div>
                            <p className="font-medium">{indicator.indicator_text}</p>
                            {questionText && <p className="text-sm text-slate-600 mt-1">For: {questionText}</p>}
                          </div>

                          {indicator.metric && (
                            <div className="text-sm">
                              <span className="font-semibold text-green-700">Metric: </span>
                              <span className="text-slate-700">{indicator.metric}</span>
                            </div>
                          )}

                          {indicator.data_source && (
                            <div className="text-sm">
                              <span className="font-semibold text-purple-700">Data Source: </span>
                              <span className="text-slate-700">{indicator.data_source}</span>
                            </div>
                          )}

                          <div className="flex gap-2">
                            {indicator.is_ai_generated && (
                              <Badge variant="secondary" className="text-xs">
                                AI Generated
                              </Badge>
                            )}
                            {indicator.is_selected && <Badge className="text-xs bg-blue-600">Selected</Badge>}
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteIndicator(indicator.id)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {error && <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{error}</div>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add Your Own Indicator</CardTitle>
          <CardDescription>Add custom indicators specific to your evaluation needs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="question-select">Related Evaluation Question (Optional)</Label>
              <Select value={selectedQuestionId} onValueChange={setSelectedQuestionId}>
                <SelectTrigger id="question-select">
                  <SelectValue placeholder="Select a question..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No specific question</SelectItem>
                  {questions.map((question) => (
                    <SelectItem key={question.id} value={question.id}>
                      {question.question.substring(0, 80)}...
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-indicator">Indicator</Label>
              <Textarea
                id="new-indicator"
                value={newIndicator}
                onChange={(e) => setNewIndicator(e.target.value)}
                placeholder="e.g., Number of participants who complete the program"
                rows={3}
              />
            </div>
            <Button onClick={handleAddIndicator} disabled={isAdding || !newIndicator.trim()}>
              {isAdding ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Indicator
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {selectedIndicators.length > 0 && selectedIndicators.some((i) => i.metric && i.data_source) && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg text-blue-900 mb-1">Next Step: Evaluation Plan</h3>
                <p className="text-blue-700 text-sm">
                  Create a timeline for data collection based on your selected indicators
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
