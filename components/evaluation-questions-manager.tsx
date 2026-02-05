"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Loader2, Plus, Trash2, Sparkles, ArrowRight } from "lucide-react"
import { exportToCSV, exportToMarkdown } from "@/lib/export-utils"
import { ExportButton } from "@/components/export-button"

interface Question {
  id: string
  question: string
  is_custom: boolean
  created_at: string
  source_type?: string
  source_details?: { rationale?: string }
  audience_tags?: string[]
  approach_tags?: string[]
  standard_tags?: string[]
}

interface EvaluationQuestionsManagerProps {
  programId: string
  logicModel: any
  existingQuestions: Question[]
}

export default function EvaluationQuestionsManager({
  programId,
  logicModel,
  existingQuestions,
}: EvaluationQuestionsManagerProps) {
  const router = useRouter()
  const [questions, setQuestions] = useState<Question[]>(existingQuestions)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [newQuestion, setNewQuestion] = useState("")
  const [error, setError] = useState<string | null>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  const handleGenerateQuestions = async () => {
    setIsGenerating(true)
    setError(null)

    try {
      const response = await fetch(`/api/programs/${programId}/evaluation-questions/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logicModel }),
      })

      if (!response.ok) throw new Error("Failed to generate questions")

      const data = await response.json()
      setQuestions(data.questions)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleAddQuestion = async () => {
    if (!newQuestion.trim()) return

    setIsAdding(true)
    setError(null)

    try {
      const response = await fetch(`/api/programs/${programId}/evaluation-questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: newQuestion }),
      })

      if (!response.ok) throw new Error("Failed to add question")

      const data = await response.json()
      setQuestions([...questions, data.question])
      setNewQuestion("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsAdding(false)
    }
  }

  const handleDeleteQuestion = async (questionId: string) => {
    try {
      const response = await fetch(`/api/programs/${programId}/evaluation-questions/${questionId}`, {
        method: "DELETE",
      })

      if (!response.ok) throw new Error("Failed to delete question")

      setQuestions(questions.filter((q) => q.id !== questionId))
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    }
  }

  const handleContinue = () => {
    router.push(`/programs/${programId}/indicators`)
  }

  const handleExportCSV = async () => {
    console.log("[v0] handleExportCSV called, questions count:", questions.length)
    const csvData = questions.map((q, index) => ({
      Number: index + 1,
      Question: q.question,
      Type: q.is_custom ? "Custom" : "AI Generated",
      Created: new Date(q.created_at).toLocaleDateString(),
    }))
    console.log("[v0] CSV data prepared:", csvData.length, "rows")
    exportToCSV(csvData, ["Number", "Question", "Type", "Created"], "evaluation-questions")
    console.log("[v0] exportToCSV function completed")
  }

  const handleExportMarkdown = async () => {
    console.log("[v0] handleExportMarkdown called, questions count:", questions.length)
    let markdown = `# Evaluation Questions\n\n`
    markdown += `**Program ID:** ${programId}\n\n`
    markdown += `**Total Questions:** ${questions.length}\n\n`
    markdown += `---\n\n`

    questions.forEach((q, index) => {
      markdown += `## ${index + 1}. ${q.question}\n\n`
      markdown += `- **Type:** ${q.is_custom ? "Custom" : "AI Generated"}\n`
      markdown += `- **Created:** ${new Date(q.created_at).toLocaleDateString()}\n\n`
    })

    console.log("[v0] Markdown content prepared, length:", markdown.length)
    exportToMarkdown(markdown, "evaluation-questions")
    console.log("[v0] exportToMarkdown function completed")
  }

  return (
    <div className="space-y-6" ref={contentRef}>
      <div className="flex justify-end no-print">
        <ExportButton
          moduleName="Evaluation Questions"
          programName={programId}
          contentRef={contentRef}
          onExportCSV={handleExportCSV}
          onExportWord={handleExportMarkdown}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Module 3: Evaluation Question Development</CardTitle>
          <CardDescription>Generate questions using AI or add your own evaluation questions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {questions.length === 0 && (
            <div className="text-center py-8">
              <p className="text-slate-600 mb-4">No evaluation questions yet</p>
              <Button onClick={handleGenerateQuestions} disabled={isGenerating || !logicModel}>
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating Questions...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Questions with AI
                  </>
                )}
              </Button>
              {!logicModel && (
                <p className="text-sm text-amber-600 mt-2">Complete the logic model first to generate questions</p>
              )}
            </div>
          )}

          {questions.length > 0 && (
            <>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">Your Evaluation Questions ({questions.length})</h3>
                {logicModel && (
                  <Button variant="outline" size="sm" onClick={handleGenerateQuestions} disabled={isGenerating}>
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
              </div>

              <div className="space-y-3">
                {questions.map((question, index) => (
                  <div key={question.id} className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-start gap-2 mb-1">
                        <span className="font-semibold text-slate-700">{index + 1}.</span>
                        <p className="flex-1">{question.question}</p>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {!question.is_custom && (
                          <Badge variant="secondary" className="text-xs">
                            AI Generated
                          </Badge>
                        )}
                        {question.audience_tags?.map(tag => (
                          <Badge key={`aud-${tag}`} variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                            {tag}
                          </Badge>
                        ))}
                        {question.approach_tags?.map(tag => (
                          <Badge key={`app-${tag}`} variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                            {tag}
                          </Badge>
                        ))}
                        {question.standard_tags?.map(tag => (
                          <Badge key={`std-${tag}`} variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      {question.source_details?.rationale && (
                        <p className="text-xs text-muted-foreground mt-1 italic">
                          {question.source_details.rationale}
                        </p>
                      )}
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteQuestion(question.id)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            </>
          )}

          {error && <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{error}</div>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add Your Own Question</CardTitle>
          <CardDescription>Add custom evaluation questions specific to your program</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-question">Evaluation Question</Label>
              <Textarea
                id="new-question"
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                placeholder="e.g., To what extent did participants improve their leadership skills?"
                rows={3}
              />
            </div>
            <Button onClick={handleAddQuestion} disabled={isAdding || !newQuestion.trim()}>
              {isAdding ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Question
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {questions.length > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg text-blue-900 mb-1">Next Step: Indicators</h3>
                <p className="text-blue-700 text-sm">
                  Create indicators to measure and answer your evaluation questions
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
