"use client"

import type React from "react"

import { useState, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Loader2, Plus, Save, ArrowRight, Trash2, Download } from "lucide-react"

interface ProgramElement {
  id: string
  element_type: string
  title: string
  description: string
  position_x: number
  position_y: number
}

interface Node {
  id: string
  x: number
  y: number
  label: string
  elementType: string
}

interface Edge {
  id: string
  source: string
  target: string
}

interface LogicModelEditorProps {
  programId: string
  elements: ProgramElement[]
  existingModel?: { nodes: Node[]; edges: Edge[] }
}

const elementTypeColors = {
  input: "#DBEAFE",
  activity: "#D1FAE5",
  short_term_outcome: "#FEF3C7",
  mid_term_outcome: "#FED7AA",
  long_term_outcome: "#FECACA",
  impact: "#E9D5FF",
}

const elementTypeLabels = {
  input: "Input",
  activity: "Activity",
  short_term_outcome: "Short-term Outcome",
  mid_term_outcome: "Mid-term Outcome",
  long_term_outcome: "Long-term Outcome",
  impact: "Impact",
}

export default function LogicModelEditor({ programId, elements, existingModel }: LogicModelEditorProps) {
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)
  const [isAddingNode, setIsAddingNode] = useState(false)
  const [newNodeContent, setNewNodeContent] = useState("")
  const [newNodeType, setNewNodeType] = useState<string>("input")
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null)
  const [draggedNode, setDraggedNode] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const svgRef = useRef<SVGSVGElement>(null)

  const [nodes, setNodes] = useState<Node[]>(() => {
    if (existingModel?.nodes) return existingModel.nodes

    const elementsByType: Record<string, ProgramElement[]> = {}
    elements.forEach((element) => {
      if (!elementsByType[element.element_type]) {
        elementsByType[element.element_type] = []
      }
      elementsByType[element.element_type].push(element)
    })

    const typeOrder = ["input", "activity", "short_term_outcome", "mid_term_outcome", "long_term_outcome", "impact"]
    const nodes: Node[] = []

    typeOrder.forEach((type, columnIndex) => {
      const elementsOfType = elementsByType[type] || []
      elementsOfType.forEach((element, rowIndex) => {
        nodes.push({
          id: element.id,
          x: columnIndex * 220 + 50,
          y: rowIndex * 120 + 50,
          label: element.title,
          elementType: element.element_type,
        })
      })
    })

    return nodes
  })

  const [edges, setEdges] = useState<Edge[]>(existingModel?.edges || [])

  const handleMouseDown = (nodeId: string, e: React.MouseEvent) => {
    console.log("[v0] Mouse down on node:", nodeId)
    e.stopPropagation()
    const node = nodes.find((n) => n.id === nodeId)
    if (!node || !svgRef.current) return

    const rect = svgRef.current.getBoundingClientRect()
    setDraggedNode(nodeId)
    setDragOffset({
      x: e.clientX - rect.left - node.x,
      y: e.clientY - rect.top - node.y,
    })
  }

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!draggedNode || !svgRef.current) return

      const rect = svgRef.current.getBoundingClientRect()
      let x = e.clientX - rect.left - dragOffset.x
      let y = e.clientY - rect.top - dragOffset.y

      x = Math.max(0, Math.min(x, 1200)) // SVG width - node width
      y = Math.max(0, Math.min(y, 520)) // SVG height - node height

      console.log("[v0] Dragging node to:", x, y)

      setNodes((prev) => prev.map((node) => (node.id === draggedNode ? { ...node, x, y } : node)))
    },
    [draggedNode, dragOffset],
  )

  const handleMouseUp = () => {
    if (draggedNode) {
      console.log("[v0] Mouse up, ending drag")
    }
    setDraggedNode(null)
  }

  const handleNodeClick = (nodeId: string) => {
    console.log("[v0] Node clicked:", nodeId, "connectingFrom:", connectingFrom)
    if (draggedNode) {
      console.log("[v0] Ignoring click during drag")
      return
    }

    if (connectingFrom === null) {
      setConnectingFrom(nodeId)
    } else if (connectingFrom !== nodeId) {
      const newEdge: Edge = {
        id: `edge-${Date.now()}`,
        source: connectingFrom,
        target: nodeId,
      }
      setEdges((prev) => [...prev, newEdge])
      setConnectingFrom(null)
    } else {
      setConnectingFrom(null)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const response = await fetch(`/api/programs/${programId}/logic-model`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodes, edges }),
      })

      if (!response.ok) throw new Error("Failed to save logic model")
      alert("Logic model saved successfully!")
    } catch (error) {
      console.error("[v0] Error saving logic model:", error)
      alert("Failed to save logic model")
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddNode = () => {
    if (!newNodeContent.trim()) return

    const newNode: Node = {
      id: `custom-${Date.now()}`,
      x: 400,
      y: 300,
      label: newNodeContent,
      elementType: newNodeType,
    }

    setNodes((prev) => [...prev, newNode])
    setNewNodeContent("")
    setIsAddingNode(false)
  }

  const handleDeleteEdge = (edgeId: string) => {
    setEdges((prev) => prev.filter((edge) => edge.id !== edgeId))
  }

  const handleExportPDF = () => {
    if (!svgRef.current) return

    // Clone the SVG so we can modify it for export without affecting the UI
    const svgClone = svgRef.current.cloneNode(true) as SVGSVGElement

    // Compute bounding box of all nodes to crop whitespace
    let minX = Infinity, minY = Infinity, maxX = 0, maxY = 0
    nodes.forEach(node => {
      minX = Math.min(minX, node.x)
      minY = Math.min(minY, node.y)
      maxX = Math.max(maxX, node.x + 200) // node width
      maxY = Math.max(maxY, node.y + 80)  // node height
    })
    const padding = 40
    const cropW = maxX - minX + padding * 2
    const cropH = maxY - minY + padding * 2
    svgClone.setAttribute("viewBox", `${minX - padding} ${minY - padding} ${cropW} ${cropH}`)
    svgClone.setAttribute("width", String(cropW))
    svgClone.setAttribute("height", String(cropH))

    // Inline the foreignObject text styles so they render in the print window
    const fos = svgClone.querySelectorAll("foreignObject div")
    fos.forEach(div => {
      ;(div as HTMLElement).style.fontFamily = "sans-serif"
      ;(div as HTMLElement).style.fontSize = "11px"
      ;(div as HTMLElement).style.fontWeight = "500"
      ;(div as HTMLElement).style.color = "#0f172a"
      ;(div as HTMLElement).style.display = "flex"
      ;(div as HTMLElement).style.alignItems = "center"
      ;(div as HTMLElement).style.justifyContent = "center"
      ;(div as HTMLElement).style.height = "100%"
      ;(div as HTMLElement).style.textAlign = "center"
      ;(div as HTMLElement).style.padding = "8px"
    })

    const svgData = new XMLSerializer().serializeToString(svgClone)

    // Build a legend from the element types present
    const typesPresent = [...new Set(nodes.map(n => n.elementType))]
    const legendHtml = typesPresent.map(type => {
      const color = elementTypeColors[type as keyof typeof elementTypeColors] || "#eee"
      const label = elementTypeLabels[type as keyof typeof elementTypeLabels] || type
      return `<span style="display:inline-flex;align-items:center;gap:6px;margin-right:16px;">
        <span style="width:16px;height:16px;border-radius:4px;background:${color};border:1px solid #94a3b8;display:inline-block;"></span>
        <span>${label}</span>
      </span>`
    }).join("")

    const printWindow = window.open("", "_blank")
    if (!printWindow) return

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Logic Model</title>
        <style>
          @page { size: landscape; margin: 0.5in; }
          body { font-family: Calibri, sans-serif; margin: 0; padding: 20px; }
          h1 { font-size: 20px; color: #1a1a1a; margin-bottom: 4px; }
          .legend { margin: 12px 0 16px; font-size: 12px; color: #475569; }
          svg { max-width: 100%; height: auto; }
        </style>
      </head>
      <body>
        <h1>Program Logic Model</h1>
        <div class="legend">${legendHtml}</div>
        ${svgData}
        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); window.close(); }, 300);
          };
        <\/script>
      </body>
      </html>
    `)
    printWindow.document.close()
  }

  const handleContinue = () => {
    router.push(`/programs/${programId}/evaluation-questions`)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Module 2: Program Theory Logic Model</CardTitle>
          <CardDescription>
            Click a box to start connecting, then click another box to create an arrow. Drag boxes to reposition.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Dialog open={isAddingNode} onOpenChange={setIsAddingNode}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Box
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Element</DialogTitle>
                  <DialogDescription>Add a new box to your logic model</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="node-type">Element Type</Label>
                    <Select value={newNodeType} onValueChange={setNewNodeType}>
                      <SelectTrigger id="node-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="input">Input</SelectItem>
                        <SelectItem value="activity">Activity</SelectItem>
                        <SelectItem value="short_term_outcome">Short-term Outcome</SelectItem>
                        <SelectItem value="mid_term_outcome">Mid-term Outcome</SelectItem>
                        <SelectItem value="long_term_outcome">Long-term Outcome</SelectItem>
                        <SelectItem value="impact">Impact</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="node-content">Content</Label>
                    <Input
                      id="node-content"
                      value={newNodeContent}
                      onChange={(e) => setNewNodeContent(e.target.value)}
                      placeholder="Enter element description"
                    />
                  </div>
                  <Button onClick={handleAddNode} className="w-full">
                    Add Element
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Button size="sm" onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </>
              )}
            </Button>
            <Button size="sm" variant="outline" onClick={handleExportPDF}>
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
            {connectingFrom && (
              <Button size="sm" variant="outline" onClick={() => setConnectingFrom(null)}>
                Cancel Connection
              </Button>
            )}
          </div>

          <div className="border-2 border-slate-200 rounded-lg bg-white overflow-auto">
            <svg
              ref={svgRef}
              width="1400"
              height="600"
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              className="cursor-default"
            >
              {/* Draw edges */}
              <defs>
                <marker
                  id="arrowhead"
                  markerWidth="10"
                  markerHeight="10"
                  refX="9"
                  refY="3"
                  orient="auto"
                  markerUnits="strokeWidth"
                >
                  <path d="M0,0 L0,6 L9,3 z" fill="#64748b" />
                </marker>
              </defs>

              {edges.map((edge) => {
                const sourceNode = nodes.find((n) => n.id === edge.source)
                const targetNode = nodes.find((n) => n.id === edge.target)
                if (!sourceNode || !targetNode) return null

                return (
                  <line
                    key={edge.id}
                    x1={sourceNode.x + 100}
                    y1={sourceNode.y + 40}
                    x2={targetNode.x}
                    y2={targetNode.y + 40}
                    stroke="#64748b"
                    strokeWidth="2"
                    markerEnd="url(#arrowhead)"
                  />
                )
              })}

              {/* Draw nodes */}
              {nodes.map((node) => (
                <g key={node.id}>
                  <rect
                    x={node.x}
                    y={node.y}
                    width="200"
                    height="80"
                    fill={elementTypeColors[node.elementType as keyof typeof elementTypeColors]}
                    stroke={connectingFrom === node.id ? "#3b82f6" : "#94a3b8"}
                    strokeWidth={connectingFrom === node.id ? "3" : "2"}
                    rx="8"
                    onMouseDown={(e) => handleMouseDown(node.id, e)}
                    onClick={() => handleNodeClick(node.id)}
                    className="cursor-move hover:stroke-slate-400"
                  />
                  <foreignObject x={node.x} y={node.y} width="200" height="80" style={{ pointerEvents: "none" }}>
                    <div className="p-2 text-xs font-medium text-slate-900 flex items-center justify-center h-full text-center">
                      {node.label}
                    </div>
                  </foreignObject>
                </g>
              ))}
            </svg>
          </div>

          <div className="mt-4 p-4 bg-slate-50 rounded-lg">
            <h3 className="font-semibold mb-2">Instructions:</h3>
            <ul className="text-sm text-slate-600 space-y-1">
              <li>• Drag boxes to reposition them</li>
              <li>• Click one box, then click another to create an arrow between them</li>
              <li>• Use the list below to delete arrows</li>
              <li>• Use "Add Box" to add new elements</li>
              <li>• Click "Save" to save your changes</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {edges.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Relationships ({edges.length})</CardTitle>
            <CardDescription>Current arrows in your logic model</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {edges.map((edge) => {
                const sourceNode = nodes.find((n) => n.id === edge.source)
                const targetNode = nodes.find((n) => n.id === edge.target)
                return (
                  <div key={edge.id} className="flex items-center justify-between p-3 bg-slate-50 rounded">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium">{sourceNode?.label}</span>
                      <span className="text-slate-500">→</span>
                      <span className="font-medium">{targetNode?.label}</span>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => handleDeleteEdge(edge.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="py-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg text-blue-900 mb-1">Next Step: Evaluation Questions</h3>
              <p className="text-blue-700 text-sm">Generate evaluation questions based on your logic model</p>
            </div>
            <Button onClick={handleContinue}>
              Continue <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
