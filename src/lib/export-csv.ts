/** تصدير مصفوفة كائنات إلى ملف CSV (يعمل في المتصفح) */
export function exportToCsv<T extends Record<string, unknown>>(
  rows: T[],
  columns: { key: keyof T; label: string }[],
  filename: string
) {
  if (!rows.length) return;

  const header = columns.map((c) => `"${c.label}"`).join(",");
  const body = rows
    .map((row) =>
      columns
        .map((c) => {
          const val = row[c.key];
          const str = val === null || val === undefined ? "" : String(val);
          return `"${str.replace(/"/g, '""')}"`;
        })
        .join(",")
    )
    .join("\n");

  // BOM لدعم العربية في Excel
  const csv = "﻿" + header + "\n" + body;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
