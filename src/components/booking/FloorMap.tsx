"use client";

import dynamic from "next/dynamic";
import type { FloorTable, FloorMeta } from "./LeafletFloorMap";

// Leaflet needs `window`, so load the actual map client-side only.
const LeafletFloorMap = dynamic(() => import("./LeafletFloorMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[460px] sm:h-[560px] rounded-lg bg-[#F5F3F2] flex items-center justify-center text-foreground/50 text-sm">
      Loading floor map…
    </div>
  ),
});

export type { FloorTable, FloorMeta };

interface FloorMapProps {
  tables: FloorTable[];
  selectedTables: number[];
  onToggle: (id: number) => void;
  floor: FloorMeta;
}

export default function FloorMap(props: FloorMapProps) {
  return <LeafletFloorMap {...props} />;
}
