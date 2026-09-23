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
   PATTERN DATA
   Each pattern's glsl block must assign to a variable named
   `strength` (or, for directColor patterns, write gl_FragColor
   itself). Uniform keys map 1:1 to slider controls.
   ============================================================ */
const GROUPS = [
  { id: "foundations", label: "Foundations · UV & Gradients" },
  { id: "steps", label: "Steps & Repetition" },
  { id: "squares", label: "Distance in Squares" },
  { id: "random", label: "Randomness" },
  { id: "radial", label: "Circles & Radial Fields" },
  { id: "waves", label: "Waves & Distortion" },
  { id: "polar", label: "Polar / Angle" },
  { id: "noise", label: "Perlin Noise" },
];

const PATTERNS = [
  {
    id: "1-2",
    group: "foundations",
    title: "Patterns 1–2 — UV as Color",
    time: "10:38",
    directColor: true,
    glsl: "gl_FragColor = vec4(vUv, uBlue, 1.0);",
    desc: "vUv itself is a gradient — red rises left→right, green rises bottom→top. The blue channel is hand-set here; drag it to 0 and you get Pattern 2 exactly. Removing a channel is just multiplying a slice of the image by zero.",
    uniforms: [
      {
        key: "uBlue",
        label: "Blue channel",
        min: 0,
        max: 1,
        step: 0.01,
        def: 1,
      },
    ],
  },

  {
    id: 3,
    group: "foundations",
    title: "Pattern 3 — Horizontal Gradient",
    time: "13:36",
    glsl: "float strength = vUv.x;",
    desc: "vUv.x alone, repeated across R, G and B, makes a black→white ramp left to right. Reading UV as brightness instead of position is the trick every pattern below builds on.",
    uniforms: [],
  },

  {
    id: 4,
    group: "foundations",
    title: "Pattern 4 — Vertical Gradient",
    time: "16:40",
    glsl: "float strength = vUv.y;",
    desc: "Same ramp, just swapped to the y axis — x and y behave identically until you deliberately choose to treat them differently.",
    uniforms: [],
  },

  {
    id: 5,
    group: "foundations",
    title: "Pattern 5 — Inverted Gradient",
    time: "17:35",
    glsl: "float strength = 1.0 - vUv.y;",
    desc: "Subtracting a value from 1.0 flips its direction. Any gradient here can be reversed with this one move.",
    uniforms: [],
  },

  {
    id: 6,
    group: "foundations",
    title: "Pattern 6 — Squeezed Gradient",
    time: "18:18",
    glsl: "float strength = vUv.y * uMult;",
    desc: 'Multiplying a 0–1 value stretches it. At higher multipliers the ramp hits white almost immediately and the rest of the plane just clips — multiplication compresses the "interesting" part of a gradient into a smaller slice of space.',
    uniforms: [
      {
        key: "uMult",
        label: "Multiplier",
        min: 1,
        max: 30,
        step: 0.5,
        def: 10,
      },
    ],
  },

  {
    id: 7,
    group: "foundations",
    title: "Pattern 7 — Repeating Gradient",
    time: "19:23",
    glsl: "float strength = mod(vUv.y * uFreq, 1.0);",
    desc: "mod() wraps a value back to 0 the instant it passes 1, so a multiplied gradient repeats instead of clipping to white. The multiplier is now a frequency — how many repeats fit across the plane.",
    uniforms: [
      { key: "uFreq", label: "Frequency", min: 1, max: 30, step: 0.5, def: 10 },
    ],
  },

  {
    id: 8,
    group: "steps",
    title: "Pattern 8 — Threshold Bars",
    time: "21:45",
    glsl: "float strength = step(uEdge, mod(vUv.y * uFreq, 1.0));",
    desc: "step(edge, value) is a hard threshold: below edge → 0, above → 1, nothing in between. Applied to a repeating gradient it turns smooth stripes into flat bars.",
    uniforms: [
      { key: "uEdge", label: "Edge", min: 0, max: 1, step: 0.01, def: 0.5 },
      { key: "uFreq", label: "Frequency", min: 1, max: 30, step: 0.5, def: 10 },
    ],
  },

  {
    id: 9,
    group: "steps",
    title: "Pattern 9 — Thinner Bars",
    time: "25:04",
    glsl: "float strength = step(uEdge, mod(vUv.y * uFreq, 1.0));",
    desc: "Same threshold, edge raised closer to 1. Less of each repeat clears the bar, so the white stripes get visibly thinner — edge position directly controls duty cycle.",
    uniforms: [
      { key: "uEdge", label: "Edge", min: 0, max: 1, step: 0.01, def: 0.8 },
      { key: "uFreq", label: "Frequency", min: 1, max: 30, step: 0.5, def: 10 },
    ],
  },

  {
    id: 10,
    group: "steps",
    title: "Pattern 10 — Bars on X",
    time: "25:54",
    glsl: "float strength = step(uEdge, mod(vUv.x * uFreq, 1.0));",
    desc: "Identical step+mod threshold, just wired to vUv.x instead of vUv.y — the same math rotated 90°.",
    uniforms: [
      { key: "uEdge", label: "Edge", min: 0, max: 1, step: 0.01, def: 0.8 },
      { key: "uFreq", label: "Frequency", min: 1, max: 30, step: 0.5, def: 10 },
    ],
  },

  {
    id: 11,
    group: "steps",
    title: "Pattern 11 — Bars Added",
    time: "26:15",
    glsl: "float strength = step(uEdgeX, mod(vUv.x * uFreq, 1.0));\nstrength += step(uEdgeY, mod(vUv.y * uFreq, 1.0));",
    desc: "Adding two independent bar fields can push values above 1.0 where they overlap — the code clamps that afterward. Addition is how you combine two effects without either one masking the other.",
    uniforms: [
      { key: "uEdgeX", label: "Edge X", min: 0, max: 1, step: 0.01, def: 0.8 },
      { key: "uEdgeY", label: "Edge Y", min: 0, max: 1, step: 0.01, def: 0.8 },
      { key: "uFreq", label: "Frequency", min: 1, max: 30, step: 0.5, def: 10 },
    ],
  },

  {
    id: 12,
    group: "steps",
    title: "Pattern 12 — Bars Multiplied",
    time: "28:17",
    glsl: "float strength = step(uEdgeX, mod(vUv.x * uFreq, 1.0));\nstrength *= step(uEdgeY, mod(vUv.y * uFreq, 1.0));",
    desc: "Multiplying two 0/1 bar fields keeps only where both are 1 — multiplication acts like a logical AND between two masks. The result is a grid of dots instead of a plus-shaped weave.",
    uniforms: [
      { key: "uEdgeX", label: "Edge X", min: 0, max: 1, step: 0.01, def: 0.8 },
      { key: "uEdgeY", label: "Edge Y", min: 0, max: 1, step: 0.01, def: 0.8 },
      { key: "uFreq", label: "Frequency", min: 1, max: 30, step: 0.5, def: 10 },
    ],
  },

  {
    id: 13,
    group: "steps",
    title: "Pattern 13 — Mismatched Edges",
    time: "29:03",
    glsl: "float strength = step(uEdgeX, mod(vUv.x * uFreq, 1.0));\nstrength *= step(uEdgeY, mod(vUv.y * uFreq, 1.0));",
    desc: "Same AND-intersection trick, but with a lower edge on x than y — the grid cells stop being square once the two axes are no longer symmetric.",
    uniforms: [
      { key: "uEdgeX", label: "Edge X", min: 0, max: 1, step: 0.01, def: 0.4 },
      { key: "uEdgeY", label: "Edge Y", min: 0, max: 1, step: 0.01, def: 0.8 },
      { key: "uFreq", label: "Frequency", min: 1, max: 30, step: 0.5, def: 10 },
    ],
  },

  {
    id: 14,
    group: "steps",
    title: "Pattern 14 — Woven Bars",
    time: "30:13",
    glsl: "float barX = step(uEdgeX1, mod(vUv.x * uFreq, 1.0)) * step(uEdgeY1, mod(vUv.y * uFreq, 1.0));\nfloat barY = step(uEdgeX2, mod(vUv.x * uFreq, 1.0)) * step(uEdgeY2, mod(vUv.y * uFreq, 1.0));\nfloat strength = barX + barY;",
    desc: "Two intersection patterns with swapped edge pairs, then added — each is thin one way and thick the other, so together they weave into a checker-like pattern out of nothing but step() and multiplication.",
    uniforms: [
      {
        key: "uEdgeX1",
        label: "Bar X1 edge",
        min: 0,
        max: 1,
        step: 0.01,
        def: 0.4,
      },
      {
        key: "uEdgeY1",
        label: "Bar Y1 edge",
        min: 0,
        max: 1,
        step: 0.01,
        def: 0.8,
      },
      {
        key: "uEdgeX2",
        label: "Bar X2 edge",
        min: 0,
        max: 1,
        step: 0.01,
        def: 0.8,
      },
      {
        key: "uEdgeY2",
        label: "Bar Y2 edge",
        min: 0,
        max: 1,
        step: 0.01,
        def: 0.4,
      },
      { key: "uFreq", label: "Frequency", min: 1, max: 30, step: 0.5, def: 10 },
    ],
  },

  {
    id: 15,
    group: "steps",
    title: "Pattern 15 — Offset Weave (Brick)",
    time: "33:08",
    glsl: "float barX = step(uEdgeX1, mod(vUv.x * uFreq - uOffset, 1.0)) * step(uEdgeY1, mod(vUv.y * uFreq, 1.0));\nfloat barY = step(uEdgeX2, mod(vUv.x * uFreq, 1.0)) * step(uEdgeY2, mod(vUv.y * uFreq - uOffset, 1.0));\nfloat strength = barX + barY;",
    desc: "Subtracting a small offset before the mod() shifts each bar sideways along its own axis. Enough offset and the two weaves interlock into a brick-like pattern instead of a plain grid.",
    uniforms: [
      {
        key: "uOffset",
        label: "Offset",
        min: -0.5,
        max: 0.5,
        step: 0.01,
        def: 0.2,
      },
      {
        key: "uEdgeX1",
        label: "Bar X1 edge",
        min: 0,
        max: 1,
        step: 0.01,
        def: 0.4,
      },
      {
        key: "uEdgeY1",
        label: "Bar Y1 edge",
        min: 0,
        max: 1,
        step: 0.01,
        def: 0.8,
      },
      {
        key: "uEdgeX2",
        label: "Bar X2 edge",
        min: 0,
        max: 1,
        step: 0.01,
        def: 0.8,
      },
      {
        key: "uEdgeY2",
        label: "Bar Y2 edge",
        min: 0,
        max: 1,
        step: 0.01,
        def: 0.4,
      },
      { key: "uFreq", label: "Frequency", min: 1, max: 30, step: 0.5, def: 10 },
    ],
  },

  {
    id: 16,
    group: "squares",
    title: "Pattern 16 — Folded Gradient",
    time: "35:46",
    glsl: "float strength = abs(vUv.x - uCenter);",
    desc: "abs(x − center) folds the gradient in half around the center point, so it's brightest at both edges and darkest in the middle — negative distances get mirrored back into positive ones instead of clipping to black.",
    uniforms: [
      { key: "uCenter", label: "Center", min: 0, max: 1, step: 0.01, def: 0.5 },
    ],
  },

  {
    id: 17,
    group: "squares",
    title: "Pattern 17 — Min of Two Folds",
    time: "37:58",
    glsl: "float strength = min(abs(vUv.x - uCenter), abs(vUv.y - uCenter));",
    desc: "min() keeps whichever axis is currently closer to the center line. The darkest diagonal band forms exactly where the x-distance and y-distance cross over — min() always picks the smaller of two competing values.",
    uniforms: [
      { key: "uCenter", label: "Center", min: 0, max: 1, step: 0.01, def: 0.5 },
    ],
  },

  {
    id: 18,
    group: "squares",
    title: "Pattern 18 — Max of Two Folds",
    time: "39:55",
    glsl: "float strength = max(abs(vUv.x - uCenter), abs(vUv.y - uCenter));",
    desc: "max() instead of min() keeps the farther axis, which builds a diamond/square gradient instead of a soft X-shaped cross.",
    uniforms: [
      { key: "uCenter", label: "Center", min: 0, max: 1, step: 0.01, def: 0.5 },
    ],
  },

  {
    id: 19,
    group: "squares",
    title: "Pattern 19 — Square Outline",
    time: "40:36",
    glsl: "float strength = step(uEdge, max(abs(vUv.x - 0.5), abs(vUv.y - 0.5)));",
    desc: 'step() on top of the max() field turns the soft diamond gradient into a hard-edged square — this is literally the move that takes you from "gradient" to "shape."',
    uniforms: [
      { key: "uEdge", label: "Edge", min: 0, max: 0.5, step: 0.005, def: 0.2 },
    ],
  },

  {
    id: 20,
    group: "squares",
    title: "Pattern 20 — Square Ring",
    time: "42:10",
    glsl: "float strength = step(uEdge1, max(abs(vUv.x - 0.5), abs(vUv.y - 0.5)));\nstrength *= 1.0 - step(uEdge2, max(abs(vUv.x - 0.5), abs(vUv.y - 0.5)));",
    desc: "Multiplying a filled square by an inverted, slightly larger square keeps only the ring between the two edges — the standard way to draw an outline from two filled shapes.",
    uniforms: [
      {
        key: "uEdge1",
        label: "Inner edge",
        min: 0,
        max: 0.5,
        step: 0.005,
        def: 0.2,
      },
      {
        key: "uEdge2",
        label: "Outer edge",
        min: 0,
        max: 0.5,
        step: 0.005,
        def: 0.25,
      },
    ],
  },

  {
    id: 21,
    group: "squares",
    title: "Pattern 21 — Grid Steps",
    time: "44:47",
    glsl: "float strength = floor(vUv.x * uFreq) / uFreq;",
    desc: "floor() rounds down to the start of the current grid cell; dividing by the same frequency rescales that back into 0–1. This is exactly how continuous UV becomes discrete grid coordinates.",
    uniforms: [
      { key: "uFreq", label: "Cells", min: 2, max: 40, step: 1, def: 10 },
    ],
  },

  {
    id: 22,
    group: "squares",
    title: "Pattern 22 — Grid Product",
    time: "47:28",
    glsl: "float strength = floor(vUv.x * uFreq) / uFreq * floor(vUv.y * uFreq) / uFreq;",
    desc: "Multiplying the floored x-grid and y-grid together makes cells further from the bottom-left corner dimmer, since two smaller fractions multiplied shrink faster than either alone.",
    uniforms: [
      { key: "uFreq", label: "Cells", min: 2, max: 40, step: 1, def: 10 },
    ],
  },

  {
    id: 23,
    group: "random",
    title: "Pattern 23 — Pseudo-Random",
    time: "48:04",
    glsl: "float strength = random(vUv + vec2(uSeed));",
    desc: "GLSL has no random() built in, so this fakes it: a huge sine multiplication scrambles any tiny change in input into an unrelated-looking output. Drag the seed and the entire static field shifts — it's deterministic noise, not true randomness.",
    uniforms: [
      {
        key: "uSeed",
        label: "Seed offset",
        min: 0,
        max: 10,
        step: 0.05,
        def: 0,
      },
    ],
  },

  {
    id: 24,
    group: "random",
    title: "Pattern 24 — Grid Noise",
    time: "50:57",
    glsl: "vec2 gridUv = vec2(floor(vUv.x * uFreq) / uFreq, floor(vUv.y * uFreq) / uFreq);\nfloat strength = random(gridUv);",
    desc: "Feeding random() the floored grid coordinates instead of raw UV gives every pixel inside one cell the exact same value — this is how you get blocky per-cell static instead of per-pixel noise.",
    uniforms: [
      { key: "uFreq", label: "Cells", min: 2, max: 40, step: 1, def: 10 },
    ],
  },

  {
    id: 25,
    group: "random",
    title: "Pattern 25 — Tilted Grid Noise",
    time: "53:20",
    glsl: "vec2 gridUv = vec2(floor(vUv.x * uFreq) / uFreq, floor((vUv.y + vUv.x * uTilt) * uFreq) / uFreq);\nfloat strength = random(gridUv);",
    desc: "Adding a fraction of x into the y coordinate before flooring skews the whole grid diagonally — the same trick used to fake wind-blown or perspective-sheared grids.",
    uniforms: [
      { key: "uFreq", label: "Cells", min: 2, max: 40, step: 1, def: 10 },
      { key: "uTilt", label: "Tilt", min: 0, max: 2, step: 0.05, def: 0.5 },
    ],
  },

  {
    id: 26,
    group: "radial",
    title: "Pattern 26 — Length From Corner",
    time: "55:23",
    glsl: "float strength = length(vUv);",
    desc: "length() measures distance from the UV origin — the bottom-left corner — so brightness radiates outward from that corner rather than the center of the plane.",
    uniforms: [],
  },

  {
    id: 27,
    group: "radial",
    title: "Pattern 27 — Distance From Center",
    time: "57:20",
    glsl: "float strength = distance(vUv, vec2(uCenter));",
    desc: "distance() to (center, center) recenters the same radiating gradient in the middle of the plane instead of the corner.",
    uniforms: [
      { key: "uCenter", label: "Center", min: 0, max: 1, step: 0.01, def: 0.5 },
    ],
  },

  {
    id: 28,
    group: "radial",
    title: "Pattern 28 — Inverted Radial",
    time: "59:58",
    glsl: "float strength = 1.0 - distance(vUv, vec2(uCenter));",
    desc: "Inverting the distance gradient makes the center bright and the edges dark — the same 1.0 minus trick from Pattern 5, just applied radially.",
    uniforms: [
      { key: "uCenter", label: "Center", min: 0, max: 1, step: 0.01, def: 0.5 },
    ],
  },

  {
    id: 29,
    group: "radial",
    title: "Pattern 29 — Light Lens",
    time: "01:00:34",
    glsl: "float strength = uNumerator / distance(vUv, vec2(0.5));",
    desc: 'Dividing a small constant by distance creates a lens or glow: near distance 0 the result explodes toward white and falls off fast. This is the classic "light lens" formula — smaller numerators make a tighter, dimmer glow.',
    uniforms: [
      {
        key: "uNumerator",
        label: "Numerator",
        min: 0.001,
        max: 0.05,
        step: 0.001,
        def: 0.015,
      },
    ],
  },

  {
    id: 30,
    group: "radial",
    title: "Pattern 30 — Squeezed Lens",
    time: "01:02:55",
    glsl: "float strength = uNumerator / distance(vec2(vUv.x, (vUv.y - 0.5) * uSqueeze + 0.5), vec2(0.5));",
    desc: "Squeezing the y axis before measuring distance stretches the lens into an ellipse. Higher squeeze values make it thinner and taller.",
    uniforms: [
      {
        key: "uNumerator",
        label: "Numerator",
        min: 0.01,
        max: 0.3,
        step: 0.005,
        def: 0.15,
      },
      {
        key: "uSqueeze",
        label: "Squeeze",
        min: 1,
        max: 15,
        step: 0.25,
        def: 5,
      },
    ],
  },

  {
    id: 31,
    group: "radial",
    title: "Pattern 31 — Lens Cross / Star",
    time: "01:06:29",
    glsl: "float strength = uNumerator / distance(vec2(vUv.x, (vUv.y - 0.5) * uSqueeze + 0.5), vec2(0.5));\nstrength *= uNumerator / distance(vec2(vUv.y, (vUv.x - 0.5) * uSqueeze + 0.5), vec2(0.5));",
    desc: "Multiplying two perpendicular ellipse-lenses together keeps only the area where both are bright — this is how a four-pointed star emerges from two overlapping ellipses.",
    uniforms: [
      {
        key: "uNumerator",
        label: "Numerator",
        min: 0.01,
        max: 0.3,
        step: 0.005,
        def: 0.15,
      },
      {
        key: "uSqueeze",
        label: "Squeeze",
        min: 1,
        max: 15,
        step: 0.25,
        def: 5,
      },
    ],
  },

  {
    id: 32,
    group: "radial",
    title: "Pattern 32 — Rotated Star",
    time: "01:08:25",
    glsl: "vec2 rotatedUv = rotate(vUv, uRotation * PI / 180.0, vec2(0.5));\nfloat strength = uNumerator / distance(vec2(rotatedUv.x, (rotatedUv.y - 0.5) * uSqueeze + 0.5), vec2(0.5));\nstrength *= uNumerator / distance(vec2(rotatedUv.y, (rotatedUv.x - 0.5) * uSqueeze + 0.5), vec2(0.5));",
    desc: "Rotating the UV coordinates before applying the star formula spins the whole shape around its center. Rotation is nothing exotic here — it's just cos/sin applied to offset coordinates before everything else runs.",
    uniforms: [
      {
        key: "uRotation",
        label: "Rotation (°)",
        min: 0,
        max: 180,
        step: 1,
        def: 45,
      },
      {
        key: "uNumerator",
        label: "Numerator",
        min: 0.01,
        max: 0.3,
        step: 0.005,
        def: 0.15,
      },
      {
        key: "uSqueeze",
        label: "Squeeze",
        min: 1,
        max: 15,
        step: 0.25,
        def: 5,
      },
    ],
  },

  {
    id: 33,
    group: "radial",
    title: "Pattern 33 — Filled Disc",
    time: "01:15:16",
    glsl: "float strength = step(uEdge, distance(vUv, vec2(0.5)) + uRadius);",
    desc: "step() on a distance test is the cleanest way to draw a filled disc: inside the radius → one color, outside → another, with a knife-sharp edge and no gradient at all.",
    uniforms: [
      { key: "uEdge", label: "Edge", min: 0, max: 1, step: 0.01, def: 0.5 },
      {
        key: "uRadius",
        label: "Radius offset",
        min: 0,
        max: 0.5,
        step: 0.005,
        def: 0.25,
      },
    ],
  },

  {
    id: 34,
    group: "radial",
    title: "Pattern 34 — V-Shaped Valley",
    time: "01:16:34",
    glsl: "float strength = abs(distance(vUv, vec2(0.5)) - uRadius);",
    desc: "abs(distance − radius) hits zero exactly at the radius and grows in both directions from there — a V-shaped valley wrapped around a circle instead of a straight line.",
    uniforms: [
      {
        key: "uRadius",
        label: "Radius",
        min: 0,
        max: 0.5,
        step: 0.005,
        def: 0.25,
      },
    ],
  },

  {
    id: 35,
    group: "radial",
    title: "Pattern 35 — Ring Outline",
    time: "01:17:27",
    glsl: "float strength = step(uThickness, abs(distance(vUv, vec2(0.5)) - uRadius));",
    desc: "Thresholding that V-shaped valley with a small step() keeps only pixels very close to the radius — this is how a filled disc becomes a thin ring outline.",
    uniforms: [
      {
        key: "uThickness",
        label: "Thickness",
        min: 0,
        max: 0.1,
        step: 0.001,
        def: 0.02,
      },
      {
        key: "uRadius",
        label: "Radius",
        min: 0,
        max: 0.5,
        step: 0.005,
        def: 0.25,
      },
    ],
  },

  {
    id: 36,
    group: "radial",
    title: "Pattern 36 — Inverted Ring",
    time: "01:18:01",
    glsl: "float strength = 1.0 - step(uThickness, abs(distance(vUv, vec2(0.5)) - uRadius));",
    desc: "Inverting the ring swaps which side is bright — useful when you want the ring itself to glow instead of its surroundings.",
    uniforms: [
      {
        key: "uThickness",
        label: "Thickness",
        min: 0,
        max: 0.1,
        step: 0.001,
        def: 0.01,
      },
      {
        key: "uRadius",
        label: "Radius",
        min: 0,
        max: 0.5,
        step: 0.005,
        def: 0.25,
      },
    ],
  },

  {
    id: 37,
    group: "waves",
    title: "Pattern 37 — Wobbling Ring",
    time: "01:18:25",
    glsl: "vec2 wavedUv = vec2(vUv.x, vUv.y + sin(vUv.x * uWaveFreq) * uWaveAmp);\nfloat strength = 1.0 - step(uThickness, abs(distance(wavedUv, vec2(0.5)) - uRadius));",
    desc: "Adding a sine wave to the y coordinate before measuring distance makes the ring wobble along x. Frequency sets how many wobbles fit across the plane; amplitude sets how far each one pushes the ring off-circle.",
    uniforms: [
      {
        key: "uWaveFreq",
        label: "Wave frequency",
        min: 1,
        max: 80,
        step: 1,
        def: 30,
      },
      {
        key: "uWaveAmp",
        label: "Wave amplitude",
        min: 0,
        max: 0.3,
        step: 0.005,
        def: 0.1,
      },
      {
        key: "uThickness",
        label: "Thickness",
        min: 0,
        max: 0.1,
        step: 0.001,
        def: 0.01,
      },
      {
        key: "uRadius",
        label: "Radius",
        min: 0,
        max: 0.5,
        step: 0.005,
        def: 0.25,
      },
    ],
  },

  {
    id: 38,
    group: "waves",
    title: "Pattern 38 — Double-Axis Wobble",
    time: "01:21:07",
    glsl: "vec2 wavedUv = vec2(vUv.x + sin(vUv.y * uWaveFreq) * uWaveAmp, vUv.y + sin(vUv.x * uWaveFreq) * uWaveAmp);\nfloat strength = 1.0 - step(uThickness, abs(distance(wavedUv, vec2(0.5)) - uRadius));",
    desc: "The same sine distortion applied to both axes at once makes the ring ripple in two directions simultaneously — a more organic, less predictable wobble than the single-axis version.",
    uniforms: [
      {
        key: "uWaveFreq",
        label: "Wave frequency",
        min: 1,
        max: 200,
        step: 1,
        def: 100,
      },
      {
        key: "uWaveAmp",
        label: "Wave amplitude",
        min: 0,
        max: 0.3,
        step: 0.005,
        def: 0.1,
      },
      {
        key: "uThickness",
        label: "Thickness",
        min: 0,
        max: 0.1,
        step: 0.001,
        def: 0.01,
      },
      {
        key: "uRadius",
        label: "Radius",
        min: 0,
        max: 0.5,
        step: 0.005,
        def: 0.25,
      },
    ],
  },

  {
    id: 39,
    group: "waves",
    title: "Pattern 39 — Psychedelic Ripple",
    time: "01:21:36",
    glsl: "vec2 wavedUv = vec2(vUv.x + sin(vUv.y * uWaveFreq) * uWaveAmp, vUv.y + sin(vUv.x * uWaveFreq) * uWaveAmp);\nfloat strength = 1.0 - step(uThickness, abs(distance(wavedUv, vec2(0.5)) - uRadius));",
    desc: "Same exact formula as Pattern 38, just pushed to a much higher frequency by default — the gentle wobble turns into dense, overlapping ripples once it passes the point where the eye can track individual waves.",
    uniforms: [
      {
        key: "uWaveFreq",
        label: "Wave frequency",
        min: 1,
        max: 300,
        step: 1,
        def: 150,
      },
      {
        key: "uWaveAmp",
        label: "Wave amplitude",
        min: 0,
        max: 0.3,
        step: 0.005,
        def: 0.1,
      },
      {
        key: "uThickness",
        label: "Thickness",
        min: 0,
        max: 0.1,
        step: 0.001,
        def: 0.01,
      },
      {
        key: "uRadius",
        label: "Radius",
        min: 0,
        max: 0.5,
        step: 0.005,
        def: 0.25,
      },
    ],
  },

  {
    id: 40,
    group: "polar",
    title: "Pattern 40 — Raw Angle",
    time: "01:22:35",
    glsl: "float strength = atan(vUv.x, vUv.y);",
    desc: 'atan(x, y) returns the angle around the origin in radians. This is the move that turns a flat plane into something readable as "direction from a point" instead of just raw position — negative angles just clamp to black here.',
    uniforms: [],
  },

  {
    id: 41,
    group: "polar",
    title: "Pattern 41 — Centered Angle",
    time: "01:24:57",
    glsl: "float strength = atan(vUv.x - uCenter, vUv.y - uCenter);",
    desc: "Offsetting by center before taking the angle moves the pivot from the corner to the middle of the plane — almost always what you actually want for a radial effect.",
    uniforms: [
      { key: "uCenter", label: "Center", min: 0, max: 1, step: 0.01, def: 0.5 },
    ],
  },

  {
    id: 42,
    group: "polar",
    title: "Pattern 42 — Normalized Angle",
    time: "01:25:36",
    glsl: "float angle = atan(vUv.x - 0.5, vUv.y - 0.5);\nangle /= PI * 2.0;\nangle += 0.5;\nfloat strength = angle;",
    desc: "atan() returns −π to +π. Dividing by 2π and adding 0.5 rescales that into a clean 0–1 range — the normalization trick you'll reuse constantly when working with angles.",
    uniforms: [],
  },

  {
    id: 43,
    group: "polar",
    title: "Pattern 43 — Angular Spokes",
    time: "01:28:05",
    glsl: "float angle = atan(vUv.x - 0.5, vUv.y - 0.5) / (PI * 2.0) + 0.5;\nfloat strength = mod(angle * uFreq, 1.0);",
    desc: "mod() on the normalized angle repeats it around the circle — the same repeating-gradient trick from Pattern 7, just laid along a curve instead of a straight line. This is how radial spokes get built.",
    uniforms: [
      { key: "uFreq", label: "Spoke count", min: 1, max: 60, step: 1, def: 20 },
    ],
  },

  {
    id: 44,
    group: "polar",
    title: "Pattern 44 — Soft Spokes",
    time: "01:29:47",
    glsl: "float angle = atan(vUv.x - 0.5, vUv.y - 0.5) / (PI * 2.0) + 0.5;\nfloat strength = sin(angle * uFreq);",
    desc: "sin() on the angle instead of mod() gives smooth spokes rather than hard-edged ones — same idea, softer transition between light and dark.",
    uniforms: [
      {
        key: "uFreq",
        label: "Spoke count",
        min: 10,
        max: 300,
        step: 1,
        def: 100,
      },
    ],
  },

  {
    id: 45,
    group: "polar",
    title: "Pattern 45 — Flower Ring",
    time: "01:31:17",
    glsl: "float angle = atan(vUv.x - 0.5, vUv.y - 0.5) / (PI * 2.0) + 0.5;\nfloat radius = uBaseRadius + sin(angle * uFreq) * uAmp;\nfloat strength = 1.0 - step(uThickness, abs(distance(vUv, vec2(0.5)) - radius));",
    desc: "Feeding the sine-of-angle value into a ring's radius makes the ring's edge wobble as you travel around it — a gear or flower shape emerges from what started as a plain circle formula.",
    uniforms: [
      {
        key: "uBaseRadius",
        label: "Base radius",
        min: 0,
        max: 0.5,
        step: 0.005,
        def: 0.25,
      },
      {
        key: "uFreq",
        label: "Petal count",
        min: 10,
        max: 300,
        step: 1,
        def: 100,
      },
      {
        key: "uAmp",
        label: "Petal depth",
        min: 0,
        max: 0.1,
        step: 0.002,
        def: 0.02,
      },
      {
        key: "uThickness",
        label: "Thickness",
        min: 0,
        max: 0.05,
        step: 0.001,
        def: 0.01,
      },
    ],
  },

  {
    id: 46,
    group: "noise",
    title: "Pattern 46 — Perlin Noise",
    time: "01:34:05",
    glsl: "float strength = cnoise(vUv * uScale);",
    desc: "Perlin noise is smooth, continuous randomness — unlike the fract(sin()) trick from Pattern 23, neighboring pixels get similar values, which is what makes it read as organic instead of static. Scale controls how zoomed-in the pattern is.",
    uniforms: [
      { key: "uScale", label: "Scale", min: 1, max: 40, step: 0.5, def: 10 },
    ],
  },

  {
    id: 47,
    group: "noise",
    title: "Pattern 47 — Noise Blobs",
    time: "01:39:06",
    glsl: "float strength = step(uEdge, cnoise(vUv * uScale));",
    desc: "Thresholding Perlin noise with step() carves it into hard black/white blobs — a fast way to fake clouds or camouflage-like shapes.",
    uniforms: [
      { key: "uEdge", label: "Edge", min: -1, max: 1, step: 0.02, def: 0 },
      { key: "uScale", label: "Scale", min: 1, max: 40, step: 0.5, def: 10 },
    ],
  },

  {
    id: 48,
    group: "noise",
    title: "Pattern 48 — Noise Veins",
    time: "01:40:29",
    glsl: "float strength = 1.0 - abs(cnoise(vUv * uScale));",
    desc: "abs() folds the noise around zero, so both high and low noise values read as bright, leaving only the mid-range dark — this traces out vein-like lines through the noise field.",
    uniforms: [
      { key: "uScale", label: "Scale", min: 1, max: 40, step: 0.5, def: 10 },
    ],
  },

  {
    id: 49,
    group: "noise",
    title: "Pattern 49 — Contour Bands",
    time: "01:41:11",
    glsl: "float strength = sin(cnoise(vUv * uScale) * uFreq);",
    desc: "Running the noise through sin() turns smooth blobs into repeating contour-line bands, like a topographic map — the same repeat-via-periodic-function idea from the spoke patterns, applied to noise instead of angle.",
    uniforms: [
      { key: "uScale", label: "Scale", min: 1, max: 40, step: 0.5, def: 10 },
      {
        key: "uFreq",
        label: "Band frequency",
        min: 1,
        max: 60,
        step: 1,
        def: 20,
      },
    ],
  },

  {
    id: 50,
    group: "noise",
    title: "Pattern 50 — Marbled Lines",
    time: "01:42:10",
    glsl: "float strength = step(uThreshold, sin(cnoise(vUv * uScale) * uFreq));",
    desc: "Thresholding those sine contour bands keeps only a thin slice of them — this is how marbled or lightning-like line patterns get pulled out of a noise field.",
    uniforms: [
      {
        key: "uThreshold",
        label: "Threshold",
        min: -1,
        max: 1,
        step: 0.02,
        def: 0.9,
      },
      { key: "uScale", label: "Scale", min: 1, max: 40, step: 0.5, def: 10 },
      {
        key: "uFreq",
        label: "Band frequency",
        min: 1,
        max: 60,
        step: 1,
        def: 20,
      },
    ],
  },
];

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
