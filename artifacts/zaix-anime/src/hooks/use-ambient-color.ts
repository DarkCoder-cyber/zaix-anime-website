import { useState, useEffect } from "react";

export interface AmbientColor { r: number; g: number; b: number; }
export interface AmbientPalette {
  topLeft: AmbientColor;
  topRight: AmbientColor;
  bottomLeft: AmbientColor;
  bottomRight: AmbientColor;
  center: AmbientColor;
  dominant: AmbientColor;
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return [h * 360, s * 100, l * 100];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  s /= 100; l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}

function sampleRegion(
  data: Uint8ClampedArray,
  w: number,
  x1: number, y1: number,
  x2: number, y2: number,
): AmbientColor | null {
  let wR = 0, wG = 0, wB = 0, wTotal = 0;
  for (let y = y1; y < y2; y++) {
    for (let x = x1; x < x2; x++) {
      const i = (y * w + x) * 4;
      const pr = data[i], pg = data[i + 1], pb = data[i + 2];
      const brightness = 0.299 * pr + 0.587 * pg + 0.114 * pb;
      if (brightness < 12 || brightness > 242) continue;
      const [, sat, lig] = rgbToHsl(pr, pg, pb);
      if (sat < 4) continue;
      const w_ = sat * (1 - Math.abs(lig / 100 - 0.5) * 1.3) + 0.5;
      wR += pr * w_; wG += pg * w_; wB += pb * w_; wTotal += w_;
    }
  }
  if (wTotal === 0) return null;
  const [h, , l] = rgbToHsl(
    Math.round(wR / wTotal),
    Math.round(wG / wTotal),
    Math.round(wB / wTotal),
  );
  const [r, g, b] = hslToRgb(h, 72, Math.max(l, 44));
  return { r, g, b };
}

function extractPalette(img: HTMLImageElement): AmbientPalette | null {
  try {
    const S = 64;
    const canvas = document.createElement("canvas");
    canvas.width = S; canvas.height = S;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, S, S);
    const { data } = ctx.getImageData(0, 0, S, S);
    const H = S, m = S >> 1, q = S >> 2;

    const topLeft     = sampleRegion(data, S,  0,  0,  m,  m);
    const topRight    = sampleRegion(data, S,  m,  0,  S,  m);
    const bottomLeft  = sampleRegion(data, S,  0,  m,  m,  H);
    const bottomRight = sampleRegion(data, S,  m,  m,  S,  H);
    const center      = sampleRegion(data, S,  q,  q,  S-q, H-q);
    const dominant    = sampleRegion(data, S,  0,  0,  S,  H);

    const fb = dominant ?? { r: 90, g: 110, b: 220 };
    return {
      topLeft:     topLeft     ?? fb,
      topRight:    topRight    ?? fb,
      bottomLeft:  bottomLeft  ?? fb,
      bottomRight: bottomRight ?? fb,
      center:      center      ?? fb,
      dominant:    fb,
    };
  } catch {
    return null;
  }
}

export function useAmbientPalette(imageUrl: string | null | undefined): AmbientPalette | null {
  const [palette, setPalette] = useState<AmbientPalette | null>(null);

  useEffect(() => {
    if (!imageUrl) { setPalette(null); return; }
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (cancelled) return;
      const p = extractPalette(img);
      if (p) setPalette(p);
    };
    img.onerror = () => { if (!cancelled) setPalette(null); };
    img.src = `/api/proxy-image?url=${encodeURIComponent(imageUrl)}`;
    return () => { cancelled = true; };
  }, [imageUrl]);

  return palette;
}

// Backwards-compatible single-color export
export type { AmbientPalette as AmbientColor_ };
export function useAmbientColor(imageUrl: string | null | undefined): AmbientColor | null {
  const p = useAmbientPalette(imageUrl);
  return p?.dominant ?? null;
}
