import * as XLSX from "xlsx";
import Papa from "papaparse";

export type ParsedTable = {
  headers: string[];
  rows: Record<string, any>[];
};

export async function parseFile(file: File): Promise<ParsedTable> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".csv") || file.type === "text/csv") {
    const text = await file.text();
    const result = Papa.parse<Record<string, any>>(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
    });
    const rows = (result.data ?? []).filter(
      (r) => r && Object.values(r).some((v) => v !== null && v !== undefined && v !== ""),
    );
    const headers = result.meta.fields ?? Object.keys(rows[0] ?? {});
    return { headers, rows };
  }

  // XLSX / XLS
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const json = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: "" });
  const headers =
    json.length > 0
      ? Object.keys(json[0])
      : (XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 })[0] as string[]) ?? [];
  return { headers, rows: json };
}