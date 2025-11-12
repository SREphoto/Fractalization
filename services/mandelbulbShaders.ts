export const vertexShaderSource = `
  attribute vec4 a_position;
  void main() {
    gl_Position = a_position;
  }
`;

export const fragmentShaderSource = `
  precision highp float;

  uniform vec2 u_resolution;
  uniform float u_time;
  uniform vec2 u_cameraRotation;
  uniform float u_cameraDistance;
  uniform vec2 u_cameraTarget;
  uniform int u_maxSteps;

  const float MIN_DIST = 0.0001;
  const float MAX_DIST = 100.0;
  const float POWER = 8.0;

  vec2 mandelbulbDE(vec3 pos) {
      vec3 z = pos;
      float dr = 1.0;
      float r = 0.0;
      for (int i = 0; i < 10; i++) {
          r = length(z);
          if (r > 2.0) break;
          
          float theta = acos(z.z / r);
          float phi = atan(z.y, z.x);
          
          dr = pow(r, POWER - 1.0) * POWER * dr + 1.0;
          
          float zr = pow(r, POWER);
          theta = theta * POWER;
          phi = phi * POWER;
          
          z = zr * vec3(sin(theta) * cos(phi), sin(theta) * sin(phi), cos(theta));
          z += pos;
      }
      return vec2(0.5 * r * log(r) / dr, r);
  }

  vec3 calcNormal(vec3 pos) {
      vec2 e = vec2(MIN_DIST, 0.0);
      vec3 n = vec3(
          mandelbulbDE(pos + e.xyy).x - mandelbulbDE(pos - e.xyy).x,
          mandelbulbDE(pos + e.yxy).x - mandelbulbDE(pos - e.yxy).x,
          mandelbulbDE(pos + e.yyx).x - mandelbulbDE(pos - e.yyx).x
      );
      return normalize(n);
  }

  mat3 getCamera(vec3 ro, vec3 ta) {
      vec3 f = normalize(ta - ro);
      vec3 r = normalize(cross(vec3(0.0, 1.0, 0.0), f));
      vec3 u = cross(f, r);
      return mat3(r, u, f);
  }

  void main() {
      vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / u_resolution.y;

      vec3 ta = vec3(u_cameraTarget.x, u_cameraTarget.y, 0.0);
      vec3 ro = vec3(u_cameraTarget.x, u_cameraTarget.y, u_cameraDistance);
      
      float rotX = u_cameraRotation.x;
      float rotY = u_cameraRotation.y;

      vec3 ro_offset = ro - ta;
      ro_offset.xz *= mat2(cos(rotX), -sin(rotX), sin(rotX), cos(rotX));
      ro_offset.yz *= mat2(cos(rotY), -sin(rotY), sin(rotY), cos(rotY));
      ro = ro_offset + ta;

      mat3 cam = getCamera(ro, ta);
      vec3 rd = cam * normalize(vec3(uv, -1.5));

      float total_dist = 0.0;
      vec3 p = ro;
      vec2 res;

      for (int i = 0; i < u_maxSteps; i++) {
          res = mandelbulbDE(p);
          float d = res.x;
          if (d < MIN_DIST || total_dist > MAX_DIST) break;
          p += rd * d;
          total_dist += d;
      }

      vec3 col = vec3(0.0);

      if (total_dist < MAX_DIST) {
          vec3 normal = calcNormal(p);
          vec3 lightPos = ro + vec3(1.0, 2.0, 3.0);
          vec3 lightDir = normalize(lightPos - p);
          
          float ambientStrength = 0.2;
          vec3 ambient = ambientStrength * vec3(1.0);
          
          float diff = max(dot(normal, lightDir), 0.0);
          vec3 diffuse = diff * vec3(0.8, 0.7, 0.6);
          
          float specularStrength = 0.5;
          vec3 viewDir = normalize(ro - p);
          vec3 reflectDir = reflect(-lightDir, normal);
          float spec = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);
          vec3 specular = specularStrength * spec * vec3(1.0);
          
          vec3 objectColor = 0.5 + 0.5 * cos(3.0 + res.y * 0.4 + vec3(0.0, 0.5, 1.0));
          
          col = (ambient + diffuse + specular) * objectColor;
      }

      col *= exp(-0.01 * total_dist * total_dist);

      gl_FragColor = vec4(col, 1.0);
  }
`;
