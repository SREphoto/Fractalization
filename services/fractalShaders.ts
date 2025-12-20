
export const vertexShaderSource = `
  attribute vec2 a_position;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

export const fragmentShaderSource2D = `
  precision highp float;

  uniform vec2 u_resolution;
  uniform float u_zoom;
  uniform vec2 u_pan;
  uniform int u_maxIterations;
  uniform int u_fractalType; // 0: Mandelbrot, 1: Julia, 2: Burning Ship
  uniform vec2 u_c; // For Julia set
  uniform int u_colorPalette; // 0: Viridis, 1: Plasma, etc.
  uniform float u_time; // For color cycling
  uniform float u_colorCycleSpeed;
  uniform int u_orbitTrap; // 0: None, 1: Point, 2: Circle, 3: Cross

  vec3 viridis(float t) {
    const vec3 c0 = vec3(0.267004, 0.004874, 0.329415);
    const vec3 c1 = vec3(-0.009309, 1.182766, 0.095938);
    const vec3 c2 = vec3(0.006179, -0.261643, -0.002225);
    const vec3 c3 = vec3(-0.002225, 0.006179, -0.009309);
    return 0.5 + 0.5 * cos(6.28318 * (t + vec3(0.0, 0.33, 0.67)));
  }

  vec3 palette(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
    return a + b * cos(6.28318 * (c * t + d));
  }

  vec3 getColor(float t) {
    // Apply color cycling
    float cycledT = fract(t + u_time * u_colorCycleSpeed * 0.1);

    if (u_colorPalette == 0) { // Viridis-ish
      return palette(cycledT, vec3(0.5), vec3(0.5), vec3(1.0), vec3(0.0, 0.33, 0.67));
    } else if (u_colorPalette == 1) { // Plasma-ish
      return palette(cycledT, vec3(0.5), vec3(0.5), vec3(1.0), vec3(0.3, 0.2, 0.2));
    } else if (u_colorPalette == 2) { // Magma-ish
      return palette(cycledT, vec3(0.5), vec3(0.5), vec3(1.0), vec3(0.0, 0.1, 0.2));
    } else if (u_colorPalette == 3) { // Inferno-ish
      return palette(cycledT, vec3(0.5), vec3(0.5), vec3(1.0), vec3(0.3, 0.0, 0.0));
    } else if (u_colorPalette == 4) { // Sunset
       return palette(cycledT, vec3(0.8, 0.5, 0.4), vec3(0.2, 0.4, 0.2), vec3(2.0, 1.0, 1.0), vec3(0.0, 0.25, 0.25));
    } else if (u_colorPalette == 5) { // Ocean
       return palette(cycledT, vec3(0.5), vec3(0.5), vec3(1.0), vec3(0.0, 0.1, 0.2));
    } else { // Forest / Rainbow
       return palette(cycledT, vec3(0.5), vec3(0.5), vec3(1.0), vec3(0.0, 0.33, 0.67));
    }
  }

  void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.y, u_resolution.x);
    
    vec2 c = uv / u_zoom + u_pan;
    vec2 z = c;
    
    if (u_fractalType == 1) { // Julia
      z = c;
      c = u_c;
    } else if (u_fractalType == 0 || u_fractalType == 2) { // Mandelbrot or Burning Ship
      z = vec2(0.0);
    }

    int iter = 0;
    float minTrapDist = 1000.0;

    for (int i = 0; i < 2000; i++) {
      if (i >= u_maxIterations) break;
      
      float x = z.x;
      float y = z.y;
      
      if (x * x + y * y > 4.0) {
        iter = i;
        break;
      }
      
      if (u_fractalType == 2) { // Burning Ship
        z.x = x * x - y * y + c.x;
        z.y = 2.0 * abs(x * y) + c.y;
      } else { // Mandelbrot & Julia
        z.x = x * x - y * y + c.x;
        z.y = 2.0 * x * y + c.y;
      }
      iter = i;

      // Orbit Traps
      if (u_orbitTrap > 0) {
          float dist = 0.0;
          if (u_orbitTrap == 1) { // Point (origin)
              dist = length(z);
          } else if (u_orbitTrap == 2) { // Circle (ring at radius 1)
              dist = abs(length(z) - 1.0);
          } else if (u_orbitTrap == 3) { // Cross (axes)
              dist = min(abs(z.x), abs(z.y));
          }
          minTrapDist = min(minTrapDist, dist);
      }
    }

    if (iter == u_maxIterations) {
      gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    } else {
      float t = float(iter) / float(u_maxIterations);
      
      vec3 color = getColor(sqrt(t));

      if (u_orbitTrap > 0) {
          // Mix orbit trap color
          float trapIntensity = exp(-2.0 * minTrapDist);
          vec3 trapColor = vec3(1.0, 1.0, 1.0); // White glow
          // Combine: base color modulated by trap, or added?
          // Let's add the trap glow
          color = mix(color, trapColor, trapIntensity * 0.8);
      }

      gl_FragColor = vec4(color, 1.0);
    }
  }
`;
