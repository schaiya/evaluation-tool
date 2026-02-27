"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, FileDown } from "lucide-react"

interface FullReportExportButtonProps {
  programId: string
}

const elementTypeColors: Record<string, { bg: string; text: string; label: string }> = {
  input: { bg: "#DBEAFE", text: "#1E3A5F", label: "Inputs" },
  activity: { bg: "#D1FAE5", text: "#065F46", label: "Activities" },
  short_term_outcome: { bg: "#FEF3C7", text: "#78350F", label: "Short-term Outcomes" },
  mid_term_outcome: { bg: "#FED7AA", text: "#7C2D12", label: "Mid-term Outcomes" },
  long_term_outcome: { bg: "#FECACA", text: "#7F1D1D", label: "Long-term Outcomes" },
  impact: { bg: "#E9D5FF", text: "#581C87", label: "Impacts" },
}

// Flow order for the logic model
const flowOrder = ["input", "activity", "short_term_outcome", "mid_term_outcome", "long_term_outcome", "impact"]

function buildProgramOverviewSection(data: any): string {
  const { program, elements } = data

  const grouped: Record<string, any[]> = {}
  for (const el of elements) {
    if (!grouped[el.element_type]) grouped[el.element_type] = []
    grouped[el.element_type].push(el)
  }

  let html = `<div class="section">
    <h2>1. Program Overview</h2>
    <p class="meta">${program.description || "No description provided."}</p>
    <table>
      <thead><tr><th>Category</th><th>Elements</th></tr></thead>
      <tbody>`

  for (const type of flowOrder) {
    const items = grouped[type]
    if (!items || items.length === 0) continue
    const colors = elementTypeColors[type]
    html += `<tr>
      <td style="font-weight:600;background:${colors.bg};color:${colors.text};white-space:nowrap;">${colors.label}</td>
      <td>${items.map((el: any) => el.title).join(", ")}</td>
    </tr>`
  }

  html += `</tbody></table></div>`
  return html
}

function buildLogicModelSection(data: any): string {
  const { logicModel } = data
  if (!logicModel || !logicModel.nodes || logicModel.nodes.length === 0) {
    return `<div class="section page-break">
      <h2>2. Logic Model</h2>
      <p class="empty">No logic model has been created yet.</p>
    </div>`
  }

  const nodes = logicModel.nodes as any[]
  const edges = logicModel.edges as any[]

  // Group nodes by type in flow order
  const columns: Record<string, any[]> = {}
  for (const type of flowOrder) {
    const typeNodes = nodes.filter(n => n.elementType === type)
    if (typeNodes.length > 0) columns[type] = typeNodes
  }

  // Build a connection map for showing arrows between columns
  const connectionMap = new Map<string, string[]>()
  for (const edge of (edges || [])) {
    const sourceNode = nodes.find(n => n.id === edge.source)
    const targetNode = nodes.find(n => n.id === edge.target)
    if (sourceNode && targetNode) {
      const key = `${sourceNode.elementType}->${targetNode.elementType}`
      if (!connectionMap.has(key)) connectionMap.set(key, [])
      connectionMap.get(key)!.push(`${sourceNode.label} -> ${targetNode.label}`)
    }
  }

  let html = `<div class="section page-break landscape-hint">
    <h2>2. Logic Model</h2>
    <div class="logic-model-flow">`

  const columnTypes = Object.keys(columns)
  columnTypes.forEach((type, colIndex) => {
    const colors = elementTypeColors[type]
    html += `<div class="lm-column">
      <div class="lm-header" style="background:${colors.bg};color:${colors.text};">${colors.label}</div>`
    
    for (const node of columns[type]) {
      html += `<div class="lm-node" style="background:${colors.bg};color:${colors.text};">${node.label}</div>`
    }
    html += `</div>`

    // Add arrow between columns
    if (colIndex < columnTypes.length - 1) {
      html += `<div class="lm-arrow">&#x27A1;</div>`
    }
  })

  html += `</div>`

  // Add connection details table
  if (edges && edges.length > 0) {
    html += `<h3 style="margin-top:16px;">Relationships</h3>
    <table class="sm-table">
      <thead><tr><th>From</th><th>To</th></tr></thead>
      <tbody>`
    for (const edge of edges) {
      const src = nodes.find(n => n.id === edge.source)
      const tgt = nodes.find(n => n.id === edge.target)
      if (src && tgt) {
        html += `<tr><td>${src.label}</td><td>${tgt.label}</td></tr>`
      }
    }
    html += `</tbody></table>`
  }

  html += `</div>`
  return html
}

function buildFlavorSection(data: any): string {
  const { flavor, standards } = data
  if (!flavor || !flavor.is_active) {
    return `<div class="section page-break">
      <h2>3. Evaluation Flavor</h2>
      <p class="empty">Evaluation flavor has not been configured.</p>
    </div>`
  }

  let html = `<div class="section page-break">
    <h2>3. Evaluation Flavor</h2>`

  // Audiences
  if (flavor.flavor_audiences?.length > 0) {
    html += `<h3>Audiences</h3>
    <table>
      <thead><tr><th>Audience</th><th>Preferred Evidence</th><th>Preferred Methods</th><th>Reporting Style</th></tr></thead>
      <tbody>`
    for (const aud of flavor.flavor_audiences) {
      const name = aud.audience_type === "custom" ? aud.custom_name : aud.audience_type
      html += `<tr>
        <td style="font-weight:600;text-transform:capitalize;">${name}</td>
        <td>${(aud.preferred_evidence || []).join(", ")}</td>
        <td>${(aud.preferred_methods || []).join(", ")}</td>
        <td style="text-transform:capitalize;">${aud.reporting_style || "N/A"}</td>
      </tr>`
    }
    html += `</tbody></table>`
  }

  // Approaches
  if (flavor.flavor_approaches?.length > 0) {
    html += `<h3>Evaluation Approaches</h3>
    <table>
      <thead><tr><th>Approach</th><th>Guiding Avatar</th></tr></thead>
      <tbody>`
    for (const app of flavor.flavor_approaches) {
      const name = app.approach_type === "custom" ? app.custom_name : app.approach_type
      const avatar = app.avatars?.name || "N/A"
      html += `<tr>
        <td style="font-weight:600;text-transform:capitalize;">${name}</td>
        <td>${avatar}</td>
      </tr>`
    }
    html += `</tbody></table>`
  }

  // Funder requirements
  if (flavor.funder_requirements?.[0]) {
    const req = flavor.funder_requirements[0]
    html += `<h3>Funder Requirements</h3>`
    if (flavor.funder_name) {
      html += `<p><b>Funder:</b> ${flavor.funder_name}</p>`
    }
    if (req.evaluation_requirements?.length > 0) {
      html += `<ul>${req.evaluation_requirements.map((r: string) => `<li>${r}</li>`).join("")}</ul>`
    }
    if (req.required_metrics?.length > 0) {
      html += `<p><b>Required Metrics:</b></p>
      <ul>${req.required_metrics.map((m: string) => `<li>${m}</li>`).join("")}</ul>`
    }
  }

  // Standards
  if (standards?.length > 0) {
    html += `<h3>Selected Evaluation Standards</h3>
    <table>
      <thead><tr><th>Standard</th><th>Category</th></tr></thead>
      <tbody>`
    for (const std of standards) {
      html += `<tr>
        <td style="font-weight:600;">${std.standard_name}</td>
        <td style="text-transform:capitalize;">${std.category || ""}</td>
      </tr>`
    }
    html += `</tbody></table>`
  }

  html += `</div>`
  return html
}

function buildEvalPlanSection(data: any): string {
  const { evalPlan, questions } = data
  if (!evalPlan?.plan_data || evalPlan.plan_data.length === 0) {
    return `<div class="section page-break">
      <h2>4. Evaluation Plan</h2>
      <p class="empty">No evaluation plan has been generated yet.</p>
    </div>`
  }

  const items = evalPlan.plan_data as any[]

  // Build question lookup
  const qMap = new Map<string, string>()
  for (const q of questions) qMap.set(q.id, q.question)

  // Group by timeline
  const groups: Record<string, any[]> = {}
  for (const item of items) {
    const tl = item.timeline || "Unscheduled"
    if (!groups[tl]) groups[tl] = []
    groups[tl].push(item)
  }

  let html = `<div class="section page-break landscape-hint">
    <h2>4. Evaluation Plan</h2>
    <div class="meta">
      <b>Period:</b> ${evalPlan.start_date ? new Date(evalPlan.start_date).toLocaleDateString() : "TBD"} &ndash; 
      ${evalPlan.end_date ? new Date(evalPlan.end_date).toLocaleDateString() : "TBD"} &nbsp;|&nbsp;
      <b>Duration:</b> ${evalPlan.duration_months || "N/A"} months &nbsp;|&nbsp;
      <b>Indicators:</b> ${items.length}
    </div>
    <table>
      <thead><tr>
        <th>Timeline</th>
        <th>Indicator</th>
        <th>Metric</th>
        <th>Data Source</th>
        <th>Method</th>
        <th>Frequency</th>
      </tr></thead>
      <tbody>`

  for (const [timeline, groupItems] of Object.entries(groups)) {
    groupItems.forEach((item, i) => {
      html += `<tr>
        ${i === 0 ? `<td rowspan="${groupItems.length}" style="font-weight:600;background:#eff6ff;vertical-align:top;">${timeline}</td>` : ""}
        <td>${item.indicator_text || ""}</td>
        <td>${item.metric || ""}</td>
        <td>${item.data_source || ""}</td>
        <td>${item.collection_method || ""}</td>
        <td>${item.frequency || ""}</td>
      </tr>`
    })
  }

  html += `</tbody></table></div>`
  return html
}

function buildIndicatorsSection(data: any): string {
  const { indicators, questions } = data
  if (!indicators || indicators.length === 0) {
    return `<div class="section page-break">
      <h2>5. Indicators</h2>
      <p class="empty">No indicators have been generated yet.</p>
    </div>`
  }

  // Build question lookup
  const qMap = new Map<string, string>()
  for (const q of questions) qMap.set(q.id, q.question)

  // Show selected first, then others
  const selected = indicators.filter((i: any) => i.is_selected)
  const other = indicators.filter((i: any) => !i.is_selected)
  const ordered = [...selected, ...other]

  let html = `<div class="section page-break">
    <h2>5. Indicators</h2>
    <div class="meta"><b>Total:</b> ${indicators.length} &nbsp;|&nbsp; <b>Selected:</b> ${selected.length}</div>
    <table>
      <thead><tr>
        <th>#</th>
        <th>Indicator</th>
        <th>Related Question</th>
        <th>Metric</th>
        <th>Data Source</th>
        <th>Selected</th>
      </tr></thead>
      <tbody>`

  ordered.forEach((ind: any, i: number) => {
    const question = qMap.get(ind.question_id) || "N/A"
    html += `<tr${ind.is_selected ? ' style="background:#f0fdf4;"' : ""}>
      <td>${i + 1}</td>
      <td>${ind.indicator_text}</td>
      <td style="font-size:10px;max-width:200px;">${question}</td>
      <td>${ind.metric || ""}</td>
      <td>${ind.data_source || ""}</td>
      <td style="text-align:center;">${ind.is_selected ? "Yes" : ""}</td>
    </tr>`
  })

  html += `</tbody></table></div>`
  return html
}

const SECTION_LABELS: Record<string, string> = {
  logic_model: "Logic Model",
  evaluation_approach: "Evaluation Approach",
  evaluation_questions: "Evaluation Questions",
  indicators: "Indicators",
  evaluation_plan: "Evaluation Plan",
}

function stanceColor(stance: string): { bg: string; text: string; label: string } {
  if (stance === "agree") return { bg: "#d1fae5", text: "#065f46", label: "Agrees" }
  if (stance === "disagree") return { bg: "#fecaca", text: "#7f1d1d", label: "Disagrees" }
  return { bg: "#fef3c7", text: "#78350f", label: "Partially Agrees" }
}

function overallStanceLabel(stance: string): { bg: string; text: string; label: string } {
  if (stance === "agree") return { bg: "#059669", text: "#fff", label: "Overall: Supports this design" }
  if (stance === "disagree") return { bg: "#dc2626", text: "#fff", label: "Overall: Significant concerns" }
  return { bg: "#d97706", text: "#fff", label: "Overall: Mixed assessment" }
}

function buildCritiquesSection(data: any): string {
  const { critiques } = data
  if (!critiques || critiques.length === 0) {
    return `<div class="section page-break">
      <h2>6. Design Critiques</h2>
      <p class="empty">No design critiques have been generated yet.</p>
    </div>`
  }

  let html = `<div class="section page-break">
    <h2>6. Design Critiques</h2>
    <p class="meta">${critiques.length} evaluation theorist(s) reviewed this design.</p>`

  for (const critique of critiques) {
    const avatar = critique.avatars
    const cd = critique.critique_data
    const os = overallStanceLabel(critique.overall_stance || "partial")

    html += `<div class="critique-card">
      <div class="critique-header">
        <div>
          <span class="critic-name">${avatar?.name || "Unknown"}</span>
          <span class="critic-role">${avatar?.role || ""}</span>
        </div>
        <span class="stance-pill" style="background:${os.bg};color:${os.text};">${os.label}</span>
      </div>`

    // Overall assessment
    if (critique.overall_assessment) {
      html += `<div class="critique-quote">${critique.overall_assessment}</div>`
    }

    // Section stances
    html += `<table class="critique-table">
      <thead><tr><th>Section</th><th>Stance</th><th>Commentary</th></tr></thead>
      <tbody>`
    for (const [key, label] of Object.entries(SECTION_LABELS)) {
      const section = cd?.[key]
      if (!section) continue
      const sc = stanceColor(section.stance)
      html += `<tr>
        <td style="font-weight:600;white-space:nowrap;">${label}</td>
        <td><span class="stance-pill-sm" style="background:${sc.bg};color:${sc.text};">${sc.label}</span></td>
        <td style="font-size:9.5pt;">${section.commentary}</td>
      </tr>`
    }
    html += `</tbody></table>`

    // Strengths / Concerns / Recommendations in columns
    const hasMeta = (cd?.strengths?.length > 0) || (cd?.concerns?.length > 0) || (cd?.recommendations?.length > 0)
    if (hasMeta) {
      html += `<div class="critique-meta-grid">`
      if (cd.strengths?.length > 0) {
        html += `<div class="critique-meta-col">
          <div class="critique-meta-title" style="color:#059669;">Strengths</div>
          <ul>${cd.strengths.map((s: string) => `<li>${s}</li>`).join("")}</ul>
        </div>`
      }
      if (cd.concerns?.length > 0) {
        html += `<div class="critique-meta-col">
          <div class="critique-meta-title" style="color:#d97706;">Concerns</div>
          <ul>${cd.concerns.map((c: string) => `<li>${c}</li>`).join("")}</ul>
        </div>`
      }
      if (cd.recommendations?.length > 0) {
        html += `<div class="critique-meta-col">
          <div class="critique-meta-title" style="color:#2563eb;">Recommendations</div>
          <ul>${cd.recommendations.map((r: string) => `<li>${r}</li>`).join("")}</ul>
        </div>`
      }
      html += `</div>`
    }

    html += `</div>` // close critique-card
  }

  html += `</div>`
  return html
}

export function FullReportExportButton({ programId }: FullReportExportButtonProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleExport = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/programs/${programId}/full-report`)
      if (!response.ok) throw new Error("Failed to fetch report data")
      const data = await response.json()

      const programName = data.program?.name || "Evaluation Report"
      const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })

      // Generate narrative from guiding avatar
      let narrativeHtml = ""
      try {
        const narrativeRes = await fetch(`/api/programs/${programId}/full-report/narrative`, {
          method: "POST",
        })
        if (narrativeRes.ok) {
          const narrativeData = await narrativeRes.json()
          if (narrativeData.narrative) {
            const paragraphs = narrativeData.narrative
              .split("\n\n")
              .filter((p: string) => p.trim())
              .map((p: string) => `<p>${p.trim()}</p>`)
              .join("")

            narrativeHtml = `<div class="section page-break">
              <h2>Executive Narrative</h2>
              <div class="narrative-meta">
                Written from the perspective of <strong>${narrativeData.avatarName}</strong>, 
                guiding avatar for the <em style="text-transform:capitalize;">${narrativeData.approachType}</em> evaluation approach
              </div>
              <div class="narrative-body">${paragraphs}</div>
            </div>`
          }
        }
      } catch (e) {
        // Narrative is optional - continue without it
        console.warn("[v0] Narrative generation failed, continuing without it")
      }

      const coverHtml = `<div class="cover">
        <div class="cover-content">
          <h1>${programName}</h1>
          <div class="cover-subtitle">Comprehensive Evaluation Report</div>
          <div class="cover-date">${today}</div>
        </div>
      </div>`

      const overviewHtml = buildProgramOverviewSection(data)
      const logicModelHtml = buildLogicModelSection(data)
      const flavorHtml = buildFlavorSection(data)
      const evalPlanHtml = buildEvalPlanSection(data)
      const indicatorsHtml = buildIndicatorsSection(data)
      const critiquesHtml = buildCritiquesSection(data)

      const fullHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${programName} - Evaluation Report</title>
<style>
  @page {
    size: letter;
    margin: 0.6in 0.75in;
  }
  @page :first {
    margin: 0;
  }
  * { box-sizing: border-box; }
  body {
    font-family: Calibri, 'Segoe UI', sans-serif;
    font-size: 11pt;
    line-height: 1.5;
    color: #1e293b;
    margin: 0;
    padding: 0;
  }

  /* Cover Page */
  .cover {
    width: 100vw;
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%);
    color: white;
    page-break-after: always;
  }
  .cover-content { text-align: center; padding: 40px; }
  .cover h1 { font-size: 36pt; font-weight: 700; margin: 0 0 12px; line-height: 1.2; }
  .cover-subtitle { font-size: 16pt; font-weight: 300; opacity: 0.9; margin-bottom: 24px; }
  .cover-date { font-size: 12pt; opacity: 0.7; }

  /* Sections */
  .section { padding-top: 8px; }
  .page-break { page-break-before: always; }

  h2 {
    font-size: 18pt;
    color: #1e3a5f;
    border-bottom: 2.5px solid #2563eb;
    padding-bottom: 6px;
    margin: 0 0 14px;
  }
  h3 {
    font-size: 13pt;
    color: #334155;
    margin: 14px 0 8px;
  }
  .meta {
    color: #475569;
    font-size: 10pt;
    margin-bottom: 12px;
  }
  .empty {
    color: #94a3b8;
    font-style: italic;
    padding: 16px 0;
  }

  /* Tables */
  table {
    border-collapse: collapse;
    width: 100%;
    font-size: 10pt;
    margin-bottom: 12px;
  }
  th {
    background: #1e3a5f;
    color: white;
    padding: 7px 10px;
    text-align: left;
    font-weight: 600;
    font-size: 9.5pt;
  }
  td {
    border: 1px solid #cbd5e1;
    padding: 5px 10px;
    vertical-align: top;
  }
  tr:nth-child(even) td { background: #f8fafc; }
  .sm-table { font-size: 9pt; }
  .sm-table td, .sm-table th { padding: 3px 8px; }

  /* Logic Model Flow */
  .logic-model-flow {
    display: flex;
    align-items: flex-start;
    gap: 0;
    overflow-x: auto;
    padding: 12px 0;
  }
  .lm-column {
    min-width: 120px;
    max-width: 160px;
    flex-shrink: 0;
  }
  .lm-header {
    font-weight: 700;
    font-size: 9pt;
    text-align: center;
    padding: 6px 8px;
    border-radius: 6px 6px 0 0;
    border: 1px solid rgba(0,0,0,0.1);
    border-bottom: none;
  }
  .lm-node {
    font-size: 9pt;
    padding: 6px 8px;
    border: 1px solid rgba(0,0,0,0.1);
    border-top: none;
    text-align: center;
    word-wrap: break-word;
  }
  .lm-node:last-child { border-radius: 0 0 6px 6px; }
  .lm-arrow {
    display: flex;
    align-items: center;
    padding: 0 6px;
    font-size: 18pt;
    color: #94a3b8;
    flex-shrink: 0;
    margin-top: 30px;
  }

  /* Narrative */
  .narrative-meta {
    font-size: 10pt;
    color: #475569;
    font-style: italic;
    margin-bottom: 16px;
    padding: 10px 14px;
    background: #f8fafc;
    border-left: 3px solid #2563eb;
    border-radius: 0 4px 4px 0;
  }
  .narrative-body {
    font-size: 11.5pt;
    line-height: 1.7;
    color: #1e293b;
    max-width: 680px;
  }
  .narrative-body p {
    margin: 0 0 14px;
    text-indent: 24px;
  }
  .narrative-body p:first-child {
    text-indent: 0;
  }

  /* Critiques */
  .critique-card {
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 16px;
    page-break-inside: avoid;
  }
  .critique-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
  }
  .critic-name { font-weight: 700; font-size: 13pt; color: #1e293b; margin-right: 10px; }
  .critic-role { font-size: 10pt; color: #64748b; }
  .stance-pill {
    padding: 3px 12px;
    border-radius: 12px;
    font-size: 9pt;
    font-weight: 600;
    white-space: nowrap;
  }
  .stance-pill-sm {
    padding: 2px 8px;
    border-radius: 8px;
    font-size: 8.5pt;
    font-weight: 600;
    white-space: nowrap;
    display: inline-block;
  }
  .critique-quote {
    background: #f8fafc;
    border-left: 3px solid #94a3b8;
    padding: 10px 14px;
    font-style: italic;
    font-size: 10pt;
    color: #334155;
    margin-bottom: 12px;
    border-radius: 0 4px 4px 0;
    line-height: 1.6;
  }
  .critique-table { margin-bottom: 12px; }
  .critique-meta-grid {
    display: flex;
    gap: 16px;
    margin-top: 8px;
  }
  .critique-meta-col { flex: 1; }
  .critique-meta-title {
    font-weight: 700;
    font-size: 10pt;
    margin-bottom: 4px;
  }
  .critique-meta-col ul { margin: 0 0 0 16px; padding: 0; font-size: 9pt; }
  .critique-meta-col li { margin: 2px 0; }

  ul { margin: 4px 0 8px 20px; padding: 0; }
  li { margin: 2px 0; }

  /* Print footer */
  @media print {
    .cover { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    th, .lm-header, .lm-node { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    td[style] { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    tr[style] { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>
  ${coverHtml}
  ${narrativeHtml}
  ${overviewHtml}
  ${logicModelHtml}
  ${flavorHtml}
  ${evalPlanHtml}
  ${indicatorsHtml}
  ${critiquesHtml}
  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); window.close(); }, 400);
    };
  <\/script>
</body>
</html>`

      const printWindow = window.open("", "_blank")
      if (!printWindow) {
        alert("Please allow popups for this site to export the report.")
        return
      }
      printWindow.document.write(fullHtml)
      printWindow.document.close()
    } catch (error) {
      console.error("[v0] Error exporting full report:", error)
      alert("Failed to generate report. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button onClick={handleExport} disabled={isLoading} variant="default" size="lg">
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Generating Report & Narrative...
        </>
      ) : (
        <>
          <FileDown className="mr-2 h-4 w-4" />
          Export Full Report (PDF)
        </>
      )}
    </Button>
  )
}
