"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

interface CreateProgramDialogProps {
  onSuccess?: () => void
}

export function CreateProgramDialog({ onSuccess }: CreateProgramDialogProps) {
  const [open, setOpen] = useState(false)
  const [programName, setProgramName] = useState("")
  const [description, setDescription] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const router = useRouter()

  const handleCreate = async () => {
    if (!programName.trim()) {
      alert("Please enter a program name")
      return
    }

    setIsCreating(true)
    try {
      const response = await fetch("/api/programs/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: programName,
          description: description || null,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to create program")
      }

      const data = await response.json()
      setOpen(false)
      setProgramName("")
      setDescription("")

      if (onSuccess) {
        onSuccess()
      }

      router.push(`/programs/${data.id}`)
    } catch (error) {
      console.error("[v0] Error creating program:", error)
      alert("Failed to create program. Please try again.")
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Create New Program</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Create New Program</DialogTitle>
          <DialogDescription>
            Enter a name for your evaluation program. You can add details and define program elements later.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Program Name *</Label>
            <Input
              id="name"
              placeholder="e.g., Youth Leadership Initiative"
              value={programName}
              onChange={(e) => setProgramName(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Brief Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="A short summary of your program..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isCreating}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={isCreating}>
            {isCreating ? "Creating..." : "Create Program"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
