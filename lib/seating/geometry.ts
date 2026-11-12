import type { TableShape } from "../types";

export const SEAT_RADIUS = 14;
const SEAT_GAP = 6;
const SEAT_PITCH = SEAT_RADIUS * 2 + SEAT_GAP; // spacing between seat centers along an edge

export interface TableSize { width: number; height: number; radius?: number }
export interface Point { x: number; y: number }

/** Size of the table top for a shape/capacity. */
export function tableSize(shape: TableShape, capacity: number): TableSize {
  if (shape === "round") {
    // circumference of the seat ring must fit `capacity` seats
    const ring = Math.max((capacity * SEAT_PITCH) / (2 * Math.PI), 40);
    const radius = Math.round(ring - SEAT_RADIUS - 4);
    return { width: radius * 2, height: radius * 2, radius };
  }
  if (shape === "square") {
    const perSide = Math.ceil(capacity / 4);
    const side = Math.max(perSide * SEAT_PITCH, 70);
    return { width: side, height: side };
  }
  // rect: seats on the two long sides, one at each end when capacity >= 6
  const ends = capacity >= 6 ? 2 : 0;
  const perLong = Math.ceil((capacity - ends) / 2);
  return { width: Math.max(perLong * SEAT_PITCH, 80), height: 70 };
}

function along(count: number, length: number): number[] {
  // evenly spaced positions centred on 0 along an edge of `length`
  if (count <= 0) return [];
  const step = length / count;
  return Array.from({ length: count }, (_, i) => -length / 2 + step * (i + 0.5));
}

/** Seat centres relative to the table centre (unrotated), in clockwise order starting at top. */
export function seatPositions(shape: TableShape, capacity: number): Point[] {
  const size = tableSize(shape, capacity);
  const off = SEAT_RADIUS + 6;
  if (shape === "round") {
    const r = (size.radius ?? size.width / 2) + off;
    return Array.from({ length: capacity }, (_, i) => {
      const a = -Math.PI / 2 + (2 * Math.PI * i) / capacity;
      return { x: Math.round(r * Math.cos(a)), y: Math.round(r * Math.sin(a)) };
    });
  }
  const hw = size.width / 2, hh = size.height / 2;
  if (shape === "square") {
    const base = Math.floor(capacity / 4), extra = capacity % 4;
    const counts = [0, 1, 2, 3].map((s) => base + (s < extra ? 1 : 0)); // top, right, bottom, left
    const pts: Point[] = [];
    along(counts[0], size.width).forEach((x) => pts.push({ x, y: -hh - off }));
    along(counts[1], size.height).forEach((y) => pts.push({ x: hw + off, y }));
    along(counts[2], size.width).reverse().forEach((x) => pts.push({ x, y: hh + off }));
    along(counts[3], size.height).reverse().forEach((y) => pts.push({ x: -hw - off, y }));
    return pts;
  }
  const ends = capacity >= 6 ? 2 : 0;
  const long = capacity - ends;
  const top = Math.ceil(long / 2), bottom = long - top;
  const pts: Point[] = [];
  along(top, size.width).forEach((x) => pts.push({ x, y: -hh - off }));
  if (ends) pts.push({ x: hw + off, y: 0 });
  along(bottom, size.width).reverse().forEach((x) => pts.push({ x, y: hh + off }));
  if (ends) pts.push({ x: -hw - off, y: 0 });
  return pts;
}

export const TABLE_PRESETS: { label: string; shape: TableShape; capacity: number }[] = [
  { label: "Round 8", shape: "round", capacity: 8 },
  { label: "Round 10", shape: "round", capacity: 10 },
  { label: "Round 12", shape: "round", capacity: 12 },
  { label: "Square 4", shape: "square", capacity: 4 },
  { label: "Square 8", shape: "square", capacity: 8 },
  { label: "Rectangle 6", shape: "rect", capacity: 6 },
  { label: "Rectangle 10", shape: "rect", capacity: 10 },
  { label: "Banquet 20", shape: "rect", capacity: 20 },
];
