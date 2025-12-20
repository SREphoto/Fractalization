import React, { useRef, useEffect } from 'react';
import { RenderParams, FractalType, ColorPalette, OrbitTrap } from '../types';
import { drawFractal } from '../services/fractalService';
import { vertexShaderSource, fragmentShaderSource } from '../services/mandelbulbShaders';
import { vertexShaderSource as vertexShaderSource2D, fragmentShaderSource2D } from '../services/fractalShaders';

interface FractalCanvasProps {
  params: RenderParams;
  onRenderComplete: () => void;
  onViewChange: (view: { panX: number; panY: number; zoom: number }) => void;
  cameraRotation: { x: number; y: number };
  onCameraChange: (changes: { rotation?: { x: number; y: number }; distance?: number; target?: { x: number; y: number } }) => void;
  onJuliaConstantChange: (constants: { cReal: number; cImag: number }) => void;
}

const createShader = (gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null => {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  if (success) return shader;
  console.error(gl.getShaderInfoLog(shader));
  gl.deleteShader(shader);
  return null;
};

const createProgram = (gl: WebGLRenderingContext, vertexShader: WebGLShader, fragmentShader: WebGLShader): WebGLProgram | null => {
  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  const success = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (success) return program;
  console.error(gl.getProgramInfoLog(program));
  gl.deleteProgram(program);
  return null;
};

const getPaletteIndex = (palette: ColorPalette): number => {
  switch (palette) {
    case ColorPalette.Viridis: return 0;
    case ColorPalette.Plasma: return 1;
    case ColorPalette.Magma: return 2;
    case ColorPalette.Inferno: return 3;
    case ColorPalette.Sunset: return 4;
    case ColorPalette.Ocean: return 5;
    case ColorPalette.Forest: return 6;
    case ColorPalette.Rainbow: return 7;
    default: return 0;
  }
};

const getOrbitTrapIndex = (trap: OrbitTrap): number => {
  switch (trap) {
    case OrbitTrap.None: return 0;
    case OrbitTrap.Point: return 1;
    case OrbitTrap.Circle: return 2;
    case OrbitTrap.Cross: return 3;
    default: return 0;
  }
};

const FractalCanvas: React.FC<FractalCanvasProps> = ({ params, onRenderComplete, onViewChange, cameraRotation, onCameraChange, onJuliaConstantChange }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDragging2D = useRef(false);
  const dragMode3D = useRef<'none' | 'rotate' | 'pan'>('none');
  const lastMousePos = useRef({ x: 0, y: 0 });

  // Refs to hold latest values for the render loop without triggering re-init
  const paramsRef = useRef(params);
  const cameraRotationRef = useRef(cameraRotation);

  useEffect(() => {
    paramsRef.current = params;
    cameraRotationRef.current = cameraRotation;
  }, [params, cameraRotation]);

  const is3D = params.fractalType === FractalType.Mandelbulb;
  const isSierpinski = params.fractalType === FractalType.Sierpinski;
  const isWebGL2D = !is3D && !isSierpinski;
  const isInteractive2D = isWebGL2D;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let cleanup = () => { };

    if (isSierpinski) {
      return;
    }

    const gl = canvas.getContext('webgl', { antialias: true });
    if (!gl) {
      console.error("WebGL is not supported by your browser.");
      return;
    }

    const vSource = is3D ? vertexShaderSource : vertexShaderSource2D;
    const fSource = is3D ? fragmentShaderSource : fragmentShaderSource2D;

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fSource);

    if (!vertexShader || !fragmentShader) return;

    const program = createProgram(gl, vertexShader, fragmentShader);
    if (!program) return;

    const positionAttributeLocation = gl.getAttribLocation(program, "a_position");
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    const positions = [-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.useProgram(program);
    gl.enableVertexAttribArray(positionAttributeLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

    // Cache uniform locations
    const uLocs: any = {};
    if (is3D) {
      uLocs.resolution = gl.getUniformLocation(program, "u_resolution");
      uLocs.time = gl.getUniformLocation(program, "u_time");
      uLocs.cameraRotation = gl.getUniformLocation(program, "u_cameraRotation");
      uLocs.cameraDistance = gl.getUniformLocation(program, "u_cameraDistance");
      uLocs.cameraTarget = gl.getUniformLocation(program, "u_cameraTarget");
      uLocs.maxSteps = gl.getUniformLocation(program, "u_maxSteps");
    } else {
      uLocs.resolution = gl.getUniformLocation(program, "u_resolution");
      uLocs.zoom = gl.getUniformLocation(program, "u_zoom");
      uLocs.pan = gl.getUniformLocation(program, "u_pan");
      uLocs.maxIterations = gl.getUniformLocation(program, "u_maxIterations");
      uLocs.fractalType = gl.getUniformLocation(program, "u_fractalType");
      uLocs.c = gl.getUniformLocation(program, "u_c");
      uLocs.colorPalette = gl.getUniformLocation(program, "u_colorPalette");
      uLocs.time = gl.getUniformLocation(program, "u_time");
      uLocs.colorCycleSpeed = gl.getUniformLocation(program, "u_colorCycleSpeed");
      uLocs.orbitTrap = gl.getUniformLocation(program, "u_orbitTrap");
    }

    let animationFrameId: number;

    const render = (time: number) => {
      const currentParams = paramsRef.current;
      const currentRotation = cameraRotationRef.current;

      if (is3D) {
        gl.uniform2f(uLocs.resolution, gl.canvas.width, gl.canvas.height);
        gl.uniform1f(uLocs.time, time * 0.001);
        gl.uniform2f(uLocs.cameraRotation, currentRotation.x, currentRotation.y);
        gl.uniform1f(uLocs.cameraDistance, currentParams.cameraDistance);
        gl.uniform2f(uLocs.cameraTarget, currentParams.cameraTarget.x, currentParams.cameraTarget.y);
        gl.uniform1i(uLocs.maxSteps, currentParams.mandelbulbIterations);
      } else {
        gl.uniform2f(uLocs.resolution, gl.canvas.width, gl.canvas.height);
        gl.uniform1f(uLocs.zoom, currentParams.zoom);
        gl.uniform2f(uLocs.pan, currentParams.panX, currentParams.panY);
        gl.uniform1i(uLocs.maxIterations, currentParams.iterations);

        let typeVal = 0;
        if (currentParams.fractalType === FractalType.Julia) typeVal = 1;
        if (currentParams.fractalType === FractalType.BurningShip) typeVal = 2;
        gl.uniform1i(uLocs.fractalType, typeVal);

        gl.uniform2f(uLocs.c, currentParams.cReal, currentParams.cImag);
        gl.uniform1i(uLocs.colorPalette, getPaletteIndex(currentParams.colorPalette));

        gl.uniform1f(uLocs.time, time * 0.001);
        gl.uniform1f(uLocs.colorCycleSpeed, currentParams.colorCycleSpeed);
        gl.uniform1i(uLocs.orbitTrap, getOrbitTrapIndex(currentParams.orbitTrap));
      }

      gl.drawArrays(gl.TRIANGLES, 0, 6);

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
    onRenderComplete();

    cleanup = () => {
      cancelAnimationFrame(animationFrameId);
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      gl.deleteBuffer(positionBuffer);
    };

    return cleanup;
  }, [is3D, isSierpinski]);

  // Separate effect for Sierpinski (CPU)
  useEffect(() => {
    if (isSierpinski && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        drawFractal({ ctx, ...params });
        onRenderComplete();
      }
    }
  }, [params, isSierpinski]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    lastMousePos.current = { x: e.clientX, y: e.clientY };
    if (is3D) {
      if (e.button === 0) {
        dragMode3D.current = 'rotate';
        e.currentTarget.style.cursor = 'grabbing';
      } else if (e.button === 2) {
        dragMode3D.current = 'pan';
        e.currentTarget.style.cursor = 'move';
      }
    } else if (isInteractive2D) {
      isDragging2D.current = true;
      e.currentTarget.style.cursor = 'grabbing';
    }
  };

  const handleMouseUpOrLeave = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDragging2D.current = false;
    dragMode3D.current = 'none';
    if (is3D || isInteractive2D) e.currentTarget.style.cursor = 'grab';
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const dx = e.clientX - lastMousePos.current.x;
    const dy = e.clientY - lastMousePos.current.y;
    lastMousePos.current = { x: e.clientX, y: e.clientY };

    if (dragMode3D.current === 'rotate') {
      onCameraChange({
        rotation: {
          x: cameraRotation.x - dx * 0.01,
          y: cameraRotation.y - dy * 0.01,
        }
      });
    } else if (dragMode3D.current === 'pan') {
      const panFactor = 0.003 * params.cameraDistance;
      onCameraChange({
        target: {
          x: params.cameraTarget.x - dx * panFactor,
          y: params.cameraTarget.y + dy * panFactor,
        }
      });
    } else if (isDragging2D.current) {
      if (params.fractalType === FractalType.Julia && e.shiftKey) {
        const sensitivity = 0.005 / params.zoom;
        const newCReal = params.cReal + dx * sensitivity;
        const newCImag = params.cImag - dy * sensitivity;
        onJuliaConstantChange({ cReal: newCReal, cImag: newCImag });
      } else {
        const minDim = Math.min(params.width, params.height);
        const scale = 1 / (params.zoom * minDim);

        const newPanX = params.panX - dx * scale;
        const newPanY = params.panY + dy * scale;

        onViewChange({ panX: newPanX, panY: newPanY, zoom: params.zoom });
      }
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (is3D) {
      const zoomFactor = 1.1;
      const newDistance = e.deltaY < 0 ? params.cameraDistance / zoomFactor : params.cameraDistance * zoomFactor;
      onCameraChange({ distance: Math.max(0.1, newDistance) });
      return;
    }

    if (!isInteractive2D || !canvasRef.current) return;

    const zoomFactor = 1.1;
    const oldZoom = params.zoom;
    const newZoom = e.deltaY < 0 ? oldZoom * zoomFactor : oldZoom / zoomFactor;

    const rect = canvasRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const glY = params.height - my;
    const minDim = Math.min(params.width, params.height);

    const uvX = (mx - params.width * 0.5) / minDim;
    const uvY = (glY - params.height * 0.5) / minDim;

    const newPanX = params.panX + uvX * (1 / oldZoom - 1 / newZoom);
    const newPanY = params.panY + uvY * (1 / oldZoom - 1 / newZoom);

    onViewChange({ panX: newPanX, panY: newPanY, zoom: newZoom });
  };

  const handleContextMenu = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
  };

  const getCursor = () => {
    if (is3D || isInteractive2D) return 'grab';
    return 'default';
  }

  return <canvas
    ref={canvasRef}
    id="fractalCanvas"
    width={params.width}
    height={params.height}
    className={`rounded-lg shadow-2xl mx-auto cursor-${getCursor()}`}
    onMouseDown={handleMouseDown}
    onMouseMove={handleMouseMove}
    onMouseUp={handleMouseUpOrLeave}
    onMouseLeave={handleMouseUpOrLeave}
    onWheel={handleWheel}
    onContextMenu={handleContextMenu}
  />;
};

export default FractalCanvas;
