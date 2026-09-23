/* ============================================================
   COMMON GLSL — shared helper functions, prepended to every
   fragment shader.
   ============================================================ */
const COMMON_GLSL = `
precision highp float;
varying vec2 vUv;
#define PI 3.1415926535897932384626433832795

float random(vec2 st){
  return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

vec2 rotate(vec2 uv, float rotation, vec2 mid){
  return vec2(
    cos(rotation) * (uv.x - mid.x) + sin(rotation) * (uv.y - mid.y) + mid.x,
    cos(rotation) * (uv.y - mid.y) - sin(rotation) * (uv.x - mid.x) + mid.y
  );
}

vec4 permute(vec4 x){ return mod(((x*34.0)+1.0)*x, 289.0); }
vec2 fade(vec2 t){ return t*t*t*(t*(t*6.0-15.0)+10.0); }

float cnoise(vec2 P){
  vec4 Pi = floor(P.xyxy) + vec4(0.0, 0.0, 1.0, 1.0);
  vec4 Pf = fract(P.xyxy) - vec4(0.0, 0.0, 1.0, 1.0);
  Pi = mod(Pi, 289.0);
  vec4 ix = Pi.xzxz;
  vec4 iy = Pi.yyww;
  vec4 fx = Pf.xzxz;
  vec4 fy = Pf.yyww;
  vec4 i = permute(permute(ix) + iy);
  vec4 gx = 2.0 * fract(i * 0.0243902439) - 1.0;
  vec4 gy = abs(gx) - 0.5;
  vec4 tx = floor(gx + 0.5);
  gx = gx - tx;
  vec2 g00 = vec2(gx.x,gy.x);
  vec2 g10 = vec2(gx.y,gy.y);
  vec2 g01 = vec2(gx.z,gy.z);
  vec2 g11 = vec2(gx.w,gy.w);
  vec4 norm = 1.79284291400159 - 0.85373472095314 * vec4(dot(g00, g00), dot(g01, g01), dot(g10, g10), dot(g11, g11));
  g00 *= norm.x; g01 *= norm.y; g10 *= norm.z; g11 *= norm.w;
  float n00 = dot(g00, vec2(fx.x, fy.x));
  float n10 = dot(g10, vec2(fx.y, fy.y));
  float n01 = dot(g01, vec2(fx.z, fy.z));
  float n11 = dot(g11, vec2(fx.w, fy.w));
  vec2 fade_xy = fade(Pf.xy);
  vec2 n_x = mix(vec2(n00, n01), vec2(n10, n11), fade_xy.x);
  float n_xy = mix(n_x.x, n_x.y, fade_xy.y);
  return 2.3 * n_xy;
}
`;

const VERT = `
attribute vec2 position;
varying vec2 vUv;
void main(){
  vUv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

/* ============================================================
   BUILD DOM
   ============================================================ */
const tocEl = document.getElementById("toc");
const contentEl = document.getElementById("content");

GROUPS.forEach((g) => {
  const patternsInGroup = PATTERNS.filter((p) => p.group === g.id);
  if (!patternsInGroup.length) return;

  // TOC
  const tocGroup = document.createElement("div");
  tocGroup.className = "toc-group";
  tocGroup.innerHTML = `<h4>${g.label}</h4><ul>${patternsInGroup
    .map(
      (p) =>
        `<li><a href="#p${p.id}">${p.title.replace(/^Pattern[s]? [\d–]+ — /, "")}</a></li>`,
    )
    .join("")}</ul>`;
  tocEl.appendChild(tocGroup);

  // Section heading
  const heading = document.createElement("div");
  heading.className = "group-heading";
  heading.innerHTML = `<span>${String(patternsInGroup.length).padStart(2, "0")}</span> ${g.label}`;
  contentEl.appendChild(heading);

  // Grid
  const grid = document.createElement("div");
  grid.className = "grid";
  patternsInGroup.forEach((p) => grid.appendChild(buildCard(p)));
  contentEl.appendChild(grid);
});

function buildCard(p) {
  const card = document.createElement("section");
  card.className = "card";
  card.id = "p" + p.id;

  const slot = document.createElement("div");
  slot.className = "canvas-slot";
  slot.innerHTML = `<span class="num">#${p.id}</span>`;
  card.appendChild(slot);
  p.el = slot;

  const body = document.createElement("div");
  body.className = "card-body";

  const controlsHtml = p.uniforms.length
    ? p.uniforms
        .map(
          (u) => `
    <div class="ctrl-row">
      <div class="ctrl-label"><b>${u.label}</b><span class="val" data-out="${u.key}">${u.def}</span></div>
      <input type="range" data-key="${u.key}" min="${u.min}" max="${u.max}" step="${u.step}" value="${u.def}">
    </div>
  `,
        )
        .join("")
    : `<div class="no-controls">No tunable constants — this one's pure UV math.</div>`;

  body.innerHTML = `
    <h3>${p.title}</h3>
    <p class="desc">${p.desc}</p>
    <div class="controls">${controlsHtml}</div>
    <details>
      <summary>GLSL</summary>
      <pre>${escapeHtml(p.directColor ? p.glsl : "float strength = ...;\n" + p.glsl)}</pre>
      <span class="timestamp">Lesson 28, timestamp ${p.time}</span>
    </details>
  `;
  card.appendChild(body);

  // wire sliders
  body.querySelectorAll("input[type=range]").forEach((input) => {
    input.addEventListener("input", () => {
      const key = input.dataset.key;
      const v = parseFloat(input.value);
      p.material.uniforms[key].value = v;
      body.querySelector(`[data-out="${key}"]`).textContent = formatVal(
        v,
        input.step,
      );
    });
  });

  return card;
}

function formatVal(v, step) {
  const decimals = (step.toString().split(".")[1] || "").length;
  return decimals ? v.toFixed(Math.min(decimals, 3)) : v.toString();
}

function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/* ============================================================
   SHADER COMPILATION
   ============================================================ */
function buildFragment(p) {
  let src = COMMON_GLSL + "\n";
  p.uniforms.forEach((u) => {
    src += `uniform float ${u.key};\n`;
  });
  src += "uniform int uColorize;\n";
  src += "void main(){\n";
  if (p.directColor) {
    src += "  " + p.glsl + "\n";
  } else {
    src += "  " + p.glsl.split("\n").join("\n  ") + "\n";
    src += "  strength = clamp(strength, 0.0, 1.0);\n";
    src += "  vec3 mono = vec3(strength);\n";
    src += "  vec3 colored = mix(vec3(0.0), vec3(vUv, 1.0), strength);\n";
    src += "  vec3 finalColor = (uColorize > 0) ? colored : mono;\n";
    src += "  gl_FragColor = vec4(finalColor, 1.0);\n";
  }
  src += "}\n";
  return src;
}

/* ============================================================
   THREE.JS — single shared renderer, many viewports
   ============================================================ */
const canvas = document.getElementById("gl");
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setScissorTest(true);

const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

const quadGeom = new THREE.BufferGeometry();
quadGeom.setAttribute(
  "position",
  new THREE.BufferAttribute(
    new Float32Array([-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1]),
    2,
  ),
);

const mesh = new THREE.Mesh(quadGeom, null);
mesh.frustumCulled = false;
scene.add(mesh);

PATTERNS.forEach((p) => {
  p.material = new THREE.RawShaderMaterial({
    vertexShader: VERT,
    fragmentShader: buildFragment(p),
    uniforms: (() => {
      const u = { uColorize: { value: 0 } };
      p.uniforms.forEach((cfg) => {
        u[cfg.key] = { value: cfg.def };
      });
      return u;
    })(),
  });
  p.visible = false;
});

const colorizeToggle = document.getElementById("colorizeToggle");
colorizeToggle.addEventListener("change", () => {
  const v = colorizeToggle.checked ? 1 : 0;
  PATTERNS.forEach((p) => {
    p.material.uniforms.uColorize.value = v;
  });
});

const io = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      const id = entry.target.parentElement.id.slice(1);
      const p = PATTERNS.find((pp) => String(pp.id) === id);
      if (p) p.visible = entry.isIntersecting;
    });
  },
  { rootMargin: "150px" },
);

PATTERNS.forEach((p) => io.observe(p.el));

function resize() {
  const w = window.innerWidth,
    h = window.innerHeight;
  renderer.setSize(w, h, false);
}
window.addEventListener("resize", resize);
resize();

function render() {
  requestAnimationFrame(render);
  const rendererH = renderer.getSize(new THREE.Vector2()).y;

  PATTERNS.forEach((p) => {
    if (!p.visible) return;
    const rect = p.el.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > window.innerHeight) return;

    const x = rect.left;
    const y = rendererH - rect.bottom;
    const w = rect.width;
    const h = rect.height;
    if (w <= 0 || h <= 0) return;

    renderer.setViewport(x, y, w, h);
    renderer.setScissor(x, y, w, h);
    mesh.material = p.material;
    renderer.render(scene, camera);
  });
}
render();
