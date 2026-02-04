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
