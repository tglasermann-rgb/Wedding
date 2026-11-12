"use client";
import Papa from "papaparse";
import { useState, useTransition } from "react";
import { mapImportRows, type ImportResult } from "@/lib/guests/import";
import { Button } from "@/components/ui";
import { importGuests } from "./actions";

export function CsvImport({ eventId }: { eventId: string }) {
  const [res, setRes] = useState<ImportResult | null>(null);
  const [msg, setMsg] = useState<{ ok?: boolean; message?: string } | null>(null);
  const [pending, start] = useTransition();

  function onFile(f: File) {
    setMsg(null);
    Papa.parse<Record<string, string>>(f, { header: true, skipEmptyLines: true, complete: (r) => setRes(mapImportRows(r.data)) });
  }

  return (
    <div className="space-y-3 text-sm">
      <p className="text-stone-600">
        Columnas reconocidas: <b>familia</b>, <b>nombre</b>, apellido, correo, teléfono, lado, etiquetas, niño, acompañantes. Desde Excel: “Guardar como CSV”.
      </p>
      <input type="file" accept=".csv,text/csv" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
      {res && (
        <div className="rounded-lg bg-stone-50 p-3">
          <p><b>{res.rows.length}</b> personas listas para importar.</p>
          {res.errors.length > 0 && (
            <ul className="mt-2 max-h-28 overflow-auto text-xs text-amber-800">
              {res.errors.map((e, i) => <li key={i}>Línea {e.line}: {e.message}</li>)}
            </ul>
          )}
          <Button className="mt-3" disabled={pending || !res.rows.length}
            onClick={() => start(async () => { setMsg(await importGuests(eventId, res.rows)); setRes(null); })}>
            {pending ? "Importando…" : "Importar"}
          </Button>
        </div>
      )}
      {msg?.message && <p className={msg.ok ? "text-emerald-700" : "text-red-700"}>{msg.message}</p>}
    </div>
  );
}
