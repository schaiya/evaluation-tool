"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { ChevronDown } from "lucide-react"

const modules = [
  { name: "Program Overview", path: "" },
  { name: "Logic Model", path: "/logic-model" },
  { name: "Evaluation Flavor", path: "/evaluation-flavor" },
  { name: "Evaluation Questions", path: "/evaluation-questions" },
  { name: "Indicators", path: "/indicators" },
  { name: "Evaluation Plan", path: "/evaluation-plan" },
  { name: "Data Collection Tools", path: "/data-collection-tools" },
  { name: "Data Analysis", path: "/data-analysis" },
]

export default function ModuleNavigation({ programId }: { programId: string }) {
  const pathname = usePathname()
  const currentModule = modules.find((m) => pathname === `/programs/${programId}${m.path}`)

  return (
    <div className="flex items-center gap-4 mb-6">
      <Link href={`/programs/${programId}`} className="text-slate-600 hover:text-slate-900 transition-colors">
        ← Back to Program
      </Link>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2 bg-transparent">
            {currentModule?.name || "Navigate to Module"}
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          {modules.map((module) => {
            const isActive = pathname === `/programs/${programId}${module.path}`
            return (
              <DropdownMenuItem key={module.path} asChild>
                <Link
                  href={`/programs/${programId}${module.path}`}
                  className={isActive ? "bg-slate-100 font-medium" : ""}
                >
                  {module.name}
                </Link>
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
