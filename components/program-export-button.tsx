"use client"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Download, FileText, Printer } from "lucide-react"
import { exportToMarkdown, exportToJSON } from "@/lib/export-utils"
import { useToast } from "@/hooks/use-toast"

interface ProgramExportButtonProps {
  program: any
  groupedElements: {
    inputs: any[]
    activities: any[]
    short_term_outcomes: any[]
    mid_term_outcomes: any[]
    long_term_outcomes: any[]
    impacts: any[]
  }
}

export function ProgramExportButton({ program, groupedElements }: ProgramExportButtonProps) {
  const { toast } = useToast()

  const handlePrint = () => {
    window.print()
  }

  const handleExportMarkdown = () => {
    let markdown = `# ${program.name}\n\n`
    if (program.description) {
      markdown += `${program.description}\n\n`
    }
    markdown += `---\n\n`

    const sections = [
      { title: "Inputs (Resources)", items: groupedElements.inputs },
      { title: "Activities", items: groupedElements.activities },
      { title: "Short-term Outcomes", items: groupedElements.short_term_outcomes },
      { title: "Mid-term Outcomes", items: groupedElements.mid_term_outcomes },
      { title: "Long-term Outcomes", items: groupedElements.long_term_outcomes },
      { title: "Impacts", items: groupedElements.impacts },
    ]

    sections.forEach((section) => {
      markdown += `## ${section.title}\n\n`
      if (section.items.length === 0) {
        markdown += `*No ${section.title.toLowerCase()} defined*\n\n`
      } else {
        section.items.forEach((item) => {
          markdown += `- **${item.title}**\n`
          if (item.description) {
            markdown += `  ${item.description}\n`
          }
        })
        markdown += `\n`
      }
    })

    exportToMarkdown(markdown, `program-${program.name.toLowerCase().replace(/\s+/g, "-")}`)
    toast({
      title: "Program exported",
      description: "Program details exported as Markdown",
    })
  }

  const handleExportJSON = () => {
    const data = {
      program: {
        name: program.name,
        description: program.description,
        created_at: program.created_at,
      },
      elements: groupedElements,
    }
    exportToJSON(data, `program-${program.name.toLowerCase().replace(/\s+/g, "-")}`)
    toast({
      title: "Program exported",
      description: "Program details exported as JSON",
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export / Print
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-2" />
          Print
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleExportMarkdown}>
          <FileText className="h-4 w-4 mr-2" />
          Export as Markdown
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportJSON}>
          <FileText className="h-4 w-4 mr-2" />
          Export as JSON
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
