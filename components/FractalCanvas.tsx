import React, { useRef, useEffect } from 'react';
import { RenderParams, FractalType } from '../types';
import { drawFractal } from '../services/fractalService';
import { vertexShaderSource, fragmentShaderSource } from '../services/mandelbulbShaders';

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

const FractalCanvas: React.FC<FractalCanvasProps> = ({ params, onRenderComplete, onViewChange, cameraRotation, onCameraChange, onJuliaConstantChange }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDragging2D = useRef(false);
  const dragMode3D = useRef<'none' | 'rotate' | 'pan'>('none');
  const lastMousePos = useRef({ x: 0, y: 0 });
  const is3D = params.fractalType === FractalType.Mandelbulb;
  const isInteractive2D = params.fractalType !== FractalType.Sierpinski && !is3D;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let cleanup = () => {};

    if (is3D) {
      const gl = canvas.getContext('webgl', { antialias: true });
      if (!gl) {
        console.error("WebGL is not supported by your browser.");
        return;
      }
      const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
      const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
      if (!vertexShader || !fragmentShader) return;
      
      const program = createProgram(gl, vertexShader, fragmentShader);
      if (!program) return;

      const positionAttributeLocation = gl.getAttribLocation(program, "a_position");
      const resolutionUniformLocation = gl.getUniformLocation(program, "u_resolution");
      const timeUniformLocation = gl.getUniformLocation(program, "u_time");
      const cameraRotationUniformLocation = gl.getUniformLocation(program, "u_cameraRotation");
      const cameraDistanceUniformLocation = gl.getUniformLocation(program, "u_cameraDistance");
      const cameraTargetUniformLocation = gl.getUniformLocation(program, "u_cameraTarget");
      const maxStepsUniformLocation = gl.getUniformLocation(program, "u_maxSteps");

      const positionBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      const positions = [-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1];
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
      
      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(program);
      gl.enableVertexAttribArray(positionAttributeLocation);
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

      let animationFrameId: number;
      const render = (time: number) => {
        gl.uniform2f(resolutionUniformLocation, gl.canvas.width, gl.canvas.height);
        gl.uniform1f(timeUniformLocation, time * 0.001);
        gl.uniform2f(cameraRotationUniformLocation, cameraRotation.x, cameraRotation.y);
        gl.uniform1f(cameraDistanceUniformLocation, params.cameraDistance);
        gl.uniform2f(cameraTargetUniformLocation, params.cameraTarget.x, params.cameraTarget.y);
        gl.uniform1i(maxStepsUniformLocation, params.mandelbulbIterations);
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
    } else {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      drawFractal({ ctx, ...params });
      onRenderComplete();
    }

    return cleanup;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, cameraRotation]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    lastMousePos.current = { x: e.clientX, y: e.clientY };
    if (is3D) {
      if (e.button === 0) { // Left click for rotation
        dragMode3D.current = 'rotate';
        e.currentTarget.style.cursor = 'grabbing';
      } else if (e.button === 2) { // Right click for panning
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
        if (params.fractalType === FractalType.Julia) {
            const rect = e.currentTarget.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            const newCReal = ((mouseX - params.width / 2) * 4) / (params.width * params.zoom) - params.panX;
            const newCImag = ((mouseY - params.height / 2) * 4) / (params.width * params.zoom) - params.panY;
            onJuliaConstantChange({ cReal: newCReal, cImag: newCImag });
        } else {
            const newPanX = params.panX - (dx * 4) / (params.width * params.zoom);
            const newPanY = params.panY - (dy * 4) / (params.width * params.zoom);
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
    const zoomFactor = 1.15;
    const oldZoom = params.zoom;
    const newZoom = e.deltaY < 0 ? oldZoom * zoomFactor : oldZoom / zoomFactor;
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const mouseCoordX = ((mouseX - params.width / 2) * 4) / (params.width * oldZoom) - params.panX;
    const mouseCoordY = ((mouseY - params.height / 2) * 4) / (params.width * oldZoom) - params.panY;
    const newPanX = ((mouseX - params.width / 2) * 4) / (params.width * newZoom) - mouseCoordX;
    const newPanY = ((mouseY - params.height / 2) * 4) / (params.width * newZoom) - mouseCoordY;
    onViewChange({ panX: newPanX, panY: newPanY, zoom: newZoom });
  };
  
  const handleContextMenu = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (is3D) {
      e.preventDefault();
    }
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
