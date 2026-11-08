"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ForceGraphMethods, NodeObject } from "react-force-graph-3d";
import * as THREE from "three";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import type { GraphData, GraphLink, GraphNode } from "@/lib/graph";
import { useReducedMotionSafe } from "@/lib/motion";

// Thin WebGL wrapper around react-force-graph-3d: all graph shaping lives in
// lib/graph.ts (unit-tested); this file only maps it onto three.js objects.
const ForceGraph3D = dynamic(() => import("react-force-graph-3d"), {
  ssr: false,
});

type Nodo = NodeObject<GraphNode>;
type OrbitLike = {
  autoRotate: boolean;
  autoRotateSpeed: number;
  addEventListener: (t: string, f: () => void) => void;
};

function radio(n: GraphNode) {
  return Math.cbrt(n.val) * 3.4;
}

function textoSprite(texto: string, alto: number, color: string) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  const fuente = `600 48px ui-sans-serif, system-ui, sans-serif`;
  ctx.font = fuente;
  const ancho = Math.ceil(ctx.measureText(texto).width) + 40;
  canvas.width = ancho;
  canvas.height = 72;
  ctx.font = fuente;
  ctx.fillStyle = "rgba(8,6,20,0.8)";
  ctx.beginPath();
  ctx.roundRect(0, 4, ancho, 64, 32);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.textBaseline = "middle";
  ctx.fillText(texto, 20, 38);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: tex,
      depthWrite: false,
      transparent: true,
    }),
  );
  sprite.scale.set((alto * ancho) / 72, alto, 1);
  return sprite;
}

let halo: THREE.Texture | null = null;
function haloTexture() {
  if (halo) return halo;
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(255,255,255,0.9)");
  g.addColorStop(0.25, "rgba(255,255,255,0.35)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  halo = new THREE.CanvasTexture(c);
  return halo;
}

function nodoObjeto(n: GraphNode) {
  const r = radio(n);
  const grupo = new THREE.Group();
  const color = new THREE.Color(n.color);
  grupo.add(
    new THREE.Mesh(
      new THREE.SphereGeometry(r, 32, 24),
      new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: n.tipo === "yo" ? 0.9 : 0.55,
        roughness: 0.35,
        metalness: 0.2,
      }),
    ),
  );
  const glow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: haloTexture(),
      color,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      opacity: 0.55,
    }),
  );
  glow.scale.setScalar(r * 4.2);
  grupo.add(glow);
  const etiqueta = textoSprite(
    n.label,
    n.tipo === "companero" ? 7 : n.tipo === "yo" ? 12 : 9.5,
    n.tipo === "companero" ? "#a5f3fc" : "#f8fafc",
  );
  etiqueta.position.y = r + 6;
  grupo.add(etiqueta);
  return grupo;
}

function estrellas() {
  const pos = new Float32Array(1500 * 3);
  for (let i = 0; i < pos.length; i++) pos[i] = (Math.random() - 0.5) * 1600;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(
    geo,
    new THREE.PointsMaterial({
      color: "#a5b4fc",
      size: 1.4,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    }),
  );
  pts.name = "estrellas";
  return pts;
}

function tooltip(n: GraphNode) {
  const esc = (s: string) =>
    s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
  return `<div style="background:rgba(12,10,28,.92);border:1px solid ${n.color};border-radius:10px;padding:6px 10px;font:500 12px system-ui;color:#f8fafc"><b>${esc(n.label)}</b><br/><span style="color:#a1a1c2">${esc(n.detalle)}</span>${n.href ? '<br/><span style="color:' + n.color + '">Click para abrir</span>' : ""}</div>`;
}

export function Graph3D({ data }: { data: GraphData }) {
  const router = useRouter();
  const reducida = useReducedMotionSafe();
  const contenedor = useRef<HTMLDivElement>(null);
  const fg = useRef<ForceGraphMethods | undefined>(undefined);
  const [size, setSize] = useState({ w: 0, h: 0 });
  // The library mutates nodes/links (x, y, z, source objects): hand it a copy.
  const grafo = useMemo(
    () => ({
      nodes: data.nodes.map((n) => ({ ...n })),
      links: data.links.map((l) => ({ ...l })),
    }),
    [data],
  );

  useEffect(() => {
    const el = contenedor.current!;
    const ro = new ResizeObserver(([e]) =>
      setSize({ w: e.contentRect.width, h: e.contentRect.height }),
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Scene extras once the instance exists: starfield, bloom, auto-rotation.
  const listo = useRef(false);
  const ticks = useRef(0);
  function preparar() {
    const g = fg.current;
    // Frame the constellation early, before the layout fully settles.
    if (g && ++ticks.current === 25) g.zoomToFit(500, 10);
    if (!g || listo.current) return;
    listo.current = true;
    g.scene().add(estrellas());
    g.postProcessingComposer().addPass(
      new UnrealBloomPass(new THREE.Vector2(256, 256), 0.9, 0.4, 0.72),
    );
    g.d3Force("charge")?.strength(-140);
    g.d3Force("link")?.distance(38);
    const controls = g.controls() as OrbitLike;
    controls.autoRotateSpeed = 0.9;
    controls.addEventListener("start", () => {
      detenido.current = true;
      controls.autoRotate = false;
    });
  }

  // Rotation follows reduced motion (resolved after mount) until the user
  // grabs the scene; after that it stays still.
  const detenido = useRef(false);
  useEffect(() => {
    const c = fg.current?.controls() as OrbitLike | undefined;
    if (c) c.autoRotate = !reducida && !detenido.current;
  });

  useEffect(() => () => void (document.body.style.cursor = ""), []);

  return (
    <div
      ref={contenedor}
      className="absolute inset-0"
      aria-label="Constelación de tus grupos, materias, cursos y compañeros"
      role="img"
    >
      {size.w > 0 && (
        <ForceGraph3D
          ref={fg}
          onEngineTick={preparar}
          width={size.w}
          height={size.h}
          graphData={grafo}
          controlType="orbit"
          backgroundColor="#000000"
          showNavInfo={false}
          nodeThreeObject={(n: object) => nodoObjeto(n as Nodo)}
          nodeLabel={(n: object) => tooltip(n as Nodo)}
          linkColor={(l: object) => (l as GraphLink).color}
          linkOpacity={0.35}
          linkWidth={0.6}
          linkDirectionalParticles={reducida ? 0 : 2}
          linkDirectionalParticleWidth={1.6}
          linkDirectionalParticleSpeed={0.006}
          linkDirectionalParticleColor={(l: object) => (l as GraphLink).color}
          warmupTicks={reducida ? 120 : 40}
          cooldownTicks={reducida ? 0 : 150}
          onEngineStop={() => fg.current?.zoomToFit(600, 10)}
          onNodeClick={(n: object) => {
            const href = (n as Nodo).href;
            if (href) router.push(href);
          }}
          onNodeHover={(n: object | null) => {
            document.body.style.cursor = (n as Nodo | null)?.href
              ? "pointer"
              : "";
          }}
        />
      )}
    </div>
  );
}
