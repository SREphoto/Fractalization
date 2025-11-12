export enum FractalType {
  Mandelbrot = 'Mandelbrot',
  Julia = 'Julia',
  BurningShip = 'BurningShip',
  Sierpinski = 'Sierpinski',
  Mandelbulb = 'Mandelbulb',
}

export enum ColorPalette {
  Rainbow = 'Rainbow',
  Viridis = 'Viridis',
  Plasma = 'Plasma',
  Magma = 'Magma',
  Inferno = 'Inferno',
  Sunset = 'Sunset',
  Ocean = 'Ocean',
  Forest = 'Forest',
}

export interface ControlParams {
  zoom: number;
  iterations: number;
  cReal: number;
  cImag: number;
  fractalType: FractalType;
  colorPalette: ColorPalette;
  mandelbulbIterations: number;
}

export interface RenderParams extends ControlParams {
  width: number;
  height: number;
  panX: number;
  panY: number;
  cameraDistance: number;
  cameraTarget: { x: number; y: number };
}
