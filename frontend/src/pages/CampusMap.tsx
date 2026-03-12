import React, { useState, useMemo, useCallback, useRef } from 'react';
import { 
  FiMaximize2, FiMinimize2, FiSearch, FiNavigation, FiLayers, 
  FiAlertCircle, FiTarget, FiList, FiX, FiCornerDownRight,
  FiMapPin, FiArrowRight, FiCheckCircle, FiActivity
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface WayPoint {
  id: number;
  name: string;
  building: string;
  type: string;
  x: number; // % of map width
  y: number; // % of map height
  label?: string;
  isJunction?: boolean;
}

// ─── WAYPOINTS ────────────────────────────────────────────────────────────────
// Named destinations (shown in index)
const namedPoints: WayPoint[] = [
  { id: 1,  name: 'Fuaye',              building: 'A Blok',      type: 'Common',    x: 33,  y: 82 },
  { id: 2,  name: 'C Blok Koridor',     building: 'C Blok',      type: 'Passage',   x: 38,  y: 55 },
  { id: 3,  name: 'Yemekhane',          building: 'H Blok',      type: 'Dining',    x: 43,  y: 26 },
  { id: 4,  name: 'Kütüphane',          building: 'S Blok',      type: 'Library',   x: 52,  y: 66 },
  { id: 5,  name: 'Öğrenci İşleri',     building: 'Y Blok',      type: 'Admin',     x: 68,  y: 77 },
  { id: 6,  name: 'Kariyer Merkezi',    building: 'Y Blok',      type: 'Admin',     x: 73,  y: 77 },
  { id: 7,  name: 'Y Blok Zemin Kat',   building: 'Y Blok',      type: 'Education', x: 82,  y: 77 },
  { id: 8,  name: 'Y Blok 1. Kat',      building: 'Y Blok',      type: 'Education', x: 86,  y: 77 },
  { id: 9,  name: 'Katrensü Diller',    building: 'Y Blok Area', type: 'Education', x: 91,  y: 61 },
  { id: 10, name: 'T Blok Fuaye',       building: 'T Blok',      type: 'Common',    x: 13,  y: 77 },
  { id: 11, name: 'T Blok Yemekhane',   building: 'T Blok',      type: 'Dining',    x: 10,  y: 70 },
  { id: 12, name: 'Öğrenci Yurdu',      building: 'Sanayi Site', type: 'Residence', x: 87,  y: 5  },
  { id: 13, name: 'SKS Girişi',         building: 'S Blok',      type: 'Health',    x: 62,  y: 77 },
  { id: 14, name: 'SKS Fitness Salonu', building: 'S Blok',      type: 'Sports',    x: 67,  y: 72 },
  { id: 15, name: 'SKS Revir',          building: 'S Blok',      type: 'Health',    x: 64,  y: 77 },
  { id: 16, name: 'M Blok',             building: 'M Blok',      type: 'Education', x: 55,  y: 56 },
  // Building letter entrances
  { id: 17, name: 'D Blok',             building: 'D Blok',      type: 'Education', x: 37,  y: 20, label: 'D' },
  { id: 18, name: 'H Blok Giriş',       building: 'H Blok',      type: 'Education', x: 43,  y: 37, label: 'H' },
  { id: 19, name: 'G Blok',             building: 'G Blok',      type: 'Education', x: 38,  y: 62, label: 'G' },
  { id: 20, name: 'B Blok Kapısı',      building: 'B Blok',      type: 'Passage',   x: 36,  y: 69, label: 'B' },
  { id: 21, name: 'F Blok',             building: 'F Blok',      type: 'Education', x: 41,  y: 73, label: 'F' },
  { id: 22, name: 'E Blok / Ön Giriş',  building: 'E Blok',      type: 'Entry',     x: 43,  y: 89, label: 'E' },
  { id: 23, name: 'K Blok / Arka Kapı', building: 'K Blok',      type: 'Entry',     x: 68,  y: 19, label: 'K' },
];

// Outdoor/junction routing nodes (invisible to user, only for pathfinding)
// These model the OPEN CAMPUS PATHS between buildings
const junctionNodes: WayPoint[] = [
  // ── Bottom perimeter road (Üniversite Caddesi side) ──
  { id: 100, name: 'SW Köşe',          building: 'Yol', type: 'Junction', x: 10,  y: 87, isJunction: true },
  { id: 101, name: 'Güney-1',          building: 'Yol', type: 'Junction', x: 21,  y: 87, isJunction: true },
  { id: 102, name: 'Güney-2 / A-önü',  building: 'Yol', type: 'Junction', x: 34,  y: 88, isJunction: true },
  { id: 103, name: 'Güney-3 / E-önü',  building: 'Yol', type: 'Junction', x: 46,  y: 89, isJunction: true },
  { id: 104, name: 'Güney-4 / S-önü',  building: 'Yol', type: 'Junction', x: 60,  y: 87, isJunction: true },
  { id: 105, name: 'Güney-5',          building: 'Yol', type: 'Junction', x: 71,  y: 85, isJunction: true },
  { id: 106, name: 'Güney-6 / Y-önü',  building: 'Yol', type: 'Junction', x: 83,  y: 85, isJunction: true },
  { id: 107, name: 'SE Köşe',          building: 'Yol', type: 'Junction', x: 92,  y: 85, isJunction: true },
  // ── Central open plaza ──
  { id: 110, name: 'Plaza SW',         building: 'Açık Alan', type: 'Junction', x: 38,  y: 73, isJunction: true },
  { id: 111, name: 'Plaza W',          building: 'Açık Alan', type: 'Junction', x: 38,  y: 62, isJunction: true },
  { id: 112, name: 'Plaza Merkez-1',   building: 'Açık Alan', type: 'Junction', x: 46,  y: 72, isJunction: true },
  { id: 113, name: 'Plaza Merkez-2',   building: 'Açık Alan', type: 'Junction', x: 54,  y: 70, isJunction: true },
  { id: 114, name: 'Plaza Merkez-3',   building: 'Açık Alan', type: 'Junction', x: 54,  y: 60, isJunction: true },
  { id: 115, name: 'Plaza E',          building: 'Açık Alan', type: 'Junction', x: 64,  y: 68, isJunction: true },
  { id: 116, name: 'Plaza NE',         building: 'Açık Alan', type: 'Junction', x: 74,  y: 70, isJunction: true },
  // ── Left side vertical (B-G corridor outdoor) ──
  { id: 120, name: 'Sol Dikey-1',      building: 'Yol', type: 'Junction', x: 36,  y: 73, isJunction: true },
  { id: 121, name: 'Sol Dikey-2',      building: 'Yol', type: 'Junction', x: 36,  y: 63, isJunction: true },
  { id: 122, name: 'Sol Dikey-3',      building: 'Yol', type: 'Junction', x: 36,  y: 52, isJunction: true },
  { id: 123, name: 'Kuzey-Sol',        building: 'Yol', type: 'Junction', x: 38,  y: 37, isJunction: true },
  // ── Right side outdoor (near Y and Katrensü) ──
  { id: 130, name: 'Sağ Dikey-1',      building: 'Yol', type: 'Junction', x: 92,  y: 73, isJunction: true },
  { id: 131, name: 'Sağ Dikey-2',      building: 'Yol', type: 'Junction', x: 92,  y: 55, isJunction: true },
  { id: 132, name: 'Sağ Dikey-3',      building: 'Yol', type: 'Junction', x: 92,  y: 35, isJunction: true },
  { id: 133, name: 'Sağ Dikey-4 Yurt', building: 'Yol', type: 'Junction', x: 92,  y: 18, isJunction: true },
  // ── North cross path ──
  { id: 140, name: 'Kuzey Yol-1',      building: 'Yol', type: 'Junction', x: 43,  y: 28, isJunction: true },
  { id: 141, name: 'Kuzey Yol-2',      building: 'Yol', type: 'Junction', x: 55,  y: 22, isJunction: true },
  // ── MERKEZ AVLU OMURGASI (the open courtyard running N-S through campus center) ──
  // This is the critical outdoor path that connects the plaza to Yemekhane directly
  { id: 150, name: 'Avlu-Güney',       building: 'Avlu', type: 'Junction', x: 48,  y: 64, isJunction: true },
  { id: 151, name: 'Avlu-Orta',        building: 'Avlu', type: 'Junction', x: 48,  y: 52, isJunction: true },
  { id: 152, name: 'Avlu-Kuzey',       building: 'Avlu', type: 'Junction', x: 48,  y: 40, isJunction: true },
  { id: 153, name: 'Avlu-Top',         building: 'Avlu', type: 'Junction', x: 48,  y: 30, isJunction: true },
];

const navigationPoints: WayPoint[] = [...namedPoints, ...junctionNodes];

// ─── EDGE GRAPH (based on red path lines in reference map) ───────────────────
// Combines outdoor roads + building connections + internal passages
const edges: [number, number][] = [
  // ── Bottom perimeter road (main outdoor axis) ──────────────────────────────
  [100, 101], [101, 102], [102, 103], [103, 104], [104, 105], [105, 106], [106, 107],
  // T Blok → perimeter
  [10, 100], [11, 100],
  // Buildings → bottom perimeter (outdoor entry points)
  [1,  102],  // Fuaye: A Blok → güney yol
  [22, 103],  // E Blok → güney yol
  [4,  104],  // S Blok → güney yol
  [13, 104], [15, 104],  // SKS → güney yol
  [5,  105], [6, 105],   // Öğrenci İşleri & Kariyer → güney yol
  [7,  106], [8, 106],   // Y Blok → güney yol
  [9,  107],             // Katrensü → SE köşe
  // ── Left side vertical outdoor spine ───────────────────────────────────────
  [100, 120],            // T → sol dikey
  [120, 121], [121, 122], [122, 123],
  // Buildings → left spine
  [1,  120],  // Fuaye → sol dikey
  [20, 120],  // B Blok → sol dikey
  [19, 121],  // G Blok → sol dikey
  [2,  122],  // C Blok → sol dikey
  [18, 123],  // H Blok → sol dikey
  // ── Central open plaza (horizontal) ─────────────────────────────────────────
  [102, 110], [103, 112],
  [110, 111], [111, 112],
  [112, 113], [113, 114],
  [113, 115], [115, 116],
  [114, 4], [114, 16],
  [116, 5], [116, 14],
  [1,  110], [4,  113], [16, 114], [13, 115], [5,  116],
  [121, 111], [120, 110],
  // ── MERKEZ AVLU OMURGASI (kuzey-güney açık alan yolu) ─────────────────────────
  // This is the direct outdoor path through the central campus courtyard
  [150, 151], [151, 152], [152, 153],
  // South connections to avlu
  [112, 150],              // plaza → avlu güney (entry from east)
  [114, 150],              // plaza merkez → avlu güney
  [16,  150],              // M Blok outdoor approach
  [4,   150],              // S Blok → avlu
  // Mid avlu connections
  [151, 16],               // avlu orta ↔ M Blok
  [151, 2],                // avlu orta ↔ C Blok (cross connection)
  [151, 122],              // avlu orta ↔ sol dikey spine
  // North avlu → Yemekhane DIRECTLY (key fix!)
  [152, 18],               // avlu kuzey → H Blok giriş outdoor
  [152, 3],                // avlu kuzey → Yemekhane direct outdoor!
  [153, 3],                // avlu top → Yemekhane (very close)
  [153, 17],               // avlu top → D Blok
  [153, 140],              // avlu top → kuzey yol
  // Kuzey yol (east-west top path)
  [140, 141], [141, 23],   // kuzey → Arka Kapı
  [141, 12],               // kuzey → Yurt area
  // ── Right side outdoor ──────────────────────────────────────────────────────
  [107, 130], [130, 131], [131, 132], [132, 133],
  [9,  130],  [9, 131],
  [23, 132], [12, 133],
  [7,  130], [8, 130],
  [116, 130],
  // ── North vertical (D-H-Yemekhane building spine) ─────────────────────────
  [123, 18],  // sol spine → H Blok (still valid as indoor shortcut)
  [18, 3],    // H Blok → Yemekhane
  [3,  17],   // Yemekhane ↔ D Blok
  [3,  140],  // Yemekhane → kuzey yol east
  // ── Y Blok internal ────────────────────────────────────────────────────────
  [5, 6], [6, 7], [7, 8],
  // ── SKS internal ───────────────────────────────────────────────────────────
  [13, 14], [13, 15],
  // ── M ↔ C corridor ─────────────────────────────────────────────────────────
  [16, 2],
  // ── F, A area ──────────────────────────────────────────────────────────────
  [21, 112], [21, 1],
];

// ─── DIJKSTRA ─────────────────────────────────────────────────────────────────
function euclidean(ax: number, ay: number, bx: number, by: number) {
  return Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);
}

function getXY(id: number, extraNode?: { id: number; x: number; y: number }) {
  if (extraNode && extraNode.id === id) return { x: extraNode.x, y: extraNode.y };
  const p = navigationPoints.find(n => n.id === id);
  return p ? { x: p.x, y: p.y } : { x: 0, y: 0 };
}

function dijkstra(
  startId: number,
  endId: number,
  extraEdges: [number, number][] = [],
  extraNode?: { id: number; x: number; y: number }
): number[] | null {
  const allIds = navigationPoints.map(p => p.id);
  if (extraNode) allIds.push(extraNode.id);

  const allEdges = [...edges, ...extraEdges];

  const dist: Record<number, number> = {};
  const prev: Record<number, number | null> = {};
  const visited = new Set<number>();

  for (const id of allIds) { dist[id] = Infinity; prev[id] = null; }
  dist[startId] = 0;

  const adj: Record<number, number[]> = {};
  for (const id of allIds) adj[id] = [];
  for (const [a, b] of allEdges) {
    if (adj[a]) adj[a].push(b);
    if (adj[b]) adj[b].push(a);
  }

  const queue = new Set(allIds);
  while (queue.size > 0) {
    let u = -1;
    for (const id of queue) {
      if (u === -1 || dist[id] < dist[u]) u = id;
    }
    if (u === -1 || dist[u] === Infinity) break;
    if (u === endId) break;
    queue.delete(u);
    visited.add(u);

    for (const v of (adj[u] || [])) {
      if (visited.has(v)) continue;
      const pa = getXY(u, extraNode), pb = getXY(v, extraNode);
      const alt = dist[u] + euclidean(pa.x, pa.y, pb.x, pb.y);
      if (alt < dist[v]) { dist[v] = alt; prev[v] = u; }
    }
  }

  if (dist[endId] === Infinity) return null;
  const path: number[] = [];
  let curr: number | null = endId;
  while (curr !== null) { path.unshift(curr); curr = prev[curr] ?? null; }
  return path;
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────
const CUSTOM_START_ID = 999;

const CampusMap: React.FC = () => {
  const { dimension } = useTheme();
  const isSpace = dimension === 'space';
  const [imageError, setImageError] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPoint, setSelectedPoint] = useState<number | null>(null);
  const [isMaximized, setIsMaximized] = useState(false);

  const [guidedMode, setGuidedMode] = useState(false);
  const [startPoint, setStartPoint] = useState<number | null>(null);
  const [startCoords, setStartCoords] = useState<{ x: number; y: number } | null>(null);
  const [destPoint, setDestPoint] = useState<number | null>(null);
  const [pathNodes, setPathNodes] = useState<number[]>([]);
  const [noPath, setNoPath] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);

  const visiblePoints = namedPoints;
  const filteredPoints = useMemo(() =>
    visiblePoints.filter(p =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.building.toLowerCase().includes(searchQuery.toLowerCase())
    ), [searchQuery]);

  const buildings = [
    { id: 'T', name: 'T Blok', points: [10, 11] },
    { id: 'M', name: 'M Blok', points: [16] },
    { id: 'S', name: 'S Blok', points: [4, 13, 14, 15] },
    { id: 'Y', name: 'Y Blok', points: [5, 6, 7, 8, 9] },
    { id: 'C', name: 'Main',   points: [1, 2, 3] },
  ];

  // ── Path Computation ────────────────────────────────────────────────────────
  const computePath = useCallback((sx: number, sy: number, isWaypointId?: number) => {
    if (!destPoint) return;

    let startId: number;
    let extraEdges: [number, number][] = [];
    let extraNode: { id: number; x: number; y: number } | undefined;

    if (isWaypointId !== undefined) {
      // Clicked on a known waypoint
      startId = isWaypointId;
      setStartPoint(isWaypointId);
      setStartCoords(null);
    } else {
      // Clicked anywhere on map → create virtual node
      startId = CUSTOM_START_ID;
      extraNode = { id: CUSTOM_START_ID, x: sx, y: sy };
      setStartPoint(null);
      setStartCoords({ x: sx, y: sy });

      // Connect virtual node to nearest 5 nodes
      const candidates = navigationPoints
        .map(p => ({ id: p.id, d: euclidean(sx, sy, p.x, p.y) }))
        .sort((a, b) => a.d - b.d)
        .slice(0, 5);
      for (const c of candidates) {
        extraEdges.push([CUSTOM_START_ID, c.id]);
      }
    }

    const path = dijkstra(startId, destPoint, extraEdges, extraNode);
    if (path) { setPathNodes(path); setNoPath(false); }
    else { setPathNodes([]); setNoPath(true); }
    setGuidedMode(false);
  }, [destPoint]);

  const handleStartGuidedPath = useCallback(() => {
    if (!selectedPoint) return;
    setDestPoint(selectedPoint);
    setStartPoint(null);
    setStartCoords(null);
    setPathNodes([]);
    setNoPath(false);
    setGuidedMode(true);
  }, [selectedPoint]);

  const handlePinClick = useCallback((e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (guidedMode) {
      computePath(0, 0, id);
    } else {
      setSelectedPoint(id);
    }
  }, [guidedMode, computePath]);

  const handleMapClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!guidedMode) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    computePath(x, y);
  }, [guidedMode, computePath]);

  const clearPath = useCallback(() => {
    setGuidedMode(false);
    setStartPoint(null);
    setStartCoords(null);
    setDestPoint(null);
    setPathNodes([]);
    setSelectedPoint(null);
    setNoPath(false);
  }, []);

  // ── SVG lines ───────────────────────────────────────────────────────────────
  const svgLines = useMemo(() => {
    if (pathNodes.length < 2) return [];
    const getCoords = (id: number) => {
      if (id === CUSTOM_START_ID && startCoords) return startCoords;
      return getXY(id);
    };
    return pathNodes.slice(0, -1).map((id, i) => {
      const a = getCoords(id), b = getCoords(pathNodes[i + 1]);
      return { x1: a.x, y1: a.y, x2: b.x, y2: b.y };
    });
  }, [pathNodes, startCoords]);

  const readablePath = useMemo(() =>
    pathNodes
      .map(id => id === CUSTOM_START_ID
        ? { id: CUSTOM_START_ID, name: 'Seçilen Konum', building: '', type: '', x: 0, y: 0 } as WayPoint
        : navigationPoints.find(p => p.id === id))
      .filter(p => p && !p.isJunction) as WayPoint[],
    [pathNodes]);

  // ── Map Contents ─────────────────────────────────────────────────────────────
  const MapInner = () => (
    <>
      <div className="absolute inset-0 pointer-events-none z-10 opacity-15">
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(var(--uv-primary) 0.5px, transparent 0.5px)', backgroundSize: '24px 24px' }} />
      </div>

      <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
        <div className="bg-uv-black/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-white flex items-center gap-2 shadow-lg">
          <FiLayers className="text-primary" size={13} />
          <span className="text-[9px] font-black uppercase tracking-widest">Tactical Layout</span>
        </div>
        {guidedMode && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
            className="bg-red-500 px-3 py-1.5 rounded-xl text-white flex items-center gap-2 shadow-lg shadow-red-500/30">
            <FiMapPin size={12} className="animate-bounce" />
            <span className="text-[9px] font-black uppercase tracking-widest whitespace-nowrap">Haritaya tıkla → başlangıç</span>
          </motion.div>
        )}
      </div>

      <div className="absolute bottom-4 right-4 z-20">
        <button onClick={() => setIsMaximized(!isMaximized)}
          className="w-10 h-10 bg-uv-black/80 backdrop-blur-md border border-white/10 text-white flex items-center justify-center rounded-xl hover:bg-primary hover:border-primary transition-all">
          {isMaximized ? <FiMinimize2 size={16} /> : <FiMaximize2 size={16} />}
        </button>
      </div>

      <div className="h-full w-full flex items-center justify-center p-3 bg-[#0d0d0f] overflow-auto relative scrollbar-hide">
        {!imageError ? (
          <div
            ref={mapContainerRef}
            className="relative inline-block h-[90%]"
            onClick={handleMapClick}
            style={{ cursor: guidedMode ? 'crosshair' : 'default' }}
          >
            <img
              src="/campus_map.png"
              alt="Yaşar Campus Infrastructure"
              className="h-full w-auto max-w-none rounded-2xl shadow-[0_0_100px_rgba(79,70,229,0.15)]"
              onError={() => setImageError(true)}
              draggable={false}
            />

            {/* SVG Path Overlay */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 25 }}
              viewBox="0 0 100 100" preserveAspectRatio="none">
              {/* Faint mesh edges */}
              {edges.map(([a, b], i) => {
                const pa = getXY(a), pb = getXY(b);
                return <line key={i} x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y}
                  stroke="rgba(255,255,255,0.04)" strokeWidth="0.3" />;
              })}

              {/* Active path — RED */}
              {svgLines.map((seg, i) => (
                <motion.line key={`seg-${i}`}
                  x1={seg.x1} y1={seg.y1} x2={seg.x2} y2={seg.y2}
                  stroke="#ef4444"
                  strokeWidth="1.1"
                  strokeLinecap="round"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.08, duration: 0.3 }}
                  style={{ filter: 'drop-shadow(0 0 4px rgba(239,68,68,0.9))' }}
                />
              ))}

              {/* Path step markers */}
              {pathNodes.map((id, i) => {
                const node = navigationPoints.find(n => n.id === id);
                if (node?.isJunction) return null;
                const isCustom = id === CUSTOM_START_ID;
                const p = isCustom ? startCoords! : getXY(id);
                if (!p) return null;
                const isStart = id === startPoint || isCustom;
                const isEnd = id === destPoint;
                return (
                  <g key={`mk-${id}`}>
                    <circle cx={p.x} cy={p.y} r={isStart || isEnd ? 2.2 : 1.6}
                      fill={isStart ? '#22c55e' : isEnd ? '#ef4444' : '#fff'}
                      stroke={isStart ? '#22c55e' : isEnd ? '#ef4444' : '#ef4444'}
                      strokeWidth="0.6" />
                  </g>
                );
              })}

              {/* Custom start crosshair */}
              {startCoords && (
                <g>
                  <circle cx={startCoords.x} cy={startCoords.y} r="2.8"
                    fill="rgba(34,197,94,0.25)" stroke="#22c55e" strokeWidth="0.8" strokeDasharray="1,1" />
                  <line x1={startCoords.x - 1.8} y1={startCoords.y} x2={startCoords.x + 1.8} y2={startCoords.y}
                    stroke="#22c55e" strokeWidth="0.6" />
                  <line x1={startCoords.x} y1={startCoords.y - 1.8} x2={startCoords.x} y2={startCoords.y + 1.8}
                    stroke="#22c55e" strokeWidth="0.6" />
                </g>
              )}
            </svg>

            {/* Waypoint Pins */}
            {visiblePoints.map(point => {
              const isStart = point.id === startPoint;
              const isEnd = point.id === destPoint;
              const isOnPath = pathNodes.includes(point.id);
              const isSelected = selectedPoint === point.id && !guidedMode;
              return (
                <div key={point.id}
                  className="absolute group cursor-pointer transition-all duration-200 transform -translate-x-1/2 -translate-y-1/2 hover:z-30"
                  style={{ left: `${point.x}%`, top: `${point.y}%`, zIndex: (isSelected || isOnPath) ? 40 : 20 }}
                  onClick={(e) => handlePinClick(e, point.id)}>
                  {(isSelected || isStart || isEnd) && (
                    <div className={`absolute inset-[-4px] rounded-full animate-ping opacity-50 pointer-events-none ${isStart ? 'bg-green-500' : isEnd ? 'bg-red-500' : 'bg-primary'}`} />
                  )}
                  <div className={`${point.label ? 'w-5 h-5 rounded-md' : 'w-4 h-4 rounded-full'} border-2 border-white shadow-lg flex items-center justify-center text-[7px] font-black transition-all ${
                    isStart ? 'bg-green-500 text-white scale-125'
                    : isEnd ? 'bg-red-500 text-white scale-125'
                    : isOnPath ? 'bg-red-500 text-white scale-110'
                    : isSelected ? 'bg-primary text-white scale-125'
                    : 'bg-uv-black/90 text-white hover:bg-primary'
                  }`}>
                    {point.label || point.id}
                  </div>
                  <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-[#111827]/95 backdrop-blur-md border border-white/10 text-white px-2 py-1 flex flex-col items-center rounded-lg transition-all whitespace-nowrap pointer-events-none shadow-xl ${isSelected || isStart || isEnd ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0'}`}>
                    <span className="text-[10px] font-black">{point.name}</span>
                    <span className="text-[8px] text-gray-400 uppercase">{point.building}</span>
                    <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[5px] border-l-transparent border-t-[5px] border-t-[#111827]/95 border-r-[5px] border-r-transparent" />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-6 text-center text-white p-12">
            <FiAlertCircle size={48} className="text-primary animate-pulse" />
            <p className="text-uv-gray text-xs font-bold max-w-xs">Place 'campus_map.png' in your public directory.</p>
          </div>
        )}
      </div>
    </>
  );

  return (
    <div className={`flex flex-col h-[100dvh] overflow-hidden ${isSpace ? 'bg-[#050510]' : 'bg-white'}`}>
      {/* Header */}
      <div className={`flex-shrink-0 sticky top-0 backdrop-blur-xl border-b z-30 px-4 lg:px-6 py-3 lg:py-4 flex items-center justify-between gap-3 ${isSpace ? 'bg-[#0a0a1a]/80 border-white/5' : 'bg-white/90 border-gray-100'}`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isSpace ? 'bg-primary/20 border border-primary/30' : 'bg-uv-black'}`}>
            <FiNavigation size={18} className="text-primary animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl font-black tracking-tighter leading-none">
              <span className={isSpace ? 'text-white' : 'text-uv-black'}>GEOMAP</span>
              <span className="text-primary italic">.NAV</span>
            </h2>
            <p className={`text-[9px] font-black uppercase tracking-[0.3em] mt-0.5 ${isSpace ? 'text-white/30' : 'text-uv-gray'}`}>Yaşar Campus Infrastructure</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {(pathNodes.length > 0 || guidedMode) && (
            <button onClick={clearPath} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl text-[10px] font-black uppercase transition-all">
              <FiX size={11} /> Temizle
            </button>
          )}
          <div className={`hidden md:flex items-center gap-2 border p-1.5 rounded-xl w-64 ${isSpace ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-uv-border'}`}>
            <FiSearch className="ml-2 text-uv-gray" size={13} />
            <input type="text" placeholder="Waypoint ara..." className={`bg-transparent border-none outline-none text-xs font-bold w-full py-1.5 placeholder:text-uv-gray/40 ${isSpace ? 'text-white' : 'text-uv-black'}`}
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row flex-1 min-h-0 overflow-hidden">
        {/* Map */}
        <div className={`flex-[3] flex flex-col p-3 lg:p-5 border-b xl:border-b-0 xl:border-r ${isSpace ? 'border-white/5' : 'border-gray-50'} min-w-0 h-full`}>
          <div className="relative flex-1 rounded-[1.5rem] lg:rounded-[2rem] overflow-hidden bg-uv-black shadow-2xl min-h-[280px]">
            <MapInner />
          </div>

          {/* Bottom panels */}
          <AnimatePresence>
            {/* Target locked panel */}
            {selectedPoint && !guidedMode && pathNodes.length === 0 && (
              <motion.div initial={{ opacity: 0, height: 0, marginTop: 0 }} animate={{ opacity: 1, height: 'auto', marginTop: 10 }} exit={{ opacity: 0, height: 0, marginTop: 0 }} className="overflow-hidden shrink-0">
                <div className={`rounded-xl p-3 lg:p-4 relative overflow-hidden flex items-center justify-between gap-4 ${isSpace ? 'bg-primary/10 text-white' : 'bg-[#111827] text-white'}`}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 bg-primary/20 rounded-xl flex items-center justify-center text-primary shrink-0"><FiTarget size={18} /></div>
                    <div className="min-w-0">
                      <p className="text-[9px] font-black text-primary uppercase tracking-widest mb-0.5">Hedef Kilitlendi</p>
                      <h5 className="text-sm lg:text-lg font-black truncate">{navigationPoints.find(p => p.id === selectedPoint)?.name}</h5>
                    </div>
                  </div>
                  <button onClick={handleStartGuidedPath} className="shrink-0 bg-primary text-white text-[10px] font-black py-2.5 px-5 rounded-xl flex items-center gap-2 hover:brightness-110 transition-all shadow-lg shadow-primary/30 whitespace-nowrap">
                    START <FiArrowRight size={13} />
                  </button>
                </div>
              </motion.div>
            )}

            {/* Guided mode hint */}
            {guidedMode && (
              <motion.div initial={{ opacity: 0, height: 0, marginTop: 0 }} animate={{ opacity: 1, height: 'auto', marginTop: 10 }} exit={{ opacity: 0, height: 0, marginTop: 0 }} className="overflow-hidden shrink-0">
                <div className="rounded-xl p-3 bg-red-500 text-white flex items-center gap-3">
                  <FiMapPin size={18} className="animate-bounce shrink-0" />
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest">Haritada istediğin yere tıkla</p>
                    <p className="text-[9px] opacity-70 mt-0.5">Başlangıç noktası herhangi bir yer olabilir — bina veya açık alan</p>
                  </div>
                  <button onClick={clearPath} className="ml-auto bg-white/20 hover:bg-white/30 p-2 rounded-xl"><FiX size={14} /></button>
                </div>
              </motion.div>
            )}

            {/* Path result */}
            {pathNodes.length > 0 && (
              <motion.div initial={{ opacity: 0, height: 0, marginTop: 0 }} animate={{ opacity: 1, height: 'auto', marginTop: 10 }} exit={{ opacity: 0, height: 0, marginTop: 0 }} className="overflow-hidden shrink-0">
                <div className={`rounded-xl p-3 ${isSpace ? 'bg-white/5 border border-white/10' : 'bg-gray-50 border border-gray-100'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <FiCheckCircle className="text-green-500" size={14} />
                      <span className={`text-[10px] font-black uppercase tracking-widest ${isSpace ? 'text-white' : 'text-uv-black'}`}>En Kısa Yol — {readablePath.length} Durak</span>
                    </div>
                    <button onClick={clearPath} className="text-[9px] font-black text-red-400 hover:text-red-500 uppercase">Sil</button>
                  </div>
                  <div className="flex items-center gap-1 flex-wrap">
                    {readablePath.map((p, i) => (
                      <React.Fragment key={p.id}>
                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-lg ${p.id === startPoint || p.id === CUSTOM_START_ID ? 'bg-green-500/20 text-green-500' : p.id === destPoint ? 'bg-red-500/20 text-red-500' : 'bg-red-500/10 text-red-500'}`}>
                          {i + 1}. {p.name}
                        </span>
                        {i < readablePath.length - 1 && <FiArrowRight size={9} className="text-uv-gray shrink-0" />}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {noPath && (
              <motion.div initial={{ opacity: 0, height: 0, marginTop: 0 }} animate={{ opacity: 1, height: 'auto', marginTop: 10 }} exit={{ opacity: 0, height: 0, marginTop: 0 }} className="overflow-hidden shrink-0">
                <div className="rounded-xl p-3 bg-red-500/10 border border-red-500/20 flex items-center gap-2">
                  <FiAlertCircle className="text-red-400" size={14} />
                  <span className="text-xs font-black text-red-400">Bu iki nokta arasında yol bulunamadı.</span>
                  <button onClick={clearPath} className="ml-auto text-[9px] text-red-400 font-black">Temizle</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Panel */}
        <div className={`w-full xl:w-[285px] flex-shrink-0 p-3 lg:p-4 flex flex-col h-full min-h-0 ${isSpace ? 'bg-[#0a0a1a]/20 border-white/5' : 'bg-gray-50/30 border-gray-50'}`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className={`font-black text-base flex items-center gap-2 tracking-tighter ${isSpace ? 'text-white' : 'text-uv-black'}`}>
              <FiList className="text-primary" size={15} /> INDEX
            </h3>
            <span className="bg-primary/10 text-primary text-[9px] font-black px-2 py-0.5 rounded-full uppercase">{filteredPoints.length} PTS</span>
          </div>

          {guidedMode && (
            <div className="mb-2 p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[9px] font-black uppercase text-center">
              ← Listeden veya haritaya tıkla
            </div>
          )}

          <div className="space-y-1.5 flex-1 overflow-y-auto pr-1 scrollbar-hide">
            {filteredPoints.map((point) => {
              const isStart = point.id === startPoint;
              const isEnd = point.id === destPoint;
              const isOnPath = pathNodes.includes(point.id);
              const isActive = selectedPoint === point.id;
              return (
                <motion.div key={point.id} layout
                  onClick={() => guidedMode ? computePath(0, 0, point.id) : setSelectedPoint(point.id)}
                  className={`rounded-xl p-2.5 cursor-pointer transition-all border-l-2 ${
                    isStart ? 'bg-green-500/10 border-l-green-500'
                    : isEnd ? 'bg-red-500/10 border-l-red-500'
                    : isOnPath ? 'bg-red-500/5 border-l-red-400'
                    : isActive ? (isSpace ? 'bg-primary/10 border-l-primary shadow-lg' : 'bg-white border-l-primary shadow-lg')
                    : isSpace ? 'bg-white/5 border-l-transparent hover:bg-white/10' : 'bg-white/40 border-l-transparent hover:bg-white'
                  }`}>
                  <div className="flex justify-between items-start mb-0.5">
                    <span className={`w-5 h-5 rounded-lg flex items-center justify-center text-[9px] font-black ${isStart ? 'bg-green-500 text-white' : isEnd ? 'bg-red-500 text-white' : isOnPath ? 'bg-red-500 text-white' : isActive ? 'bg-primary text-white' : isSpace ? 'bg-primary/20 text-primary' : 'bg-[#111827] text-white'}`}>
                      {point.label || point.id}
                    </span>
                    <span className="text-[7px] font-black uppercase tracking-wide text-gray-500">{point.type}</span>
                  </div>
                  <h4 className={`font-black text-xs truncate ${isSpace ? 'text-white' : 'text-uv-black'}`}>{point.name}</h4>
                  <div className="flex items-center gap-1 mt-0.5">
                    <FiCornerDownRight size={9} className="text-primary" />
                    <span className="text-[8px] font-bold uppercase truncate text-uv-gray">{point.building}</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Fullscreen */}
        <AnimatePresence>
          {isMaximized && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className={`fixed inset-0 z-[100] flex items-center justify-center p-4 ${isSpace ? 'bg-[#050510]/95 backdrop-blur-2xl' : 'bg-black/90 backdrop-blur-2xl'}`}>
              <div className="w-full h-full relative rounded-[2rem] overflow-hidden bg-uv-black">
                <MapInner />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className={`flex-shrink-0 px-4 lg:px-6 py-2 border-t flex flex-wrap justify-between items-center gap-3 ${isSpace ? 'border-white/5 bg-[#0a0a1a]/80' : 'border-gray-100 bg-white'}`}>
        <div className="flex items-center gap-4 flex-wrap">
          {buildings.map(b => (
            <div key={b.id} className="flex flex-col items-center">
              <span className="text-[9px] font-black text-uv-gray mb-0.5">{b.name}</span>
              <div className="flex gap-0.5">
                {b.points.slice(0, 3).map(p => (
                  <div key={p} className={`w-4 h-4 rounded flex items-center justify-center text-[8px] font-bold ${isSpace ? 'bg-white/5 text-uv-gray' : 'bg-gray-100 text-uv-gray'}`}>{p}</div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="text-[9px] font-black text-uv-gray uppercase tracking-widest flex items-center gap-1.5">
          Status: Mesh Active <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_6px_rgba(34,197,94,0.5)]" />
        </div>
      </div>
    </div>
  );
};

export default CampusMap;
