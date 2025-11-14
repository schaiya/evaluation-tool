"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ProgramCard } from "@/components/program-card"
import { CreateProgramDialog } from "@/components/create-program-dialog"

interface Program {
  id: string
  name: string
  description: string
  created_at: string
}

export default function HomePage() {
  const [programs, setPrograms] = useState<Program[]>([])
  const [loading, setLoading] = useState(true)

  const fetchPrograms = async () => {
    try {
      const response = await fetch("/api/programs")
      if (response.ok) {
        const data = await response.json()
        setPrograms(data)
      }
    } catch (error) {
      console.error("[v0] Error fetching programs:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPrograms()

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchPrograms()
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [])

  const handleProgramCreated = () => {
    fetchPrograms()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Impact Evaluation Tool</h1>
          <p className="text-slate-600">Design, plan, and execute comprehensive program evaluations</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
          <Card className="border-2 border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="text-blue-900">Your Programs</CardTitle>
              <CardDescription>Active evaluation projects</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-900">{loading ? "..." : programs.length}</div>
            </CardContent>
          </Card>
        </div>

        <div className="mb-6 flex justify-between items-center">
          <h2 className="text-2xl font-semibold text-slate-900">Your Programs</h2>
          <CreateProgramDialog onSuccess={handleProgramCreated} />
        </div>

        {loading ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-slate-600">Loading programs...</p>
            </CardContent>
          </Card>
        ) : programs.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {programs.map((program) => (
              <ProgramCard key={program.id} program={program} onDelete={handleProgramCreated} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-slate-600 mb-4">No programs yet. Create your first evaluation project!</p>
              <CreateProgramDialog onSuccess={handleProgramCreated} />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
