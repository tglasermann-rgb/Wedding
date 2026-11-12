"use client";
export function PrintButton() {
  return <button onClick={() => window.print()} className="no-print rounded-lg border px-3 py-1.5 text-sm">Imprimir / PDF</button>;
}
