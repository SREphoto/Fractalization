import React, { useState, useEffect } from 'react';
import { FractalType, ControlParams, ColorPalette } from '../types';

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
  const [hasSavedSettings, setHasSavedSettings] = useState(false);

  const is2DEscapeTimeFractal =
    fractalType === FractalType.Mandelbrot ||
    fractalType === FractalType.Julia ||
    fractalType === FractalType.BurningShip;

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
  }, [currentParams]);


  const handleRenderClick = () => {
    onRender({ zoom, iterations, cReal, cImag, fractalType, colorPalette, mandelbulbIterations });
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
    <div id="controls" className="w-full max-w-4xl mx-auto bg-gray-800 p-6 rounded-lg shadow-xl">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
        
        <div className="md:col-span-1 space-y-4">
          <div>
            <label htmlFor="fractalType" className="block text-sm font-medium text-gray-300 mb-2">Fractal Type</label>
            <select
              id="fractalType"
              value={fractalType}
              onChange={(e) => setFractalType(e.target.value as FractalType)}
              className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:ring-accent focus:border-accent"
            >
              <option value={FractalType.Mandelbrot}>Mandelbrot</option>
              <option value={FractalType.Julia}>Julia</option>
              <option value={FractalType.BurningShip}>Burning Ship</option>
              <option value={FractalType.Sierpinski}>Sierpinski Triangle</option>
              <option value={FractalType.Mandelbulb}>3D Mandelbulb</option>
            </select>
          </div>
          <div>
            <label htmlFor="colorPalette" className="block text-sm font-medium text-gray-300 mb-2">Color Palette</label>
            <select
              id="colorPalette"
              value={colorPalette}
              onChange={(e) => setColorPalette(e.target.value as ColorPalette)}
              disabled={fractalType === FractalType.Mandelbulb}
              className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:ring-accent focus:border-accent disabled:opacity-50"
            >
              {Object.values(ColorPalette).map((palette) => (
                <option key={palette} value={palette}>
                  {palette}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="md:col-span-2">
          <fieldset disabled={fractalType !== FractalType.Julia || isRendering} className="border border-gray-600 rounded-lg p-4 disabled:opacity-50">
            <legend className="text-sm font-medium text-gray-300 px-2">Julia Set Constant (c)</legend>
            <div className="flex space-x-4">
              <div>
                <label htmlFor="cReal" className="block text-xs font-medium text-gray-400">Real Part</label>
                <input
                  type="number"
                  id="cReal"
                  step="0.001"
                  value={cReal}
                  onChange={(e) => setCReal(parseFloat(e.target.value))}
                  className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 mt-1 text-white"
                />
              </div>
              <div>
                <label htmlFor="cImag" className="block text-xs font-medium text-gray-400">Imaginary Part</label>
                <input
                  type="number"
                  id="cImag"
                  step="0.001"
                  value={cImag}
                  onChange={(e) => setCImag(parseFloat(e.target.value))}
                  className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 mt-1 text-white"
                />
              </div>
            </div>
          </fieldset>
        </div>

        <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="disabled:opacity-50">
              <label htmlFor="zoomSlider" className={`block text-sm font-medium mb-2 ${is2DEscapeTimeFractal ? 'text-gray-300' : 'text-gray-500'}`}>Zoom ({zoom})</label>
              <input
                id="zoomSlider"
                type="range"
                min="1"
                max="50000"
                value={zoom}
                disabled={!is2DEscapeTimeFractal || isRendering}
                onChange={(e) => setZoom(parseInt(e.target.value, 10))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed"
              />
            </div>
            <div className="disabled:opacity-50">
              <label htmlFor="iterationsSlider" className={`block text-sm font-medium mb-2 ${is2DEscapeTimeFractal ? 'text-gray-300' : 'text-gray-500'}`}>Iterations ({iterations})</label>
              <input
                id="iterationsSlider"
                type="range"
                min="50"
                max="2000"
                value={iterations}
                disabled={!is2DEscapeTimeFractal || isRendering}
                onChange={(e) => setIterations(parseInt(e.target.value, 10))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed"
              />
            </div>
        </div>
      </div>

      {fractalType === FractalType.Mandelbulb && (
        <div className="mt-6 border-t border-gray-700 pt-6">
          <div className="max-w-md mx-auto">
            <label htmlFor="mandelbulbIterationsSlider" className="block text-sm font-medium text-gray-300 mb-2">
              3D Render Quality (Steps: {mandelbulbIterations})
            </label>
            <input
              id="mandelbulbIterationsSlider"
              type="range"
              min="50"
              max="1000"
              step="10"
              value={mandelbulbIterations}
              disabled={isRendering}
              onChange={(e) => setMandelbulbIterations(parseInt(e.target.value, 10))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed"
            />
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-wrap justify-center items-center gap-4">
        <button
          onClick={handleSaveClick}
          disabled={isRendering}
          className="bg-sky-600 hover:bg-sky-500 text-white font-bold py-3 px-6 rounded-lg transition duration-300 ease-in-out disabled:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Save Settings
        </button>
        <button
          onClick={handleLoadClick}
          disabled={isRendering || !hasSavedSettings}
          className="bg-teal-600 hover:bg-teal-500 text-white font-bold py-3 px-6 rounded-lg transition duration-300 ease-in-out disabled:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Load Settings
        </button>
        <button
          onClick={handleResetClick}
          disabled={isRendering}
          className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-3 px-6 rounded-lg transition duration-300 ease-in-out disabled:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Reset View
        </button>
        <button
          id="renderButton"
          onClick={handleRenderClick}
          disabled={isRendering}
          className="bg-accent hover:opacity-90 text-white font-bold py-3 px-8 rounded-lg transition duration-300 ease-in-out disabled:bg-gray-500 disabled:cursor-not-allowed"
        >
          {isRendering ? 'Rendering...' : 'Render Fractal'}
        </button>
      </div>
    </div>
  );
};

export default Controls;
