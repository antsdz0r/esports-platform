// Izvlacenje dominantne (brend) boje iz logotipa i gradjenje "hero" gradijenta.
// Ideja: pozadina kartice koristi KOMPLEMENTARNU nijansu u odnosu na logo, sa
// ANALOGNIM (susedne nijanse) rasponom -> futuristicki gradijent u kom logo "iskace".
//
// Ekstrakcija ide preko <canvas> (crossOrigin=anonymous). Ako CDN ne dozvoli
// citanje piksela (CORS), gracefully padamo na null -> pozivalac koristi fallback.

export interface Rgb { r: number; g: number; b: number; }

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  const d = max - min;
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)); break;
      case g: h = ((b - r) / d + 2); break;
      default: h = ((r - g) / d + 4); break;
    }
    h *= 60;
  }
  return { h, s, l };
}

export interface LogoInfo {
  hue: number | null;    // dominantna brend-nijansa (0..360) ili null
  lum: number | null;    // prosecna svetlina loga (0..1) ili null (CORS)
  multiColor: boolean;   // true = logo ima 2+ razdvojene boje (visebojni)
}

// Kes po URL-u da ne racunamo isti logo vise puta.
const infoCache = new Map<string, LogoInfo>();

// Analiza logotipa: dominantna nijansa + prosecna svetlina (nad neprozirnim pikselima).
// Vraca {null,null} ako CDN ne dozvoli citanje piksela (CORS).
export function analyzeLogo(url: string): Promise<LogoInfo> {
  const cached = infoCache.get(url);
  if (cached) return Promise.resolve(cached);
  return new Promise((resolve) => {
    const done = (info: LogoInfo) => { infoCache.set(url, info); resolve(info); };
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.decoding = "async";
    img.onload = () => {
      try {
        const size = 40;
        const canvas = document.createElement("canvas");
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) { done({ hue: null, lum: null, multiColor: false }); return; }
        ctx.drawImage(img, 0, 0, size, size);
        const data = ctx.getImageData(0, 0, size, size).data;

        // Nijansa: vivid pikseli u 12 hue-korpi (po 30°), tezinski po zasicenosti.
        const bins = 12;
        const weight = new Array(bins).fill(0);
        const sumSin = new Array(bins).fill(0);
        const sumCos = new Array(bins).fill(0);
        // Svetlina: prosek luma nad SVIM neprozirnim pikselima (i sivim/crnim).
        let lumaSum = 0, lumaCount = 0, chromaCount = 0;
        for (let i = 0; i < data.length; i += 4) {
          const a = data[i + 3];
          if (a < 200) continue;
          const r = data[i], g = data[i + 1], b = data[i + 2];
          lumaSum += (0.299 * r + 0.587 * g + 0.114 * b) / 255;
          lumaCount++;
          const { h, s, l } = rgbToHsl(r, g, b);
          if (s < 0.18 || l < 0.10 || l > 0.92) continue; // za nijansu preskoci sivo/belo/crno
          chromaCount++;
          const w = s * (1 - Math.abs(l - 0.5));
          const bin = Math.min(bins - 1, Math.floor(h / (360 / bins)));
          weight[bin] += w;
          const rad = (h * Math.PI) / 180;
          sumSin[bin] += Math.sin(rad) * w;
          sumCos[bin] += Math.cos(rad) * w;
        }
        let best = -1, bestW = 0;
        for (let b = 0; b < bins; b++) if (weight[b] > bestW) { bestW = weight[b]; best = b; }
        let hue: number | null = null;
        if (best !== -1) {
          hue = (Math.atan2(sumSin[best], sumCos[best]) * 180) / Math.PI;
          if (hue < 0) hue += 360;
        }
        const lum = lumaCount > 0 ? lumaSum / lumaCount : null;

        // Visebojnost: broj RAZDVOJENIH hue-klastera sa znacajnom tezinom.
        // Susedne nijanse (gradijent) broje se kao JEDNA boja; belimo samo single-color.
        let multiColor = false;
        const total = weight.reduce((sum, w) => sum + w, 0);
        if (total > 0 && lumaCount > 0 && chromaCount / lumaCount >= 0.15) {
          const on = weight.map((w) => w >= total * 0.07);
          const offStart = on.indexOf(false);
          if (offStart !== -1) {
            const clusters: number[] = [];
            let run = 0, active = false;
            for (let step = 0; step <= bins; step++) {
              const idx = (offStart + step) % bins;
              if (on[idx]) { run += weight[idx]; active = true; }
              else if (active) { clusters.push(run); run = 0; active = false; }
            }
            multiColor = clusters.filter((c) => c >= total * 0.20).length >= 2;
          }
        }
        done({ hue, lum, multiColor });
      } catch {
        done({ hue: null, lum: null, multiColor: false }); // CORS-tainted canvas
      }
    };
    img.onerror = () => done({ hue: null, lum: null, multiColor: false });
    img.src = url;
  });
}

// Deterministicka nijansa iz stringa (fallback kad ekstrakcija ne uspe).
export function hueFromString(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h % 360;
}

// Gradijent za hero: KOMPLEMENT logo-nijanse kao baza + ANALOGNI raspon oko nje,
// taman/futuristicki, sa mekim sjajem iza loga da logo "oziveli".
// Tamni gradijent u boji izvedenoj iz loga (komplement + analogni raspon).
// Svi logoi su svetli/beli, pa je pozadina namerno tamna radi kontrasta.
export function heroGradientFromHue(logoHue: number): string {
  const base = (logoHue + 180) % 360;         // komplement -> kontrast sa logom
  const a = (base - 26 + 360) % 360;          // analogne susedne nijanse
  const c = (base + 26) % 360;
  const c1 = `hsl(${a}, 68%, 17%)`;
  const c2 = `hsl(${base}, 60%, 11%)`;
  const c3 = `hsl(${c}, 74%, 7%)`;
  const glow = `hsla(${base}, 85%, 55%, 0.16)`;
  return `radial-gradient(circle at 50% 26%, ${glow}, transparent 62%), linear-gradient(150deg, ${c1} 0%, ${c2} 55%, ${c3} 100%)`;
}
