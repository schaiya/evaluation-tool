"use client"

import React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Users, BookOpen, FileText, Upload, Search, Save, AlertCircle, CheckCircle, X, Plus, UserCircle } from "lucide-react"

// Type definitions matching database schema
interface Avatar {
  id: string
  name: string
  role: string | null
  background: string | null
  values: string | null
  decision_style: string | null
  expertise_areas: string[] | null
}

interface Standard {
  id: string
  standard_name: string
  category: string
  content: {
    name: string
    domains?: Array<{ name: string; principles: string[] }>
    steps?: Array<{ step: number; name: string; description: string }>
    principles?: Array<{ name: string; description: string }>
    evidence_preferences: string[]
    reporting_emphasis: string[]
  }
  source_url: string | null
}

interface Audience {
  id?: string
  flavor_id?: string
  audience_type: string
  custom_name: string | null
  custom_description: string | null
  priority: number
  preferred_evidence: string[]
  preferred_methods: string[]
  reporting_style: string
}

interface Approach {
  id?: string
  flavor_id?: string
  approach_type: string
  custom_name: string | null
  custom_description: string | null
  avatar_id: string | null
  avatars?: Avatar | null
}

interface FunderRequirement {
  id?: string
  flavor_id?: string
  source_filename: string | null
  evaluation_requirements: string[]
  reporting_templates: string[]
  timeline_expectations: string | null
  required_metrics: string[]
}

interface Flavor {
  id: string
  program_id: string
  is_active: boolean
  funder_name: string | null
  funder_guidelines_url: string | null
  custom_notes: string | null
  flavor_audiences: Audience[]
  flavor_approaches: Approach[]
  funder_requirements: FunderRequirement[]
}

interface Props {
  programId: string
  initialFlavor: Flavor | null
  standards: Standard[]
  availableAvatars: Avatar[]
  hasLogicModel: boolean
}

// Pre-defined audience types with default preferences
const AUDIENCE_PRESETS: Record<string, Omit<Audience, 'id' | 'flavor_id' | 'audience_type'>> = {
  funder: {
    custom_name: null,
    custom_description: null,
    priority: 1,
    preferred_evidence: ['quantitative', 'outcomes'],
    preferred_methods: ['survey', 'administrative_data'],
    reporting_style: 'executive'
  },
  government: {
    custom_name: null,
    custom_description: null,
    priority: 1,
    preferred_evidence: ['quantitative', 'compliance'],
    preferred_methods: ['administrative_data', 'audit'],
    reporting_style: 'technical'
  },
  internal: {
    custom_name: null,
    custom_description: null,
    priority: 1,
    preferred_evidence: ['mixed', 'process'],
    preferred_methods: ['survey', 'interview', 'observation'],
    reporting_style: 'narrative'
  },
  public: {
    custom_name: null,
    custom_description: null,
    priority: 1,
    preferred_evidence: ['qualitative', 'stories'],
    preferred_methods: ['interview', 'focus_group'],
    reporting_style: 'visual'
  },
  community: {
    custom_name: null,
    custom_description: null,
    priority: 1,
    preferred_evidence: ['qualitative', 'participatory'],
    preferred_methods: ['focus_group', 'community_forum', 'photovoice'],
    reporting_style: 'accessible'
  },
  staff: {
    custom_name: null,
    custom_description: null,
    priority: 1,
    preferred_evidence: ['process', 'implementation'],
    preferred_methods: ['observation', 'interview', 'document_review'],
    reporting_style: 'practical'
  }
}

// Pre-defined evaluation approaches
const APPROACH_PRESETS = [
  { type: 'utilization-focused', name: 'Utilization-Focused Evaluation', description: 'Evaluation should be judged by its use and actual impact on decisions and actions.' },
  { type: 'realist', name: 'Realist Evaluation', description: 'Focuses on understanding what works, for whom, in what circumstances, and why.' },
  { type: 'participatory', name: 'Participatory Evaluation', description: 'Stakeholders are actively involved in all phases of the evaluation process.' },
  { type: 'developmental', name: 'Developmental Evaluation', description: 'Supports innovation and adaptation in complex, dynamic environments.' },
  { type: 'empowerment', name: 'Empowerment Evaluation', description: 'Aims to increase the capacity of program stakeholders to conduct their own evaluations.' },
  { type: 'theory-driven', name: 'Theory-Driven Evaluation', description: 'Uses program theory or logic model as the basis for evaluation design.' },
  { type: 'transformative', name: 'Transformative Evaluation', description: 'Centers issues of social justice and addresses power imbalances.' },
  { type: 'principles-focused', name: 'Principles-Focused Evaluation', description: 'Evaluates adherence to and effectiveness of guiding principles.' }
]

export function EvaluationFlavorManager({ 
  programId, 
  initialFlavor, 
  standards, 
  availableAvatars,
  hasLogicModel 
}: Props) {
  // State
  const [isActive, setIsActive] = useState(initialFlavor?.is_active ?? true)
  const [audiences, setAudiences] = useState<Audience[]>(initialFlavor?.flavor_audiences || [])
  const [approaches, setApproaches] = useState<Approach[]>(initialFlavor?.flavor_approaches || [])
  const [funderName, setFunderName] = useState(initialFlavor?.funder_name || '')
  const [funderUrl, setFunderUrl] = useState(initialFlavor?.funder_guidelines_url || '')
  const [customNotes, setCustomNotes] = useState(initialFlavor?.custom_notes || '')
  const [funderRequirements, setFunderRequirements] = useState<FunderRequirement | null>(
    initialFlavor?.funder_requirements?.[0] || null
  )
  
  const [saving, setSaving] = useState(false)
  const [searchingFunder, setSearchingFunder] = useState(false)
  const [uploadingRfp, setUploadingRfp] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  // Custom audience form
  const [showCustomAudience, setShowCustomAudience] = useState(false)
  const [customAudienceName, setCustomAudienceName] = useState('')
  const [customAudienceDescription, setCustomAudienceDescription] = useState('')
  
  // Custom approach form
  const [showCustomApproach, setShowCustomApproach] = useState(false)
  const [customApproachName, setCustomApproachName] = useState('')
  const [customApproachDescription, setCustomApproachDescription] = useState('')

  // Clear messages after delay
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [success])

  // Add audience
  const addAudience = (type: string) => {
    if (audiences.some(a => a.audience_type === type)) return
    
    const preset = AUDIENCE_PRESETS[type] || AUDIENCE_PRESETS.internal
    setAudiences([...audiences, { audience_type: type, ...preset }])
  }

  // Add custom audience
  const addCustomAudience = () => {
    if (!customAudienceName.trim()) return
    
    setAudiences([...audiences, {
      audience_type: 'custom',
      custom_name: customAudienceName,
      custom_description: customAudienceDescription,
      priority: 1,
      preferred_evidence: ['mixed'],
      preferred_methods: ['survey', 'interview'],
      reporting_style: 'narrative'
    }])
    
    setCustomAudienceName('')
    setCustomAudienceDescription('')
    setShowCustomAudience(false)
  }

  // Remove audience
  const removeAudience = (index: number) => {
    setAudiences(audiences.filter((_, i) => i !== index))
  }

  // Add approach
  const addApproach = (type: string) => {
    if (approaches.some(a => a.approach_type === type)) return
    
    setApproaches([...approaches, {
      approach_type: type,
      custom_name: null,
      custom_description: null,
      avatar_id: null
    }])
  }

  // Add custom approach
  const addCustomApproach = () => {
    if (!customApproachName.trim()) return
    
    setApproaches([...approaches, {
      approach_type: 'custom',
      custom_name: customApproachName,
      custom_description: customApproachDescription,
      avatar_id: null
    }])
    
    setCustomApproachName('')
    setCustomApproachDescription('')
    setShowCustomApproach(false)
  }

  // Remove approach
  const removeApproach = (index: number) => {
    setApproaches(approaches.filter((_, i) => i !== index))
  }

  // Link avatar to approach
  const linkAvatar = (approachIndex: number, avatarId: string | null) => {
    const updated = [...approaches]
    updated[approachIndex] = { 
      ...updated[approachIndex], 
      avatar_id: avatarId,
      avatars: avatarId ? availableAvatars.find(a => a.id === avatarId) || null : null
    }
    setApproaches(updated)
  }

  // Search for funder guidelines
  const searchFunderGuidelines = async () => {
    if (!funderName.trim()) return
    
    setSearchingFunder(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/programs/${programId}/evaluation-flavor/search-funder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ funderName })
      })
      
      if (!response.ok) throw new Error('Failed to search for funder guidelines')
      
      const data = await response.json()
      if (data.guidelinesUrl) {
        setFunderUrl(data.guidelinesUrl)
        setSuccess('Found funder evaluation guidelines!')
      } else {
        setError('No specific evaluation guidelines found for this funder.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed')
    } finally {
      setSearchingFunder(false)
    }
  }

  // Upload and analyze RFP
  const handleRfpUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    setUploadingRfp(true)
    setError(null)
    
    try {
      const formData = new FormData()
      formData.append('file', file)
      
      const response = await fetch(`/api/programs/${programId}/evaluation-flavor/analyze-rfp`, {
        method: 'POST',
        body: formData
      })
      
      if (!response.ok) throw new Error('Failed to analyze RFP')
      
      const data = await response.json()
      setFunderRequirements({
        source_filename: file.name,
        evaluation_requirements: data.evaluation_requirements || [],
        reporting_templates: data.reporting_templates || [],
        timeline_expectations: data.timeline_expectations || null,
        required_metrics: data.required_metrics || []
      })
      setSuccess('RFP analyzed successfully!')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploadingRfp(false)
    }
  }

  // Save flavor configuration
  const saveFlavor = async () => {
    setSaving(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/programs/${programId}/evaluation-flavor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_active: isActive,
          funder_name: funderName || null,
          funder_guidelines_url: funderUrl || null,
          custom_notes: customNotes || null,
          audiences,
          approaches,
          funder_requirements: funderRequirements
        })
      })
      
      if (!response.ok) throw new Error('Failed to save evaluation flavor')
      
      setSuccess('Evaluation flavor saved successfully!')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  // Get audience display name
  const getAudienceDisplayName = (audience: Audience) => {
    if (audience.audience_type === 'custom') return audience.custom_name || 'Custom Audience'
    return audience.audience_type.charAt(0).toUpperCase() + audience.audience_type.slice(1)
  }

  // Get approach display name
  const getApproachDisplayName = (approach: Approach) => {
    if (approach.approach_type === 'custom') return approach.custom_name || 'Custom Approach'
    const preset = APPROACH_PRESETS.find(p => p.type === approach.approach_type)
    return preset?.name || approach.approach_type
  }

  if (!hasLogicModel) {
    return (
      <Alert className="mt-8">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Please complete the Logic Model before configuring the Evaluation Flavor.
          The logic model helps inform appropriate evaluation approaches and methods.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="mt-8 space-y-6">
      {/* Messages */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert className="border-green-500 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {/* Flavor Toggle */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Evaluation Flavor</CardTitle>
              <CardDescription>
                When active, flavor settings influence evaluation questions, methods, and reporting across all modules.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="flavor-toggle">Active</Label>
              <Switch
                id="flavor-toggle"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="audiences" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="audiences" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Audiences
          </TabsTrigger>
          <TabsTrigger value="approaches" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Approaches
          </TabsTrigger>
          <TabsTrigger value="funder" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Funder
          </TabsTrigger>
          <TabsTrigger value="standards" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Standards
          </TabsTrigger>
        </TabsList>

        {/* Audiences Tab */}
        <TabsContent value="audiences" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Evaluation Audiences</CardTitle>
              <CardDescription>
                Select who will consume this evaluation. Each audience has different preferences for evidence, methods, and reporting.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Preset Audiences */}
              <div className="flex flex-wrap gap-2">
                {Object.keys(AUDIENCE_PRESETS).map(type => (
                  <Button
                    key={type}
                    variant={audiences.some(a => a.audience_type === type) ? "default" : "outline"}
                    size="sm"
                    onClick={() => audiences.some(a => a.audience_type === type) 
                      ? removeAudience(audiences.findIndex(a => a.audience_type === type))
                      : addAudience(type)
                    }
                    className={audiences.some(a => a.audience_type === type) ? "" : "bg-transparent"}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCustomAudience(true)}
                  className="bg-transparent"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Custom
                </Button>
              </div>

              {/* Custom Audience Form */}
              {showCustomAudience && (
                <Card className="bg-muted/50">
                  <CardContent className="pt-4 space-y-3">
                    <div>
                      <Label htmlFor="custom-audience-name">Audience Name</Label>
                      <Input
                        id="custom-audience-name"
                        value={customAudienceName}
                        onChange={e => setCustomAudienceName(e.target.value)}
                        placeholder="e.g., Program Advisory Board"
                      />
                    </div>
                    <div>
                      <Label htmlFor="custom-audience-desc">Description (optional)</Label>
                      <Textarea
                        id="custom-audience-desc"
                        value={customAudienceDescription}
                        onChange={e => setCustomAudienceDescription(e.target.value)}
                        placeholder="Describe their evaluation preferences..."
                        rows={2}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={addCustomAudience}>Add Audience</Button>
                      <Button size="sm" variant="outline" onClick={() => setShowCustomAudience(false)} className="bg-transparent">Cancel</Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Selected Audiences */}
              {audiences.length > 0 && (
                <div className="space-y-3 mt-4">
                  <Label>Selected Audiences</Label>
                  {audiences.map((audience, index) => (
                    <Card key={index} className="bg-muted/30">
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium">{getAudienceDisplayName(audience)}</p>
                            {audience.custom_description && (
                              <p className="text-sm text-muted-foreground mt-1">{audience.custom_description}</p>
                            )}
                            <div className="flex flex-wrap gap-1 mt-2">
                              <Badge variant="secondary">
                                Evidence: {audience.preferred_evidence.join(', ')}
                              </Badge>
                              <Badge variant="secondary">
                                Methods: {audience.preferred_methods.join(', ')}
                              </Badge>
                              <Badge variant="secondary">
                                Reporting: {audience.reporting_style}
                              </Badge>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeAudience(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Approaches Tab */}
        <TabsContent value="approaches" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Evaluation Approaches</CardTitle>
              <CardDescription>
                Select theoretical approaches that will guide the evaluation design. You can optionally link an avatar to embody each approach.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Preset Approaches */}
              <div className="flex flex-wrap gap-2">
                {APPROACH_PRESETS.map(preset => (
                  <Button
                    key={preset.type}
                    variant={approaches.some(a => a.approach_type === preset.type) ? "default" : "outline"}
                    size="sm"
                    onClick={() => approaches.some(a => a.approach_type === preset.type)
                      ? removeApproach(approaches.findIndex(a => a.approach_type === preset.type))
                      : addApproach(preset.type)
                    }
                    className={approaches.some(a => a.approach_type === preset.type) ? "" : "bg-transparent"}
                  >
                    {preset.name}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCustomApproach(true)}
                  className="bg-transparent"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Custom
                </Button>
              </div>

              {/* Custom Approach Form */}
              {showCustomApproach && (
                <Card className="bg-muted/50">
                  <CardContent className="pt-4 space-y-3">
                    <div>
                      <Label htmlFor="custom-approach-name">Approach Name</Label>
                      <Input
                        id="custom-approach-name"
                        value={customApproachName}
                        onChange={e => setCustomApproachName(e.target.value)}
                        placeholder="e.g., Equity-Centered Evaluation"
                      />
                    </div>
                    <div>
                      <Label htmlFor="custom-approach-desc">Description</Label>
                      <Textarea
                        id="custom-approach-desc"
                        value={customApproachDescription}
                        onChange={e => setCustomApproachDescription(e.target.value)}
                        placeholder="Describe this evaluation approach..."
                        rows={2}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={addCustomApproach}>Add Approach</Button>
                      <Button size="sm" variant="outline" onClick={() => setShowCustomApproach(false)} className="bg-transparent">Cancel</Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Selected Approaches with Avatar Linking */}
              {approaches.length > 0 && (
                <div className="space-y-3 mt-4">
                  <Label>Selected Approaches</Label>
                  {approaches.map((approach, index) => {
                    const preset = APPROACH_PRESETS.find(p => p.type === approach.approach_type)
                    return (
                      <Card key={index} className="bg-muted/30">
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="font-medium">{getApproachDisplayName(approach)}</p>
                              <p className="text-sm text-muted-foreground mt-1">
                                {approach.custom_description || preset?.description}
                              </p>
                              
                              {/* Avatar Selector */}
                              <div className="mt-3 flex items-center gap-2">
                                <UserCircle className="h-4 w-4 text-muted-foreground" />
                                <Select
                                  value={approach.avatar_id || "none"}
                                  onValueChange={(value) => linkAvatar(index, value === "none" ? null : value)}
                                >
                                  <SelectTrigger className="w-64">
                                    <SelectValue placeholder="Link an avatar (optional)" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">No avatar</SelectItem>
                                    {availableAvatars.map(avatar => (
                                      <SelectItem key={avatar.id} value={avatar.id}>
                                        {avatar.name} {avatar.role ? `(${avatar.role})` : ''}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              
                              {approach.avatars && (
                                <div className="mt-2 p-2 bg-background rounded text-sm">
                                  <p className="font-medium">{approach.avatars.name}</p>
                                  {approach.avatars.values && (
                                    <p className="text-muted-foreground text-xs mt-1 line-clamp-2">
                                      {approach.avatars.values}
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeApproach(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Funder Tab */}
        <TabsContent value="funder" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Funder Information</CardTitle>
              <CardDescription>
                Add funder details to search for evaluation guidelines or upload an RFP for AI analysis.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Funder Name and Search */}
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label htmlFor="funder-name">Funder Name</Label>
                  <Input
                    id="funder-name"
                    value={funderName}
                    onChange={e => setFunderName(e.target.value)}
                    placeholder="e.g., Robert Wood Johnson Foundation"
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    variant="outline"
                    onClick={searchFunderGuidelines}
                    disabled={searchingFunder || !funderName.trim()}
                    className="bg-transparent"
                  >
                    <Search className="h-4 w-4 mr-2" />
                    {searchingFunder ? 'Searching...' : 'Search Guidelines'}
                  </Button>
                </div>
              </div>

              {/* Funder Guidelines URL */}
              <div>
                <Label htmlFor="funder-url">Evaluation Guidelines URL (if known)</Label>
                <Input
                  id="funder-url"
                  value={funderUrl}
                  onChange={e => setFunderUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>

              {/* RFP Upload */}
              <div>
                <Label>Upload RFP for AI Analysis</Label>
                <div className="mt-2">
                  <label className="flex items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex flex-col items-center">
                      <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                      <span className="text-sm text-muted-foreground">
                        {uploadingRfp ? 'Analyzing...' : 'Click to upload RFP (PDF, DOC, DOCX)'}
                      </span>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.doc,.docx"
                      onChange={handleRfpUpload}
                      disabled={uploadingRfp}
                    />
                  </label>
                </div>
              </div>

              {/* Extracted Requirements */}
              {funderRequirements && (
                <Card className="bg-muted/30">
                  <CardHeader>
                    <CardTitle className="text-base">Extracted from: {funderRequirements.source_filename}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {funderRequirements.evaluation_requirements.length > 0 && (
                      <div>
                        <Label>Evaluation Requirements</Label>
                        <ul className="list-disc list-inside text-sm mt-1">
                          {funderRequirements.evaluation_requirements.map((req, i) => (
                            <li key={i}>{req}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {funderRequirements.required_metrics.length > 0 && (
                      <div>
                        <Label>Required Metrics</Label>
                        <ul className="list-disc list-inside text-sm mt-1">
                          {funderRequirements.required_metrics.map((metric, i) => (
                            <li key={i}>{metric}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {funderRequirements.timeline_expectations && (
                      <div>
                        <Label>Timeline Expectations</Label>
                        <p className="text-sm mt-1">{funderRequirements.timeline_expectations}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Custom Notes */}
              <div>
                <Label htmlFor="custom-notes">Additional Notes</Label>
                <Textarea
                  id="custom-notes"
                  value={customNotes}
                  onChange={e => setCustomNotes(e.target.value)}
                  placeholder="Any additional context about evaluation preferences..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Standards Tab */}
        <TabsContent value="standards" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Evaluation Standards Reference</CardTitle>
              <CardDescription>
                Reference materials from major evaluation organizations. These standards inform best practices for your evaluation.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {standards.map(standard => (
                  <Card key={standard.id} className="bg-muted/30">
                    <CardHeader>
                      <CardTitle className="text-base">{standard.content.name}</CardTitle>
                      <CardDescription>{standard.category}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {standard.content.domains && (
                        <div>
                          <Label className="text-xs">Domains</Label>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {standard.content.domains.map((domain, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {domain.name}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {standard.content.steps && (
                        <div>
                          <Label className="text-xs">Steps</Label>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {standard.content.steps.map((step, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {step.step}. {step.name}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {standard.content.principles && (
                        <div>
                          <Label className="text-xs">Principles</Label>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {standard.content.principles.map((principle, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {principle.name}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      <div>
                        <Label className="text-xs">Evidence Preferences</Label>
                        <p className="text-xs text-muted-foreground mt-1">
                          {standard.content.evidence_preferences.join(', ')}
                        </p>
                      </div>
                      {standard.source_url && (
                        <a
                          href={standard.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline"
                        >
                          View Source
                        </a>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={saveFlavor} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Evaluation Flavor'}
        </Button>
      </div>
    </div>
  )
}
