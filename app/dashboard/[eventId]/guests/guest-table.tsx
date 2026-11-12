"use client";
import Papa from "papaparse";
import { useMemo, useState, useTransition } from "react";
import { guestStatus } from "@/lib/messaging/audience";
import { STATUS_LABELS } from "@/lib/messaging/status";
import { RSVP_LABELS } from "@/lib/rsvp/logic";
import type { GuestWithContext, MessageStatus, RsvpStatus, SessionRow } from "@/lib/types";
import { Badge, Button, Card, Input, Select } from "@/components/ui";
import { deleteGuest, setRsvp, updateGuest } from "./actions";

interface Props {
  eventId: string;
  guests: GuestWithContext[];
  sessions: SessionRow[];
  lastMessage: Record<string, { email?: string; whatsapp?: string }>;
  canEdit: boolean;
  rsvpBase: string;
}

function InlineEdit({ value, onSave, disabled, placeholder }: { value: string | null; onSave: (v: string) => void; disabled: boolean; placeholder: string }) {
  const [v, setV] = useState(value ?? "");
  return (
    <input
      className="w-full rounded border border-transparent bg-transparent px-1 py-0.5 text-sm hover:border-stone-200 focus:border-stone-400 focus:outline-none"
      value={v} placeholder={placeholder} disabled={disabled}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => v !== (value ?? "") && onSave(v)}
    />
  );
}

export function GuestTable({ eventId, guests, sessions, lastMessage, canEdit, rsvpBase }: Props) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<RsvpStatus | "">("");
  const [tag, setTag] = useState("");
  const [, start] = useTransition();
  const [copied, setCopied] = useState<string | null>(null);

  const tags = useMemo(() => [...new Set(guests.flatMap((g) => g.household.tags))].sort(), [guests]);
  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    return guests.filter((g) =>
      (!t || `${g.first_name} ${g.last_name ?? ""} ${g.household.name} ${g.email ?? ""} ${g.phone ?? ""}`.toLowerCase().includes(t)) &&
      (!status || guestStatus(g) === status) &&
      (!tag || g.household.tags.includes(tag)),
    ).sort((a, b) => a.household.name.localeCompare(b.household.name));
  }, [guests, q, status, tag]);

  function exportCsv() {
    const data = rows.map((g) => ({
      familia: g.household.name, nombre: g.first_name, apellido: g.last_name ?? "", correo: g.email ?? "", telefono: g.phone ?? "",
      lado: g.household.side ?? "", etiquetas: g.household.tags.join(", "), niño: g.is_child ? "sí" : "", dieta: g.dietary ?? "",
      ...Object.fromEntries(sessions.map((s) => [s.name, RSVP_LABELS[g.rsvps.find((r) => r.session_id === s.id)?.status ?? "pending"]])),
      link: rsvpBase + g.household.token,
    }));
    const blob = new Blob(["﻿" + Papa.unparse(data)], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "invitados.csv";
    a.click();
  }

  const save = (id: string, patch: Omit<Parameters<typeof updateGuest>[1], "id">) => start(async () => {
    const r = await updateGuest(eventId, { ...patch, id });
    if (r && !r.ok && r.message) alert(r.message);
  });

  return (
    <Card
      title={`Invitados (${rows.length}/${guests.length})`}
      actions={
        <div className="flex flex-wrap gap-2">
          <Input placeholder="Buscar…" value={q} onChange={(e) => setQ(e.target.value)} className="w-44" />
          <Select value={status} onChange={(e) => setStatus(e.target.value as RsvpStatus | "")} className="w-36">
            <option value="">Todas las respuestas</option>
            {(["yes", "maybe", "no", "pending"] as const).map((s) => <option key={s} value={s}>{RSVP_LABELS[s]}</option>)}
          </Select>
          {tags.length > 0 && (
            <Select value={tag} onChange={(e) => setTag(e.target.value)} className="w-36">
              <option value="">Todas las etiquetas</option>
              {tags.map((t) => <option key={t}>{t}</option>)}
            </Select>
          )}
          <Button variant="secondary" onClick={exportCsv}>Exportar CSV</Button>
        </div>
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="text-left text-xs uppercase text-stone-500">
            <tr>
              <th className="py-2">Invitación</th><th>Nombre</th><th>Email</th><th>WhatsApp</th>
              {sessions.map((s) => <th key={s.id}>{s.name}</th>)}
              <th>Mensajes</th><th></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {rows.map((g) => (
              <tr key={g.id} className="align-middle">
                <td className="py-1.5">
                  <div className="font-medium">{g.household.name}</div>
                  <div className="flex gap-1 text-xs text-stone-500">
                    {g.household.side && <span>{g.household.side}</span>}
                    {g.household.tags.map((t) => <span key={t} className="rounded bg-stone-100 px-1">{t}</span>)}
                  </div>
                </td>
                <td>
                  <span>{g.first_name} {g.last_name}</span>
                  {g.is_child && <span className="ml-1 text-xs text-stone-500">(niño)</span>}
                  {g.is_plus_one && <span className="ml-1 text-xs text-stone-500">(+1)</span>}
                  {g.dietary && <div className="text-xs text-amber-700">{g.dietary}</div>}
                </td>
                <td className="w-48"><InlineEdit value={g.email} disabled={!canEdit} placeholder="—" onSave={(v) => save(g.id, { email: v || null })} /></td>
                <td className="w-40"><InlineEdit value={g.phone} disabled={!canEdit} placeholder="—" onSave={(v) => save(g.id, { phone: v || null })} /></td>
                {sessions.map((s) => {
                  const st = g.rsvps.find((r) => r.session_id === s.id)?.status ?? "pending";
                  return (
                    <td key={s.id}>
                      {canEdit ? (
                        <select value={st} className="rounded border border-stone-200 bg-white px-1 py-0.5 text-xs"
                          onChange={(e) => start(() => setRsvp(eventId, g.id, s.id, e.target.value as RsvpStatus))}>
                          {(["pending", "yes", "maybe", "no"] as const).map((o) => <option key={o} value={o}>{RSVP_LABELS[o]}</option>)}
                        </select>
                      ) : <Badge tone={st}>{RSVP_LABELS[st]}</Badge>}
                    </td>
                  );
                })}
                <td className="space-x-1 whitespace-nowrap">
                  {lastMessage[g.id]?.email && <Badge tone={lastMessage[g.id].email!}>✉ {STATUS_LABELS[lastMessage[g.id].email as MessageStatus]}</Badge>}
                  {lastMessage[g.id]?.whatsapp && <Badge tone={lastMessage[g.id].whatsapp!}>WA {STATUS_LABELS[lastMessage[g.id].whatsapp as MessageStatus]}</Badge>}
                </td>
                <td className="whitespace-nowrap text-right">
                  <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(rsvpBase + g.household.token); setCopied(g.id); setTimeout(() => setCopied(null), 1500); }}>
                    {copied === g.id ? "¡Copiado!" : "Link"}
                  </Button>
                  {canEdit && (
                    <Button size="sm" variant="danger" onClick={() => confirm(`¿Eliminar a ${g.first_name}?`) && start(() => deleteGuest(eventId, g.id))}>✕</Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="py-8 text-center text-sm text-stone-500">No hay invitados que coincidan.</p>}
      </div>
    </Card>
  );
}
