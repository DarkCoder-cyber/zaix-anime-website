import { useState, useEffect } from "react";

export interface AmbientColor {
  r: number;
  g: number;
  b: number;
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  s /= 100; l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
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

function extractColorFromImage(img: HTMLImageElement): AmbientColor | null {
  try {
    const SIZE = 32;
    const canvas = document.createElement("canvas");
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, SIZE, SIZE);
    const data = ctx.getImageData(0, 0, SIZE, SIZE).data;

    let bestSat = -1;
    let bestR = 0, bestG = 0, bestB = 0;

    let wR = 0, wG = 0, wB = 0, wTotal = 0;

    for (let i = 0; i < data.length; i += 4) {
      const pr = data[i], pg = data[i + 1], pb = data[i + 2];
      const brightness = 0.299 * pr + 0.587 * pg + 0.114 * pb;
      if (brightness < 20 || brightness > 235) continue;

      const [, sat, lig] = rgbToHsl(pr, pg, pb);
      if (sat < 8) continue;

      const weight = sat * (1 - Math.abs(lig / 100 - 0.5) * 1.2);
      wR += pr * weight;
      wG += pg * weight;
      wB += pb * weight;
      wTotal += weight;

      if (sat > bestSat) { bestSat = sat; bestR = pr; bestG = pg; bestB = pb; }
    }

    if (wTotal === 0) return null;

    const avgR = Math.round(wR / wTotal);
    const avgG = Math.round(wG / wTotal);
    const avgB = Math.round(wB / wTotal);

    const [h, , l] = rgbToHsl(avgR, avgG, avgB);
    const [r, g, b] = hslToRgb(h, 75, Math.max(l, 45));
    return { r, g, b };
  } catch {
    return null;
  }
}

export function useAmbientColor(imageUrl: string | null | undefined): AmbientColor | null {
  const [color, setColor] = useState<AmbientColor | null>(null);

  useEffect(() => {
    if (!imageUrl) { setColor(null); return; }

    let cancelled = false;
    const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(imageUrl)}`;
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      if (cancelled) return;
      const extracted = extractColorFromImage(img);
      if (extracted) setColor(extracted);
    };

    img.onerror = () => { if (!cancelled) setColor(null); };

    img.src = proxyUrl;
    return () => { cancelled = true; };
  }, [imageUrl]);

  return color;
}
