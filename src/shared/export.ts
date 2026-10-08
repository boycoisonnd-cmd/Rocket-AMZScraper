/**
 * Data export engine: CSV conversion and file download utilities.
 */

import Papa from 'papaparse'

/**
 * Flattens a nested object into a 1-level record for clean CSV columns.
 */
export function flattenObject(
  obj: Record<string, any>,
  prefix: string = ''
): Record<string, any> {
  const flattened: Record<string, any> = {}

  for (const [key, val] of Object.entries(obj)) {
    const propName = prefix ? `${prefix}_${key}` : key
    if (val === null || val === undefined) {
      flattened[propName] = ''
    } else if (Array.isArray(val)) {
      if (val.length > 0 && typeof val[0] === 'object') {
        flattened[propName] = JSON.stringify(val)
      } else {
        flattened[propName] = val.join('; ')
      }
    } else if (typeof val === 'object') {
      Object.assign(flattened, flattenObject(val, propName))
    } else {
      flattened[propName] = val
    }
  }

  return flattened
}

/**
 * Converts items to CSV string.
 */
export function exportToCsv(data: any): string {
  let rows: any[] = []

  if (Array.isArray(data)) {
    rows = data.map((item) => (typeof item === 'object' ? flattenObject(item) : { value: item }))
  } else if (typeof data === 'object' && data !== null) {
    if (Array.isArray(data.results)) {
      rows = data.results.map((item: any) => flattenObject(item))
    } else if (Array.isArray(data.items)) {
      rows = data.items.map((item: any) => flattenObject(item))
    } else if (Array.isArray(data.offers)) {
      rows = data.offers.map((item: any) => flattenObject(item))
    } else if (Array.isArray(data.products)) {
      rows = data.products.map((item: any) => flattenObject(item))
    } else if (Array.isArray(data.top_reviews)) {
      rows = data.top_reviews.map((item: any) => flattenObject(item))
    } else {
      rows = [flattenObject(data)]
    }
  } else {
    rows = [{ value: data }]
  }

  return Papa.unparse(rows)
}

/**
 * Triggers a browser file download for text/blob content with UTF-8 BOM.
 */
export function downloadFile(content: string, filename: string, mimeType: string = 'text/csv'): void {
  // \uFEFF ensures Excel and Windows correctly parse UTF-8 characters without mojibake
  const bomPrefix = mimeType.includes('csv') ? '\uFEFF' : ''
  const blob = new Blob([bomPrefix + content], { type: `${mimeType};charset=utf-8;` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Directly exports data to a CSV file.
 */
export function exportToCsvFile(data: any, filename: string = 'amazon_data.csv'): void {
  const csv = exportToCsv(data)
  downloadFile(csv, filename, 'text/csv')
}

/**
 * Directly exports data to a JSON file.
 */
export function exportToJsonFile(data: any, filename: string = 'amazon_data.json'): void {
  const jsonStr = typeof data === 'string' ? data : JSON.stringify(data, null, 2)
  downloadFile(jsonStr, filename, 'application/json')
}

// Aliases for convenience
export const exportToJson = exportToJsonFile

/**
 * Copies formatted text to the user's clipboard.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const textarea = document.createElement('textarea')
    textarea.value = text
    document.body.appendChild(textarea)
    textarea.select()
    const success = document.execCommand('copy')
    document.body.removeChild(textarea)
    return success
  }
}
