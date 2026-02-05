"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import LogicModelEditor from "@/components/logic-model-editor"
import Link from "next/link"
import { Loader2 } from "lucide-react"
import ModuleNavigation from "@/components/module-navigation"

interface ProgramElement {
  id: string
  element_type: string
  title: string
  description: string
  position_x: number
  position_y: number
}

export default function LogicModelPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [loading, setLoading] = useState(true)
  const [program, setProgram] = useState<any>(null)
  const [elements, setElements] = useState<ProgramElement[]>([])
  const [existingModel, setExistingModel] = useState<any>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch(`/api/programs/${id}/logic-model-data`)
        if (!response.ok) {
          router.push("/")
          return
        }

        const data = await response.json()
        setProgram(data.program)
        setElements(data.elements)
        setExistingModel(data.logicModel)
      } catch (error) {
        console.error("[v0] Error fetching logic model data:", error)
        router.push("/")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [id, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
      </div>
    )
  }

  if (!program) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8">
          <ModuleNavigation programId={id} />
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Logic Model</h1>
          <p className="text-slate-600">Create a visual diagram showing relationships between program elements</p>
        </div>

        <LogicModelEditor programId={id} elements={elements} existingModel={existingModel} />
      </div>
    </div>
  )
}
