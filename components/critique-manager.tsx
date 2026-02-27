"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import {
  Loader2,
  Sparkles,
  Trash2,
  ChevronDown,
  ChevronRight,
  CheckCircle,
  AlertTriangle,
  XCircle,
  MessageSquare,
  ThumbsUp,
  AlertCircle,
  Lightbulb,
} from "lucide-react"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface Avatar {
  id: string
  name: string
  role: string
  background: string
  values?: string
  expertise_areas?: string[]
}

interface SectionCritique {
  stance: "agree" | "partial" | "disagree"
  commentary: string
}

interface CritiqueData {
  logic_model: SectionCritique
  evaluation_approach: SectionCritique
  evaluation_questions: SectionCritique
  indicators: SectionCritique
  evaluation_plan: SectionCritique
  strengths: string[]
  concerns: string[]
  recommendations: string[]
}

interface Critique {
  id: string
  program_id: string
  avatar_id: string
  critique_data: CritiqueData
  overall_assessment: string
  overall_stance: string
  created_at: string
  avatars: { id: string; name: string; role: string; background: string }
}

interface CritiqueManagerProps {
  programId: string
  existingCritiques: Critique[]
  availableAvatars: Avatar[]
  guidingAvatarIds: string[]
}

const SECTION_LABELS: Record<string, string> = {
  logic_model: "Logic Model",
  evaluation_approach: "Evaluation Approach",
  evaluation_questions: "Evaluation Questions",
  indicators: "Indicators",
  evaluation_plan: "Evaluation Plan",
}

function StanceBadge({ stance }: { stance: string }) {
  if (stance === "agree") {
    return (
      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100">
        <CheckCircle className="h-3 w-3 mr-1" />
        Agrees
      </Badge>
    )
  }
  if (stance === "partial") {
    return (
      <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100">
        <AlertTriangle className="h-3 w-3 mr-1" />
        Partially Agrees
      </Badge>
    )
  }
  return (
    <Badge className="bg-red-100 text-red-800 border-red-200 hover:bg-red-100">
      <XCircle className="h-3 w-3 mr-1" />
      Disagrees
    </Badge>
  )
}

function OverallStanceBadge({ stance }: { stance: string }) {
  const config = {
    agree: { bg: "bg-emerald-600", label: "Overall: Supports this design" },
    partial: { bg: "bg-amber-600", label: "Overall: Mixed assessment" },
    disagree: { bg: "bg-red-600", label: "Overall: Significant concerns" },
  }
  const c = config[stance as keyof typeof config] || config.partial
  return <Badge className={`${c.bg} text-white hover:${c.bg}`}>{c.label}</Badge>
}

export function CritiqueManager({
  programId,
  existingCritiques,
  availableAvatars,
  guidingAvatarIds,
}: CritiqueManagerProps) {
  const [critiques, setCritiques] = useState<Critique[]>(existingCritiques)
  const [selectedAvatarId, setSelectedAvatarId] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [expandedCritique, setExpandedCritique] = useState<string | null>(
    existingCritiques.length > 0 ? existingCritiques[0].id : null
  )
  const { toast } = useToast()
  const router = useRouter()

  // Avatars that already have a critique
  const usedAvatarIds = critiques.map((c) => c.avatar_id)

  // Available critics: all avatars minus those already used
  const availableCritics = availableAvatars.filter(
    (a) => !usedAvatarIds.includes(a.id)
  )

  const handleGenerateCritique = async () => {
    if (!selectedAvatarId) return
    setIsGenerating(true)

    try {
      const res = await fetch(`/api/programs/${programId}/critiques/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar_id: selectedAvatarId }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "Failed to generate critique")
      }

      const newCritique = await res.json()
      setCritiques([newCritique, ...critiques])
      setExpandedCritique(newCritique.id)
      setSelectedAvatarId(null)
      toast({ title: "Critique generated", description: `${newCritique.avatars?.name || "Avatar"} has reviewed your evaluation design.` })
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDeleteCritique = async (critiqueId: string) => {
    try {
      const res = await fetch(`/api/programs/${programId}/critiques?critiqueId=${critiqueId}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Failed to delete")
      setCritiques(critiques.filter((c) => c.id !== critiqueId))
      toast({ title: "Critique removed" })
    } catch {
      toast({ title: "Error", description: "Failed to delete critique", variant: "destructive" })
    }
  }

  return (
    <div className="space-y-6">
      {/* Avatar Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Invite a Critic
          </CardTitle>
          <CardDescription>
            Select an evaluation theorist to review your design. Each critic brings their unique
            perspective, values, and theoretical framework.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {availableCritics.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              All available avatars have already provided critiques.
            </p>
          ) : (
            <>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 mb-4">
                {availableCritics.map((avatar) => {
                  const isGuiding = guidingAvatarIds.includes(avatar.id)
                  const isSelected = selectedAvatarId === avatar.id
                  return (
                    <button
                      key={avatar.id}
                      type="button"
                      onClick={() => setSelectedAvatarId(isSelected ? null : avatar.id)}
                      className={`text-left p-4 rounded-lg border-2 transition-all ${
                        isSelected
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-border hover:border-muted-foreground/30 hover:bg-muted/30"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <span className="font-semibold text-sm text-foreground">{avatar.name}</span>
                        {isGuiding && (
                          <Badge variant="outline" className="text-xs ml-2 shrink-0">
                            Guiding
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1">{avatar.role}</p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {avatar.background}
                      </p>
                    </button>
                  )
                })}
              </div>
              <Button
                onClick={handleGenerateCritique}
                disabled={!selectedAvatarId || isGenerating}
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating Critique...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Critique
                  </>
                )}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Existing Critiques */}
      {critiques.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground">
            Critiques ({critiques.length})
          </h2>

          {critiques.map((critique) => {
            const avatar = critique.avatars
            const data = critique.critique_data
            const isExpanded = expandedCritique === critique.id

            return (
              <Card key={critique.id} className="overflow-hidden">
                {/* Critique Header */}
                <button
                  type="button"
                  onClick={() => setExpandedCritique(isExpanded ? null : critique.id)}
                  className="w-full text-left"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <CardTitle className="text-lg">{avatar?.name}</CardTitle>
                          <OverallStanceBadge stance={critique.overall_stance || "partial"} />
                        </div>
                        <CardDescription className="text-sm">
                          {avatar?.role}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Section stance summary as small dots */}
                        <div className="flex gap-1">
                          {Object.entries(SECTION_LABELS).map(([key]) => {
                            const section = data?.[key as keyof CritiqueData] as SectionCritique | undefined
                            const color = section?.stance === "agree" ? "bg-emerald-500"
                              : section?.stance === "disagree" ? "bg-red-500"
                              : "bg-amber-500"
                            return <span key={key} className={`w-2.5 h-2.5 rounded-full ${color}`} title={`${SECTION_LABELS[key]}: ${section?.stance}`} />
                          })}
                        </div>
                        {isExpanded ? <ChevronDown className="h-5 w-5 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
                      </div>
                    </div>
                  </CardHeader>
                </button>

                {isExpanded && (
                  <CardContent className="pt-0 space-y-6">
                    {/* Overall Assessment */}
                    {critique.overall_assessment && (
                      <div className="p-4 bg-muted/40 rounded-lg border">
                        <p className="text-sm italic text-foreground leading-relaxed">
                          {critique.overall_assessment}
                        </p>
                      </div>
                    )}

                    {/* Section-by-section critique */}
                    <div className="space-y-4">
                      {Object.entries(SECTION_LABELS).map(([key, label]) => {
                        const section = data?.[key as keyof CritiqueData] as SectionCritique | undefined
                        if (!section) return null
                        return (
                          <div key={key} className="border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-semibold text-sm text-foreground">{label}</h4>
                              <StanceBadge stance={section.stance} />
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              {section.commentary}
                            </p>
                          </div>
                        )
                      })}
                    </div>

                    {/* Strengths / Concerns / Recommendations */}
                    <div className="grid gap-4 md:grid-cols-3">
                      {data?.strengths?.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="font-semibold text-sm flex items-center gap-1.5 text-emerald-700">
                            <ThumbsUp className="h-4 w-4" /> Strengths
                          </h4>
                          <ul className="space-y-1">
                            {data.strengths.map((s: string, i: number) => (
                              <li key={i} className="text-xs text-muted-foreground flex gap-2">
                                <span className="text-emerald-500 mt-0.5 shrink-0">+</span>
                                {s}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {data?.concerns?.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="font-semibold text-sm flex items-center gap-1.5 text-amber-700">
                            <AlertCircle className="h-4 w-4" /> Concerns
                          </h4>
                          <ul className="space-y-1">
                            {data.concerns.map((c: string, i: number) => (
                              <li key={i} className="text-xs text-muted-foreground flex gap-2">
                                <span className="text-amber-500 mt-0.5 shrink-0">!</span>
                                {c}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {data?.recommendations?.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="font-semibold text-sm flex items-center gap-1.5 text-blue-700">
                            <Lightbulb className="h-4 w-4" /> Recommendations
                          </h4>
                          <ul className="space-y-1">
                            {data.recommendations.map((r: string, i: number) => (
                              <li key={i} className="text-xs text-muted-foreground flex gap-2">
                                <span className="text-blue-500 mt-0.5 shrink-0">*</span>
                                {r}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* Footer with date and delete */}
                    <div className="flex items-center justify-between pt-2 border-t">
                      <span className="text-xs text-muted-foreground">
                        Generated {new Date(critique.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                      </span>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4 mr-1" />
                            Remove
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove this critique?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently remove {avatar?.name}&apos;s critique of your evaluation design.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteCritique(critique.id)}>
                              Remove
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
