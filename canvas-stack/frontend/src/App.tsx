import { useCallback, useEffect, useRef, useState } from "react";
import "./App.css";

const POLL_MS = 500;
const MAX_ZOOM = 50;
const FALLBACK: readonly [number, number, number] = [204, 204, 204];

const PALETTE = [
  "#ffffff",
  "#000000",
  "#e74c3c",
  "#e67e22",
  "#f1c40f",
  "#2ecc71",
  "#1abc9c",
  "#3498db",
  "#9b59b6",
  "#e84393",
];

const RGB = PALETTE.map((hex) => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255] as const;
});

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));

function writePixel(data: Uint8ClampedArray, index: number, value: number) {
  const [r, g, b] = RGB[value] ?? FALLBACK;
  const o = index * 4;
  data[o] = r;
  data[o + 1] = g;
  data[o + 2] = b;
  data[o + 3] = 255;
}

function App() {
  const [size, setSize] = useState<{ x: number; y: number } | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const bytesRef = useRef<Uint8Array>(new Uint8Array(0));
  const imageDataRef = useRef<ImageData | null>(null);
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const minZoomRef = useRef(1);
  const maxZoomRef = useRef(MAX_ZOOM);

  const repaintAll = useCallback(() => {
    const ctx = canvasRef.current?.getContext("2d");
    const img = imageDataRef.current;
    if (!ctx || !img) return;
    const bytes = bytesRef.current;
    for (let i = 0; i < bytes.length; i++) writePixel(img.data, i, bytes[i]);
    ctx.putImageData(img, 0, 0);
  }, []);

  const paintCell = useCallback((index: number, value: number) => {
    const ctx = canvasRef.current?.getContext("2d");
    const img = imageDataRef.current;
    if (!ctx || !img) return;
    writePixel(img.data, index, value);
    ctx.putImageData(
      img,
      0,
      0,
      index % img.width,
      (index / img.width) | 0,
      1,
      1,
    );
  }, []);

  const fetchBytes = useCallback(async () => {
    const res = await fetch("/canvas");
    if (!res.ok) return;
    bytesRef.current = new Uint8Array(await res.arrayBuffer());
    repaintAll();
  }, [repaintAll]);

  useEffect(() => {
    fetch("/canvas/size")
      .then((r) => r.json())
      .then(setSize)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!size) return;
    imageDataRef.current = new ImageData(size.x, size.y);
    const vp = viewportRef.current;
    const cover = vp
      ? Math.max(vp.clientWidth / size.x, vp.clientHeight / size.y)
      : 1;
    minZoomRef.current = cover;
    maxZoomRef.current = Math.max(MAX_ZOOM, cover * 4);
    setZoom(cover);
    repaintAll();
    requestAnimationFrame(() => {
      if (!vp) return;
      vp.scrollLeft = (size.x * cover - vp.clientWidth) / 2;
      vp.scrollTop = (size.y * cover - vp.clientHeight) / 2;
    });
  }, [size, repaintAll]);

  useEffect(() => {
    if (!size) return;
    fetchBytes();
    const id = setInterval(fetchBytes, POLL_MS);
    return () => clearInterval(id);
  }, [size, fetchBytes]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const applyZoom = useCallback(
    (target: number, anchorX: number, anchorY: number) => {
      const vp = viewportRef.current;
      const canvas = canvasRef.current;
      if (!vp || !canvas || !size) return;
      const old = zoomRef.current;
      const next = clamp(target, minZoomRef.current, maxZoomRef.current);
      if (next === old) return;
      const rect = vp.getBoundingClientRect();
      const ax = anchorX - rect.left;
      const ay = anchorY - rect.top;
      const wx = (ax + vp.scrollLeft) / old;
      const wy = (ay + vp.scrollTop) / old;
      canvas.style.width = size.x * next + "px";
      canvas.style.height = size.y * next + "px";
      vp.scrollLeft = wx * next - ax;
      vp.scrollTop = wy * next - ay;
      zoomRef.current = next;
      setZoom(next);
    },
    [size],
  );

  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      applyZoom(
        zoomRef.current * (e.deltaY < 0 ? 1.15 : 1 / 1.15),
        e.clientX,
        e.clientY,
      );
    };
    vp.addEventListener("wheel", onWheel, { passive: false });
    return () => vp.removeEventListener("wheel", onWheel);
  }, [size, applyZoom]);

  const bumpZoom = (factor: number) => {
    const vp = viewportRef.current;
    if (!vp) return;
    const rect = vp.getBoundingClientRect();
    applyZoom(
      zoomRef.current * factor,
      rect.left + rect.width / 2,
      rect.top + rect.height / 2,
    );
  };

  const dragRef = useRef({
    active: false,
    moved: false,
    x: 0,
    y: 0,
    l: 0,
    t: 0,
  });

  const onPointerDown = (e: React.PointerEvent) => {
    const vp = viewportRef.current;
    if (!vp) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      active: true,
      moved: false,
      x: e.clientX,
      y: e.clientY,
      l: vp.scrollLeft,
      t: vp.scrollTop,
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    const vp = viewportRef.current;
    if (!d.active || !vp) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) d.moved = true;
    vp.scrollLeft = d.l - dx;
    vp.scrollTop = d.t - dy;
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const d = dragRef.current;
    d.active = false;
    const canvas = canvasRef.current;
    if (d.moved || !size || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    const col = Math.floor(((e.clientX - rect.left) / rect.width) * size.x);
    const row = Math.floor(((e.clientY - rect.top) / rect.height) * size.y);
    if (col < 0 || row < 0 || col >= size.x || row >= size.y) return;
    setSelected(row * size.x + col);
  };

  const pick = (index: number, value: number) => {
    if (index < bytesRef.current.length) bytesRef.current[index] = value;
    paintCell(index, value);
    setSelected(null);
    fetch("/canvas/set", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ index, value }),
    }).catch(() => {});
  };

  if (!size) return <div className="status">Loading canvas…</div>;

  return (
    <div className="canvas-page">
      <header className="title-bar">
        <h1>Live Canvas</h1>
        <p className="sub">
          {size.x}×{size.y} · drag to pan · scroll to zoom · click to paint
        </p>
      </header>

      <div className="zoom-bar">
        <button type="button" onClick={() => bumpZoom(1 / 1.5)}>
          −
        </button>
        <span>{zoom.toFixed(1)}×</span>
        <button type="button" onClick={() => bumpZoom(1.5)}>
          +
        </button>
      </div>

      <div
        className="viewport"
        ref={viewportRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <canvas
          ref={canvasRef}
          width={size.x}
          height={size.y}
          className="board"
          style={{ width: size.x * zoom, height: size.y * zoom }}
        />
      </div>

      {selected !== null && (
        <div className="picker-overlay" onClick={() => setSelected(null)}>
          <div className="picker" onClick={(e) => e.stopPropagation()}>
            <div className="picker-title">
              Cell #{selected} ({selected % size.x}, {(selected / size.x) | 0})
            </div>
            <div className="swatches">
              {PALETTE.map((color, value) => (
                <button
                  key={value}
                  type="button"
                  className="swatch"
                  style={{ background: color }}
                  title={String(value)}
                  onClick={() => pick(selected, value)}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
