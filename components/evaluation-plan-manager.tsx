"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Loader2, Calendar, Sparkles, ArrowRight, Download } from "lucide-react"
import { exportToWord } from "@/lib/export-utils"

interface Indicator {
  id: string
  indicator_text: string
  metric: string | null
  data_source: string | null
}

interface PlanItem {
  indicator_id: string
  indicator_text: string
  metric: string
  data_source: string
  collection_method: string
  timeline: string
  frequency: string
}

interface EvaluationPlanManagerProps {
  programId: string
  indicators: Indicator[]
  existingPlan: any
}

export default function EvaluationPlanManager({ programId, indicators, existingPlan }: EvaluationPlanManagerProps) {
  const router = useRouter()
  const [isGenerating, setIsGenerating] = useState(false)
  const [startDate, setStartDate] = useState(existingPlan?.start_date || "")
  const [endDate, setEndDate] = useState(existingPlan?.end_date || "")
  const [durationMonths, setDurationMonths] = useState(existingPlan?.duration_months || 12)
  const [planItems, setPlanItems] = useState<PlanItem[]>(existingPlan?.plan_data || [])
  const [error, setError] = useState<string | null>(null)

  const getMissingIndicators = () => {
    const plannedIndicatorIds = new Set(planItems.map((item) => item.indicator_id))
    return indicators.filter((ind) => !plannedIndicatorIds.has(ind.id))
  }

  const missingIndicators = getMissingIndicators()
  const coveragePercentage = indicators.length > 0 ? Math.round((planItems.length / indicators.length) * 100) : 0

  const handleGeneratePlan = async () => {
    if (!startDate || !endDate) {
      setError("Please provide start and end dates")
      return
    }

    setIsGenerating(true)
    setError(null)

    try {
      const response = await fetch(`/api/programs/${programId}/evaluation-plan/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          indicators,
          startDate,
          endDate,
          durationMonths,
        }),
      })

      if (!response.ok) throw new Error("Failed to generate evaluation plan")

      const data = await response.json()

      console.log("[v0] Generated plan items:", data.planItems.length, "for", indicators.length, "indicators")

      if (data.planItems.length < indicators.length) {
        console.warn("[v0] Not all indicators are in the plan. Missing:", indicators.length - data.planItems.length)
      }

      setPlanItems(data.planItems)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSavePlan = async () => {
    try {
      const response = await fetch(`/api/programs/${programId}/evaluation-plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate,
          endDate,
          durationMonths,
          planData: planItems,
        }),
      })

      if (!response.ok) throw new Error("Failed to save evaluation plan")

      alert("Evaluation plan saved successfully!")
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    }
  }

  const buildPlanMarkdown = () => {
    let md = `# Evaluation Plan\n\n`
    md += `**Evaluation Period:** ${startDate ? new Date(startDate).toLocaleDateString() : "TBD"} - ${endDate ? new Date(endDate).toLocaleDateString() : "TBD"}\n`
    md += `**Duration:** ${durationMonths} months\n`
    md += `**Total Indicators:** ${planItems.length}\n\n`
    md += `---\n\n`

    const groups = groupByTimeline()
    for (const [timeline, items] of Object.entries(groups)) {
      md += `## ${timeline}\n\n`
      items.forEach((item, i) => {
        md += `### ${i + 1}. ${item.indicator_text}\n\n`
        md += `- **Metric:** ${item.metric}\n`
        md += `- **Data Source:** ${item.data_source}\n`
        md += `- **Collection Method:** ${item.collection_method}\n`
        md += `- **Frequency:** ${item.frequency}\n\n`
      })
      md += `---\n\n`
    }
    return md
  }

  const handleExportWord = () => {
    const md = buildPlanMarkdown()
    exportToWord(md, "evaluation-plan")
  }

  const handleExportPDF = () => {
    const groups = groupByTimeline()

    let tableRows = ""
    for (const [timeline, items] of Object.entries(groups)) {
      items.forEach((item, i) => {
        tableRows += `<tr>
          ${i === 0 ? `<td rowspan="${items.length}" style="font-weight:bold;background:#eff6ff;vertical-align:top;">${timeline}</td>` : ""}
          <td>${item.indicator_text}</td>
          <td>${item.metric}</td>
          <td>${item.data_source}</td>
          <td>${item.collection_method}</td>
          <td>${item.frequency}</td>
        </tr>`
      })
    }

    const printWindow = window.open("", "_blank")
    if (!printWindow) return

    printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
<title>Evaluation Plan</title>
<style>
  @page { size: landscape; margin: 0.5in; }
  body { font-family: Calibri, sans-serif; margin: 0; padding: 20px; }
  h1 { font-size: 20px; color: #1a1a1a; border-bottom: 2px solid #2563eb; padding-bottom: 6px; }
  .meta { color: #475569; font-size: 13px; margin-bottom: 16px; }
  table { border-collapse: collapse; width: 100%; font-size: 11px; }
  th { background: #1e40af; color: white; padding: 8px 10px; text-align: left; font-weight: 600; }
  td { border: 1px solid #cbd5e1; padding: 6px 10px; vertical-align: top; }
  tr:nth-child(even) td { background: #f8fafc; }
</style>
</head>
<body>
  <h1>Evaluation Plan</h1>
  <div class="meta">
    <b>Period:</b> ${startDate ? new Date(startDate).toLocaleDateString() : "TBD"} - ${endDate ? new Date(endDate).toLocaleDateString() : "TBD"} |
    <b>Duration:</b> ${durationMonths} months |
    <b>Indicators:</b> ${planItems.length}
  </div>
  <table>
    <thead>
      <tr>
        <th>Timeline</th>
        <th>Indicator</th>
        <th>Metric</th>
        <th>Data Source</th>
        <th>Collection Method</th>
        <th>Frequency</th>
      </tr>
    </thead>
    <tbody>${tableRows}</tbody>
  </table>
  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); window.close(); }, 300);
    };
  <\/script>
</body>
</html>`)
    printWindow.document.close()
  }

  const handleContinue = () => {
    router.push(`/programs/${programId}/data-collection-tools`)
  }

  const groupByTimeline = () => {
    const grouped: Record<string, PlanItem[]> = {}
    planItems.forEach((item) => {
      if (!grouped[item.timeline]) {
        grouped[item.timeline] = []
      }
      grouped[item.timeline].push(item)
    })
    return grouped
  }

  const timelineGroups = groupByTimeline()

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Module 5: Evaluation Planner</CardTitle>
          <CardDescription>Set your evaluation timeline and generate a data collection plan</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="start-date">Start Date</Label>
              <Input id="start-date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date">End Date</Label>
              <Input id="end-date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (months)</Label>
              <Input
                id="duration"
                type="number"
                min="1"
                max="60"
                value={durationMonths}
                onChange={(e) => setDurationMonths(Number.parseInt(e.target.value))}
              />
            </div>
          </div>

          {indicators.length === 0 && (
            <div className="text-center py-8 bg-amber-50 rounded-lg border border-amber-200">
              <p className="text-amber-800">
                No indicators selected. Please go back and select indicators to create an evaluation plan.
              </p>
            </div>
          )}

          {indicators.length > 0 && planItems.length === 0 && (
            <div className="text-center py-8">
              <p className="text-slate-600 mb-4">
                Ready to generate your evaluation plan with {indicators.length} selected indicators
              </p>
              {(!startDate || !endDate) && (
                <p className="text-sm text-amber-600 mb-3">
                  Please set start and end dates above before generating
                </p>
              )}
              <Button 
                onClick={handleGeneratePlan} 
                disabled={isGenerating || !startDate || !endDate}
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating Plan...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Evaluation Plan
                  </>
                )}
              </Button>
            </div>
          )}

          {error && <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{error}</div>}

          {planItems.length > 0 && missingIndicators.length > 0 && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-bold mt-0.5">
                  !
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-amber-900 mb-1">
                    Incomplete Coverage: {missingIndicators.length} indicator{missingIndicators.length !== 1 ? "s" : ""}{" "}
                    not in plan ({coveragePercentage}% coverage)
                  </h4>
                  <p className="text-sm text-amber-800 mb-2">
                    The following indicators are missing from your evaluation plan:
                  </p>
                  <ul className="text-sm text-amber-800 space-y-1 ml-4 list-disc">
                    {missingIndicators.map((ind) => (
                      <li key={ind.id}>{ind.indicator_text}</li>
                    ))}
                  </ul>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 border-amber-300 bg-white hover:bg-amber-50"
                    onClick={handleGeneratePlan}
                    disabled={isGenerating}
                  >
                    Regenerate Plan to Include All Indicators
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {planItems.length > 0 && (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Your Evaluation Plan</CardTitle>
                  <CardDescription>Data collection schedule organized by timeline</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleExportPDF}>
                    <Download className="h-4 w-4 mr-1" />
                    PDF
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleExportWord}>
                    <Download className="h-4 w-4 mr-1" />
                    Word
                  </Button>
                  <Button variant="outline" onClick={handleGeneratePlan} disabled={isGenerating}>
                    {isGenerating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Regenerating...
                      </>
                    ) : (
                      "Regenerate Plan"
                    )}
                  </Button>
                  <Button onClick={handleSavePlan}>Save Plan</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {Object.entries(timelineGroups).map(([timeline, items]) => (
                <div key={timeline} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-blue-600" />
                    <h3 className="font-semibold text-lg text-blue-900">{timeline}</h3>
                    <Badge variant="secondary">{items.length} indicators</Badge>
                  </div>
                  <div className="space-y-2 ml-7">
                    {items.map((item, index) => (
                      <div key={index} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="space-y-2">
                          <p className="font-medium">{item.indicator_text}</p>
                          <div className="grid gap-2 text-sm">
                            <div className="flex gap-2">
                              <span className="font-semibold text-slate-600 min-w-[140px]">Metric:</span>
                              <span className="text-slate-700">{item.metric}</span>
                            </div>
                            <div className="flex gap-2">
                              <span className="font-semibold text-slate-600 min-w-[140px]">Data Source:</span>
                              <span className="text-slate-700">{item.data_source}</span>
                            </div>
                            <div className="flex gap-2">
                              <span className="font-semibold text-slate-600 min-w-[140px]">Collection Method:</span>
                              <span className="text-slate-700">{item.collection_method}</span>
                            </div>
                            <div className="flex gap-2">
                              <span className="font-semibold text-slate-600 min-w-[140px]">Frequency:</span>
                              <Badge variant="outline">{item.frequency}</Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="py-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg text-blue-900 mb-1">Next Step: Data Collection Tools</h3>
                  <p className="text-blue-700 text-sm">
                    Generate surveys, interview guides, and other data collection instruments
                  </p>
                </div>
                <Button onClick={handleContinue}>
                  Continue <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
