import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { CritiqueManager } from "@/components/critique-manager"
import ModuleNavigation from "@/components/module-navigation"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function DesignCritiquePage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: program, error: programError } = await supabase
    .from("programs")
    .select("*")
    .eq("id", id)
    .maybeSingle()

  if (programError || !program) {
    notFound()
  }

  // Fetch existing critiques with avatar info
  const { data: critiques } = await supabase
    .from("evaluation_critiques")
    .select(`
      *,
      avatars (id, name, role, background)
    `)
    .eq("program_id", id)
    .order("created_at", { ascending: false })

  // Fetch all available avatars
  const { data: avatars } = await supabase
    .from("avatars")
    .select("id, name, role, background, values, expertise_areas")
    .order("name")

  // Fetch the guiding avatar from evaluation flavor so we can label it
  const { data: flavor } = await supabase
    .from("evaluation_flavors")
    .select(`
      is_active,
      flavor_approaches (
        avatar_id,
        avatars (id, name)
      )
    `)
    .eq("program_id", id)
    .maybeSingle()

  const guidingAvatarIds = flavor?.flavor_approaches
    ?.map((a: any) => a.avatar_id)
    .filter(Boolean) || []

  return (
    <div className="container mx-auto py-8 px-4">
      <ModuleNavigation programId={id} currentModule="design-critique" />

      <div className="mt-8 mb-6">
        <h1 className="text-3xl font-bold text-foreground">{program.name}</h1>
        <p className="text-muted-foreground mt-2">
          Invite evaluation theorists to critique your evaluation design. Each critic 
          reviews your logic model, approach, questions, indicators, and plan from their 
          unique perspective.
        </p>
      </div>

      <CritiqueManager
        programId={id}
        existingCritiques={critiques || []}
        availableAvatars={avatars || []}
        guidingAvatarIds={guidingAvatarIds}
      />
    </div>
  )
}
