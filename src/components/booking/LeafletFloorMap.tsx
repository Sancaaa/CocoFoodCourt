"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export interface FloorTable {
  id: number;
  name: string | number;
  seats: number;
  floor_name: string;
  position_h: number;
  position_v: number;
  width: number;
  height: number;
  shape: string;
}

export interface FloorMeta {
  image: string | null;
  width: number;
  height: number;
  backgroundColor: string;
}

interface LeafletFloorMapProps {
  tables: FloorTable[];
  selectedTables: number[];
  onToggle: (id: number) => void;
  floor: FloorMeta;
}

const PRIMARY = "#ac4425";

// Both states use a translucent fill so the Odoo floor image stays visible;
// the selected table is just more saturated.
const selectedStyle: L.PathOptions = { color: PRIMARY, weight: 3, fillColor: PRIMARY, fillOpacity: 0.55 };
const availableStyle: L.PathOptions = { color: PRIMARY, weight: 2, fillColor: PRIMARY, fillOpacity: 0.15 };

// Centered table-number label; its color flips with the selection state.
function labelIcon(name: string | number, selected: boolean) {
  return L.divIcon({
    className: "table-label",
    html: `<span style="color:${selected ? "#ffffff" : PRIMARY}">${name}</span>`,
    iconSize: [34, 20],
    iconAnchor: [17, 10],
  });
}

export default function LeafletFloorMap({ tables, selectedTables, onToggle, floor }: LeafletFloorMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layersRef = useRef<Map<number, L.Path>>(new Map());
  const labelsRef = useRef<Map<number, L.Marker>>(new Map());
  const onToggleRef = useRef(onToggle);

  // Keep the click handler current without rebuilding the map layers.
  useEffect(() => {
    onToggleRef.current = onToggle;
  }, [onToggle]);

  // Build the map + table layers whenever the tables or floor change.
  useEffect(() => {
    if (!containerRef.current || tables.length === 0) return;

    // Determine the coordinate space. Prefer the Odoo floor image dimensions;
    // otherwise derive bounds from the table coordinates themselves.
    let W = floor.width;
    let H = floor.height;
    if (!W || !H) {
      let maxX = 0, maxY = 0;
      for (const t of tables) {
        maxX = Math.max(maxX, t.position_h + (t.width || 50));
        maxY = Math.max(maxY, t.position_v + (t.height || 50));
      }
      W = maxX + 40;
      H = maxY + 40;
    }

    // In CRS.Simple, lat increases upward, so flip the vertical axis: an Odoo
    // pixel (px, py) measured from the top-left maps to [H - py, px].
    const pt = (px: number, py: number): L.LatLngExpression => [H - py, px];
    const bounds = L.latLngBounds([0, 0], [H, W]);

    const map = L.map(containerRef.current, {
      crs: L.CRS.Simple,
      minZoom: -4,
      maxZoom: 4,
      zoomSnap: 0.25,
      attributionControl: false,
      maxBounds: bounds.pad(0.25),
    });
    mapRef.current = map;

    if (floor.image) {
      L.imageOverlay(floor.image, bounds).addTo(map);
    } else {
      // Plain backdrop when Odoo has no floor image.
      L.rectangle(bounds, { color: floor.backgroundColor, weight: 0, fillColor: floor.backgroundColor, fillOpacity: 1 }).addTo(map);
    }

    layersRef.current = new Map();
    labelsRef.current = new Map();
    for (const t of tables) {
      const w = t.width || 50;
      const h = t.height || 50;
      const center = pt(t.position_h + w / 2, t.position_v + h / 2);
      let layer: L.Path;
      if (t.shape === "round") {
        layer = L.circle(center, { radius: Math.max(w, h) / 2, ...availableStyle });
      } else {
        layer = L.rectangle(L.latLngBounds(pt(t.position_h, t.position_v), pt(t.position_h + w, t.position_v + h)), availableStyle);
      }
      layer.addTo(map);
      layer.bindTooltip(`${t.name} · ${t.seats} seats`, { direction: "top" });
      layer.on("click", () => onToggleRef.current(t.id));
      layersRef.current.set(t.id, layer);

      // Centered, non-interactive number label (clicks fall through to the shape).
      const label = L.marker(center, { icon: labelIcon(t.name, false), interactive: false, keyboard: false });
      label.addTo(map);
      labelsRef.current.set(t.id, label);
    }

    // The container may not have its final size on first paint, so fit the
    // bounds only after telling Leaflet to remeasure.
    map.fitBounds(bounds);
    setTimeout(() => {
      map.invalidateSize();
      map.fitBounds(bounds);
    }, 60);

    return () => {
      map.remove();
      mapRef.current = null;
      layersRef.current.clear();
      labelsRef.current.clear();
    };
  }, [tables, floor]);

  // Restyle shapes and recolor the number labels when the selection changes.
  useEffect(() => {
    const nameById = new Map(tables.map((t) => [t.id, t.name]));
    layersRef.current.forEach((layer, id) => {
      const selected = selectedTables.includes(id);
      layer.setStyle(selected ? selectedStyle : availableStyle);
      labelsRef.current.get(id)?.setIcon(labelIcon(nameById.get(id) ?? "", selected));
    });
  }, [selectedTables, tables]);

  return (
    <div
      ref={containerRef}
      className="w-full h-[460px] sm:h-[560px] rounded-lg overflow-hidden cursor-pointer [&_.leaflet-interactive]:cursor-pointer"
      style={{ background: floor.backgroundColor || "#F5F3F2" }}
      role="group"
      aria-label="Interactive floor map. Click a table to select it."
    />
  );
}
