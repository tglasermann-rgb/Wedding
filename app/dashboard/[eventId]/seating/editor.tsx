"use client";
import type Konva from "konva";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Circle, Group, Layer, Rect, Stage, Text } from "react-konva";
import { SEAT_RADIUS, seatPositions, TABLE_PRESETS, tableSize } from "@/lib/seating/geometry";
import { firstFreeSeat, validateSeating, type SeatingWarning } from "@/lib/seating/validate";
import type { RsvpStatus, SeatAssignmentRow, SeatingConstraintRow, SeatingTableRow, TableShape } from "@/lib/types";
import { RSVP_LABELS } from "@/lib/rsvp/logic";
import { Button, Input, Select } from "@/components/ui";
import { addConstraint, addTable, assignGuest, deleteConstraint, deleteTable, updateTable } from "./actions";

export interface EditorGuest { id: string; name: string; householdId: string; household: string; status: RsvpStatus; isChild: boolean; tags: string[] }
export interface EditorProps {
  eventId: string;
  layout: { id: string; width: number; height: number };
  canEdit: boolean;
  guests: EditorGuest[];
  initialTables: SeatingTableRow[];
  initialAssignments: SeatAssignmentRow[];
  initialConstraints: SeatingConstraintRow[];
}

const STATUS_COLOR: Record<RsvpStatus, string> = { yes: "#10b981", maybe: "#f59e0b", no: "#ef4444", pending: "#a8a29e" };
const initials = (n: string) => n.split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase();

export function SeatingEditor({ eventId, layout, canEdit, guests, initialTables, initialAssignments, initialConstraints }: EditorProps) {
  const [tables, setTables] = useState(initialTables);
  const [assignments, setAssignments] = useState(initialAssignments);
  const [constraints, setConstraints] = useState(initialConstraints);
  const [selTable, setSelTable] = useState<string | null>(null);
  const [selGuest, setSelGuest] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [onlyConfirmed, setOnlyConfirmed] = useState(false);
  const [scale, setScale] = useState(0.7);
  const [width, setWidth] = useState(800);
  const [error, setError] = useState<string | null>(null);
  const [, start] = useTransition();
  const wrap = useRef<HTMLDivElement>(null);
  const stage = useRef<Konva.Stage>(null);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const guestById = useMemo(() => new Map(guests.map((g) => [g.id, g])), [guests]);
  const tableOf = useMemo(() => new Map(assignments.map((a) => [a.guest_id, a.table_id])), [assignments]);
  const warnings = useMemo(
    () => validateSeating({ tables, assignments, constraints, guestHousehold: Object.fromEntries(guests.map((g) => [g.id, g.householdId])) }),
    [tables, assignments, constraints, guests],
  );
  const overCap = new Set(warnings.filter((w) => w.kind === "over_capacity").map((w) => (w as { tableId: string }).tableId));

  const unseated = guests
    .filter((g) => !tableOf.has(g.id) && g.status !== "no")
    .filter((g) => !onlyConfirmed || g.status === "yes")
    .filter((g) => !q || `${g.name} ${g.household}`.toLowerCase().includes(q.toLowerCase()));
  const byHousehold = new Map<string, EditorGuest[]>();
  for (const g of unseated) byHousehold.set(g.household, [...(byHousehold.get(g.household) ?? []), g]);

  const run = (fn: () => Promise<unknown>) => start(async () => { try { setError(null); await fn(); } catch (e) { setError((e as Error).message); } });

  function seat(guestIds: string[], tableId: string) {
    if (!canEdit) return;
    const t = tables.find((x) => x.id === tableId);
    if (!t) return;
    let next = assignments.filter((a) => !guestIds.includes(a.guest_id));
    const changes: { guestId: string; seatIndex: number | null }[] = [];
    for (const gid of guestIds) {
      const idx = firstFreeSeat(t.capacity, next.filter((a) => a.table_id === tableId).map((a) => a.seat_index));
      next = [...next, { layout_id: layout.id, guest_id: gid, table_id: tableId, event_id: eventId, seat_index: idx }];
      changes.push({ guestId: gid, seatIndex: idx });
    }
    setAssignments(next);
    setSelGuest(null);
    run(async () => { for (const c of changes) await assignGuest(eventId, layout.id, c.guestId, tableId, c.seatIndex); });
  }

  function unseat(guestId: string) {
    setAssignments((a) => a.filter((x) => x.guest_id !== guestId));
    run(() => assignGuest(eventId, layout.id, guestId, null, null));
  }

  function tableAt(x: number, y: number) {
    return tables.find((t) => {
      const s = tableSize(t.shape, t.capacity);
      return Math.hypot(t.x - x, t.y - y) < Math.max(s.width, s.height) / 2 + SEAT_RADIUS * 2 + 10;
    });
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const st = stage.current;
    const ids = e.dataTransfer.getData("text/guests").split(",").filter(Boolean);
    if (!st || !ids.length) return;
    st.setPointersPositions(e);
    const p = st.getRelativePointerPosition();
    const t = p && tableAt(p.x, p.y);
    if (t) seat(ids, t.id);
  }

  function newTable(shape: TableShape, capacity: number) {
    const n = tables.length + 1;
    const col = (n - 1) % 6, row = Math.floor((n - 1) / 6);
    const input = { shape, capacity, x: 150 + col * 230, y: 150 + row * 230, label: `Table ${n}` };
    run(async () => {
      const t = await addTable(eventId, layout.id, input);
      setTables((ts) => [...ts, t]);
      setSelTable(t.id);
    });
  }

  function patchTable(id: string, patch: Partial<SeatingTableRow>) {
    setTables((ts) => ts.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    run(() => updateTable(eventId, id, patch));
  }

  function onWheel(e: Konva.KonvaEventObject<WheelEvent>) {
    e.evt.preventDefault();
    setScale((s) => Math.min(2, Math.max(0.3, s * (e.evt.deltaY > 0 ? 0.92 : 1.08))));
  }

  const table = tables.find((t) => t.id === selTable);
  const guest = selGuest ? guestById.get(selGuest) : null;
  const warnText = (w: SeatingWarning) => {
    const tl = (id: string) => tables.find((t) => t.id === id)?.label ?? "?";
    const gn = (id: string) => guestById.get(id)?.name ?? "?";
    const c = (id: string) => constraints.find((x) => x.id === id);
    switch (w.kind) {
      case "over_capacity": return `${tl(w.tableId)}: ${w.seated} people for ${w.capacity} seats`;
      case "household_split": return `${guests.find((g) => g.householdId === w.householdId)?.household} is split across ${w.tableIds.map(tl).join(" and ")}`;
      case "together_violated": return `${gn(c(w.constraintId)!.guest_a)} and ${gn(c(w.constraintId)!.guest_b)} should sit together`;
      case "apart_violated": return `${gn(c(w.constraintId)!.guest_a)} and ${gn(c(w.constraintId)!.guest_b)} shouldn't share ${tl(w.tableId)}`;
    }
  };

  const seatedCount = assignments.length;
  const confirmed = guests.filter((g) => g.status === "yes").length;
  const totalSeats = tables.reduce((a, t) => a + t.capacity, 0);

  return (
    <div className="grid gap-4 lg:grid-cols-[260px_1fr_260px]">
      {/* Unseated guests */}
      <aside className="flex max-h-[680px] flex-col rounded-xl border border-stone-200 bg-white p-3">
        <div className="mb-2 text-sm font-semibold">Unseated ({unseated.length})</div>
        <Input placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
        <label className="my-2 flex items-center gap-1 text-xs"><input type="checkbox" checked={onlyConfirmed} onChange={(e) => setOnlyConfirmed(e.target.checked)} /> Attending only</label>
        <p className="mb-2 text-xs text-stone-500">Drag a person or a whole household onto a table, or select them and click a table.</p>
        <div className="flex-1 space-y-2 overflow-auto">
          {[...byHousehold].map(([hh, gs]) => (
            <div key={hh} className="rounded-lg border border-stone-100">
              <div draggable={canEdit} onDragStart={(e) => e.dataTransfer.setData("text/guests", gs.map((g) => g.id).join(","))}
                className="cursor-grab bg-stone-50 px-2 py-1 text-xs font-medium text-stone-600">{hh} · {gs.length}</div>
              {gs.map((g) => (
                <div key={g.id} draggable={canEdit} onDragStart={(e) => e.dataTransfer.setData("text/guests", g.id)}
                  onClick={() => setSelGuest(selGuest === g.id ? null : g.id)}
                  className={`flex cursor-grab items-center gap-2 px-2 py-1 text-sm ${selGuest === g.id ? "bg-stone-900 text-white" : "hover:bg-stone-50"}`}>
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: STATUS_COLOR[g.status] }} title={RSVP_LABELS[g.status]} />
                  {g.name}{g.isChild && <span className="text-xs opacity-60">child</span>}
                </div>
              ))}
            </div>
          ))}
        </div>
      </aside>

      {/* Canvas */}
      <div className="space-y-2">
        {canEdit && (
          <div className="flex flex-wrap gap-1">
            {TABLE_PRESETS.map((p) => <Button key={p.label} size="sm" variant="secondary" onClick={() => newTable(p.shape, p.capacity)}>+ {p.label}</Button>)}
          </div>
        )}
        <div ref={wrap} onDragOver={(e) => e.preventDefault()} onDrop={onDrop} className="overflow-hidden rounded-xl border border-stone-200 bg-[radial-gradient(#e7e5e4_1px,transparent_1px)] [background-size:20px_20px]">
          <Stage ref={stage} width={width} height={620} scaleX={scale} scaleY={scale} draggable onWheel={onWheel}
            onClick={(e) => { if (e.target === e.target.getStage()) setSelTable(null); }}>
            <Layer>
              <Rect x={0} y={0} width={layout.width} height={layout.height} stroke="#d6d3d1" dash={[8, 6]} cornerRadius={12} listening={false} />
              {tables.map((t) => {
                const size = tableSize(t.shape, t.capacity);
                const seats = seatPositions(t.shape, t.capacity);
                const at = assignments.filter((a) => a.table_id === t.id);
                const bySeat = new Map<number, string>();
                const extra: string[] = [];
                for (const a of at) {
                  if (a.seat_index !== null && a.seat_index < t.capacity && !bySeat.has(a.seat_index)) bySeat.set(a.seat_index, a.guest_id);
                  else extra.push(a.guest_id);
                }
                for (const gid of extra) { const i = firstFreeSeat(t.capacity, [...bySeat.keys()]); if (i !== null) bySeat.set(i, gid); }
                const stroke = overCap.has(t.id) ? "#dc2626" : selTable === t.id ? "#1c1917" : "#a8a29e";
                return (
                  <Group key={t.id} x={t.x} y={t.y} rotation={t.rotation} draggable={canEdit}
                    onClick={() => (selGuest ? seat([selGuest], t.id) : setSelTable(t.id))}
                    onTap={() => (selGuest ? seat([selGuest], t.id) : setSelTable(t.id))}
                    onDragEnd={(e) => patchTable(t.id, { x: Math.round(e.target.x()), y: Math.round(e.target.y()) })}>
                    {t.shape === "round"
                      ? <Circle radius={size.radius} fill="#fff" stroke={stroke} strokeWidth={2} shadowBlur={4} shadowOpacity={0.1} />
                      : <Rect width={size.width} height={size.height} offsetX={size.width / 2} offsetY={size.height / 2} fill="#fff" stroke={stroke} strokeWidth={2} cornerRadius={6} shadowBlur={4} shadowOpacity={0.1} />}
                    <Text text={`${t.label}\n${at.length}/${t.capacity}`} align="center" width={size.width} offsetX={size.width / 2} offsetY={14} fontSize={13} fill="#44403c" rotation={-t.rotation} />
                    {seats.map((p, i) => {
                      const gid = bySeat.get(i);
                      const g = gid ? guestById.get(gid) : undefined;
                      return (
                        <Group key={i} x={p.x} y={p.y} rotation={-t.rotation}
                          onClick={(e) => { if (g) { e.cancelBubble = true; setSelGuest(g.id); setSelTable(t.id); } }}>
                          <Circle radius={SEAT_RADIUS} fill={g ? STATUS_COLOR[g.status] : "#f5f5f4"} stroke={selGuest && selGuest === gid ? "#1c1917" : "#d6d3d1"} strokeWidth={selGuest === gid ? 3 : 1} />
                          {g && <Text text={initials(g.name)} fontSize={10} fill="#fff" fontStyle="bold" width={SEAT_RADIUS * 2} offsetX={SEAT_RADIUS} offsetY={5} align="center" />}
                        </Group>
                      );
                    })}
                  </Group>
                );
              })}
            </Layer>
          </Stage>
        </div>
        <div className="flex items-center justify-between text-xs text-stone-500">
          <span>{tables.length} tables · {totalSeats} seats · {seatedCount} seated · {confirmed} attending</span>
          <span className="flex items-center gap-2">
            <button onClick={() => setScale((s) => Math.max(0.3, s * 0.85))}>−</button>{Math.round(scale * 100)}%<button onClick={() => setScale((s) => Math.min(2, s * 1.15))}>+</button>
          </span>
        </div>
        {error && <p className="text-sm text-red-700">{error}</p>}
      </div>

      {/* Inspector */}
      <aside className="space-y-4">
        {guest && (
          <div className="rounded-xl border border-stone-200 bg-white p-3 text-sm">
            <div className="font-semibold">{guest.name}</div>
            <div className="text-xs text-stone-500">{guest.household} · {RSVP_LABELS[guest.status]}</div>
            {tableOf.has(guest.id) && canEdit && <Button size="sm" variant="secondary" className="mt-2" onClick={() => { unseat(guest.id); setSelGuest(null); }}>Remove from table</Button>}
            {!tableOf.has(guest.id) && <p className="mt-2 text-xs">Click a table to seat them.</p>}
            {canEdit && <ConstraintForm guest={guest} guests={guests} onAdd={(kind, other) => run(async () => { const c = await addConstraint(eventId, kind, guest.id, other); setConstraints((cs) => [...cs, c]); })} />}
          </div>
        )}
        {table && (
          <div className="space-y-2 rounded-xl border border-stone-200 bg-white p-3 text-sm">
            <Input value={table.label} disabled={!canEdit} onChange={(e) => setTables((ts) => ts.map((t) => (t.id === table.id ? { ...t, label: e.target.value } : t)))}
              onBlur={(e) => patchTable(table.id, { label: e.target.value || "Table" })} />
            <div className="grid grid-cols-2 gap-2">
              <Select value={table.shape} disabled={!canEdit} onChange={(e) => patchTable(table.id, { shape: e.target.value as TableShape })}>
                <option value="round">Round</option><option value="square">Square</option><option value="rect">Rectangle</option>
              </Select>
              <Input type="number" min={1} max={40} value={table.capacity} disabled={!canEdit} onChange={(e) => patchTable(table.id, { capacity: Math.max(1, Math.min(40, Number(e.target.value) || 1)) })} />
            </div>
            {canEdit && (
              <div className="flex gap-1">
                <Button size="sm" variant="secondary" onClick={() => patchTable(table.id, { rotation: (table.rotation + 45) % 360 })}>Rotate 45°</Button>
                <Button size="sm" variant="danger" onClick={() => { if (!confirm("Delete this table?")) return; setTables((ts) => ts.filter((t) => t.id !== table.id)); setAssignments((a) => a.filter((x) => x.table_id !== table.id)); setSelTable(null); run(() => deleteTable(eventId, table.id)); }}>Delete</Button>
              </div>
            )}
            <ul className="divide-y divide-stone-100">
              {assignments.filter((a) => a.table_id === table.id).map((a) => (
                <li key={a.guest_id} className="flex justify-between py-1">
                  <span>{guestById.get(a.guest_id)?.name}</span>
                  {canEdit && <button className="text-xs text-red-700" onClick={() => unseat(a.guest_id)}>✕</button>}
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="rounded-xl border border-stone-200 bg-white p-3 text-sm">
          <div className="mb-1 font-semibold">Warnings ({warnings.length})</div>
          {warnings.length === 0 ? <p className="text-xs text-stone-500">All good.</p> : (
            <ul className="space-y-1 text-xs text-amber-800">{warnings.map((w, i) => <li key={i}>⚠ {warnText(w)}</li>)}</ul>
          )}
          {constraints.length > 0 && (
            <>
              <div className="mt-3 mb-1 font-semibold">Rules</div>
              <ul className="space-y-1 text-xs">
                {constraints.map((c) => (
                  <li key={c.id} className="flex justify-between gap-1">
                    <span>{guestById.get(c.guest_a)?.name} {c.kind === "together" ? "with" : "away from"} {guestById.get(c.guest_b)?.name}</span>
                    {canEdit && <button className="text-red-700" onClick={() => { setConstraints((cs) => cs.filter((x) => x.id !== c.id)); run(() => deleteConstraint(eventId, c.id)); }}>✕</button>}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}

function ConstraintForm({ guest, guests, onAdd }: { guest: EditorGuest; guests: EditorGuest[]; onAdd: (k: "together" | "apart", other: string) => void }) {
  const [kind, setKind] = useState<"together" | "apart">("together");
  const [other, setOther] = useState("");
  return (
    <div className="mt-3 space-y-1 border-t border-stone-100 pt-2">
      <div className="text-xs font-medium">Rule</div>
      <Select value={kind} onChange={(e) => setKind(e.target.value as "together" | "apart")}><option value="together">Seat with</option><option value="apart">Seat away from</option></Select>
      <Select value={other} onChange={(e) => setOther(e.target.value)}>
        <option value="">Choose a person…</option>
        {guests.filter((g) => g.id !== guest.id).sort((a, b) => a.name.localeCompare(b.name)).map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
      </Select>
      <Button size="sm" variant="secondary" disabled={!other} onClick={() => { onAdd(kind, other); setOther(""); }}>Add rule</Button>
    </div>
  );
}
