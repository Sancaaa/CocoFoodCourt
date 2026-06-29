"use client";

import { useMemo } from "react";

export interface FloorTable {
  id: number;
  name: string;
  seats: number;
  floor_name: string;
  position_h: number;
  position_v: number;
  width: number;
  height: number;
  shape: string;
}

interface FloorMapProps {
  tables: FloorTable[];
  selectedTables: number[];
  onToggle: (id: number) => void;
}

const CHAIR_MARGIN = 26; // space reserved around tables for chairs
const FALLBACK_COLS = 4; // grid used when Odoo has no layout coordinates

// Build chair rectangles around a table so the map reads as furniture, not boxes.
function chairPositions(t: FloorTable) {
  const chairs: { x: number; y: number }[] = [];
  const cx = t.position_h + t.width / 2;
  const cy = t.position_v + t.height / 2;

  if (t.shape === "round") {
    const rx = t.width / 2 + 14;
    const ry = t.height / 2 + 14;
    for (let i = 0; i < t.seats; i++) {
      const angle = (Math.PI * 2 * i) / t.seats - Math.PI / 2;
      chairs.push({ x: cx + Math.cos(angle) * rx, y: cy + Math.sin(angle) * ry });
    }
    return chairs;
  }

  // Square/rectangular: split seats between the top and bottom edges.
  const top = Math.ceil(t.seats / 2);
  const bottom = t.seats - top;
  const place = (count: number, y: number) => {
    for (let i = 0; i < count; i++) {
      const x = t.position_h + (t.width * (i + 1)) / (count + 1);
      chairs.push({ x, y });
    }
  };
  place(top, t.position_v - 13);
  place(bottom, t.position_v + t.height + 13);
  return chairs;
}

export default function FloorMap({ tables, selectedTables, onToggle }: FloorMapProps) {
  // Use Odoo's floor-plan coordinates only when they're actually meaningful.
  // If tables share the same spot (Odoo default 10,10 when a venue hasn't
  // arranged its floor) they'd all stack on top of each other — so fall back
  // to a clean grid whenever the coordinates aren't all distinct.
  const positioned = useMemo<FloorTable[]>(() => {
    const distinct = new Set(tables.map((t) => `${t.position_h},${t.position_v}`)).size;
    const hasLayout = tables.length > 1 && distinct === tables.length && tables.some((t) => t.position_h || t.position_v);
    if (hasLayout) return tables;

    const cols = Math.min(FALLBACK_COLS, Math.max(1, Math.ceil(Math.sqrt(tables.length))));
    return tables.map((t, i) => ({
      ...t,
      width: 150,
      height: 115,
      position_h: 40 + (i % cols) * 210,
      position_v: 40 + Math.floor(i / cols) * 210,
    }));
  }, [tables]);

  const bounds = useMemo(() => {
    if (positioned.length === 0) return { x: 0, y: 0, w: 800, h: 400 };
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const t of positioned) {
      minX = Math.min(minX, t.position_h);
      minY = Math.min(minY, t.position_v);
      maxX = Math.max(maxX, t.position_h + t.width);
      maxY = Math.max(maxY, t.position_v + t.height);
    }
    const pad = CHAIR_MARGIN + 16;
    return { x: minX - pad, y: minY - pad, w: maxX - minX + pad * 2, h: maxY - minY + pad * 2 };
  }, [positioned]);

  if (positioned.length === 0) return null;

  return (
    <svg
      viewBox={`${bounds.x} ${bounds.y} ${bounds.w} ${bounds.h}`}
      className="w-full h-auto select-none rounded-lg bg-[#F5F3F2]"
      role="group"
      aria-label="Floor map. Select a table."
    >
      {/* Floor-plan backdrop (decorative) so the map reads as a real venue. */}
      <image
        href="/floorplan.png"
        x={bounds.x}
        y={bounds.y}
        width={bounds.w}
        height={bounds.h}
        preserveAspectRatio="xMidYMid slice"
        opacity={0.18}
      />
      {positioned.map((t) => {
        const selected = selectedTables.includes(t.id);
        const cx = t.position_h + t.width / 2;
        const cy = t.position_v + t.height / 2;

        const bodyClass = selected
          ? "fill-primary stroke-primary"
          : "fill-white stroke-primary hover:fill-primary/10";
        const focusClass = "group-focus-visible/table:stroke-2 group-focus-visible/table:stroke-primary";

        return (
          <g
            key={t.id}
            onClick={() => onToggle(t.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onToggle(t.id);
              }
            }}
            tabIndex={0}
            role="checkbox"
            aria-checked={selected}
            aria-label={`Table ${t.name}, ${t.seats} seats${selected ? ", selected" : ""}`}
            className="cursor-pointer outline-none group/table"
          >
            {/* Chairs (drawn first, sit behind the table body) */}
            {chairPositions(t).map((c, i) => (
              <rect
                key={i}
                x={c.x - 8}
                y={c.y - 6}
                width={16}
                height={12}
                rx={3}
                className={selected ? "fill-primary/40" : "fill-primary/20"}
              />
            ))}

            {/* Table body */}
            {t.shape === "round" ? (
              <ellipse cx={cx} cy={cy} rx={t.width / 2} ry={t.height / 2} className={`${bodyClass} ${focusClass}`} strokeWidth={1.5} />
            ) : (
              <rect
                x={t.position_h}
                y={t.position_v}
                width={t.width}
                height={t.height}
                rx={10}
                className={`${bodyClass} ${focusClass}`}
                strokeWidth={1.5}
              />
            )}

            {/* Labels */}
            <text
              x={cx}
              y={cy - 4}
              textAnchor="middle"
              className={`font-bold ${selected ? "fill-white" : "fill-foreground"}`}
              style={{ fontSize: 22 }}
            >
              {t.name}
            </text>
            <text
              x={cx}
              y={cy + 20}
              textAnchor="middle"
              className={selected ? "fill-white/80" : "fill-primary"}
              style={{ fontSize: 14, fontWeight: 700 }}
            >
              {t.seats} seats
            </text>
          </g>
        );
      })}
    </svg>
  );
}
