"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function ProgramElementsEditor({ programId }: { programId: string }) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
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
      const response = await fetch(`/api/programs/${programId}/add-elements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ narrativeDescription }),
      })

      if (!response.ok) throw new Error("Failed to extract program elements")

      setNarrativeDescription("")
      router.refresh()
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
      const response = await fetch(`/api/programs/${programId}/add-elements-manual`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inputs: inputs.filter((i) => i.trim()),
          activities: activities.filter((a) => a.trim()),
          shortTermOutcomes: shortTermOutcomes.filter((o) => o.trim()),
          midTermOutcomes: midTermOutcomes.filter((o) => o.trim()),
          longTermOutcomes: longTermOutcomes.filter((o) => o.trim()),
          impacts: impacts.filter((i) => i.trim()),
        }),
      })

      if (!response.ok) throw new Error("Failed to add program elements")

      // Reset form
      setInputs([""])
      setActivities([""])
      setShortTermOutcomes([""])
      setMidTermOutcomes([""])
      setLongTermOutcomes([""])
      setImpacts([""])
      router.refresh()
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
    <Tabs defaultValue="manual">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="manual">Manual Input</TabsTrigger>
        <TabsTrigger value="narrative">AI-Assisted (Narrative)</TabsTrigger>
      </TabsList>

      <TabsContent value="manual">
        <form onSubmit={handleManualSubmit} className="space-y-4">
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
                    <Button type="button" variant="outline" size="sm" onClick={() => removeField(setInputs, index)}>
                      Remove
                    </Button>
                  )}
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => addField(setInputs)} className="mt-2">
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
                    <Button type="button" variant="outline" size="sm" onClick={() => removeField(setActivities, index)}>
                      Remove
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addField(setActivities)}
                className="mt-2"
              >
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
                      size="sm"
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
                size="sm"
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
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeField(setMidTermOutcomes, index)}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addField(setMidTermOutcomes)}
                className="mt-2"
              >
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
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeField(setLongTermOutcomes, index)}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
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
                    <Button type="button" variant="outline" size="sm" onClick={() => removeField(setImpacts, index)}>
                      Remove
                    </Button>
                  )}
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => addField(setImpacts)} className="mt-2">
                Add Impact
              </Button>
            </div>
          </div>

          {error && <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{error}</div>}

          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding Elements...
              </>
            ) : (
              "Add Elements"
            )}
          </Button>
        </form>
      </TabsContent>

      <TabsContent value="narrative">
        <Alert className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>AI Integration Required</AlertTitle>
          <AlertDescription>
            To use AI-assisted extraction, you need to connect an AI integration (like Groq, xAI, or OpenAI) from the
            Connect section in the sidebar. For now, please use the Manual Input tab to add program elements.
          </AlertDescription>
        </Alert>

        <form onSubmit={handleNarrativeSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="narrative">Narrative Description</Label>
            <Textarea
              id="narrative"
              value={narrativeDescription}
              onChange={(e) => setNarrativeDescription(e.target.value)}
              placeholder="Describe additional aspects of your program. Include any new inputs, activities, outcomes, or impacts..."
              rows={6}
              required
            />
            <p className="text-sm text-slate-500">Our AI will extract and add new elements to your program</p>
          </div>

          {error && <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{error}</div>}

          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Extracting Elements...
              </>
            ) : (
              "Extract & Add Elements"
            )}
          </Button>
        </form>
      </TabsContent>
    </Tabs>
  )
}
