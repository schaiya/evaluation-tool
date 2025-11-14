"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function ProgramClarificationForm() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [programName, setProgramName] = useState("")
  const [programDescription, setProgramDescription] = useState("")
  const [narrativeDescription, setNarrativeDescription] = useState("")

  // Manual input state
  const [inputs, setInputs] = useState<string[]>([""])
  const [activities, setActivities] = useState<string[]>([""])
  const [shortTermOutcomes, setShortTermOutcomes] = useState<string[]>([""])
  const [midTermOutcomes, setMidTermOutcomes] = useState<string[]>([""])
  const [longTermOutcomes, setLongTermOutcomes] = useState<string[]>([""])
  const [impacts, setImpacts] = useState<string[]>([""])

  const handleNarrativeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/programs/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          programName,
          programDescription,
          narrativeDescription,
        }),
      })

      if (!response.ok) throw new Error("Failed to extract program elements")

      const data = await response.json()
      router.push(`/programs/${data.programId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/programs/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          programName,
          programDescription,
          inputs: inputs.filter((i) => i.trim()),
          activities: activities.filter((a) => a.trim()),
          shortTermOutcomes: shortTermOutcomes.filter((o) => o.trim()),
          midTermOutcomes: midTermOutcomes.filter((o) => o.trim()),
          longTermOutcomes: longTermOutcomes.filter((o) => o.trim()),
          impacts: impacts.filter((i) => i.trim()),
        }),
      })

      if (!response.ok) throw new Error("Failed to create program")

      const data = await response.json()
      router.push(`/programs/${data.programId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const addField = (setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    setter((prev) => [...prev, ""])
  }

  const updateField = (setter: React.Dispatch<React.SetStateAction<string[]>>, index: number, value: string) => {
    setter((prev) => {
      const updated = [...prev]
      updated[index] = value
      return updated
    })
  }

  const removeField = (setter: React.Dispatch<React.SetStateAction<string[]>>, index: number) => {
    setter((prev) => prev.filter((_, i) => i !== index))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Module 1: Program Clarification</CardTitle>
        <CardDescription>Choose how you'd like to define your program</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="narrative">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="narrative">AI-Assisted (Narrative)</TabsTrigger>
            <TabsTrigger value="manual">Manual Input</TabsTrigger>
          </TabsList>

          <TabsContent value="narrative">
            <form onSubmit={handleNarrativeSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="program-name">Program Name *</Label>
                <Input
                  id="program-name"
                  value={programName}
                  onChange={(e) => setProgramName(e.target.value)}
                  placeholder="e.g., Youth Leadership Development Program"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="program-description">Brief Description</Label>
                <Input
                  id="program-description"
                  value={programDescription}
                  onChange={(e) => setProgramDescription(e.target.value)}
                  placeholder="One-line summary of your program"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="narrative">Narrative Description *</Label>
                <Textarea
                  id="narrative"
                  value={narrativeDescription}
                  onChange={(e) => setNarrativeDescription(e.target.value)}
                  placeholder="Describe your program in detail. Include what resources you use (inputs), what activities you conduct, what changes you expect to see (outcomes), and the ultimate impact you hope to achieve..."
                  rows={10}
                  required
                />
                <p className="text-sm text-slate-500">
                  Our AI will extract inputs, activities, outcomes, and impacts from your description
                </p>
              </div>

              {error && <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{error}</div>}

              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? "Extracting Program Elements..." : "Extract & Continue"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="manual">
            <form onSubmit={handleManualSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="manual-program-name">Program Name *</Label>
                <Input
                  id="manual-program-name"
                  value={programName}
                  onChange={(e) => setProgramName(e.target.value)}
                  placeholder="e.g., Youth Leadership Development Program"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="manual-program-description">Brief Description</Label>
                <Input
                  id="manual-program-description"
                  value={programDescription}
                  onChange={(e) => setProgramDescription(e.target.value)}
                  placeholder="One-line summary of your program"
                />
              </div>

              <div className="space-y-4">
                <div>
                  <Label>Inputs (Resources)</Label>
                  {inputs.map((input, index) => (
                    <div key={index} className="flex gap-2 mt-2">
                      <Input
                        value={input}
                        onChange={(e) => updateField(setInputs, index, e.target.value)}
                        placeholder="e.g., Trained facilitators, curriculum materials"
                      />
                      {inputs.length > 1 && (
                        <Button type="button" variant="outline" onClick={() => removeField(setInputs, index)}>
                          Remove
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button type="button" variant="outline" onClick={() => addField(setInputs)} className="mt-2">
                    Add Input
                  </Button>
                </div>

                <div>
                  <Label>Activities</Label>
                  {activities.map((activity, index) => (
                    <div key={index} className="flex gap-2 mt-2">
                      <Input
                        value={activity}
                        onChange={(e) => updateField(setActivities, index, e.target.value)}
                        placeholder="e.g., Weekly leadership workshops"
                      />
                      {activities.length > 1 && (
                        <Button type="button" variant="outline" onClick={() => removeField(setActivities, index)}>
                          Remove
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button type="button" variant="outline" onClick={() => addField(setActivities)} className="mt-2">
                    Add Activity
                  </Button>
                </div>

                <div>
                  <Label>Short-term Outcomes</Label>
                  {shortTermOutcomes.map((outcome, index) => (
                    <div key={index} className="flex gap-2 mt-2">
                      <Input
                        value={outcome}
                        onChange={(e) => updateField(setShortTermOutcomes, index, e.target.value)}
                        placeholder="e.g., Increased leadership knowledge"
                      />
                      {shortTermOutcomes.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => removeField(setShortTermOutcomes, index)}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => addField(setShortTermOutcomes)}
                    className="mt-2"
                  >
                    Add Short-term Outcome
                  </Button>
                </div>

                <div>
                  <Label>Mid-term Outcomes</Label>
                  {midTermOutcomes.map((outcome, index) => (
                    <div key={index} className="flex gap-2 mt-2">
                      <Input
                        value={outcome}
                        onChange={(e) => updateField(setMidTermOutcomes, index, e.target.value)}
                        placeholder="e.g., Youth take on leadership roles"
                      />
                      {midTermOutcomes.length > 1 && (
                        <Button type="button" variant="outline" onClick={() => removeField(setMidTermOutcomes, index)}>
                          Remove
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button type="button" variant="outline" onClick={() => addField(setMidTermOutcomes)} className="mt-2">
                    Add Mid-term Outcome
                  </Button>
                </div>

                <div>
                  <Label>Long-term Outcomes</Label>
                  {longTermOutcomes.map((outcome, index) => (
                    <div key={index} className="flex gap-2 mt-2">
                      <Input
                        value={outcome}
                        onChange={(e) => updateField(setLongTermOutcomes, index, e.target.value)}
                        placeholder="e.g., Sustained community leadership"
                      />
                      {longTermOutcomes.length > 1 && (
                        <Button type="button" variant="outline" onClick={() => removeField(setLongTermOutcomes, index)}>
                          Remove
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => addField(setLongTermOutcomes)}
                    className="mt-2"
                  >
                    Add Long-term Outcome
                  </Button>
                </div>

                <div>
                  <Label>Impacts</Label>
                  {impacts.map((impact, index) => (
                    <div key={index} className="flex gap-2 mt-2">
                      <Input
                        value={impact}
                        onChange={(e) => updateField(setImpacts, index, e.target.value)}
                        placeholder="e.g., Stronger, more resilient communities"
                      />
                      {impacts.length > 1 && (
                        <Button type="button" variant="outline" onClick={() => removeField(setImpacts, index)}>
                          Remove
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button type="button" variant="outline" onClick={() => addField(setImpacts)} className="mt-2">
                    Add Impact
                  </Button>
                </div>
              </div>

              {error && <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{error}</div>}

              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? "Creating Program..." : "Create Program"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
