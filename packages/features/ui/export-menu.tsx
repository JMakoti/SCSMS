"use client";

import { useState } from "react";
import { Download } from "lucide-react";

type ExportCell = string | number | null | undefined;

export type ExportMenuProps = {
  title: string;
  filename: string;
  headers: string[];
  rows: ExportCell[][];
  className?: string;
  label?: string;
};

const escapeHtml = (value: ExportCell) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

function buildTable(headers: string[], rows: ExportCell[][]) {
  const headerHtml = headers
    .map((header) => `<th>${escapeHtml(header)}</th>`)
    .join("");
  const bodyHtml = rows
    .map(
      (row) =>
        `<tr>${row
          .map((value) => `<td>${escapeHtml(value)}</td>`)
          .join("")}</tr>`,
    )
    .join("");

  return `<table><thead><tr>${headerHtml}</tr></thead><tbody>${bodyHtml}</tbody></table>`;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function ExportMenu({
  title,
  filename,
  headers,
  rows,
  className = "outline-button",
  label = "Export",
}: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const datedFilename = `${filename}-${new Date().toISOString().slice(0, 10)}`;
  const exportExcel = () => {
    const workbook = `<!doctype html><html><head><meta charset="utf-8" /></head><body>${buildTable(
      headers,
      rows,
    )}</body></html>`;

    downloadBlob(
      new Blob([workbook], {
        type: "application/vnd.ms-excel;charset=utf-8",
      }),
      `${datedFilename}.xls`,
    );
    setOpen(false);
  };
  const exportPdf = () => {
    const printWindow = window.open("", "_blank", "width=1024,height=768");

    if (!printWindow) {
      window.alert("Allow pop-ups to export this report as PDF.");
      return;
    }

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>${escapeHtml(title)}</title>
          <style>
            body { font-family: Arial, sans-serif; color: #0f172a; margin: 24px; }
            h1 { font-size: 20px; margin: 0 0 4px; }
            p { color: #64748b; font-size: 12px; margin: 0 0 16px; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; }
            th, td { border: 1px solid #dbe3ef; padding: 7px 8px; text-align: left; }
            th { background: #f8fafc; color: #334155; }
          </style>
        </head>
        <body>
          <h1>${escapeHtml(title)}</h1>
          <p>Generated ${new Date().toLocaleString()}</p>
          ${buildTable(headers, rows)}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    setOpen(false);
  };

  return (
    <div className="filter-menu-wrap">
      <button
        className={`${className} ${open ? "active-tool" : ""}`}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <Download /> {label}
      </button>
      {open && (
        <div className="school-filter-menu">
          <span>Export format</span>
          <button type="button" onClick={exportExcel}>
            Excel (.xls)
          </button>
          <button type="button" onClick={exportPdf}>
            PDF
          </button>
        </div>
      )}
    </div>
  );
}
