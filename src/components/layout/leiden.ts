// ------------------------------------------------------
// 1. Leiden Community Detection (standalone, TypeScript)
// ------------------------------------------------------

import { Edge, Node } from "reactflow";

export function runLeiden(
  nodesAndEdges: { nodes: Node[]; edges: Edge[] },
): Record<string, number> 
{
  const iterations = 10;//options.iterations ?? 10;

  // Build adjacency map
  const graph = new Map<string, Set<string>>();
  for (var i=0; i< nodesAndEdges.nodes.length; i++) {
    graph.set(nodesAndEdges.nodes[i].id, new Set());
  }
  for (var i=0; i< nodesAndEdges.edges.length; i++) {
    graph.get(nodesAndEdges.edges[i].source)?.add(nodesAndEdges.edges[i].target);
  }

  const getNeighbors = (n: string) => graph.get(n)!;
  
  // Initial community: each node own community
  const community: Record<string, number> = {};
  nodesAndEdges.nodes.forEach((n: Node, idx: number) => (community[n.id] = idx));

  // Helper: compute modularity gain
  function modularityGain(node: string, targetComm: number) {
    let internalEdges = 0;
    for (const nb of getNeighbors(node)) {
      if (community[nb] === targetComm) internalEdges++;
    }
    return internalEdges;
  }

  // Main Leiden loop
  for (let iter = 0; iter < iterations; iter++) {
    let moved = false;

    for (var node of nodesAndEdges.nodes) {
      const currentComm = community[node.id];
      let bestComm = currentComm;
      let bestGain = 0;

      const neighborComms = new Set<number>();
      for (const nb of getNeighbors(node.id)) {
        neighborComms.add(community[nb]);
      }

      for (const nc of neighborComms) {
        const gain = modularityGain(node.id, nc);
        if (gain > bestGain) {
          bestGain = gain;
          bestComm = nc;
        }
      }

      if (bestComm !== currentComm) {
        community[node] = bestComm;
        moved = true;
      }
    }

    if (!moved) break;
  }

  // Normalize community IDs to 0..N
  const remap: Record<number, number> = {};
  let cid = 0;

  for (const n of nodesAndEdges.nodes) {
    const c = community[n.id];
    if (remap[c] === undefined) remap[c] = cid++;
    community[n.id] = remap[c];
  }

  return community;
}

export function layoutClusters(clusterCount: number, radius = 500) {
  const result: Record<number, { x: number; y: number }> = {};
  const step = (2 * Math.PI) / clusterCount;

  for (let i = 0; i < clusterCount; i++) {
    result[i] = {
      x: Math.cos(i * step) * radius,
      y: Math.sin(i * step) * radius
    };
  }

  return result;
}

// ------------------------------------------------------
// 3. Node placement inside a cluster
// ------------------------------------------------------

export function layoutNodes(
  nodesAndEdges: { nodes: string[]; edges: { from: string; to: string }[] },
  communities: Record<string, number>,
  clusterPositions: Record<number, { x: number; y: number }>,
  options: { algorithm: "grid" | "radial" | "sorted-grid"; spacing?: number }
) {
  const spacing = options.spacing ?? 160;
  const algo = options.algorithm;

  // Organize into clusters
  const clusters: Record<number, string[]> = {};
  for (const n of nodesAndEdges.nodes) {
    const c = communities[n];
    if (!clusters[c]) clusters[c] = [];
    clusters[c].push(n);
  }

  const result: Record<string, { x: number; y: number }> = {};

  for (const [cidStr, items] of Object.entries(clusters)) {
    const cid = parseInt(cidStr, 10);
    const { x: cx, y: cy } = clusterPositions[cid];

    let itemsSorted = items;

    if (algo === "sorted-grid") {
      const degree = Object.fromEntries(nodesAndEdges.nodes.map(n => [n, 0]));
      nodesAndEdges.edges.forEach(e => {
        degree[e.from]++;
        degree[e.to]++;
      });
      itemsSorted = [...items].sort((a, b) => degree[b] - degree[a]);
    }

    if (algo === "grid" || algo === "sorted-grid") {
      const cols = Math.ceil(Math.sqrt(itemsSorted.length));
      itemsSorted.forEach((item, i) => {
        const r = Math.floor(i / cols);
        const c = i % cols;
        result[item.id] = { x: cx + c * spacing, y: cy + r * spacing };
      });
    }

    if (algo === "radial") {
      const step = (2 * Math.PI) / items.length;
      const radius = spacing * 1.2;
      items.forEach((item, i) => {
        result[item.id] = {
          x: cx + Math.cos(i * step) * radius,
          y: cy + Math.sin(i * step) * radius
        };
      });
    }
  }

  return result;
}


// ------------------------------------------------------
// 4. Edge routing
// ------------------------------------------------------

export function routeEdges(
  nodesAndEdges: { nodes: string[]; edges: { from: string; to: string }[] },
  nodePositions: Record<string, { x: number; y: number }>,
  options: { algorithm: "straight" | "curved" | "orthogonal" }
) {
  const algo = options.algorithm;
  const routes = [];

  for (const e of nodesAndEdges.edges) {
    const a = nodePositions[e.source];
    const b = nodePositions[e.target];

    if (!a || !b) continue;

    if (algo === "straight") {
      routes.push({ ...e, points: [a, b] });
    }

    if (algo === "curved") {
      const mid = {
        x: (a.x + b.x) / 2,
        y: (a.y + b.y) / 2 - 80
      };
      routes.push({ ...e, points: [a, mid, b] });
    }

    if (algo === "orthogonal") {
      const mid = { x: b.x, y: a.y };
      routes.push({ ...e, points: [a, mid, b] });
    }
  }

  return routes;
}
