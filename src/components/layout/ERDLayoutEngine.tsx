// ERDLayoutEngine.tsx
import React, { useEffect, useMemo, useState } from "react";

/**
 * ERDLayoutEngine
 *
 * Props:
 *  - nodes: { id: string, width?: number, height?: number }[]
 *  - edges: { source: string, target: string, weight?: number }[]
 *  - clusters?: Record<string, number>   // optional precomputed community mapping: nodeId -> clusterId
 *
 * You can select clusterPlacement, nodePlacement and edgeRouting from the UI.
 *
 * This file implements:
 *  - cluster placement strategies
 *  - node placement strategies inside cluster
 *  - edge routing strategies
 *
 * NOTE: This is intentionally dependency free (no elkjs, no webcola).
 */

// ---------------------- Types ----------------------
type NodeInput = { id: string; width?: number; height?: number };
type EdgeInput = { source: string; target: string; weight?: number };

type Props = {
  nodes: NodeInput[];
  edges: EdgeInput[];
  clusters?: Record<string, number>;
  width?: number;
  height?: number;
};

// ---------------------- Helpers ----------------------
const defaultNodeSize = { width: 140, height: 46 };

function nodeKey(n: NodeInput) { return n.id; }

function buildAdjacency(nodes: NodeInput[], edges: EdgeInput[]) {
  const nbrs = new Map<string, Map<string, number>>();
  for (const n of nodes) nbrs.set(n.id, new Map());
  for (const e of edges) {
    if (!nbrs.has(e.source) || !nbrs.has(e.target)) continue;
    const a = nbrs.get(e.source)!, b = nbrs.get(e.target)!;
    a.set(e.target, (a.get(e.target) || 0) + (e.weight ?? 1));
    b.set(e.source, (b.get(e.source) || 0) + (e.weight ?? 1));
  }
  return nbrs;
}

function degreeOf(nodeId: string, adj: Map<string, Map<string, number>>) {
  const m = adj.get(nodeId);
  if (!m) return 0;
  let s = 0;
  for (const v of m.values()) s += v;
  return s;
}

// simple deterministic RNG for reproducibility (mulberry32)
function makeRNG(seed = 123456) {
  let t = seed >>> 0;
  return () => {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------- Cluster Utilities ----------------------
function groupByCluster(
  nodes: NodeInput[],
  clusters?: Record<string, number>
) {
  const map = new Map<number, NodeInput[]>();
  if (clusters) {
    for (const n of nodes) {
      const c = clusters[n.id] ?? 0;
      if (!map.has(c)) map.set(c, []);
      map.get(c)!.push(n);
    }
  } else {
    // fallback: trivial single cluster OR tiny heuristic: connected components
    // We'll use connected components heuristic to form clusters if clusters not provided.
    // Caller can always pass real Leiden mapping.
    for (let i = 0; i < nodes.length; i++) {
      if (!map.has(0)) map.set(0, []);
      map.get(0)!.push(nodes[i]);
    }
  }
  return map;
}

// ---------------------- CLUSTER PLACEMENT STRATEGIES (#2) ----------------------

// 1) Circle placement of cluster centroids
function circlePlaceClusters(clusterIds: number[], radius = 600) {
  const step = (2 * Math.PI) / Math.max(1, clusterIds.length);
  const out = new Map<number, { x: number; y: number }>();
  for (let i = 0; i < clusterIds.length; i++) {
    const id = clusterIds[i];
    out.set(id, { x: Math.cos(i * step) * radius, y: Math.sin(i * step) * radius });
  }
  return out;
}

// 2) Grid placement of cluster centroids (rows/cols)
function gridPlaceClusters(clusterIds: number[], spacing = 600) {
  const n = clusterIds.length;
  const cols = Math.ceil(Math.sqrt(n));
  const out = new Map<number, { x: number; y: number }>();
  for (let i = 0; i < n; i++) {
    const r = Math.floor(i / cols);
    const c = i % cols;
    out.set(clusterIds[i], { x: (c - cols / 2) * spacing, y: (r - Math.ceil(n / cols) / 2) * spacing });
  }
  return out;
}

// 3) Treemap / slice-and-dice: produce rectangles (we return centers)
function treemapPlaceClusters(clusterSizes: [number, number][], totalW = 1200, totalH = 800) {
  // clusterSizes: array of [clusterId, size]
  // implement simple slice-and-dice recursively
  const rects = new Map<number, { x: number; y: number; w: number; h: number }>();

  const totalSize = clusterSizes.reduce((s, [, size]) => s + size, 0) || 1;

  function sliceAndDice(items: [number, number][], x: number, y: number, w: number, h: number, horizontal = true) {
    if (items.length === 0) return;
    if (items.length === 1) {
      const [id, size] = items[0];
      rects.set(id, { x, y, w, h });
      return;
    }
    let acc = 0;
    const halfSize = items.reduce((s, [, size]) => s + size, 0) / 2;
    let split = 0;
    for (let i = 0; i < items.length; i++) {
      acc += items[i][1];
      if (acc >= halfSize) { split = i + 1; break; }
    }
    if (split === 0) split = 1;
    const left = items.slice(0, split);
    const right = items.slice(split);

    const leftSize = left.reduce((s, [, size]) => s + size, 0);
    const rightSize = right.reduce((s, [, size]) => s + size, 0);

    if (horizontal) {
      const leftW = w * (leftSize / (leftSize + rightSize));
      sliceAndDice(left, x, y, leftW, h, !horizontal);
      sliceAndDice(right, x + leftW, y, w - leftW, h, !horizontal);
    } else {
      const leftH = h * (leftSize / (leftSize + rightSize));
      sliceAndDice(left, x, y, w, leftH, !horizontal);
      sliceAndDice(right, x, y + leftH, w, h - leftH, !horizontal);
    }
  }

  sliceAndDice(clusterSizes, -totalW / 2, -totalH / 2, totalW, totalH, true);

  // return centers
  const centers = new Map<number, { x: number; y: number }>();
  for (const [id, r] of rects) centers.set(id, { x: r.x + r.w / 2, y: r.y + r.h / 2 });
  return centers;
}

// ------------------------------------------------------
// 2. Cluster Placement Algorithms
// ------------------------------------------------------

export function layoutClusters(
  communities: Record<string, number>,
  options: { algorithm: "circle" | "grid" | "radial" | "treemap"; radius?: number }
) {
  const algo = options.algorithm;
  const radius = options.radius ?? 600;

  const clusterIds = [...new Set(Object.values(communities))];
  const count = clusterIds.length;
  const positions: Record<number, { x: number; y: number }> = {};

  if (algo === "circle") {
    const step = (2 * Math.PI) / count;
    clusterIds.forEach((cid, i) => {
      positions[cid] = {
        x: Math.cos(i * step) * radius,
        y: Math.sin(i * step) * radius
      };
    });
  }

  if (algo === "grid") {
    const cols = Math.ceil(Math.sqrt(count));
    clusterIds.forEach((cid, i) => {
      positions[cid] = {
        x: (i % cols) * 600,
        y: Math.floor(i / cols) * 450
      };
    });
  }

  if (algo === "radial") {
    const center = clusterIds[0];
    positions[center] = { x: 0, y: 0 };
    const others = clusterIds.slice(1);
    const step = (2 * Math.PI) / others.length;
    others.forEach((cid, i) => {
      positions[cid] = {
        x: Math.cos(i * step) * radius,
        y: Math.sin(i * step) * radius
      };
    });
  }

  if (algo === "treemap") {
    let x = 0;
    let y = 0;
    clusterIds.forEach(cid => {
      positions[cid] = { x, y };
      x += 500;
      if (x > 2000) {
        x = 0;
        y += 500;
      }
    });
  }

  return positions;
}

// 4) Force-directed layout on cluster centroids (simple spring system)
function forcePlaceClusters(clusterIds: number[], clusterGraphs: Map<number, string[]>, adj: Map<string, Map<string, number>>, iterations = 200) {
  // Build graph of cluster connectivity: weight = number of cross-cluster edges.
  const clusterIndex = new Map<number, number>();
  clusterIds.forEach((c, i) => clusterIndex.set(c, i));
  const n = clusterIds.length;
  const pos = new Array(n).fill(0).map((_) => ({ x: (Math.random() - 0.5) * 800, y: (Math.random() - 0.5) * 800 }));
  const mass = new Array(n).fill(1);

  // connectivity matrix
  const conn = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  for (const [c, nodes] of clusterGraphs.entries()) {
    const i = clusterIndex.get(c)!;
    for (const u of nodes) {
      const nbrs = adj.get(u);
      if (!nbrs) continue;
      for (const [v, w] of nbrs.entries()) {
        const c2 = clusterIndex.get(findClusterOfNode(clusterGraphs, v));
        if (c2 === undefined) continue;
        conn[i][c2] += w;
      }
    }
  }

  // simple force simulation: repulsive + spring (attractive based on conn)
  const rng = makeRNG(42);
  for (let it = 0; it < iterations; it++) {
    // repulsion
    const disp = pos.map(() => ({ x: 0, y: 0 }));
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const dx = pos[j].x - pos[i].x;
        const dy = pos[j].y - pos[i].y;
        const d2 = dx * dx + dy * dy + 1e-6;
        const d = Math.sqrt(d2);
        const force = 10000 / d2; // repulsive param
        const fx = (dx / d) * force;
        const fy = (dy / d) * force;
        disp[i].x -= fx; disp[i].y -= fy;
        disp[j].x += fx; disp[j].y += fy;
      }
    }
    // attraction according to cluster connectivity
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        const w = conn[i][j];
        if (!w) continue;
        const dx = pos[j].x - pos[i].x;
        const dy = pos[j].y - pos[i].y;
        const d = Math.sqrt(dx * dx + dy * dy) + 1e-6;
        const desired = 200; // preferred length
        const force = w * (d - desired) * 0.01;
        disp[i].x += force * dx / d;
        disp[i].y += force * dy / d;
        disp[j].x -= force * dx / d;
        disp[j].y -= force * dy / d;
      }
    }
    // integrate with small step
    for (let i = 0; i < n; i++) {
      pos[i].x += disp[i].x * 0.02;
      pos[i].y += disp[i].y * 0.02;
      // small jitter to avoid exact overlaps
      pos[i].x += (rng() - 0.5) * 0.1;
      pos[i].y += (rng() - 0.5) * 0.1;
    }
  }

  const out = new Map<number, { x: number; y: number }>();
  for (let i = 0; i < n; i++) out.set(clusterIds[i], pos[i]);
  return out;
}

// 5) Radial cluster placement (clusters at different radii by size)
function radialPlaceClusters(clusterIds: number[], clusterSizesMap: Map<number, number>, baseRadius = 200) {
  const sorted = [...clusterIds].sort((a, b) => (clusterSizesMap.get(b) || 0) - (clusterSizesMap.get(a) || 0));
  const out = new Map<number, { x: number; y: number }>();
  for (let i = 0; i < sorted.length; i++) {
    const r = baseRadius * (1 + Math.floor(i / 6));
    const angle = (i % 6) * (Math.PI * 2 / 6);
    out.set(sorted[i], { x: Math.cos(angle) * r, y: Math.sin(angle) * r });
  }
  return out;
}

// 6) DAG-like layered cluster placement (topological rank)
function layeredClusterPlacement(clusterGraphEdges: [number, number][], clusterIds: number[], spacingX = 500, spacingY = 250) {
  // compute in-degree/topological layers via Kahn-like BFS (simple)
  const indeg = new Map<number, number>();
  const outs = new Map<number, number[]>();
  clusterIds.forEach(c => (indeg.set(c, 0), outs.set(c, [])));
  for (const [u, v] of clusterGraphEdges) {
    indeg.set(v, (indeg.get(v) || 0) + 1);
    outs.get(u)!.push(v);
  }
  const queue = clusterIds.filter(c => (indeg.get(c) || 0) === 0);
  const layer = new Map<number, number>();
  for (const q of queue) layer.set(q, 0);
  let idx = 0;
  while (idx < queue.length) {
    const u = queue[idx++];
    for (const v of outs.get(u) || []) {
      indeg.set(v, indeg.get(v)! - 1);
      if (indeg.get(v) === 0) {
        layer.set(v, (layer.get(u) || 0) + 1);
        queue.push(v);
      }
    }
  }
  // nodes not reachable: assign increasing layers
  for (const c of clusterIds) if (!layer.has(c)) layer.set(c, Math.max(...Array.from(layer.values())) + 1);

  const maxLayer = Math.max(...Array.from(layer.values()));
  const groups = new Map<number, number[]>();
  for (const c of clusterIds) {
    const l = layer.get(c)!;
    if (!groups.has(l)) groups.set(l, []);
    groups.get(l)!.push(c);
  }
  const out = new Map<number, { x: number; y: number }>();
  for (let l = 0; l <= maxLayer; l++) {
    const arr = groups.get(l) || [];
    for (let i = 0; i < arr.length; i++) {
      out.set(arr[i], { x: (i - arr.length / 2) * spacingX, y: (l - maxLayer / 2) * spacingY });
    }
  }
  return out;
}

// helper to find cluster id of a node in the clusterGraphs map
function findClusterOfNode(clusterGraphs: Map<number, string[]>, nodeId: string) {
  for (const [cid, nodes] of clusterGraphs.entries()) if (nodes.includes(nodeId)) return cid;
  return -1;
}

// ---------------------- NODE PLACEMENT INSIDE CLUSTER (#3) ----------------------

// A) Grid layout inside cluster
function layoutNodesGrid(nodes: NodeInput[], cx: number, cy: number, spacing = 160, cols?: number) {
  const n = nodes.length;
  const c = cols ?? Math.ceil(Math.sqrt(n));
  const out = new Map<string, { x: number; y: number }>();
  for (let i = 0; i < n; i++) {
    const r = Math.floor(i / c);
    const col = i % c;
    const x = cx + (col - (c - 1) / 2) * spacing;
    const y = cy + (r - (Math.ceil(n / c) - 1) / 2) * spacing;
    out.set(nodes[i].id, { x, y });
  }
  return out;
}

// B) Local force layout inside cluster (nodes interact within cluster)
function layoutNodesForce(nodes: NodeInput[], clusterCenter: { x: number; y: number }, adj: Map<string, Map<string, number>>, iterations = 300) {
  const n = nodes.length;
  const pos = nodes.map((_, i) => ({ x: clusterCenter.x + (Math.random() - 0.5) * 80, y: clusterCenter.y + (Math.random() - 0.5) * 80 }));
  const idIndex = new Map<string, number>(); nodes.forEach((m, i) => idIndex.set(m.id, i));
  // simple spring: connected nodes attract, all nodes repel
  for (let it = 0; it < iterations; it++) {
    const disp = pos.map(() => ({ x: 0, y: 0 }));
    // repulsion
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const dx = pos[j].x - pos[i].x;
        const dy = pos[j].y - pos[i].y;
        const d2 = dx * dx + dy * dy + 1e-6;
        const d = Math.sqrt(d2);
        const f = 2000 / d2;
        const fx = (dx / d) * f;
        const fy = (dy / d) * f;
        disp[i].x -= fx; disp[i].y -= fy;
        disp[j].x += fx; disp[j].y += fy;
      }
    }
    // attraction for edges inside same cluster
    for (let i = 0; i < n; i++) {
      const id = nodes[i].id;
      const nbrs = adj.get(id);
      if (!nbrs) continue;
      for (const [nb, w] of nbrs.entries()) {
        const j = idIndex.get(nb);
        if (j === undefined) continue;
        const dx = pos[j].x - pos[i].x;
        const dy = pos[j].y - pos[i].y;
        const d = Math.sqrt(dx * dx + dy * dy) + 1e-6;
        const desired = 120;
        const force = w * (d - desired) * 0.02;
        disp[i].x += force * dx / d;
        disp[i].y += force * dy / d;
        disp[j].x -= force * dx / d;
        disp[j].y -= force * dy / d;
      }
    }
    // integrate
    for (let i = 0; i < n; i++) {
      pos[i].x += disp[i].x * 0.02;
      pos[i].y += disp[i].y * 0.02;
    }
  }
  const out = new Map<string, { x: number; y: number }>();
  for (let i = 0; i < n; i++) out.set(nodes[i].id, pos[i]);
  return out;
}

// C) radial layout inside cluster
function layoutNodesRadial(nodes: NodeInput[], cx: number, cy: number, spacing = 60) {
  const n = nodes.length;
  const out = new Map<string, { x: number; y: number }>();
  if (n === 1) { out.set(nodes[0].id, { x: cx, y: cy }); return out; }
  const radius = Math.max(140, spacing * Math.ceil(n / 6));
  for (let i = 0; i < n; i++) {
    const angle = (i / n) * 2 * Math.PI;
    out.set(nodes[i].id, { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius });
  }
  return out;
}

// D) degree-ordered: order by degree, place in snake grid to keep high-degree center-ish
function layoutNodesDegreeOrdered(nodes: NodeInput[], cx: number, cy: number, adj: Map<string, Map<string, number>>, spacing = 140) {
  const deg = nodes.map(n => ({ id: n.id, d: degreeOf(n.id, adj) }));
  deg.sort((a, b) => b.d - a.d);
  const orderedNodes = deg.map(d => nodes.find(n => n.id === d.id)!);
  return layoutNodesGrid(orderedNodes, cx, cy, spacing);
}

// E) box-packing (naive): place boxes of their width/height in rows in the cluster bounding region
function layoutNodesBoxPacking(nodes: NodeInput[], cx: number, cy: number, maxRowWidth = 700) {
  const out = new Map<string, { x: number; y: number }>();
  let x = -maxRowWidth / 2;
  let y = -100;
  let rowH = 0;
  for (const n of nodes) {
    const w = n.width ?? defaultNodeSize.width;
    const h = n.height ?? defaultNodeSize.height;
    if (x + w > maxRowWidth / 2) {
      x = -maxRowWidth / 2;
      y += rowH + 20;
      rowH = 0;
    }
    out.set(n.id, { x: cx + x + w / 2, y: cy + y + h / 2 });
    x += w + 20;
    rowH = Math.max(rowH, h);
  }
  return out;
}

// ---------------------- EDGE ROUTING (#4) ----------------------

// Straight line (center to center)
function routeStraight(p1: { x: number; y: number }, p2: { x: number; y: number }) {
  return { type: "straight", points: [p1, p2] as { x: number; y: number }[] };
}

// Quadratic Bezier control point mid
function routeCurved(p1: { x: number; y: number }, p2: { x: number; y: number }) {
  const mx = (p1.x + p2.x) / 2;
  const my = (p1.y + p2.y) / 2;
  // offset control point perpendicular to line to get nice curvature
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const len = Math.sqrt(dx * dx + dy * dy) + 1e-6;
  const ux = -dy / len;
  const uy = dx / len;
  const offset = Math.min(200, len * 0.25) * ((Math.abs(dx) + Math.abs(dy)) % 2 ? 1 : -1);
  const cx = mx + ux * offset;
  const cy = my + uy * offset;
  return { type: "quad", points: [p1, { x: cx, y: cy }, p2] };
}

// Orthogonal Manhattan route: center -> horizontal/vertical elbow -> center
function routeOrthogonal(p1: { x: number; y: number }, p2: { x: number; y: number }) {
  // choose elbow mid on x or y depending on delta
  const dx = Math.abs(p2.x - p1.x);
  const dy = Math.abs(p2.y - p1.y);
  if (dx > dy) {
    // horizontal first: p1 -> (p2.x, p1.y) -> p2
    const mid = { x: p2.x, y: p1.y };
    return { type: "poly", points: [p1, mid, p2] };
  } else {
    // vertical first
    const mid = { x: p1.x, y: p2.y };
    return { type: "poly", points: [p1, mid, p2] };
  }
}

// Bundled: route via cluster centroid (if different clusters) to encourage bundling
function routeBundled(p1: { x: number; y: number }, p2: { x: number; y: number }, c1: { x: number; y: number } | null, c2: { x: number; y: number } | null) {
  // If same cluster or centroids null, fallback to curved
  if (!c1 || !c2) return routeCurved(p1, p2);
  // If same centroid, just curved
  if (Math.abs(c1.x - c2.x) < 1e-6 && Math.abs(c1.y - c2.y) < 1e-6) return routeCurved(p1, p2);
  // route: p1 -> c1 -> mid(c1,c2) -> c2 -> p2
  const mid = { x: (c1.x + c2.x) / 2, y: (c1.y + c2.y) / 2 };
  return { type: "poly", points: [p1, c1, mid, c2, p2] };
}

// ---------------------- MAIN COMPONENT ----------------------

export default function ERDLayoutEngine({
  nodes, edges, clusters, width = 1400, height = 900
}: Props) {
  // adjacency
  const adj = useMemo(() => buildAdjacency(nodes, edges), [nodes, edges]);

  // cluster grouping (if clusters provided, use them; else single cluster)
  const clusterMap = useMemo(() => {
    if (clusters) {
      const m = new Map<number, NodeInput[]>();
      for (const n of nodes) {
        const c = clusters[n.id] ?? 0;
        if (!m.has(c)) m.set(c, []);
        m.get(c)!.push(n);
      }
      return m;
    } else {
      const m = new Map<number, NodeInput[]>();
      m.set(0, nodes.slice());
      return m;
    }
  }, [nodes, clusters]);

  const clusterIds = useMemo(() => Array.from(clusterMap.keys()).sort((a, b) => a - b), [clusterMap]);

  // build cluster sizes and cluster->nodes map
  const clusterSizesMap = useMemo(() => {
    const m = new Map<number, number>();
    for (const [cid, arr] of clusterMap.entries()) m.set(cid, arr.length);
    return m;
  }, [clusterMap]);

  const [clusterPlacementStrategy, setClusterPlacementStrategy] = useState<string>("circle");
  const [nodePlacementStrategy, setNodePlacementStrategy] = useState<string>("grid");
  const [edgeRoutingStrategy, setEdgeRoutingStrategy] = useState<string>("straight");

  // compute cluster centroid positions
  const clusterCentroids = useMemo(() => {
    const ids = clusterIds;
    switch (clusterPlacementStrategy) {
      case "circle":
        return circlePlaceClusters(ids, Math.min(width, height) * 0.35);
      case "grid":
        return gridPlaceClusters(ids, Math.min(width, height) * 0.35);
      case "treemap": {
        const arr: [number, number][] = ids.map(id => [id, clusterSizesMap.get(id) || 1]);
        return treemapPlaceClusters(arr, Math.min(width, height) * 0.9, Math.min(width, height) * 0.6);
      }
      case "force":
        return forcePlaceClusters(ids, clusterMap, adj, 200);
      case "radial":
        return radialPlaceClusters(ids, clusterSizesMap, Math.min(width, height) * 0.22);
      case "layered": {
        // create clusterGraph edges by if any cross-cluster edge exists, add an edge clusterA->clusterB
        const clusterEdgesSet = new Set<string>();
        for (const e of edges) {
          const c1 = clusters?.[e.source] ?? 0;
          const c2 = clusters?.[e.target] ?? 0;
          if (c1 !== c2) clusterEdgesSet.add(`${c1}|${c2}`);
        }
        const clusterEdges: [number, number][] = [...clusterEdgesSet].map(s => {
          const [a, b] = s.split("|").map(Number); return [a, b];
        });
        return layeredClusterPlacement(clusterEdges, ids, Math.min(width, height) * 0.28, 220);
      }
      default:
        return circlePlaceClusters(ids, Math.min(width, height) * 0.35);
    }
  }, [clusterPlacementStrategy, clusterIds.join(","), clusterSizesMap, width, height, adj, clusterMap, edges, clusters]);

  // compute node positions inside cluster
  const nodePositions = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    for (const [cid, nodeList] of clusterMap.entries()) {
      const centroid = clusterCentroids.get(cid) ?? { x: 0, y: 0 };
      let local: Map<string, { x: number; y: number }>;
      switch (nodePlacementStrategy) {
        case "grid":
          local = layoutNodesGrid(nodeList, centroid.x, centroid.y, 160);
          break;
        case "force":
          local = layoutNodesForce(nodeList, centroid, adj, 250);
          break;
        case "radial":
          local = layoutNodesRadial(nodeList, centroid.x, centroid.y, 80);
          break;
        case "degree":
          local = layoutNodesDegreeOrdered(nodeList, centroid.x, centroid.y, adj, 140);
          break;
        case "box":
          local = layoutNodesBoxPacking(nodeList, centroid.x, centroid.y, Math.min(width, height) * 0.6);
          break;
        default:
          local = layoutNodesGrid(nodeList, centroid.x, centroid.y, 160);
      }
      for (const [k, v] of local) map.set(k, v);
    }
    return map;
  }, [nodePlacementStrategy, clusterMap, clusterCentroids, adj, width, height]);

  // compute bounding to center on canvas
  const bounds = useMemo(() => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const pos of nodePositions.values()) {
      minX = Math.min(minX, pos.x);
      minY = Math.min(minY, pos.y);
      maxX = Math.max(maxX, pos.x);
      maxY = Math.max(maxY, pos.y);
    }
    if (minX === Infinity) { minX = -width / 2; minY = -height / 2; maxX = width / 2; maxY = height / 2; }
    return { minX, minY, maxX, maxY };
  }, [nodePositions, width, height]);

  // map to svg coords (centered)
  const pad = 40;
  const scaleX = (width - pad * 2) / Math.max(1, (bounds.maxX - bounds.minX));
  const scaleY = (height - pad * 2) / Math.max(1, (bounds.maxY - bounds.minY));
  const scale = Math.min(scaleX, scaleY);

  function toSvg(p: { x: number; y: number }) {
    return {
      x: (p.x - (bounds.minX + bounds.maxX) / 2) * scale + width / 2,
      y: (p.y - (bounds.minY + bounds.maxY) / 2) * scale + height / 2
    };
  }

  // render edges according to routing strategy
  function routedEdge(e: EdgeInput) {
    const p1 = nodePositions.get(e.source);
    const p2 = nodePositions.get(e.target);
    if (!p1 || !p2) return null;
    const c1 = clusterCentroids.get(clusters?.[e.source] ?? 0) ?? null;
    const c2 = clusterCentroids.get(clusters?.[e.target] ?? 0) ?? null;
    switch (edgeRoutingStrategy) {
      case "straight": return routeStraight(toSvg(p1), toSvg(p2));
      case "curved": return routeCurved(toSvg(p1), toSvg(p2));
      case "orthogonal": return routeOrthogonal(toSvg(p1), toSvg(p2));
      case "bundled": return routeBundled(toSvg(p1), toSvg(p2), c1 ? toSvg(c1) : null, c2 ? toSvg(c2) : null);
      default: return routeStraight(toSvg(p1), toSvg(p2));
    }
  }

  // UI & render
  return (
    <div style={{ display: "flex", gap: 12 }}>
      <div style={{ width: 300, padding: 12, borderRight: "1px solid #ddd" }}>
        <h3>ERD Layout Controls</h3>

        <label>Cluster Placement</label>
        <select value={clusterPlacementStrategy} onChange={e => setClusterPlacementStrategy(e.target.value)}>
          <option value="circle">Circle packing</option>
          <option value="grid">Grid packing</option>
          <option value="treemap">Treemap (slice-and-dice)</option>
          <option value="force">Force-directed (centroids)</option>
          <option value="radial">Radial by size</option>
          <option value="layered">Layered / DAG-like</option>
        </select>

        <hr />

        <label>Node Placement (inside cluster)</label>
        <select value={nodePlacementStrategy} onChange={e => setNodePlacementStrategy(e.target.value)}>
          <option value="grid">Grid</option>
          <option value="force">Local Force</option>
          <option value="radial">Radial</option>
          <option value="degree">Degree-ordered</option>
          <option value="box">Box packing</option>
        </select>

        <hr />

        <label>Edge Routing</label>
        <select value={edgeRoutingStrategy} onChange={e => setEdgeRoutingStrategy(e.target.value)}>
          <option value="straight">Straight</option>
          <option value="curved">Curved</option>
          <option value="orthogonal">Orthogonal</option>
          <option value="bundled">Bundled (via cluster centroids)</option>
        </select>

        <hr />
        <div>
          <strong>Clusters:</strong> {clusterIds.length}
        </div>
        <div>
          <strong>Nodes:</strong> {nodes.length}
        </div>
        <div>
          <strong>Edges:</strong> {edges.length}
        </div>
      </div>

      <div style={{ flex: 1 }}>
        <svg width={width} height={height} style={{ background: "#fff", border: "1px solid #eee" }}>
          {/* draw cluster centroid markers */}
          {[...clusterCentroids.entries()].map(([cid, cent]) => {
            const svgC = toSvg(cent);
            return (
              <g key={`cent-${cid}`}>
                <circle cx={svgC.x} cy={svgC.y} r={6} fill="#444" opacity={0.14} />
                <text x={svgC.x + 8} y={svgC.y + 4} fontSize={11} fill="#666">C{cid}</text>
              </g>
            );
          })}

          {/* edges */}
          {edges.map((e, i) => {
            const r = routedEdge(e);
            if (!r) return null;
            if (r.type === "straight") {
              const [a, b] = r.points;
              return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#bbb" strokeWidth={1.0} />;
            } else if (r.type === "quad") {
              const [p0, c, p1] = r.points;
              return <path key={i} d={`M ${p0.x} ${p0.y} Q ${c.x} ${c.y} ${p1.x} ${p1.y}`} stroke="#999" fill="none" strokeWidth={1.2} />;
            } else if (r.type === "poly") {
              const pts = r.points;
              const d = "M " + pts.map(p => `${p.x} ${p.y}`).join(" L ");
              return <path key={i} d={d} stroke="#999" fill="none" strokeWidth={1.2} />;
            } else return null;
          })}

          {/* nodes */}
          {[...nodePositions.entries()].map(([id, p]) => {
            const svgP = toSvg(p);
            const node = nodes.find(n => n.id === id)!;
            const w = (node.width ?? defaultNodeSize.width) * 0.9 * scale;
            const h = (node.height ?? defaultNodeSize.height) * 0.9 * scale;
            const fill = "#ffffff";
            const stroke = "#333";
            return (
              <g key={id} transform={`translate(${svgP.x - w / 2}, ${svgP.y - h / 2})`} style={{ cursor: "grab" }}>
                <rect width={w} height={h} rx={6} ry={6} fill={fill} stroke={stroke} />
                <text x={w / 2} y={h / 2} dominantBaseline="middle" textAnchor="middle" fontSize={12 * scale}>
                  {id}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
