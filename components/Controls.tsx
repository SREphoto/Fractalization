import React, { useState, useEffect } from 'react';
import { FractalType, ControlParams, ColorPalette, OrbitTrap } from '../types';

interface ControlsProps {
  initialParams: ControlParams;
  currentParams: ControlParams;
  onRender: (params: ControlParams) => void;
  isRendering: boolean;
  onSaveSettings: () => void;
  onLoadSettings: () => void;
}

const Controls: React.FC<ControlsProps> = ({
  initialParams,
  currentParams,
  onRender,
  isRendering,
  onSaveSettings,
  onLoadSettings,
}) => {
  const [fractalType, setFractalType] = useState<FractalType>(currentParams.fractalType);
  const [zoom, setZoom] = useState<number>(currentParams.zoom * 100);
  const [iterations, setIterations] = useState<number>(currentParams.iterations);
  const [cReal, setCReal] = useState<number>(currentParams.cReal);
  const [cImag, setCImag] = useState<number>(currentParams.cImag);
  const [colorPalette, setColorPalette] = useState<ColorPalette>(currentParams.colorPalette);
  const [mandelbulbIterations, setMandelbulbIterations] = useState<number>(currentParams.mandelbulbIterations);
  const [colorCycleSpeed, setColorCycleSpeed] = useState<number>(currentParams.colorCycleSpeed || 0);
  const [orbitTrap, setOrbitTrap] = useState<OrbitTrap>(currentParams.orbitTrap || OrbitTrap.None);
  const [hasSavedSettings, setHasSavedSettings] = useState(false);

  const isWebGL = fractalType !== FractalType.Sierpinski;
  const is2DWebGL = isWebGL && fractalType !== FractalType.Mandelbulb;

  useEffect(() => {
    if (localStorage.getItem('fractalExplorerSettings')) {
      setHasSavedSettings(true);
    }
  }, []);

  useEffect(() => {
    setFractalType(currentParams.fractalType);
    setZoom(currentParams.zoom * 100);
    setIterations(currentParams.iterations);
    setCReal(currentParams.cReal);
    setCImag(currentParams.cImag);
    setColorPalette(currentParams.colorPalette);
    setMandelbulbIterations(currentParams.mandelbulbIterations);
    setColorCycleSpeed(currentParams.colorCycleSpeed || 0);
    setOrbitTrap(currentParams.orbitTrap || OrbitTrap.None);
  }, [currentParams]);

  // For WebGL, update immediately on change
  const handleChange = (updates: Partial<ControlParams>) => {
    const newParams = {
      fractalType,
      zoom,
      iterations,
      cReal,
      cImag,
      colorPalette,
      mandelbulbIterations,
      colorCycleSpeed,
      orbitTrap,
      ...updates
    };

    // Update local state
    if (updates.fractalType) setFractalType(updates.fractalType);
    if (updates.zoom !== undefined) setZoom(updates.zoom);
    if (updates.iterations !== undefined) setIterations(updates.iterations);
    if (updates.cReal !== undefined) setCReal(updates.cReal);
    if (updates.cImag !== undefined) setCImag(updates.cImag);
    if (updates.colorPalette) setColorPalette(updates.colorPalette);
    if (updates.mandelbulbIterations !== undefined) setMandelbulbIterations(updates.mandelbulbIterations);
    if (updates.colorCycleSpeed !== undefined) setColorCycleSpeed(updates.colorCycleSpeed);
    if (updates.orbitTrap !== undefined) setOrbitTrap(updates.orbitTrap);

    // Trigger render if WebGL (instant)
    if (isWebGL || updates.fractalType) { // Always render on type change
      onRender(newParams);
    }
  };

  const handleRenderClick = () => {
    onRender({ zoom, iterations, cReal, cImag, fractalType, colorPalette, mandelbulbIterations, colorCycleSpeed, orbitTrap });
  };

  const handleResetClick = () => {
    onRender(initialParams);
  };

  const handleSaveClick = () => {
    onSaveSettings();
    setHasSavedSettings(true);
  };

  const handleLoadClick = () => {
    onLoadSettings();
  };

  return (
    <div id="controls" className="w-full bg-gray-800/80 backdrop-blur-md p-6 rounded-xl shadow-2xl border border-gray-700 max-h-[90vh] overflow-y-auto custom-scrollbar">
      <div className="space-y-6">

        <div>
          <label htmlFor="fractalType" className="block text-sm font-medium text-gray-300 mb-2">Fractal Type</label>
          <select
            id="fractalType"
            value={fractalType}
            onChange={(e) => handleChange({ fractalType: e.target.value as FractalType })}
            className="w-full bg-gray-900 border border-gray-600 rounded-lg py-2.5 px-4 text-white focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
          >
            <option value={FractalType.Mandelbrot}>Mandelbrot Set</option>
            <option value={FractalType.Julia}>Julia Set</option>
            <option value={FractalType.BurningShip}>Burning Ship</option>
            <option value={FractalType.Mandelbulb}>3D Mandelbulb</option>
            <option value={FractalType.Sierpinski}>Sierpinski Triangle</option>
          </select>
        </div>

        <div>
          <label htmlFor="colorPalette" className="block text-sm font-medium text-gray-300 mb-2">Color Palette</label>
          <select
            id="colorPalette"
            value={colorPalette}
            onChange={(e) => handleChange({ colorPalette: e.target.value as ColorPalette })}
            disabled={fractalType === FractalType.Mandelbulb}
            className="w-full bg-gray-900 border border-gray-600 rounded-lg py-2.5 px-4 text-white focus:ring-2 focus:ring-pink-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {Object.values(ColorPalette).map((palette) => (
              <option key={palette} value={palette}>
                {palette}
              </option>
            ))}
          </select>
        </div>

        {is2DWebGL && (
          <div className="space-y-4 border-t border-gray-700 pt-4">
            <div>
              <div className="flex justify-between mb-1">
                <label htmlFor="colorCycleSpeed" className="text-sm font-medium text-gray-300">Color Cycle Speed</label>
                <span className="text-xs text-gray-500 font-mono">{colorCycleSpeed}</span>
              </div>
              <input
                id="colorCycleSpeed"
                type="range"
                min="0"
                max="10"
                step="0.1"
                value={colorCycleSpeed}
                onChange={(e) => handleChange({ colorCycleSpeed: parseFloat(e.target.value) })}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-teal-500"
              />
            </div>
            <div>
              <label htmlFor="orbitTrap" className="block text-sm font-medium text-gray-300 mb-2">Orbit Trap</label>
              <select
                id="orbitTrap"
                value={orbitTrap}
                onChange={(e) => handleChange({ orbitTrap: e.target.value as OrbitTrap })}
                className="w-full bg-gray-900 border border-gray-600 rounded-lg py-2.5 px-4 text-white focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
              >
                {Object.values(OrbitTrap).map((trap) => (
                  <option key={trap} value={trap}>
                    {trap}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div className={`transition-all duration-300 ${fractalType === FractalType.Julia ? 'opacity-100 max-h-40' : 'opacity-50 max-h-0 overflow-hidden'}`}>
          <div className="border border-gray-600 rounded-lg p-4 bg-gray-900/50">
            <legend className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Julia Constants</legend>
            <div className="flex space-x-4">
              <div className="flex-1">
                <label htmlFor="cReal" className="block text-xs font-medium text-gray-500 mb-1">Real</label>
                <input
                  type="number"
                  id="cReal"
                  step="0.001"
                  value={cReal}
                  onChange={(e) => handleChange({ cReal: parseFloat(e.target.value) })}
                  className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:border-pink-500 focus:outline-none"
                />
              </div>
              <div className="flex-1">
                <label htmlFor="cImag" className="block text-xs font-medium text-gray-500 mb-1">Imaginary</label>
                <input
                  type="number"
                  id="cImag"
                  step="0.001"
                  value={cImag}
                  onChange={(e) => handleChange({ cImag: parseFloat(e.target.value) })}
                  className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:border-pink-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex justify-between mb-1">
              <label htmlFor="zoomSlider" className="text-sm font-medium text-gray-300">Zoom</label>
              <span className="text-xs text-gray-500 font-mono">
                {zoom >= 10000 ? zoom.toExponential(2) : Math.round(zoom)}x
              </span>
            </div>
            <input
              id="zoomSlider"
              type="range"
              min={Math.log10(100)}
              max={Math.log10(100000000)}
              step="0.01"
              value={Math.log10(zoom)}
              disabled={!isWebGL && isRendering}
              onChange={(e) => handleChange({ zoom: Math.pow(10, parseFloat(e.target.value)) })}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-pink-500"
            />
          </div>
          <div>
            <div className="flex justify-between mb-1">
              <label htmlFor="iterationsSlider" className="text-sm font-medium text-gray-300">Iterations</label>
              <span className="text-xs text-gray-500 font-mono">{iterations}</span>
            </div>
            <input
              id="iterationsSlider"
              type="range"
              min="50"
              max="2000"
              value={iterations}
              disabled={!isWebGL && isRendering}
              onChange={(e) => handleChange({ iterations: parseInt(e.target.value, 10) })}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-pink-500"
            />
          </div>
        </div>

        {fractalType === FractalType.Mandelbulb && (
          <div className="pt-2">
            <div className="flex justify-between mb-1">
              <label htmlFor="mandelbulbIterationsSlider" className="text-sm font-medium text-gray-300">3D Quality</label>
              <span className="text-xs text-gray-500 font-mono">{mandelbulbIterations}</span>
            </div>
            <input
              id="mandelbulbIterationsSlider"
              type="range"
              min="50"
              max="1000"
              step="10"
              value={mandelbulbIterations}
              disabled={isRendering}
              onChange={(e) => handleChange({ mandelbulbIterations: parseInt(e.target.value, 10) })}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
            />
          </div>
        )}

        <div className="pt-4 grid grid-cols-2 gap-3">
          <button
            onClick={handleSaveClick}
            disabled={isRendering}
            className="bg-gray-700 hover:bg-gray-600 text-white text-sm font-semibold py-2 px-4 rounded-lg transition duration-200"
          >
            Save
          </button>
          <button
            onClick={handleLoadClick}
            disabled={isRendering || !hasSavedSettings}
            className="bg-gray-700 hover:bg-gray-600 text-white text-sm font-semibold py-2 px-4 rounded-lg transition duration-200 disabled:opacity-50"
          >
            Load
          </button>
          <button
            onClick={handleResetClick}
            disabled={isRendering}
            className="col-span-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-semibold py-2 px-4 rounded-lg transition duration-200"
          >
            Reset View
          </button>

          {!isWebGL && (
            <button
              id="renderButton"
              onClick={handleRenderClick}
              disabled={isRendering}
              className="col-span-2 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold py-3 px-4 rounded-lg shadow-lg transform transition hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRendering ? 'Rendering...' : 'Render'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Controls;
