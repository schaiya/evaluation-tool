"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Download, FileText, Printer } from "lucide-react"
import { useState } from "react"
import { useToast } from "@/hooks/use-toast"

interface ExportButtonProps {
  moduleName: string
  programName: string
  contentRef: React.RefObject<HTMLElement>
  onExportPDF?: () => Promise<void>
  onExportWord?: () => Promise<void>
  onExportCSV?: () => Promise<void>
}

export function ExportButton({
  moduleName,
  programName,
  contentRef,
  onExportPDF,
  onExportWord,
  onExportCSV,
}: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false)
  const { toast } = useToast()

  const handlePrint = () => {
    console.log("[v0] Print button clicked")
    window.print()
  }

  const handleExportPDF = async () => {
    console.log("[v0] Export PDF clicked, has callback:", !!onExportPDF)
    if (onExportPDF) {
      setIsExporting(true)
      try {
        await onExportPDF()
        toast({
          title: "PDF exported",
          description: `${moduleName} has been exported as PDF`,
        })
      } catch (error) {
        console.log("[v0] PDF export error:", error)
        toast({
          title: "Export failed",
          description: "Failed to export PDF. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsExporting(false)
      }
    } else {
      // Default browser print to PDF
      window.print()
    }
  }

  const handleExportWord = async () => {
    console.log("[v0] Export Word clicked, has callback:", !!onExportWord)
    if (onExportWord) {
      setIsExporting(true)
      try {
        await onExportWord()
        toast({
          title: "Word document exported",
          description: `${moduleName} has been exported as Word document`,
        })
      } catch (error) {
        console.log("[v0] Word export error:", error)
        toast({
          title: "Export failed",
          description: "Failed to export Word document. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsExporting(false)
      }
    }
  }

  const handleExportCSV = async () => {
    console.log("[v0] Export CSV clicked, has callback:", !!onExportCSV)
    if (onExportCSV) {
      setIsExporting(true)
      try {
        await onExportCSV()
        toast({
          title: "CSV exported",
          description: `${moduleName} has been exported as CSV`,
        })
      } catch (error) {
        console.log("[v0] CSV export error:", error)
        toast({
          title: "Export failed",
          description: "Failed to export CSV. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsExporting(false)
      }
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={isExporting}>
          <Download className="h-4 w-4 mr-2" />
          {isExporting ? "Exporting..." : "Export / Print"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-2" />
          Print
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleExportPDF}>
          <FileText className="h-4 w-4 mr-2" />
          Export as PDF
        </DropdownMenuItem>
        {onExportWord && (
          <DropdownMenuItem onClick={handleExportWord}>
            <FileText className="h-4 w-4 mr-2" />
            Export as Word
          </DropdownMenuItem>
        )}
        {onExportCSV && (
          <DropdownMenuItem onClick={handleExportCSV}>
            <FileText className="h-4 w-4 mr-2" />
            Export as CSV
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
