/**
 * Simple CSV Parser - deployment-friendly implementation
 * This avoids external dependencies that cause module resolution issues
 */

export interface ParseOptions {
  columns?: boolean;
  skip_empty_lines?: boolean;
  trim?: boolean;
  cast?: boolean;
  [key: string]: any;
}

/**
 * Simple CSV parser that handles basic CSV parsing needs
 * Sufficient for our dealership import requirements
 */
export function parse(input: string | Buffer, options?: ParseOptions): any[] {
  let inputStr: string;
  if (input instanceof Buffer) {
    inputStr = input.toString('utf8');
  } else {
    inputStr = input as string;
  }
  
  const lines = inputStr.split(/\r?\n/);
  const results: any[] = [];
  
  if (lines.length === 0) {
    return results;
  }
  
  // Parse headers if columns option is true
  let headers: string[] | null = null;
  let startIndex = 0;
  
  if (options?.columns === true && lines.length > 0) {
    headers = parseCSVLine(lines[0], options);
    startIndex = 1;
  }
  
  // Parse data rows
  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];
    
    // Skip empty lines if requested
    if (options?.skip_empty_lines !== false && line.trim() === '') {
      continue;
    }
    
    const values = parseCSVLine(line, options);
    
    if (headers) {
      // Convert to object using headers
      const obj: Record<string, any> = {};
      headers.forEach((header, index) => {
        obj[header] = values[index] || '';
      });
      results.push(obj);
    } else {
      results.push(values);
    }
  }
  
  return results;
}

/**
 * Parse a single CSV line handling quoted values
 */
function parseCSVLine(line: string, options?: ParseOptions): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      values.push(processValue(current, options));
      current = '';
    } else {
      current += char;
    }
  }
  
  // Don't forget the last value
  values.push(processValue(current, options));
  
  return values;
}

/**
 * Process a single value according to options
 */
function processValue(value: string, options?: ParseOptions): any {
  if (options?.trim) {
    value = value.trim();
  }
  
  if (options?.cast) {
    // Try to cast to number
    if (value !== '' && !isNaN(Number(value))) {
      return Number(value);
    }
    // Try to cast to boolean
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
  }
  
  return value;
} 