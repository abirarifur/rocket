import { z } from 'zod';

export const RunCollectionSchema = z.object({
  environmentId: z.string().min(1).nullish(),
  iterations: z.number().int().min(1).max(100).default(1),
  data: z
    .object({
      type: z.enum(['json', 'csv']),
      content: z.string(),
    })
    .nullish(),
});
export type RunCollectionDto = z.infer<typeof RunCollectionSchema>;

/** Parse a data file into rows of string-valued variables. */
export function parseDataRows(data?: { type: 'json' | 'csv'; content: string } | null): Record<string, string>[] {
  if (!data || !data.content.trim()) return [];
  if (data.type === 'json') {
    const parsed: unknown = JSON.parse(data.content);
    const arr = Array.isArray(parsed) ? parsed : [parsed];
    return arr.map((row) => {
      const out: Record<string, string> = {};
      if (row && typeof row === 'object') {
        for (const [k, v] of Object.entries(row as Record<string, unknown>)) out[k] = String(v);
      }
      return out;
    });
  }
  // CSV: first non-empty line is the header.
  const lines = data.content.split(/\r?\n/).filter((l) => l.trim() !== '');
  if (lines.length < 2) return [];
  const headers = splitCsvLine(lines[0]!);
  return lines.slice(1).map((line) => {
    const cells = splitCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => (row[h] = cells[i] ?? ''));
    return row;
  });
}

/** Minimal CSV line splitter supporting double-quoted fields. */
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        cur += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      out.push(cur.trim());
      cur = '';
    } else {
      cur += c;
    }
  }
  out.push(cur.trim());
  return out;
}
