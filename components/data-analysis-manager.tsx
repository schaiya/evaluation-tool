"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, Upload, BarChart3, FileText, CheckCircle2, Trash2 } from "lucide-react"
import * as RechartsPrimitive from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import * as XLSX from "xlsx"

interface Question {
  id: string
  question: string
}

interface UploadedData {
  id: string
  file_name: string
  file_type: string
  data_content: any
  uploaded_at: string
}

interface AnalysisResult {
  id: string
  analysis_type: string
  analysis_plan: any
  results: any
  created_at: string
}

interface DataProfile {
  summary: string
  files: Array<{
    fileName: string
    fileType: string
    recordCount: number
    fields: Array<{
      name: string
      type: string
      description?: string
      sampleValues: any[]
      uniqueCount?: number
      nullCount?: number
    }>
  }>
  suggestedQuestions: Array<{
    question: string
    relevantFields: string[]
    rationale: string
  }>
}

interface DataAnalysisManagerProps {
  programId: string
  questions: Question[]
  uploadedData: UploadedData[]
  analysisResults: AnalysisResult[]
  existingReport: any
}

function FindingVisualization({ visualization }: { visualization: any }) {
  if (!visualization || !visualization.data || !Array.isArray(visualization.data)) {
    return null
  }

  const { type, title, description, data, xAxisKey, yAxisKey } = visualization

  if (data.length === 0) {
    return null
  }

  const COLORS = [
    "hsl(var(--chart-1))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
    "hsl(var(--chart-5))",
  ]

  const chartConfig = {
    [yAxisKey || "value"]: {
      label: yAxisKey || "Value",
      color: "hsl(var(--chart-1))",
    },
  }

  return (
    <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
      <div>
        <p className="font-semibold text-sm">{title}</p>
        {description && <p className="text-xs text-slate-600 mt-1">{description}</p>}
      </div>

      <ChartContainer config={chartConfig} className="h-[250px]">
        {type === "bar" && (
          <RechartsPrimitive.BarChart data={data}>
            <RechartsPrimitive.CartesianGrid strokeDasharray="3 3" />
            <RechartsPrimitive.XAxis dataKey={xAxisKey || "name"} />
            <RechartsPrimitive.YAxis />
            <ChartTooltip content={<ChartTooltipContent />} />
            <RechartsPrimitive.Legend />
            <RechartsPrimitive.Bar dataKey={yAxisKey || "value"} fill="var(--color-value)" />
          </RechartsPrimitive.BarChart>
        )}

        {type === "line" && (
          <RechartsPrimitive.LineChart data={data}>
            <RechartsPrimitive.CartesianGrid strokeDasharray="3 3" />
            <RechartsPrimitive.XAxis dataKey={xAxisKey || "name"} />
            <RechartsPrimitive.YAxis />
            <ChartTooltip content={<ChartTooltipContent />} />
            <RechartsPrimitive.Legend />
            <RechartsPrimitive.Line type="monotone" dataKey={yAxisKey || "value"} stroke="var(--color-value)" />
          </RechartsPrimitive.LineChart>
        )}

        {type === "area" && (
          <RechartsPrimitive.AreaChart data={data}>
            <RechartsPrimitive.CartesianGrid strokeDasharray="3 3" />
            <RechartsPrimitive.XAxis dataKey={xAxisKey || "name"} />
            <RechartsPrimitive.YAxis />
            <ChartTooltip content={<ChartTooltipContent />} />
            <RechartsPrimitive.Legend />
            <RechartsPrimitive.Area
              type="monotone"
              dataKey={yAxisKey || "value"}
              fill="var(--color-value)"
              stroke="var(--color-value)"
            />
          </RechartsPrimitive.AreaChart>
        )}

        {type === "pie" && (
          <RechartsPrimitive.PieChart>
            <ChartTooltip content={<ChartTooltipContent />} />
            <RechartsPrimitive.Pie
              data={data}
              dataKey={yAxisKey || "value"}
              nameKey={xAxisKey || "name"}
              cx="50%"
              cy="50%"
              outerRadius={80}
            >
              {data.map((entry, index) => (
                <RechartsPrimitive.Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </RechartsPrimitive.Pie>
            <RechartsPrimitive.Legend />
          </RechartsPrimitive.PieChart>
        )}
      </ChartContainer>
    </div>
  )
}

export default function DataAnalysisManager({
  programId,
  questions,
  uploadedData: initialUploadedData,
  analysisResults: initialAnalysisResults,
  existingReport,
}: DataAnalysisManagerProps) {
  const [uploadedData, setUploadedData] = useState<UploadedData[]>(initialUploadedData)
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>(initialAnalysisResults)
  const [report, setReport] = useState(existingReport)
  const [isUploading, setIsUploading] = useState(false)
  const [isProposingPlan, setIsProposingPlan] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isGeneratingReport, setIsGeneratingReport] = useState(false)
  const [proposedPlan, setProposedPlan] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [customQuestion, setCustomQuestion] = useState("")
  const [isAskingQuestion, setIsAskingQuestion] = useState(false)
  const [customAnswers, setCustomAnswers] = useState<any[]>([])
  const [dataProfile, setDataProfile] = useState<DataProfile | null>(null)
  const [isProfilingData, setIsProfilingData] = useState(false)

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    setIsUploading(true)
    setError(null)

    try {
      const newUploadedData: UploadedData[] = []

      // Process each file
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const fileName = file.name.toLowerCase()
        let dataContent

        if (fileName.endsWith(".json")) {
          const text = await file.text()
          dataContent = JSON.parse(text)
        } else if (fileName.endsWith(".csv")) {
          const text = await file.text()
          // Simple CSV parsing
          const lines = text.split("\n")
          const headers = lines[0].split(",")
          dataContent = lines.slice(1).map((line) => {
            const values = line.split(",")
            const obj: any = {}
            headers.forEach((header, index) => {
              obj[header.trim()] = values[index]?.trim()
            })
            return obj
          })
        } else if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
          try {
            const arrayBuffer = await file.arrayBuffer()

            // Validate file is not empty
            if (arrayBuffer.byteLength === 0) {
              throw new Error(`Excel file ${file.name} is empty`)
            }

            const workbook = XLSX.read(arrayBuffer, {
              type: "buffer",
              cellDates: true,
              raw: false, // Convert to formatted strings
            })

            // Validate workbook has sheets
            if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
              throw new Error(`Excel file ${file.name} contains no worksheets`)
            }

            console.log("[v0] Excel SheetNames:", workbook.SheetNames)

            // Get the first actual worksheet (skip internal sheets)
            let worksheet = null
            let sheetName = null

            for (const name of workbook.SheetNames) {
              // Skip internal sheets that start with special characters or contain XML structure
              if (!name.startsWith("_") && !name.includes("[Content_Types]") && !name.startsWith("PK-")) {
                worksheet = workbook.Sheets[name]
                sheetName = name
                console.log("[v0] Using sheet:", name)
                break
              }
            }

            if (!worksheet) {
              throw new Error(
                `Excel file ${file.name} contains no readable worksheets. All sheets appear to be internal/system sheets.`,
              )
            }

            // Convert to JSON
            const jsonData = XLSX.utils.sheet_to_json(worksheet, {
              defval: "", // Default value for empty cells
              raw: false, // Convert to formatted strings
              dateNF: "yyyy-mm-dd", // Date format
            })

            console.log("[v0] Parsed rows:", jsonData.length)

            // Validate that we got actual data
            if (!jsonData || jsonData.length === 0) {
              throw new Error(`Excel file ${file.name} appears to be empty or contains no readable data`)
            }

            // Validate column names are not corrupted
            const firstRow = jsonData[0]
            const keys = Object.keys(firstRow)
            console.log("[v0] Column names:", keys)

            // Check for binary/corrupted data in column names
            const hasCriticalCorruption = keys.some((key) => {
              // Check for null bytes, control characters, or suspiciously long names
              return key.includes("\0") || key.startsWith("PK-") || key.includes("[Content_Types]")
            })

            if (hasCriticalCorruption) {
              throw new Error(
                `Excel file ${file.name} appears corrupted. Please try opening and re-saving the file in Excel.`,
              )
            }

            dataContent = jsonData
          } catch (xlsxError) {
            console.error("[v0] Excel parsing error:", xlsxError)
            throw new Error(
              `Failed to parse Excel file ${file.name}: ${xlsxError instanceof Error ? xlsxError.message : "Unknown error"}. ` +
                `Please ensure the file is a valid Excel format (.xlsx or .xls) and is not password-protected or corrupted.`,
            )
          }
        } else if (fileName.endsWith(".docx") || fileName.endsWith(".doc")) {
          // For Word files, extract text content
          // In a production app, you'd use a library like 'mammoth' for proper parsing
          const text = await file.text()
          dataContent = {
            type: "document",
            content: text,
            fileName: file.name,
            uploadedAt: new Date().toISOString(),
          }
        } else {
          throw new Error(
            `Unsupported file type for ${file.name}. Please upload JSON, CSV, Excel (.xlsx, .xls), or Word (.docx, .doc) files.`,
          )
        }

        const response = await fetch(`/api/programs/${programId}/data-analysis/upload`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: file.name,
            fileType: file.type,
            dataContent,
          }),
        })

        if (!response.ok) throw new Error(`Failed to upload ${file.name}`)

        const data = await response.json()
        newUploadedData.push(data.uploadedData)
      }

      setUploadedData([...newUploadedData, ...uploadedData])
      // Reset the file input
      event.target.value = ""
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsUploading(false)
    }
  }

  const handleProposePlan = async () => {
    setIsProposingPlan(true)
    setError(null)

    try {
      const response = await fetch(`/api/programs/${programId}/data-analysis/propose-plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uploadedData,
          questions,
        }),
      })

      if (!response.ok) throw new Error("Failed to propose analysis plan")

      const data = await response.json()
      setProposedPlan(data.plan)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsProposingPlan(false)
    }
  }

  const handleConductAnalysis = async () => {
    if (!proposedPlan) return

    setIsAnalyzing(true)
    setError(null)

    try {
      const response = await fetch(`/api/programs/${programId}/data-analysis/conduct`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: proposedPlan,
          uploadedData,
          questions,
        }),
      })

      if (!response.ok) throw new Error("Failed to conduct analysis")

      const data = await response.json()
      setAnalysisResults([data.analysisResult, ...analysisResults])
      setProposedPlan(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleGenerateReport = async () => {
    setIsGeneratingReport(true)
    setError(null)

    try {
      const response = await fetch(`/api/programs/${programId}/data-analysis/generate-report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysisResults,
          questions,
        }),
      })

      if (!response.ok) throw new Error("Failed to generate report")

      const data = await response.json()
      setReport(data.report)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsGeneratingReport(false)
    }
  }

  const handleDeleteData = async (dataId: string) => {
    try {
      const response = await fetch(`/api/programs/${programId}/data-analysis/upload/${dataId}`, {
        method: "DELETE",
      })

      if (!response.ok) throw new Error("Failed to delete data")

      setUploadedData(uploadedData.filter((d) => d.id !== dataId))
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    }
  }

  const handleAskQuestion = async () => {
    if (!customQuestion.trim()) return

    setIsAskingQuestion(true)
    setError(null)

    try {
      console.log("[v0] Starting question analysis")
      console.log("[v0] Question:", customQuestion)
      console.log("[v0] Uploaded data count:", uploadedData.length)

      const response = await fetch(`/api/programs/${programId}/data-analysis/ask-question`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: customQuestion,
          uploadedData,
        }),
      })

      console.log("[v0] Response status:", response.status)
      console.log("[v0] Response ok:", response.ok)

      if (!response.ok) {
        const errorData = await response.json()
        console.error("[v0] API error response:", errorData)
        throw new Error(errorData.error || "Failed to analyze question")
      }

      const data = await response.json()
      console.log("[v0] Successfully received answer")
      setCustomAnswers([data.answer, ...customAnswers])
      setCustomQuestion("")
    } catch (err) {
      console.error("[v0] Error in handleAskQuestion:", err)
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsAskingQuestion(false)
    }
  }

  const handleProfileData = async () => {
    setIsProfilingData(true)
    setError(null)

    try {
      const response = await fetch(`/api/programs/${programId}/data-analysis/profile-data`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uploadedData,
        }),
      })

      if (!response.ok) throw new Error("Failed to profile data")

      const data = await response.json()
      setDataProfile(data.profile)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsProfilingData(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Module 7: Data Analysis</CardTitle>
          <CardDescription>
            Upload your collected data and conduct analysis to answer evaluation questions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="font-semibold mb-3">Step 1: Upload Data</h3>
            <div className="flex items-center gap-4">
              <input
                type="file"
                accept=".json,.csv,.xlsx,.xls,.docx,.doc"
                multiple
                onChange={handleFileUpload}
                disabled={isUploading}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload">
                <Button asChild disabled={isUploading}>
                  <span>
                    {isUploading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Upload Data Files
                      </>
                    )}
                  </span>
                </Button>
              </label>
              <p className="text-sm text-slate-600">Select one or multiple files (JSON, CSV, Excel, Word)</p>
            </div>

            {uploadedData.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-sm font-semibold">Uploaded Files ({uploadedData.length})</p>
                {uploadedData.map((data) => (
                  <div
                    key={data.id}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded border border-slate-200"
                  >
                    <div>
                      <p className="font-medium">{data.file_name}</p>
                      <p className="text-xs text-slate-600">Uploaded {new Date(data.uploaded_at).toLocaleString()}</p>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => handleDeleteData(data.id)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {uploadedData.length > 0 && !dataProfile && (
            <div>
              <h3 className="font-semibold mb-3">Step 2: Understand Your Data</h3>
              <p className="text-sm text-slate-600 mb-3">
                Analyze your uploaded data to understand what information is available and what questions can be
                answered.
              </p>
              <Button onClick={handleProfileData} disabled={isProfilingData}>
                {isProfilingData ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing Data Structure...
                  </>
                ) : (
                  <>
                    <BarChart3 className="mr-2 h-4 w-4" />
                    Analyze Data Structure
                  </>
                )}
              </Button>
            </div>
          )}

          {dataProfile && (
            <Card className="bg-purple-50 border-purple-200">
              <CardHeader>
                <CardTitle className="text-lg">Data Profile & Insights</CardTitle>
                <CardDescription>Understanding what your data contains</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-white rounded-lg border border-purple-200">
                  <p className="font-semibold text-purple-900 mb-2">Dataset Overview</p>
                  <p className="text-sm text-slate-700">{dataProfile.summary}</p>
                  {dataProfile.files && dataProfile.files.length > 0 && (
                    <p className="text-xs text-slate-600 mt-2">
                      Total Records: {dataProfile.files.reduce((sum, file) => sum + file.recordCount, 0)}
                    </p>
                  )}
                </div>

                {dataProfile.files && dataProfile.files.length > 0 && (
                  <div className="space-y-4">
                    <p className="font-semibold text-sm">Available Data by File:</p>
                    {dataProfile.files.map((file, fileIndex) => (
                      <div key={fileIndex} className="space-y-2">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm text-purple-900">{file.fileName}</p>
                          <Badge variant="outline" className="text-xs">
                            {file.recordCount} records
                          </Badge>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {file.fields.map((field, fieldIndex) => (
                            <div key={fieldIndex} className="p-3 bg-white rounded border border-purple-200">
                              <p className="font-medium text-sm text-purple-900">{field.name}</p>
                              <p className="text-xs text-slate-600">Type: {field.type}</p>
                              {field.description && (
                                <p className="text-xs text-slate-500 italic">{field.description}</p>
                              )}
                              {field.uniqueCount && (
                                <p className="text-xs text-slate-600">Unique values: {field.uniqueCount}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {dataProfile.suggestedQuestions && dataProfile.suggestedQuestions.length > 0 && (
                  <div className="space-y-3">
                    <p className="font-semibold text-sm">AI-Suggested Evaluation Questions:</p>
                    <p className="text-xs text-slate-600">
                      Based on your data, here are questions that can be answered with analysis:
                    </p>
                    {dataProfile.suggestedQuestions.map((sq, index) => (
                      <div key={index} className="p-4 bg-white rounded-lg border border-purple-300 space-y-2">
                        <p className="font-semibold text-purple-900">{sq.question}</p>
                        <p className="text-sm text-slate-700 italic">{sq.rationale}</p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          <span className="text-xs text-slate-600">Relevant fields:</span>
                          {sq.relevantFields.map((field, fIndex) => (
                            <Badge key={fIndex} variant="secondary" className="text-xs">
                              {field}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="pt-2 border-t border-purple-200">
                  <p className="text-sm text-slate-600 mb-2">
                    You can now proceed with the suggested questions or add your own evaluation questions below.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {dataProfile && !proposedPlan && (
            <div>
              <h3 className="font-semibold mb-3">Step 3: Propose Analysis Plan</h3>
              <p className="text-sm text-slate-600 mb-3">
                Based on your data and evaluation questions, we'll create a detailed analysis plan.
              </p>
              <Button onClick={handleProposePlan} disabled={isProposingPlan}>
                {isProposingPlan ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Proposing Plan...
                  </>
                ) : (
                  <>
                    <BarChart3 className="mr-2 h-4 w-4" />
                    Propose Analysis Methods
                  </>
                )}
              </Button>
            </div>
          )}

          {proposedPlan && (
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader>
                <CardTitle className="text-lg">Proposed Analysis Plan</CardTitle>
                <CardDescription>Review and confirm the analysis approach</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {proposedPlan.methods?.map((method: any, index: number) => (
                    <div key={index} className="p-4 bg-white rounded border border-blue-200 space-y-3">
                      <div>
                        <p className="font-semibold text-blue-900">{method.method_name}</p>
                        <p className="text-sm text-slate-700 mt-1">{method.description}</p>
                      </div>

                      {method.evaluation_questions && method.evaluation_questions.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-xs font-semibold text-slate-600 uppercase">Addresses Questions:</p>
                          <ul className="space-y-1">
                            {method.evaluation_questions.map((question: string, qIndex: number) => (
                              <li key={qIndex} className="text-sm text-slate-700 pl-3 border-l-2 border-blue-300">
                                {question}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {method.data_sources && method.data_sources.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-xs font-semibold text-slate-600 uppercase">Data Sources:</p>
                          <div className="flex flex-wrap gap-1">
                            {method.data_sources.map((source: string, sIndex: number) => (
                              <Badge key={sIndex} variant="secondary" className="text-xs">
                                {source}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {method.expected_insights && (
                        <div className="space-y-1">
                          <p className="text-xs font-semibold text-slate-600 uppercase">Expected Insights:</p>
                          <p className="text-sm text-slate-700 italic">{method.expected_insights}</p>
                        </div>
                      )}

                      <div className="flex gap-2 pt-2 border-t border-slate-200">
                        <Badge variant="outline">{method.type}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleConductAnalysis} disabled={isAnalyzing}>
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Confirm & Conduct Analysis
                      </>
                    )}
                  </Button>
                  <Button variant="outline" onClick={() => setProposedPlan(null)}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {error && <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{error}</div>}
        </CardContent>
      </Card>

      {uploadedData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Ask Questions About Your Data</CardTitle>
            <CardDescription>
              Ask specific questions about your data to get instant AI-powered analysis and insights
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <textarea
                value={customQuestion}
                onChange={(e) => setCustomQuestion(e.target.value)}
                placeholder="e.g., What is the average satisfaction score? What trends do you see in the data? How many participants completed the program?"
                className="flex-1 min-h-[80px] rounded-md border border-slate-300 p-3 text-sm resize-none"
                disabled={isAskingQuestion}
              />
            </div>
            <Button onClick={handleAskQuestion} disabled={isAskingQuestion || !customQuestion.trim()}>
              {isAskingQuestion ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                "Ask Question"
              )}
            </Button>

            {customAnswers.length > 0 && (
              <div className="space-y-4 mt-6">
                <p className="font-semibold text-sm">Answers & Insights:</p>
                {customAnswers.map((answer, index) => (
                  <div key={index} className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
                    <div>
                      <p className="font-semibold text-slate-900">Q: {answer.question}</p>
                      <p className="text-sm text-slate-600 mt-1">{new Date(answer.created_at).toLocaleString()}</p>
                    </div>
                    <div className="p-3 bg-white rounded border border-slate-300">
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{answer.answer}</p>
                    </div>
                    {answer.visualization && <FindingVisualization visualization={answer.visualization} />}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {analysisResults.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-lg">Analysis Results ({analysisResults.length})</CardTitle>
                <CardDescription>Findings from your data analysis</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analysisResults.map((result) => (
                <Card key={result.id} className="bg-slate-50">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{result.analysis_type}</CardTitle>
                        <CardDescription>Completed {new Date(result.created_at).toLocaleString()}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {result.results.findings?.map((finding: any, index: number) => (
                        <div key={index} className="p-3 bg-white rounded border border-slate-200 space-y-2">
                          <p className="font-semibold text-slate-900">{finding.title}</p>
                          <p className="text-sm text-slate-700 mt-1">{finding.description}</p>
                          {finding.key_points && (
                            <ul className="mt-2 ml-4 text-sm text-slate-600 space-y-1">
                              {finding.key_points.map((point: string, pIndex: number) => (
                                <li key={pIndex}>• {point}</li>
                              ))}
                            </ul>
                          )}
                          {finding.visualization && <FindingVisualization visualization={finding.visualization} />}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {!report && (
              <Button onClick={handleGenerateReport} disabled={isGeneratingReport} className="w-full">
                {isGeneratingReport ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating Report...
                  </>
                ) : (
                  <>
                    <FileText className="mr-2 h-4 w-4" />
                    Generate Evaluation Report
                  </>
                )}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {report && (
        <Card className="bg-green-50 border-green-200">
          <CardHeader>
            <CardTitle>Module 8: Evaluation Report</CardTitle>
            <CardDescription>Comprehensive narrative report of your evaluation findings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none">
              <div className="p-6 bg-white rounded-lg border border-green-200 whitespace-pre-wrap">
                {report.report_content}
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Button onClick={handleGenerateReport} disabled={isGeneratingReport}>
                {isGeneratingReport ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Regenerating...
                  </>
                ) : (
                  "Regenerate Report"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
