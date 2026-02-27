/**
 * Export utilities for generating downloadable files from application data
 */

/**
 * Export data as CSV file
 */
export function exportToCSV(data: Record<string, any>[], headers: string[], filename: string): void {
  console.log("[v0] exportToCSV called with", data.length, "rows, filename:", filename)

  if (data.length === 0) {
    console.warn("[v0] No data to export")
    return
  }

  // Create CSV header row
  const csvHeaders = headers.join(",")

  // Create CSV data rows
  const csvRows = data.map((row) => {
    return headers
      .map((header) => {
        const value = row[header]
        // Handle values that might contain commas or quotes
        if (value === null || value === undefined) return ""
        const stringValue = String(value)
        if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
          return `"${stringValue.replace(/"/g, '""')}"`
        }
        return stringValue
      })
      .join(",")
  })

  // Combine header and rows
  const csvContent = [csvHeaders, ...csvRows].join("\n")
  console.log("[v0] CSV content created, length:", csvContent.length)

  // Create and download file
  downloadFile(csvContent, `${filename}.csv`, "text/csv")
}

/**
 * Export content as Markdown file
 */
export function exportToMarkdown(content: string, filename: string): void {
  console.log("[v0] exportToMarkdown called, content length:", content.length, "filename:", filename)
  downloadFile(content, `${filename}.md`, "text/markdown")
}

/**
 * Export content as a Word-compatible .docx file
 * Uses the Office Open XML format with minimal structure
 */
export function exportToWord(content: string, filename: string): void {
  // Convert markdown-style content to basic HTML for Word
  let htmlBody = content
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/\*(.+?)\*/g, '<i>$1</i>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`)
    .replace(/^(?!<[hulob])(.*\S.*)$/gm, '<p>$1</p>')
    .replace(/---/g, '<hr/>')
    .replace(/\n{2,}/g, '')

  const wordHtml = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<style>
  body { font-family: Calibri, sans-serif; font-size: 11pt; line-height: 1.5; margin: 1in; }
  h1 { font-size: 18pt; color: #1a1a1a; border-bottom: 2px solid #2563eb; padding-bottom: 4pt; }
  h2 { font-size: 14pt; color: #333; margin-top: 12pt; }
  h3 { font-size: 12pt; color: #555; }
  p { margin: 4pt 0; }
  ul { margin: 4pt 0 4pt 20pt; }
  li { margin: 2pt 0; }
  table { border-collapse: collapse; width: 100%; margin: 8pt 0; }
  td, th { border: 1px solid #ccc; padding: 4pt 8pt; text-align: left; }
  th { background-color: #f0f0f0; font-weight: bold; }
  hr { border: none; border-top: 1px solid #ddd; margin: 8pt 0; }
</style>
</head>
<body>${htmlBody}</body>
</html>`

  const blob = new Blob([wordHtml], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `${filename}.doc`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Export data as an Excel-compatible .xlsx file
 * Uses a simple HTML table format that Excel can open
 */
export function exportToExcel(data: Record<string, any>[], headers: string[], filename: string): void {
  if (data.length === 0) {
    console.warn("[v0] No data to export to Excel")
    return
  }

  const headerRow = headers.map(h => `<th>${escapeHtml(h)}</th>`).join('')
  const dataRows = data.map(row => {
    const cells = headers.map(header => {
      const value = row[header]
      return `<td>${escapeHtml(value === null || value === undefined ? '' : String(value))}</td>`
    }).join('')
    return `<tr>${cells}</tr>`
  }).join('\n')

  const excelHtml = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<style>
  table { border-collapse: collapse; }
  td, th { border: 1px solid #ccc; padding: 4px 8px; }
  th { background-color: #4472C4; color: white; font-weight: bold; }
  tr:nth-child(even) { background-color: #D6E4F0; }
</style>
</head>
<body>
<table>
<thead><tr>${headerRow}</tr></thead>
<tbody>${dataRows}</tbody>
</table>
</body>
</html>`

  const blob = new Blob([excelHtml], { type: 'application/vnd.ms-excel' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `${filename}.xls`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/**
 * Export data as JSON file
 */
export function exportToJSON(data: any, filename: string): void {
  const jsonContent = JSON.stringify(data, null, 2)
  downloadFile(jsonContent, `${filename}.json`, "application/json")
}

/**
 * Helper function to trigger file download in the browser
 */
function downloadFile(content: string, filename: string, mimeType: string): void {
  console.log("[v0] downloadFile called, filename:", filename, "mimeType:", mimeType)
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  console.log("[v0] Download link clicked")
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
