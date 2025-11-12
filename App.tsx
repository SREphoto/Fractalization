import React, { useState, useCallback, useRef } from 'react';
import { FractalType, ControlParams, RenderParams, ColorPalette } from './types';
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
  const [isRendering, setIsRendering] = useState(true);
  const [cameraRotation, setCameraRotation] = useState({ x: 0, y: 0 });

  const animationRef = useRef({
    startTime: null as number | null,
    startView: { panX: 0, panY: 0, zoom: 1 },
    targetView: { panX: 0, panY: 0, zoom: 1 },
    animationFrameId: null as number | null,
  });

  const ANIMATION_DURATION = 300; // ms

  const is2DInteractive = (type: FractalType) =>
    type === FractalType.Mandelbrot ||
    type === FractalType.Julia ||
    type === FractalType.BurningShip;

  const easeInOutQuad = (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

  const animateView = useCallback((timestamp: number) => {
    if (!animationRef.current.startTime) {
      animationRef.current.startTime = timestamp;
    }

    const elapsedTime = timestamp - animationRef.current.startTime;
    const progress = Math.min(elapsedTime / ANIMATION_DURATION, 1);
    const easedProgress = easeInOutQuad(progress);

    const { startView, targetView } = animationRef.current;
    
    const nextPanX = startView.panX + (targetView.panX - startView.panX) * easedProgress;
    const nextPanY = startView.panY + (targetView.panY - startView.panY) * easedProgress;
    const nextZoom = startView.zoom + (targetView.zoom - startView.zoom) * easedProgress;

    setRenderParams(prev => ({ ...prev, panX: nextPanX, panY: nextPanY, zoom: nextZoom }));

    if (progress < 1) {
      animationRef.current.animationFrameId = requestAnimationFrame(animateView);
    } else {
      animationRef.current.startTime = null;
      animationRef.current.animationFrameId = null;
      setIsRendering(false);
    }
  }, []);

  const handleRender = useCallback((newParams: ControlParams) => {
    setIsRendering(true);
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
    if (!is2DInteractive(renderParams.fractalType)) {
      setIsRendering(true);
      setRenderParams(prevParams => ({ ...prevParams, ...view }));
      return;
    }
    if (animationRef.current.animationFrameId) {
      cancelAnimationFrame(animationRef.current.animationFrameId);
    }
    
    setIsRendering(true);
    animationRef.current.startTime = null;
    animationRef.current.startView = { panX: renderParams.panX, panY: renderParams.panY, zoom: renderParams.zoom };
    animationRef.current.targetView = view;
    animationRef.current.animationFrameId = requestAnimationFrame(animateView);
  }, [renderParams, animateView]);

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
    setIsRendering(true);
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
      // Reset camera when loading settings for simplicity
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
    <div className="min-h-screen flex flex-col items-center justify-center p-4 space-y-8">
      <header className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl">Fractal Explorer</h1>
        <p className="mt-4 text-lg text-gray-400">Explore the infinite complexity of mathematical beauty.</p>
      </header>
      <main className="w-full max-w-4xl flex flex-col items-center space-y-8">
        <FractalCanvas
          params={renderParams}
          onRenderComplete={handleRenderComplete}
          onViewChange={handleViewChange}
          cameraRotation={cameraRotation}
          onCameraChange={handleCameraChange}
          onJuliaConstantChange={handleJuliaConstantChange}
        />
        <Controls
          initialParams={initialControlParams}
          currentParams={renderParams}
          onRender={handleRender}
          isRendering={isRendering}
          onSaveSettings={handleSaveSettings}
          onLoadSettings={handleLoadSettings}
        />
      </main>
    </div>
  );
};

export default App;
