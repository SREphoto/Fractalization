import { FractalType, ColorPalette } from '../types';

interface DrawParams {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  fractalType: FractalType;
  zoom: number;
  iterations: number;
  cReal: number;
  cImag: number;
  panX: number;
  panY: number;
  colorPalette: ColorPalette;
}

// Helper to convert HSL color strings to an RGB array for canvas ImageData
const hslToRgb = (hsl: string): [number, number, number] => {
  const result = /^hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)$/.exec(hsl);
  if (!result) return [0, 0, 0];
  const h = parseInt(result[1], 10);
  const s = parseInt(result[2], 10) / 100;
  const l = parseInt(result[3], 10) / 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;

  if (h >= 0 && h < 60) { [r, g, b] = [c, x, 0]; }
  else if (h >= 60 && h < 120) { [r, g, b] = [x, c, 0]; }
  else if (h >= 120 && h < 180) { [r, g, b] = [0, c, x]; }
  else if (h >= 180 && h < 240) { [r, g, b] = [0, x, c]; }
  else if (h >= 240 && h < 300) { [r, g, b] = [x, 0, c]; }
  else { [r, g, b] = [c, 0, x]; }

  r = Math.round((r + m) * 255);
  g = Math.round((g + m) * 255);
  b = Math.round((b + m) * 255);

  return [r, g, b];
};

// FIX: Explicitly type the palettes to ensure colors are treated as [R, G, B] tuples.
const palettes: { [key: string]: [number, number, number][] } = {
  [ColorPalette.Viridis]: [[68, 1, 84], [59, 82, 139], [33, 145, 140], [94, 201, 98], [253, 231, 37]],
  [ColorPalette.Plasma]: [[13, 8, 135], [110, 0, 168], [177, 42, 144], [225, 100, 98], [252, 166, 54], [240, 249, 33]],
  [ColorPalette.Magma]: [[0, 0, 4], [59, 15, 112], [140, 41, 129], [221, 73, 104], [253, 154, 108], [252, 253, 191]],
  [ColorPalette.Inferno]: [[0, 0, 4], [88, 16, 110], [172, 37, 104], [239, 100, 58], [251, 179, 31], [252, 254, 177]],
  [ColorPalette.Sunset]: [[35, 7, 77], [106, 2, 93], [188, 59, 73], [248, 146, 56], [249, 248, 113]],
  [ColorPalette.Ocean]: [[0, 2, 67], [0, 41, 114], [0, 83, 140], [0, 138, 168], [145, 205, 194]],
  [ColorPalette.Forest]: [[1, 22, 12], [10, 50, 20], [45, 87, 44], [102, 124, 61], [179, 162, 93]],
};

// Maps an iteration count to a smooth color from the selected palette
const getColor = (iterations: number, maxIterations: number, palette: ColorPalette): [number, number, number] => {
  if (iterations >= maxIterations) {
    return [0, 0, 0]; // Black for points within the set
  }

  if (palette === ColorPalette.Rainbow) {
    const hue = Math.floor(360 * iterations / maxIterations);
    return hslToRgb(`hsl(${hue}, 100%, 50%)`);
  }

  const selectedPalette = palettes[palette];
  if (!selectedPalette) {
    // Fallback to rainbow if palette is not found
    const hue = Math.floor(360 * iterations / maxIterations);
    return hslToRgb(`hsl(${hue}, 100%, 50%)`);
  }

  const value = iterations / maxIterations;
  const colorIndex = value * (selectedPalette.length - 1);
  const idx1 = Math.floor(colorIndex);
  const idx2 = Math.ceil(colorIndex);
  const frac = colorIndex - idx1;

  if (idx2 >= selectedPalette.length) {
    return selectedPalette[selectedPalette.length - 1];
  }

  const c1 = selectedPalette[idx1];
  const c2 = selectedPalette[idx2];

  const r = Math.round(c1[0] + (c2[0] - c1[0]) * frac);
  const g = Math.round(c1[1] + (c2[1] - c1[1]) * frac);
  const b = Math.round(c1[2] + (c2[2] - c1[2]) * frac);

  return [r, g, b];
};

const drawSierpinskiTriangle = (params: DrawParams) => {
  const { ctx, width, height, colorPalette } = params;

  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, width, height);

  const vertices = [
    { x: width / 2, y: 10 },
    { x: 10, y: height - 10 },
    { x: width - 10, y: height - 10 },
  ];
  
  const palette = palettes[colorPalette] || palettes[ColorPalette.Viridis];
  const midColorIndex = Math.floor(palette.length / 2);
  const [r, g, b] = palette[midColorIndex];
  ctx.fillStyle = `rgb(${r},${g},${b})`;

  let p = { x: Math.random() * width, y: Math.random() * height };
  const numPoints = 75000;

  for (let i = 0; i < numPoints; i++) {
    const targetVertex = vertices[Math.floor(Math.random() * 3)];
    p.x = (p.x + targetVertex.x) / 2;
    p.y = (p.y + targetVertex.y) / 2;
    
    if (i > 20) { // Let the first few points settle
        ctx.fillRect(p.x, p.y, 1, 1);
    }
  }
};


export const drawFractal = (params: DrawParams) => {
  if (params.fractalType === FractalType.Sierpinski) {
    drawSierpinskiTriangle(params);
    return;
  }

  const { ctx, width, height, fractalType, zoom, iterations: maxIterations, cReal, cImag, panX, panY, colorPalette } = params;
  const imageData = ctx.createImageData(width, height);

  for (let px = 0; px < width; px++) {
    for (let py = 0; py < height; py++) {
      const x0 = ((px - width / 2) * 4) / (width * zoom) - panX;
      const y0 = ((py - height / 2) * 4) / (width * zoom) - panY;

      let iteration = 0;
      if (fractalType === FractalType.Mandelbrot) {
        let x = 0, y = 0;
        while (x * x + y * y <= 4 && iteration < maxIterations) {
          const xtemp = x * x - y * y + x0;
          y = 2 * x * y + y0;
          x = xtemp;
          iteration++;
        }
      } else if (fractalType === FractalType.BurningShip) {
        let x = 0, y = 0;
        let xtemp;
        while (x * x + y * y <= 4 && iteration < maxIterations) {
          xtemp = x * x - y * y + x0;
          y = 2 * Math.abs(x * y) + y0;
          x = xtemp;
          iteration++;
        }
      } else { // Julia Set
        let x = x0, y = y0;
        while (x * x + y * y <= 4 && iteration < maxIterations) {
          const xtemp = x * x - y * y + cReal;
          y = 2 * x * y + cImag;
          x = xtemp;
          iteration++;
        }
      }

      const [r, g, b] = getColor(iteration, maxIterations, colorPalette);
      
      const pixelIndex = (py * width + px) * 4;
      imageData.data[pixelIndex] = r;
      imageData.data[pixelIndex + 1] = g;
      imageData.data[pixelIndex + 2] = b;
      imageData.data[pixelIndex + 3] = 255; // Alpha
    }
  }

  ctx.putImageData(imageData, 0, 0);
};
