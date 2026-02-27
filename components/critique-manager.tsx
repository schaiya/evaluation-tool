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

interface ExpandableItem {
  summary: string
  detail: string
}

interface SectionCritique {
  section_name: string
  stance: "agree" | "partial" | "disagree"
  commentary: string
  strengths: (string | ExpandableItem)[]
  concerns: (string | ExpandableItem)[]
  what_i_would_change: string[]
}

type CritiqueData = SectionCritique[]

/** Normalize a strength/concern to always be an ExpandableItem */
function normalizeItem(item: string | ExpandableItem): ExpandableItem {
  if (typeof item === "string") return { summary: item, detail: "" }
  return item
}

/** Clickable item that expands to show the avatar's deeper explanation */
function ExpandablePoint({
  item,
  icon,
  iconColor,
}: {
  item: string | ExpandableItem
  icon: React.ReactNode
  iconColor: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const normalized = normalizeItem(item)
  const hasDetail = Boolean(normalized.detail)

  return (
    <li className="list-none">
      <div
        role="button"
        tabIndex={0}
        onClick={(e) => {
          e.stopPropagation()
          e.preventDefault()
          if (hasDetail) setIsOpen((prev) => !prev)
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.stopPropagation()
            e.preventDefault()
            if (hasDetail) setIsOpen((prev) => !prev)
          }
        }}
        className={`w-full text-left flex gap-2 leading-relaxed group rounded-md p-2 -m-1 ${hasDetail ? "cursor-pointer hover:bg-muted/50" : "cursor-default"}`}
      >
        <span className={`${iconColor} mt-0.5 shrink-0 font-bold`}>{icon}</span>
        <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors flex-1">
          {normalized.summary}
          {hasDetail && (
            <ChevronDown className={`inline-block h-3.5 w-3.5 ml-1.5 text-muted-foreground/50 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
          )}
        </span>
      </div>
      {isOpen && hasDetail && (
        <div className="ml-6 mt-1 mb-2 p-3 bg-muted/30 rounded-lg border-l-2 border-muted-foreground/20 animate-in fade-in-0 slide-in-from-top-1 duration-200">
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">
            {normalized.detail}
          </p>
        </div>
      )}
    </li>
  )
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
                          {(Array.isArray(data) ? data : []).map((section: SectionCritique, idx: number) => {
                            const color = section.stance === "agree" ? "bg-emerald-500"
                              : section.stance === "disagree" ? "bg-red-500"
                              : "bg-amber-500"
                            return <span key={idx} className={`w-2.5 h-2.5 rounded-full ${color}`} title={`${section.section_name}: ${section.stance}`} />
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
                    {(() => { console.log("[v0] Critique data shape:", JSON.stringify(data?.[0]?.strengths?.[0]).substring(0, 200)); return null })()}
                    <Accordion type="multiple" defaultValue={Array.isArray(data) ? data.map((_, i) => `section-${i}`) : []}>
                      {(Array.isArray(data) ? data : []).map((section: SectionCritique, idx: number) => (
                        <AccordionItem key={idx} value={`section-${idx}`}>
                          <AccordionTrigger className="hover:no-underline">
                            <div className="flex items-center gap-3">
                              <span className="font-semibold text-sm">{section.section_name}</span>
                              <StanceBadge stance={section.stance} />
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="space-y-4 pt-2">
                            {/* Commentary */}
                            <div className="p-3 bg-muted/30 rounded-lg">
                              <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">
                                {section.commentary}
                              </p>
                            </div>

                            {/* Strengths */}
                            {section.strengths?.length > 0 && (
                              <div>
                                {(() => {
                                  const hasAnyDetail = section.strengths.some(
                                    (s) => typeof s === "object" && s.detail
                                  )
                                  return (
                                    <>
                                      <h5 className="font-semibold text-sm flex items-center gap-1.5 text-emerald-700 mb-2">
                                        <ThumbsUp className="h-3.5 w-3.5" /> Strengths
                                        {hasAnyDetail && (
                                          <span className="font-normal text-xs text-muted-foreground ml-1">(click items to see deeper analysis)</span>
                                        )}
                                      </h5>
                                      <ul className="space-y-2">
                                        {section.strengths.map((s, i) => (
                                          <ExpandablePoint key={i} item={s} icon="+" iconColor="text-emerald-500" />
                                        ))}
                                      </ul>
                                    </>
                                  )
                                })()}
                              </div>
                            )}

                            {/* Concerns */}
                            {section.concerns?.length > 0 && (
                              <div>
                                {(() => {
                                  const hasAnyDetail = section.concerns.some(
                                    (c) => typeof c === "object" && c.detail
                                  )
                                  return (
                                    <>
                                      <h5 className="font-semibold text-sm flex items-center gap-1.5 text-amber-700 mb-2">
                                        <AlertCircle className="h-3.5 w-3.5" /> Concerns
                                        {hasAnyDetail && (
                                          <span className="font-normal text-xs text-muted-foreground ml-1">(click items to see deeper analysis)</span>
                                        )}
                                      </h5>
                                      <ul className="space-y-2">
                                        {section.concerns.map((c, i) => (
                                          <ExpandablePoint key={i} item={c} icon="!" iconColor="text-amber-500" />
                                        ))}
                                      </ul>
                                    </>
                                  )
                                })()}
                              </div>
                            )}

                            {/* What I Would Change */}
                            {section.what_i_would_change?.length > 0 && (
                              <div className="border-l-3 border-blue-400 pl-4">
                                <h5 className="font-semibold text-sm flex items-center gap-1.5 text-blue-700 mb-2">
                                  <Lightbulb className="h-3.5 w-3.5" /> What I Would Change
                                </h5>
                                <ul className="space-y-3">
                                  {section.what_i_would_change.map((r: string, i: number) => (
                                    <li key={i} className="text-sm text-foreground leading-relaxed">
                                      {r}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>

                    {/* Regenerate banner for old-format critiques */}
                    {Array.isArray(data) && data.length > 0 && typeof data[0]?.strengths?.[0] === "string" && (
                      <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <Sparkles className="h-4 w-4 text-blue-600 shrink-0" />
                        <p className="text-sm text-blue-800 flex-1">
                          This critique uses an older format. Regenerate it to get expandable strengths and concerns with deeper analysis.
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          className="shrink-0"
                          disabled={isGenerating}
                          onClick={async () => {
                            setIsGenerating(true)
                            try {
                              await handleDeleteCritique(critique.id)
                              setSelectedAvatarId(critique.avatar_id)
                              // Small delay then generate
                              const res = await fetch(`/api/programs/${programId}/critiques/generate`, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ avatar_id: critique.avatar_id }),
                              })
                              if (!res.ok) throw new Error("Failed to regenerate")
                              const newCritique = await res.json()
                              setCritiques((prev) => [newCritique, ...prev.filter((c) => c.id !== critique.id)])
                              setExpandedCritique(newCritique.id)
                              setSelectedAvatarId(null)
                              toast({ title: "Critique regenerated", description: `${avatar?.name}'s critique has been updated with deeper analysis.` })
                            } catch (error: any) {
                              toast({ title: "Error", description: error.message, variant: "destructive" })
                            } finally {
                              setIsGenerating(false)
                            }
                          }}
                        >
                          {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Regenerate"}
                        </Button>
                      </div>
                    )}

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
