import React, { useState, useCallback, useRef } from 'react';
import { FractalType, ControlParams, RenderParams, ColorPalette, OrbitTrap } from './types';
import FractalCanvas from './components/FractalCanvas';
import Controls from './components/Controls';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

interface SavedSettings extends Omit<ControlParams, 'zoom'> {
  zoom: number;
  panX: number;
  panY: number;
}

const initialControlParams: ControlParams = {
  fractalType: FractalType.Mandelbrot,
  zoom: 100,
  iterations: 200,
  cReal: 0.285,
  cImag: 0.01,
  colorPalette: ColorPalette.Viridis,
  mandelbulbIterations: 500,
  colorCycleSpeed: 0,
  orbitTrap: OrbitTrap.None,
};

const getInitialPan = (type: FractalType): { panX: number, panY: number } => {
  switch (type) {
    case FractalType.Mandelbrot:
      return { panX: 0.5, panY: 0 };
    case FractalType.BurningShip:
      return { panX: 0.5, panY: -0.5 };
    case FractalType.Julia:
    case FractalType.Sierpinski:
    case FractalType.Mandelbulb:
    default:
      return { panX: 0, panY: 0 };
  }
};

const App: React.FC = () => {
  const [renderParams, setRenderParams] = useState<RenderParams>({
    ...initialControlParams,
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    panX: getInitialPan(initialControlParams.fractalType).panX,
    panY: getInitialPan(initialControlParams.fractalType).panY,
    zoom: initialControlParams.zoom / 100,
    cameraDistance: 3.0,
    cameraTarget: { x: 0, y: 0 },
  });
  const [isRendering, setIsRendering] = useState(false);
  const [cameraRotation, setCameraRotation] = useState({ x: 0, y: 0 });

  const animationRef = useRef({
    startTime: null as number | null,
    startView: { panX: 0, panY: 0, zoom: 1 },
    targetView: { panX: 0, panY: 0, zoom: 1 },
    animationFrameId: null as number | null,
  });

  const handleRender = useCallback((newParams: ControlParams) => {
    // For WebGL, we don't really need "isRendering" state to block UI, but we can keep it for Sierpinski
    const isHeavy = newParams.fractalType === FractalType.Sierpinski;
    if (isHeavy) setIsRendering(true);

    if (animationRef.current.animationFrameId) {
      cancelAnimationFrame(animationRef.current.animationFrameId);
      animationRef.current.animationFrameId = null;
    }

    setRenderParams(prevParams => {
      const isTypeChange = prevParams.fractalType !== newParams.fractalType;
      const initialPan = getInitialPan(newParams.fractalType);

      let cameraUpdates = {};
      if (isTypeChange && newParams.fractalType === FractalType.Mandelbulb) {
        setCameraRotation({ x: 0, y: 0 });
        cameraUpdates = {
          cameraDistance: 3.0,
          cameraTarget: { x: 0, y: 0 },
        };
      }

      return {
        ...prevParams,
        ...newParams,
        ...cameraUpdates,
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        zoom: newParams.zoom / 100,
        panX: isTypeChange ? initialPan.panX : prevParams.panX,
        panY: isTypeChange ? initialPan.panY : prevParams.panY,
      };
    });
  }, []);

  const handleRenderComplete = useCallback(() => {
    if (!animationRef.current.animationFrameId) {
      setIsRendering(false);
    }
  }, []);

  const handleViewChange = useCallback((view: { panX: number; panY: number; zoom: number }) => {
    setRenderParams(prevParams => ({ ...prevParams, ...view }));
  }, []);

  const handleCameraChange = useCallback((changes: { rotation?: { x: number; y: number }; distance?: number; target?: { x: number; y: number } }) => {
    if (changes.rotation) {
      setCameraRotation(changes.rotation);
    }
    if (changes.distance || changes.target) {
      setRenderParams(prev => ({
        ...prev,
        cameraDistance: changes.distance ?? prev.cameraDistance,
        cameraTarget: changes.target ?? prev.cameraTarget,
      }));
    }
  }, []);

  const handleJuliaConstantChange = useCallback((constants: { cReal: number; cImag: number }) => {
    setRenderParams(prevParams => ({
      ...prevParams,
      cReal: constants.cReal,
      cImag: constants.cImag,
    }));
  }, []);

  const handleSaveSettings = useCallback(() => {
    const settingsToSave: SavedSettings = {
      fractalType: renderParams.fractalType,
      zoom: renderParams.zoom * 100,
      iterations: renderParams.iterations,
      cReal: renderParams.cReal,
      cImag: renderParams.cImag,
      colorPalette: renderParams.colorPalette,
      panX: renderParams.panX,
      panY: renderParams.panY,
      mandelbulbIterations: renderParams.mandelbulbIterations,
      colorCycleSpeed: renderParams.colorCycleSpeed,
      orbitTrap: renderParams.orbitTrap,
    };
    localStorage.setItem('fractalExplorerSettings', JSON.stringify(settingsToSave));
    alert('Current settings have been saved!');
  }, [renderParams]);

  const handleLoadSettings = useCallback(() => {
    const savedSettingsJSON = localStorage.getItem('fractalExplorerSettings');
    if (savedSettingsJSON) {
      const savedSettings: SavedSettings = JSON.parse(savedSettingsJSON);
      if (animationRef.current.animationFrameId) {
        cancelAnimationFrame(animationRef.current.animationFrameId);
      }
      setIsRendering(true);
      setCameraRotation({ x: 0, y: 0 });
      setRenderParams(prev => ({
        ...prev,
        ...savedSettings,
        zoom: savedSettings.zoom / 100,
        cameraDistance: 3.0,
        cameraTarget: { x: 0, y: 0 },
      }));
    } else {
      alert('No saved settings found.');
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col font-sans selection:bg-pink-500 selection:text-white">
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>

      <header className="relative z-10 pt-8 pb-4 text-center">
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 drop-shadow-lg">
          Fractal Explorer
        </h1>
        <p className="mt-2 text-lg text-gray-400 font-light tracking-wide">
          Dive into the infinite.
        </p>
      </header>

      <main className="relative z-10 flex-grow flex flex-col md:flex-row items-start justify-center p-4 gap-8 max-w-[1600px] mx-auto w-full">
        <div className="flex-grow flex justify-center items-center w-full md:w-auto">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-pink-600 to-purple-600 rounded-xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative bg-black rounded-xl p-1 shadow-2xl">
              <FractalCanvas
                params={renderParams}
                onRenderComplete={handleRenderComplete}
                onViewChange={handleViewChange}
                cameraRotation={cameraRotation}
                onCameraChange={handleCameraChange}
                onJuliaConstantChange={handleJuliaConstantChange}
              />
            </div>
          </div>
        </div>

        <div className="w-full md:w-96 flex-shrink-0">
          <Controls
            initialParams={initialControlParams}
            currentParams={renderParams}
            onRender={handleRender}
            isRendering={isRendering}
            onSaveSettings={handleSaveSettings}
            onLoadSettings={handleLoadSettings}
          />
        </div>
      </main>

      <footer className="relative z-10 py-6 text-center text-gray-500 text-sm">
        <p>© 2025 Fractal Explorer. Built with React & WebGL.</p>
      </footer>
    </div>
  );
};

export default App;
