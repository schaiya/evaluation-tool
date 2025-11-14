"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface ProgramCardProps {
  program: {
    id: string
    name: string
    description: string | null
    created_at: string
  }
  onDelete?: () => void
}

export function ProgramCard({ program, onDelete }: ProgramCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/programs/${program.id}`, {
        method: "DELETE",
      })

      if (!response.ok) throw new Error("Failed to delete program")

      if (onDelete) {
        onDelete()
      }
    } catch (error) {
      console.error("[v0] Error deleting program:", error)
      alert("Failed to delete program. Please try again.")
    } finally {
      setIsDeleting(false)
      setShowDeleteDialog(false)
    }
  }

  return (
    <>
      <Card className="hover:shadow-lg transition-shadow relative group">
        <Link href={`/programs/${program.id}`}>
          <CardHeader>
            <CardTitle>{program.name}</CardTitle>
            <CardDescription>{program.description || "No description"}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-500">Created {new Date(program.created_at).toLocaleDateString()}</p>
          </CardContent>
        </Link>

        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={(e) => {
            e.preventDefault()
            setShowDeleteDialog(true)
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 6h18" />
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
          </svg>
        </Button>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Program?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{program.name}</strong> and all associated data including:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Program elements</li>
                <li>Logic model</li>
                <li>Evaluation questions</li>
                <li>Indicators</li>
                <li>Evaluation plan</li>
                <li>Data collection tools</li>
                <li>Uploaded data</li>
                <li>Analysis results and reports</li>
              </ul>
              <p className="mt-3 font-semibold">This action cannot be undone.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-red-600 hover:bg-red-700">
              {isDeleting ? "Deleting..." : "Delete Program"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
