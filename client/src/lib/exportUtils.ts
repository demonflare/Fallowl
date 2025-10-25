/**
 * Export utilities for generating CSV and other export formats
 */

/**
 * Convert array of objects to CSV string
 */
export function arrayToCSV<T extends Record<string, any>>(data: T[], columns?: string[]): string {
  if (data.length === 0) return '';

  // Use provided columns or extract from first row
  const headers = columns || Object.keys(data[0]);
  
  // Create CSV header row
  const csvHeaders = headers.map(h => escapeCSVValue(h)).join(',');
  
  // Create CSV data rows
  const csvRows = data.map(row => 
    headers.map(header => escapeCSVValue(row[header])).join(',')
  );
  
  return [csvHeaders, ...csvRows].join('\n');
}

/**
 * Escape special characters in CSV values
 */
function escapeCSVValue(value: any): string {
  if (value === null || value === undefined) return '';
  
  // Convert to string
  let stringValue = String(value);
  
  // Handle dates
  if (value instanceof Date) {
    stringValue = value.toISOString();
  }
  
  // Handle objects/arrays
  if (typeof value === 'object' && !(value instanceof Date)) {
    stringValue = JSON.stringify(value);
  }
  
  // Escape quotes and wrap in quotes if needed
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    stringValue = `"${stringValue.replace(/"/g, '""')}"`;
  }
  
  return stringValue;
}

/**
 * Download CSV file
 */
export function downloadCSV(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

/**
 * Export data to CSV file
 */
export function exportToCSV<T extends Record<string, any>>(
  data: T[],
  filename: string,
  columns?: string[]
): void {
  const csv = arrayToCSV(data, columns);
  downloadCSV(csv, filename);
}

/**
 * Format filename with timestamp
 */
export function getExportFilename(prefix: string, extension: string = 'csv'): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  return `${prefix}_${timestamp}.${extension}`;
}
