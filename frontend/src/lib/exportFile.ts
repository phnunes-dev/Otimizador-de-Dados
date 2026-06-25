import * as XLSX from "xlsx";
import Papa from "papaparse";

export function exportRows(
  rows: Record<string, any>[],
  headers: string[],
  format: "csv" | "xlsx",
  filename = "dados-limpos",
) {
  if (format === "csv") {
    const csv = Papa.unparse({ fields: headers, data: rows });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    download(blob, `${filename}.csv`);
    return;
  }
  const ws = XLSX.utils.json_to_sheet(rows, { header: headers });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Dados");
  const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  download(new Blob([out], { type: "application/octet-stream" }), `${filename}.xlsx`);
}

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}