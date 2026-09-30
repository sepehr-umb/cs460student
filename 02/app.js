/**
 * XTK HYPERCUBE // 3D Psychedelic Visualizer & Perspective Lab
 * Computer Graphics CS460
 * 
 * An advanced WebGL cube art engine built with The X Toolkit (XTK),
 * featuring non-Euclidean 4D projections, Hitchcock vertigo dolly-zoom,
 * impossible Escher perspective alignments, matrix shearing, and audio-reactivity.
 */

(function () {
  'use strict';

  // ==========================================
  // CONFIGURATION & GLOBAL STATE
  // ==========================================
  var CONFIG = {
    numCubes: 360,
    baseSize: 10,
    cubeOpacity: 0.92,
    mode: 'tesseract', // 'tesseract', 'swarm', 'wave', 'escher', 'kaleidoscope', 'meteor'
    palette: 'cyberpunk', // 'cyberpunk', 'acid', 'synthwave', 'aurora', 'magma', 'rainbow'
    animating: true,
    speed: 1.0,
    
    // Perspective Tricks
    trick: 'none', // 'none', 'vertigo', 'roll', 'shear', 'impossibleLock'
    vertigoIntensity: 0.85,
    vertigoSpeed: 1.2,
    rollSpeed: 0.6,
    shearAmount: 0.45,
    
    // Rotation & Wave
    rotSpeedX: 0.35,
    rotSpeedY: 0.5,
    rotSpeedZ: 0.2,
    waveAmplitude: 38,
    waveFreq: 0.045,
    swarmRadius: 155,
    tesseractSpeed: 1.1,
    
    // Audio
    soundEnabled: false,
    soundVolume: 0.28,

    // UI
    showHUD: true
  };

  // PALETTES DEFINITIONS (RGB 0.0 to 1.0)
  var PALETTES = {
    cyberpunk: [
      [0.0, 0.94, 1.0],   // Cyan
      [1.0, 0.0, 0.47],   // Magenta
      [1.0, 0.9, 0.0],    // Yellow
      [0.6, 0.1, 1.0],    // Violet
      [0.0, 1.0, 0.6]     // Neon Mint
    ],
    acid: [
      [0.22, 1.0, 0.08],  // Toxic Lime
      [0.75, 0.0, 1.0],   // Acid Violet
      [1.0, 0.33, 0.0],   // Fluorescent Orange
      [0.0, 1.0, 0.9],    // Acid Cyan
      [1.0, 0.95, 0.1]    // Radiant Yellow
    ],
    synthwave: [
      [1.0, 0.16, 0.52],  // Retro Pink
      [0.02, 0.85, 0.91], // Neon Cyan
      [1.0, 0.72, 0.0],   // Sunset Gold
      [0.48, 0.12, 0.85], // Deep Purple
      [1.0, 0.4, 0.2]     // Orange Horizon
    ],
    aurora: [
      [0.0, 0.96, 0.83],  // Turquoise
      [0.44, 0.88, 0.0],  // Ghost Mint
      [0.62, 0.3, 1.0],   // Ethereal Lavender
      [0.1, 0.55, 1.0],   // Deep Sky
      [0.9, 0.8, 1.0]     // Starlight White
    ],
    magma: [
      [1.0, 0.05, 0.2],   // Flare Crimson
      [1.0, 0.45, 0.0],   // Molten Amber
      [1.0, 0.85, 0.0],   // Neon Gold
      [0.85, 0.15, 0.05], // Lava Red
      [1.0, 0.95, 0.7]    // Core Heat
    ],
    rainbow: [] // Calculated dynamically via HSV
  };

  var PALETTE_NAMES = ['cyberpunk', 'acid', 'synthwave', 'aurora', 'magma', 'rainbow'];

  // 4D HYPERCUBE MATHEMATICS
  // 16 4D Vertices (+-1, +-1, +-1, +-1)
  var TESS_VERTICES = [];
  for (var i0 = 0; i0 < 16; i0++) {
    TESS_VERTICES.push([
      (i0 & 1) ? 1 : -1,
      (i0 & 2) ? 1 : -1,
      (i0 & 4) ? 1 : -1,
      (i0 & 8) ? 1 : -1
    ]);
  }

  // 32 4D Edges (differ in exactly 1 bit)
  var TESS_EDGES = [];
  for (var a = 0; a < 16; a++) {
    for (var b = a + 1; b < 16; b++) {
      var diff = 0;
      for (var d = 0; d < 4; d++) {
        if (TESS_VERTICES[a][d] !== TESS_VERTICES[b][d]) diff++;
      }
      if (diff === 1) {
        TESS_EDGES.push([a, b]);
      }
    }
  }

  // GLOBAL SYSTEM INSTANCES
  var r = null;              // XTK Renderer
  var heroCube = null;       // Center Anchor Cube
  var cubes = [];            // Array of X.cube
  var cubeData = [];         // Simulation state per cube
  var clockTime = 0.0;       // Animation time
  var lastFrameTime = performance.now();
  var fpsCount = 0;
  var fpsTimer = performance.now();
  var currentFPS = 60;
  var audioSys = null;       // Generative Synthesizer
  var gui = null;            // dat.GUI

  // Camera baseline reference for perspective tricks
  var defaultCamPos = [0, 180, 260];
  var defaultCamFocus = [0, 0, 0];
  var defaultCamUp = [0, 1, 0];
  var vertigoDollyDist = 260;

  // ==========================================
  // GENERATIVE WEB AUDIO SYNTHESIZER
  // ==========================================
  function createAudioEngine() {
    var ctx = null;
    var masterGain = null;
    var bassOsc = null;
    var bassFilter = null;
    var padOscs = [];
    var padFilter = null;

    function init() {
      try {
        var AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        ctx = new AudioCtx();

        masterGain = ctx.createGain();
        masterGain.gain.setValueAtTime(CONFIG.soundEnabled ? CONFIG.soundVolume : 0, ctx.currentTime);
        masterGain.connect(ctx.destination);

        // Sub Bass Drone (55Hz - A1)
        bassOsc = ctx.createOscillator();
        bassOsc.type = 'sawtooth';
        bassOsc.frequency.setValueAtTime(55, ctx.currentTime);

        bassFilter = ctx.createBiquadFilter();
        bassFilter.type = 'lowpass';
        bassFilter.frequency.setValueAtTime(95, ctx.currentTime);
        bassFilter.Q.setValueAtTime(4.0, ctx.currentTime);

        bassOsc.connect(bassFilter);
        bassFilter.connect(masterGain);
        bassOsc.start();

        // Ethereal Chord Pad (Major 9th Cosmic Drone: D3, F#3, A3, C#4, E4)
        var chordNotes = [146.83, 185.00, 220.00, 277.18, 329.63];
        padFilter = ctx.createBiquadFilter();
        padFilter.type = 'bandpass';
        padFilter.frequency.setValueAtTime(440, ctx.currentTime);
        padFilter.Q.setValueAtTime(2.5, ctx.currentTime);
        padFilter.connect(masterGain);

        for (var p = 0; p < chordNotes.length; p++) {
          var osc = ctx.createOscillator();
          osc.type = (p % 2 === 0) ? 'sine' : 'triangle';
          osc.frequency.setValueAtTime(chordNotes[p] + (Math.random() - 0.5) * 0.8, ctx.currentTime);
          var g = ctx.createGain();
          g.gain.setValueAtTime(0.12, ctx.currentTime);
          osc.connect(g);
          g.connect(padFilter);
          osc.start();
          padOscs.push(osc);
        }
      } catch (err) {
        console.warn('Web Audio initialization error:', err);
      }
    }

    function setVolume(v) {
      if (!ctx || !masterGain) return;
      CONFIG.soundVolume = v;
      if (CONFIG.soundEnabled) {
        masterGain.gain.setTargetAtTime(v, ctx.currentTime, 0.05);
      }
    }

    function toggle(enable) {
      if (typeof enable !== 'undefined') CONFIG.soundEnabled = enable;
      else CONFIG.soundEnabled = !CONFIG.soundEnabled;

      if (!ctx) init();
      if (ctx && ctx.state === 'suspended') ctx.resume();

      if (masterGain && ctx) {
        var target = CONFIG.soundEnabled ? CONFIG.soundVolume : 0.0;
        masterGain.gain.setTargetAtTime(target, ctx.currentTime, 0.05);
      }

      var indicator = document.getElementById('sound-indicator');
      var label = document.getElementById('sound-label');
      if (indicator && label) {
        if (CONFIG.soundEnabled) {
          indicator.classList.remove('muted');
          label.textContent = 'SOUND: ON';
        } else {
          indicator.classList.add('muted');
          label.textContent = 'SOUND: OFF';
        }
      }
      return CONFIG.soundEnabled;
    }

    // Interactive SFX: Resonant Chime
    function playChime(freq) {
      if (!ctx || !CONFIG.soundEnabled) return;
      try {
        var now = ctx.currentTime;
        var osc = ctx.createOscillator();
        var g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq || 523.25, now);
        osc.frequency.exponentialRampToValueAtTime((freq || 523.25) * 1.5, now + 0.3);

        g.gain.setValueAtTime(CONFIG.soundVolume * 0.45, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

        osc.connect(g);
        g.connect(masterGain);
        osc.start(now);
        osc.stop(now + 0.55);
      } catch (e) {}
    }

    // Interactive SFX: Nova Blast Sub Drop
    function playNova() {
      if (!ctx || !CONFIG.soundEnabled) return;
      try {
        var now = ctx.currentTime;
        var osc = ctx.createOscillator();
        var g = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(32, now + 0.7);

        g.gain.setValueAtTime(CONFIG.soundVolume * 0.7, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.75);

        osc.connect(g);
        g.connect(masterGain);
        osc.start(now);
        osc.stop(now + 0.8);
      } catch (e) {}
    }

    // Audio-visual update hook
    function update(t) {
      if (!ctx || !CONFIG.soundEnabled || !padFilter) return;
      // Gently sweep filter cutoff with the visuals
      var cutoff = 380 + Math.sin(t * 1.5) * 260 + Math.cos(t * 0.7) * 150;
      padFilter.frequency.setTargetAtTime(Math.max(120, cutoff), ctx.currentTime, 0.1);
    }

    return {
      init: init,
      toggle: toggle,
      setVolume: setVolume,
      playChime: playChime,
      playNova: playNova,
      update: update
    };
  }

  // ==========================================
  // COLOR UTILITIES
  // ==========================================
  function hsvToRgb(h, s, v) {
    var r, g, b;
    var i = Math.floor(h * 6);
    var f = h * 6 - i;
    var p = v * (1 - s);
    var q = v * (1 - f * s);
    var t = v * (1 - (1 - f) * s);
    switch (i % 6) {
      case 0: r = v; g = t; b = p; break;
      case 1: r = q; g = v; b = p; break;
      case 2: r = p; g = v; b = t; break;
      case 3: r = p; g = q; b = v; break;
      case 4: r = t; g = p; b = v; break;
      case 5: r = v; g = p; b = q; break;
    }
    return [r, g, b];
  }

  function getPaletteColor(paletteName, factor, index, total) {
    if (paletteName === 'rainbow') {
      var hue = (factor * 0.6 + (index / total) * 0.8) % 1.0;
      return hsvToRgb(hue, 0.95, 1.0);
    }

    var colors = PALETTES[paletteName] || PALETTES.cyberpunk;
    var len = colors.length;
    var idx = (index + Math.floor(factor * len)) % len;
    if (idx < 0) idx += len;
    return colors[idx];
  }

  // ==========================================
  // FAST 4x4 MATRIX COMPOSITION
  // ==========================================
  /**
   * Applies 3D rotation, scaling, and translation directly into
   * XTK's internal Float32Array column-major transformation matrix.
   */
  function applyTransform(cube, x, y, z, rx, ry, rz, scale) {
    var m = cube.transform.matrix;
    var cx = Math.cos(rx), sx = Math.sin(rx);
    var cy = Math.cos(ry), sy = Math.sin(ry);
    var cz = Math.cos(rz), sz = Math.sin(rz);

    // Column 0
    m[0] = (cy * cz) * scale;
    m[1] = (cy * sz) * scale;
    m[2] = (-sy) * scale;
    m[3] = 0;

    // Column 1
    m[4] = (sx * sy * cz - cx * sz) * scale;
    m[5] = (sx * sy * sz + cx * cz) * scale;
    m[6] = (sx * cy) * scale;
    m[7] = 0;

    // Column 2
    m[8] = (cx * sy * cz + sx * sz) * scale;
    m[9] = (cx * sy * sz - sx * cz) * scale;
    m[10] = (cx * cy) * scale;
    m[11] = 0;

    // Column 3 (World Translation)
    m[12] = x;
    m[13] = y;
    m[14] = z;
    m[15] = 1;
  }

  // ==========================================
  // VISUAL ART MODE GENERATORS
  // ==========================================

  /**
   * MODE 1: 4D HYPERCUBE / TESSERACT FOLD
   * Real 4D-to-3D perspective projection with 4D rotations in XW, YW, and ZW planes.
   * Produces the non-Euclidean illusion of cells turning inside out!
   */
  function updateTesseract(t) {
    var alpha = t * 0.8 * CONFIG.tesseractSpeed;
    var beta  = t * 0.5 * CONFIG.tesseractSpeed;
    var gamma = t * 0.3 * CONFIG.tesseractSpeed;

    var cosA = Math.cos(alpha), sinA = Math.sin(alpha);
    var cosB = Math.cos(beta),  sinB = Math.sin(beta);
    var cosG = Math.cos(gamma), sinG = Math.sin(gamma);

    // Rotate and project 4D points to 3D
    function project4D(p4) {
      var x = p4[0], y = p4[1], z = p4[2], w = p4[3];

      // X-W Plane Rotation
      var x1 = x * cosA - w * sinA;
      var w1 = x * sinA + w * cosA;

      // Y-W Plane Rotation
      var y2 = y * cosB - w1 * sinB;
      var w2 = y * sinB + w1 * cosB;

      // Z-W Plane Rotation
      var z3 = z * cosG - w2 * sinG;
      var w3 = z * sinG + w2 * cosG;

      // 4D Perspective Projection into 3D
      var d4 = 2.45; // 4D focal distance
      var pFactor = d4 / Math.max(0.2, (d4 - w3));
      var scale = 80;

      return {
        x: x1 * pFactor * scale,
        y: y2 * pFactor * scale,
        z: z3 * pFactor * scale,
        w: w3,
        scale: Math.max(0.35, pFactor * 0.95)
      };
    }

    // Pre-calculate 16 3D projected vertices
    var projVerts = [];
    for (var v = 0; v < 16; v++) {
      projVerts.push(project4D(TESS_VERTICES[v]));
    }

    var numEdges = TESS_EDGES.length; // 32
    var edgeCubesCount = Math.floor(CONFIG.numCubes * 0.75); // ~270 cubes along edges

    for (var i = 0; i < CONFIG.numCubes; i++) {
      var cube = cubes[i];
      var d = cubeData[i];

      var px, py, pz, pScale, rotAngle;

      if (i < 16) {
        // Vertex Cubes
        var vert = projVerts[i];
        px = vert.x;
        py = vert.y;
        pz = vert.z;
        pScale = vert.scale * 1.5;
        rotAngle = t * 1.2 + i;
      } else if (i < edgeCubesCount + 16) {
        // Interpolated Edge Cubes
        var edgeIdx = (i - 16) % numEdges;
        var edge = TESS_EDGES[edgeIdx];
        var v0 = projVerts[edge[0]];
        var v1 = projVerts[edge[1]];
        var interp = ((i - 16) / edgeCubesCount);
        // Sinusoidal distribution along edge
        var factor = (Math.sin(interp * Math.PI * 4 + t * 2) * 0.5 + 0.5);

        px = v0.x + (v1.x - v0.x) * factor;
        py = v0.y + (v1.y - v0.y) * factor;
        pz = v0.z + (v1.z - v0.z) * factor;
        pScale = (v0.scale + v1.scale) * 0.5 * 0.75;
        rotAngle = t * 0.8 + interp * 6.28;
      } else {
        // Core orbiting satellites
        var theta = t * 1.5 + (i * 0.18);
        var phi = t * 0.8 + (i * 0.12);
        var rOrbit = 35 + Math.sin(t * 3 + i) * 15;

        px = rOrbit * Math.sin(theta) * Math.cos(phi);
        py = rOrbit * Math.sin(theta) * Math.sin(phi);
        pz = rOrbit * Math.cos(theta);
        pScale = 0.8 + Math.sin(t * 4 + i) * 0.3;
        rotAngle = t * 2 + i;
      }

      applyTransform(cube, px, py, pz, rotAngle * 0.5, rotAngle * 0.7, rotAngle * 0.3, pScale);

      // Color based on 4D distance
      var color = getPaletteColor(CONFIG.palette, t * 0.3 + (pz * 0.005), i, CONFIG.numCubes);
      cube.color = color;
    }
  }

  /**
   * MODE 2: QUANTUM SWARM & BLACK HOLE VORTEX
   * Flying cubes in multi-dimensional Lissajous curves with gravitational attractor physics.
   */
  function updateSwarm(t) {
    var radius = CONFIG.swarmRadius;

    for (var i = 0; i < CONFIG.numCubes; i++) {
      var cube = cubes[i];
      var d = cubeData[i];

      // Lissajous 3D harmonics + Trefoil knot
      var u = t * 0.7 * d.freq + d.phase;
      var v = t * 0.5 * d.freq + d.phase * 1.5;

      var lx = Math.sin(u) + 2 * Math.sin(2 * u);
      var ly = Math.cos(u) - 2 * Math.cos(2 * u);
      var lz = -Math.sin(3 * u);

      var scaleR = (d.radius / 100) * radius;
      var px = lx * scaleR * 0.45;
      var py = ly * scaleR * 0.45;
      var pz = lz * scaleR * 0.45;

      // Add a dynamic breathing vortex twist
      var twist = Math.sin(t * 1.8 + d.phase) * 20;
      px += Math.cos(v) * twist;
      pz += Math.sin(v) * twist;

      // Handle custom user blast velocities (damping)
      d.vx *= 0.94;
      d.vy *= 0.94;
      d.vz *= 0.94;
      px += d.vx;
      py += d.vy;
      pz += d.vz;

      // Cube self-rotation
      d.rx += d.vrx * 4;
      d.ry += d.vry * 4;
      d.rz += d.vrz * 4;

      var scale = (0.7 + Math.sin(t * 2 + d.phase) * 0.3) * (CONFIG.baseSize / 10);
      applyTransform(cube, px, py, pz, d.rx, d.ry, d.rz, scale);

      // Trailing spectrum coloring
      var speedMag = Math.sqrt(px * px + py * py + pz * pz) / radius;
      var color = getPaletteColor(CONFIG.palette, t * 0.4 + speedMag, i, CONFIG.numCubes);
      cube.color = color;
    }
  }

  /**
   * MODE 3: PSYCHEDELIC SINE WAVE MATRIX
   * 19x19 grid of oscillating cubes with wave slope orientation and ripple crests.
   */
  function updateWave(t) {
    var gridSize = 19;
    var spacing = 16.5;
    var amp = CONFIG.waveAmplitude;
    var freq = CONFIG.waveFreq;

    for (var i = 0; i < CONFIG.numCubes; i++) {
      var cube = cubes[i];
      var u = i % gridSize;
      var v = Math.floor(i / gridSize);

      if (v >= gridSize) {
        // Floating ambient particles above the terrain
        var pTheta = t * 2 + i;
        applyTransform(cube, Math.cos(pTheta) * 160, 60 + Math.sin(t * 3 + i) * 30, Math.sin(pTheta) * 160, t, t * 1.3, 0, 0.6);
        continue;
      }

      var x = (u - (gridSize - 1) / 2) * spacing;
      var z = (v - (gridSize - 1) / 2) * spacing;
      var rDist = Math.sqrt(x * x + z * z);

      // Multi-octave ripple interference
      var y = Math.sin(rDist * freq - t * 3.5) * amp
            + Math.cos(x * 0.035 + t * 2.2) * Math.sin(z * 0.035 + t * 1.8) * (amp * 0.6)
            + Math.sin((x + z) * 0.02 - t * 2.8) * (amp * 0.4);

      // Calculate slopes for wave surface alignment
      var delta = 0.5;
      var yX = Math.sin((rDist + delta) * freq - t * 3.5) * amp;
      var yZ = Math.cos((x + delta) * 0.035 + t * 2.2) * Math.sin(z * 0.035 + t * 1.8) * (amp * 0.6);
      var rotZ = (yX - y) * 0.08;
      var rotX = -(yZ - y) * 0.08;
      var rotY = t * 0.4 + (u * 0.1);

      // Dynamic scale: crests expand, troughs compress
      var normH = (y + amp * 2) / (amp * 4);
      var scale = (0.55 + normH * 0.75) * (CONFIG.baseSize / 10);

      applyTransform(cube, x, y, z, rotX, rotY, rotZ, scale);

      // Color mapping: Heights glow hot, troughs plunge dark
      var color = getPaletteColor(CONFIG.palette, normH * 1.4 + t * 0.2, i, CONFIG.numCubes);
      cube.color = color;
    }
  }

  /**
   * MODE 4: ESCHER'S IMPOSSIBLE STAIRCASE & FORCED PERSPECTIVE
   * Stepped closed polygon loop with impossible depth foreshortening.
   */
  function updateEscher(t) {
    var numSteps = 48;
    var sideLen = 12; // 4 sides of 12 steps each
    var stepSize = 13.5;
    var stepHeight = 4.2;

    for (var i = 0; i < CONFIG.numCubes; i++) {
      var cube = cubes[i];
      var d = cubeData[i];

      if (i < numSteps) {
        var side = Math.floor(i / sideLen);
        var sIndex = i % sideLen;
        var h = i * stepHeight - 100;

        var sx = 0, sz = 0;
        var half = (sideLen * stepSize) / 2;

        if (side === 0) { // Moving +X
          sx = -half + sIndex * stepSize;
          sz = -half;
        } else if (side === 1) { // Moving +Z
          sx = half;
          sz = -half + sIndex * stepSize;
        } else if (side === 2) { // Moving -X
          sx = half - sIndex * stepSize;
          sz = half;
        } else if (side === 3) { // Moving -Z
          sx = -half;
          sz = half - sIndex * stepSize;
        }

        // Runner light pulse
        var runner = (Math.floor(t * 16) % numSteps);
        var isRunner = (i === runner);
        var scale = isRunner ? 1.8 : 1.1;

        applyTransform(cube, sx, h, sz, 0, (side * Math.PI / 2), 0, scale);

        if (isRunner) {
          cube.color = [1.0, 1.0, 1.0]; // Bright white flash
        } else {
          cube.color = getPaletteColor(CONFIG.palette, (i / numSteps) + t * 0.2, i, CONFIG.numCubes);
        }
      } else {
        // Floating impossible illusion shards in background
        var orbitIdx = i - numSteps;
        var oTheta = t * 0.6 + orbitIdx * 0.15;
        var oRadius = 140 + Math.sin(t * 1.5 + orbitIdx) * 30;
        var oy = Math.sin(t * 2 + orbitIdx * 0.3) * 70;

        applyTransform(
          cube,
          Math.cos(oTheta) * oRadius,
          oy,
          Math.sin(oTheta) * oRadius,
          t * 1.2 + orbitIdx,
          t * 0.9,
          t * 0.5,
          0.65
        );
        cube.color = getPaletteColor(CONFIG.palette, t * 0.3 + (orbitIdx * 0.05), i, CONFIG.numCubes);
      }
    }
  }

  /**
   * MODE 5: KALEIDO-OCTAHEDRON MANDALA
   * Concentric Platonic shells counter-rotating around golden-ratio axes.
   */
  function updateKaleidoscope(t) {
    var shells = 6;
    var perShell = Math.floor(CONFIG.numCubes / shells);

    for (var i = 0; i < CONFIG.numCubes; i++) {
      var cube = cubes[i];
      var s = Math.floor(i / perShell);
      var idx = i % perShell;

      var radius = (s + 1) * 28;
      var dir = (s % 2 === 0) ? 1 : -1;
      var rotSpeed = (0.5 + s * 0.18) * dir;

      // Distribute points on spherical shell using golden spiral
      var phi = Math.acos(1 - 2 * (idx + 0.5) / perShell);
      var theta = Math.PI * (1 + Math.sqrt(5)) * idx + (t * rotSpeed);

      var px = radius * Math.sin(phi) * Math.cos(theta);
      var py = radius * Math.sin(phi) * Math.sin(theta);
      var pz = radius * Math.cos(phi);

      // Kaleidoscopic pulsing
      var pulse = Math.sin(t * 3.5 + s * 1.2) * 6;
      px += (px / radius) * pulse;
      py += (py / radius) * pulse;
      pz += (pz / radius) * pulse;

      var scale = (0.7 + (s / shells) * 0.6) * (CONFIG.baseSize / 10);
      applyTransform(cube, px, py, pz, t * rotSpeed, t * 1.4, phi, scale);

      var color = getPaletteColor(CONFIG.palette, (s / shells) + t * 0.25, i, CONFIG.numCubes);
      cube.color = color;
    }
  }

  /**
   * MODE 6: CHAOS METEOR STORM & CUBE BLASTER
   * Full velocity integration, boundary bouncing, and hypersonic flight.
   */
  function updateMeteor(t, dt) {
    var maxBound = 220;

    for (var i = 0; i < CONFIG.numCubes; i++) {
      var cube = cubes[i];
      var d = cubeData[i];

      // Integrate velocity
      d.x += d.vx * dt * 60;
      d.y += d.vy * dt * 60;
      d.z += d.vz * dt * 60;

      // Add gentle cosmic wind
      d.vz -= dt * 15;

      // Bounding sphere bounce & wrap
      var dist = Math.sqrt(d.x * d.x + d.y * d.y + d.z * d.z);
      if (dist > maxBound) {
        d.vx = -d.vx * 0.85;
        d.vy = -d.vy * 0.85;
        d.vz = -d.vz * 0.85;
        d.x = (d.x / dist) * (maxBound - 2);
        d.y = (d.y / dist) * (maxBound - 2);
        d.z = (d.z / dist) * (maxBound - 2);
      }

      // Air resistance damping
      d.vx *= 0.992;
      d.vy *= 0.992;
      d.vz *= 0.992;

      // Self tumbling
      d.rx += d.vrx * 5;
      d.ry += d.vry * 5;
      d.rz += d.vrz * 5;

      var velMag = Math.sqrt(d.vx * d.vx + d.vy * d.vy + d.vz * d.vz);
      var scale = (0.7 + Math.min(1.2, velMag * 0.15)) * (CONFIG.baseSize / 10);

      applyTransform(cube, d.x, d.y, d.z, d.rx, d.ry, d.rz, scale);

      var color = getPaletteColor(CONFIG.palette, (velMag * 0.2) + t * 0.3, i, CONFIG.numCubes);
      cube.color = color;
    }
  }

  // ==========================================
  // WEIRD 3D PERSPECTIVE TRICKS SYSTEM
  // ==========================================

  /**
   * Applies active optical perspective distortions directly to XTK's camera.
   */
  function applyPerspectiveTricks(t, dt) {
    if (!r || !r.camera) return;

    var trick = CONFIG.trick;
    var cam = r.camera;

    // 1. VERTIGO DOLLY-ZOOM ILLUSION
    if (trick === 'vertigo') {
      var vPhase = Math.sin(t * CONFIG.vertigoSpeed);
      // Oscillate distance: 120 (close) to 380 (far)
      vertigoDollyDist = 240 + vPhase * (130 * CONFIG.vertigoIntensity);

      // Normalize camera direction vector
      var cx = cam.position[0] - cam.focus[0];
      var cy = cam.position[1] - cam.focus[1];
      var cz = cam.position[2] - cam.focus[2];
      var cLen = Math.sqrt(cx * cx + cy * cy + cz * cz) || 1.0;

      // Reposition along gaze axis
      cam.position = [
        cam.focus[0] + (cx / cLen) * vertigoDollyDist,
        cam.focus[1] + (cy / cLen) * vertigoDollyDist,
        cam.focus[2] + (cz / cLen) * vertigoDollyDist
      ];

      // Inversely scale the hero cube so it maintains CONSTANT perceived screen width
      // while the entire universe expands or contracts behind it!
      if (heroCube) {
        var perceivedCompensation = vertigoDollyDist / 240;
        heroCube.lengthX = heroCube.lengthY = heroCube.lengthZ = 22 * perceivedCompensation;
        heroCube.color = [1.0, 0.0, 0.5]; // Glowing pink anchor
      }

      // Update HUD warp indicator
      var warpElem = document.getElementById('warp-display');
      if (warpElem) warpElem.textContent = (vertigoDollyDist / 240).toFixed(2) + 'x';
    }

    // 2. ZERO-G BARREL ROLL
    else if (trick === 'roll') {
      var rollAngle = t * CONFIG.rollSpeed;
      var upX = Math.sin(rollAngle);
      var upY = Math.cos(rollAngle);
      var upZ = Math.sin(rollAngle * 0.5) * 0.4;
      var upLen = Math.sqrt(upX * upX + upY * upY + upZ * upZ);

      cam.up = [upX / upLen, upY / upLen, upZ / upLen];

      var warpElem = document.getElementById('warp-display');
      if (warpElem) warpElem.textContent = (rollAngle * (180 / Math.PI) % 360).toFixed(0) + '°';
    }

    // 3. MATRIX SHEAR GLITCH (Non-Euclidean Space Bending)
    else if (trick === 'shear') {
      if (cam._view && cam._view.length === 16) {
        var sAmount = CONFIG.shearAmount;
        // Inject non-affine shear into view matrix
        cam._view[1] = Math.sin(t * 3.8) * sAmount;
        cam._view[4] = Math.cos(t * 2.7) * sAmount;
        cam._view[8] = Math.sin(t * 4.5) * (sAmount * 0.5);
      }
      var warpElem = document.getElementById('warp-display');
      if (warpElem) warpElem.textContent = 'SHEAR: ' + (CONFIG.shearAmount).toFixed(2);
    }

    // 4. FORCED PERSPECTIVE IMPOSSIBLE LOCK
    else if (trick === 'impossibleLock') {
      // Smoothly interpolate to exact Penrose alignment angle
      var targetPos = [230, 230, 230];
      var targetFocus = [0, 0, 0];
      var targetUp = [0, 1, 0];

      var lerpSpeed = 0.08;
      cam.position = [
        cam.position[0] + (targetPos[0] - cam.position[0]) * lerpSpeed,
        cam.position[1] + (targetPos[1] - cam.position[1]) * lerpSpeed,
        cam.position[2] + (targetPos[2] - cam.position[2]) * lerpSpeed
      ];
      cam.focus = targetFocus;
      cam.up = targetUp;

      var warpElem = document.getElementById('warp-display');
      if (warpElem) warpElem.textContent = 'LOCKED 45°';
    }
  }

  // ==========================================
  // NOVA BLAST (FLYING CUBES EXPLOSION)
  // ==========================================
  function triggerNovaBlast() {
    flashBanner('💥 NOVA EXPLOSION TRIGGERED!');
    if (audioSys) audioSys.playNova();

    for (var i = 0; i < CONFIG.numCubes; i++) {
      var d = cubeData[i];
      // Random explosive radial velocity
      var speed = 70 + Math.random() * 160;
      var theta = Math.random() * Math.PI * 2;
      var phi = Math.acos((Math.random() * 2) - 1);

      d.vx = speed * Math.sin(phi) * Math.cos(theta);
      d.vy = speed * Math.sin(phi) * Math.sin(theta);
      d.vz = speed * Math.cos(phi);

      d.vrx = (Math.random() - 0.5) * 0.3;
      d.vry = (Math.random() - 0.5) * 0.3;
      d.vrz = (Math.random() - 0.5) * 0.3;
    }
  }

  // ==========================================
  // UI & HUD MANAGEMENT
  // ==========================================
  function flashBanner(text) {
    var banner = document.getElementById('flash-banner');
    var bannerText = document.getElementById('flash-text');
    if (!banner || !bannerText) return;

    bannerText.textContent = text;
    banner.classList.add('show');

    clearTimeout(banner._timeout);
    banner._timeout = setTimeout(function () {
      banner.classList.remove('show');
    }, 2200);
  }

  function setMode(newMode) {
    CONFIG.mode = newMode;
    if (audioSys) audioSys.playChime(440 + Math.random() * 300);

    // Update Mode Buttons Active State
    var buttons = document.querySelectorAll('.mode-btn');
    buttons.forEach(function (btn) {
      if (btn.dataset.mode === newMode) btn.classList.add('active');
      else btn.classList.remove('active');
    });

    flashBanner('MODE: ' + newMode.toUpperCase());

    // Auto-adjust perspective trick default for mode
    if (newMode === 'escher') {
      setTrick('impossibleLock');
    }
  }

  function setTrick(newTrick) {
    if (CONFIG.trick === newTrick) {
      CONFIG.trick = 'none'; // Toggle off
    } else {
      CONFIG.trick = newTrick;
    }

    var trickDisplay = document.getElementById('perspective-display');
    if (trickDisplay) {
      trickDisplay.textContent = (CONFIG.trick === 'none') ? 'STANDARD' : CONFIG.trick.toUpperCase();
    }

    // Update Button Highlights
    var trickBtns = {
      vertigo: document.getElementById('trick-vertigo'),
      roll: document.getElementById('trick-roll'),
      shear: document.getElementById('trick-shear'),
      impossibleLock: document.getElementById('trick-lock')
    };

    for (var k in trickBtns) {
      if (trickBtns[k]) {
        if (CONFIG.trick === k) trickBtns[k].classList.add('active');
        else trickBtns[k].classList.remove('active');
      }
    }

    if (CONFIG.trick === 'none') {
      // Restore standard camera up
      if (r && r.camera) r.camera.up = [0, 1, 0];
      flashBanner('PERSPECTIVE: STANDARD');
    } else {
      flashBanner('TRICK ACTIVATED: ' + CONFIG.trick.toUpperCase());
      if (audioSys) audioSys.playChime(660);
    }
  }

  function cyclePalette() {
    var curIdx = PALETTE_NAMES.indexOf(CONFIG.palette);
    var nextIdx = (curIdx + 1) % PALETTE_NAMES.length;
    CONFIG.palette = PALETTE_NAMES[nextIdx];

    var label = document.getElementById('palette-label');
    if (label) label.textContent = CONFIG.palette.toUpperCase();

    flashBanner('PALETTE: ' + CONFIG.palette.toUpperCase());
    if (audioSys) audioSys.playChime(587.33);
  }

  function resetCamera() {
    if (!r || !r.camera) return;
    r.camera.position = [defaultCamPos[0], defaultCamPos[1], defaultCamPos[2]];
    r.camera.focus = [defaultCamFocus[0], defaultCamFocus[1], defaultCamFocus[2]];
    r.camera.up = [defaultCamUp[0], defaultCamUp[1], defaultCamUp[2]];
    setTrick('none');
    flashBanner('CAMERA RESET');
  }

  function toggleFreeze() {
    CONFIG.animating = !CONFIG.animating;
    var freezeIcon = document.getElementById('freeze-icon');
    var freezeLabel = document.getElementById('freeze-label');

    if (freezeIcon && freezeLabel) {
      if (CONFIG.animating) {
        freezeIcon.textContent = '⏸';
        freezeLabel.textContent = 'FREEZE';
        flashBanner('RESUMED');
      } else {
        freezeIcon.textContent = '▶';
        freezeLabel.textContent = 'RESUME';
        flashBanner('FROZEN (BULLET-TIME)');
      }
    }
  }

  function toggleHUD() {
    CONFIG.showHUD = !CONFIG.showHUD;
    var overlay = document.getElementById('ui-overlay');
    if (overlay) {
      if (CONFIG.showHUD) overlay.classList.remove('hidden');
      else overlay.classList.add('hidden');
    }
    // Also toggle dat.GUI
    if (gui && gui.domElement) {
      gui.domElement.style.display = CONFIG.showHUD ? 'block' : 'none';
    }
  }

  // ==========================================
  // DAT.GUI INTEGRATION
  // ==========================================
  function setupDatGUI() {
    if (typeof dat === 'undefined') return;

    gui = new dat.GUI({ width: 280 });

    var fVisual = gui.addFolder('Visual Engine');
    fVisual.add(CONFIG, 'mode', ['tesseract', 'swarm', 'wave', 'escher', 'kaleidoscope', 'meteor'])
      .name('Scene Mode')
      .onChange(setMode)
      .listen();

    fVisual.add(CONFIG, 'palette', PALETTE_NAMES)
      .name('Color Theme')
      .onChange(function () {
        var label = document.getElementById('palette-label');
        if (label) label.textContent = CONFIG.palette.toUpperCase();
      })
      .listen();

    fVisual.add(CONFIG, 'speed', 0.1, 3.0).name('Anim Speed');
    fVisual.add(CONFIG, 'baseSize', 4, 25).name('Cube Size');
    fVisual.open();

    var fTricks = gui.addFolder('Perspective Lab');
    fTricks.add(CONFIG, 'trick', ['none', 'vertigo', 'roll', 'shear', 'impossibleLock'])
      .name('Perspective Trick')
      .onChange(setTrick)
      .listen();

    fTricks.add(CONFIG, 'vertigoIntensity', 0.2, 1.5).name('Vertigo Scale');
    fTricks.add(CONFIG, 'rollSpeed', 0.1, 2.5).name('Roll Velocity');
    fTricks.add(CONFIG, 'shearAmount', 0.1, 1.2).name('Shear Glitch');
    fTricks.add({ nova: triggerNovaBlast }, 'nova').name('💥 Trigger Nova');
    fTricks.add({ reset: resetCamera }, 'reset').name('🔄 Reset View');
    fTricks.open();

    var fAudio = gui.addFolder('Generative Synth');
    fAudio.add(CONFIG, 'soundEnabled')
      .name('Enable Audio')
      .onChange(function (v) {
        if (audioSys) audioSys.toggle(v);
      })
      .listen();

    fAudio.add(CONFIG, 'soundVolume', 0.0, 1.0)
      .name('Volume')
      .onChange(function (v) {
        if (audioSys) audioSys.setVolume(v);
      });
  }

  // ==========================================
  // EVENT LISTENERS & SHORTCUTS
  // ==========================================
  function setupEventListeners() {
    // Mode Buttons
    document.querySelectorAll('.mode-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        setMode(this.dataset.mode);
      });
    });

    // Perspective Trick Buttons
    document.getElementById('trick-vertigo').addEventListener('click', function () { setTrick('vertigo'); });
    document.getElementById('trick-roll').addEventListener('click', function () { setTrick('roll'); });
    document.getElementById('trick-shear').addEventListener('click', function () { setTrick('shear'); });
    document.getElementById('trick-lock').addEventListener('click', function () { setTrick('impossibleLock'); });
    document.getElementById('trick-nova').addEventListener('click', triggerNovaBlast);

    // Top Controls
    document.getElementById('btn-sound').addEventListener('click', function () {
      if (audioSys) audioSys.toggle();
    });
    document.getElementById('btn-palette').addEventListener('click', cyclePalette);
    document.getElementById('btn-freeze').addEventListener('click', toggleFreeze);
    document.getElementById('btn-reset-cam').addEventListener('click', resetCamera);
    document.getElementById('btn-hide-ui').addEventListener('click', toggleHUD);

    // Canvas Click: Nova Shockwave
    var container = document.getElementById('webgl-container');
    var isDragging = false;
    var pointerStart = { x: 0, y: 0 };

    container.addEventListener('pointerdown', function (e) {
      isDragging = false;
      pointerStart.x = e.clientX;
      pointerStart.y = e.clientY;
    });

    container.addEventListener('pointermove', function (e) {
      var dx = Math.abs(e.clientX - pointerStart.x);
      var dy = Math.abs(e.clientY - pointerStart.y);
      if (dx > 5 || dy > 5) isDragging = true;
    });

    container.addEventListener('pointerup', function (e) {
      if (!isDragging && e.button === 0) {
        triggerNovaBlast();
      }
    });

    // Keyboard Shortcuts
    window.addEventListener('keydown', function (e) {
      // Don't intercept if dat.GUI input is focused
      if (e.target.tagName === 'INPUT') return;

      switch (e.key.toLowerCase()) {
        case '1': setMode('tesseract'); break;
        case '2': setMode('swarm'); break;
        case '3': setMode('wave'); break;
        case '4': setMode('escher'); break;
        case '5': setMode('kaleidoscope'); break;
        case '6': setMode('meteor'); break;

        case ' ': // Space: Pause
          e.preventDefault();
          toggleFreeze();
          break;

        case 'v': setTrick('vertigo'); break;
        case 'b': setTrick('roll'); break;
        case 'g': setTrick('shear'); break;
        case 'e': setTrick('impossibleLock'); break;
        case 'f': triggerNovaBlast(); break;

        case 'c': cyclePalette(); break;
        case 'm': if (audioSys) audioSys.toggle(); break;
        case 'r': resetCamera(); break;
        case 'h': toggleHUD(); break;
      }
    });
  }

  // ==========================================
  // INITIALIZATION ENGINE
  // ==========================================
  window.onload = function () {
    console.log('⚡ Initializing XTK Cube Art Visualizer...');

    // Verify XTK is loaded
    if (typeof X === 'undefined' || !X.renderer3D) {
      console.error('XTK library failed to load from CDN.');
      var loaderText = document.querySelector('.loading-text');
      if (loaderText) {
        loaderText.textContent = 'ERROR: XTK LIBRARY NOT DETECTED (CHECK NETWORK)';
        loaderText.style.color = '#ff0055';
      }
      return;
    }

    // 1. Initialize Audio Synthesizer
    audioSys = createAudioEngine();

    // 2. Initialize XTK 3D Renderer
    r = new X.renderer3D();
    r.container = 'webgl-container';
    r.bgColor = [0.015, 0.018, 0.045]; // Cosmic dark navy
    r.init();

    // 3. Create Center Hero Cube (Reference Focal Point)
    heroCube = new X.cube();
    heroCube.lengthX = heroCube.lengthY = heroCube.lengthZ = 22;
    heroCube.center = [0, 0, 0];
    heroCube.color = [0.0, 0.94, 1.0];
    heroCube.opacity = 0.95;
    heroCube.caption = '★ HYPERCUBE CORE ★';
    r.add(heroCube);

    // 4. Create Cubes Pool
    var totalCubes = CONFIG.numCubes;
    for (var i = 0; i < totalCubes; i++) {
      var c = new X.cube();
      c.lengthX = c.lengthY = c.lengthZ = CONFIG.baseSize;
      c.center = [0, 0, 0];
      c.color = [0.0, 0.94, 1.0];
      c.opacity = CONFIG.cubeOpacity;
      r.add(c);
      cubes.push(c);

      // Simulation State
      cubeData.push({
        x: (Math.random() - 0.5) * 200,
        y: (Math.random() - 0.5) * 200,
        z: (Math.random() - 0.5) * 200,
        vx: (Math.random() - 0.5) * 20,
        vy: (Math.random() - 0.5) * 20,
        vz: (Math.random() - 0.5) * 20,
        rx: Math.random() * Math.PI,
        ry: Math.random() * Math.PI,
        rz: Math.random() * Math.PI,
        vrx: (Math.random() - 0.5) * 0.08,
        vry: (Math.random() - 0.5) * 0.08,
        vrz: (Math.random() - 0.5) * 0.08,
        phase: Math.random() * Math.PI * 2,
        freq: 0.6 + Math.random() * 1.2,
        radius: 40 + Math.random() * 130
      });
    }

    // 5. Initial Camera Setup
    r.camera.position = [defaultCamPos[0], defaultCamPos[1], defaultCamPos[2]];
    r.camera.focus = [defaultCamFocus[0], defaultCamFocus[1], defaultCamFocus[2]];
    r.camera.up = [defaultCamUp[0], defaultCamUp[1], defaultCamUp[2]];

    // 6. Dat.GUI and Event Listeners
    setupDatGUI();
    setupEventListeners();

    // 7. Update HUD initial numbers
    var cubeCountDisplay = document.getElementById('cube-count-display');
    if (cubeCountDisplay) cubeCountDisplay.textContent = (CONFIG.numCubes + 1).toString();

    // Hide Loading Screen
    var loader = document.getElementById('loading-screen');
    if (loader) {
      setTimeout(function () {
        loader.classList.add('fade-out');
      }, 400);
    }

    // 8. RENDER LOOP ANIMATION
    r.onRender = function () {
      var now = performance.now();
      var dt = (now - lastFrameTime) / 1000;
      lastFrameTime = now;

      // Cap delta time to prevent physics explosions on background tab
      if (dt > 0.1) dt = 0.1;

      // FPS Calculation
      fpsCount++;
      if (now - fpsTimer >= 500) {
        currentFPS = Math.round((fpsCount * 1000) / (now - fpsTimer));
        fpsCount = 0;
        fpsTimer = now;
        var fpsElem = document.getElementById('fps-counter');
        if (fpsElem) fpsElem.textContent = currentFPS.toString();
      }

      if (CONFIG.animating) {
        clockTime += dt * CONFIG.speed;
      }

      var t = clockTime;

      // Rotate Hero Cube
      if (heroCube) {
        heroCube.transform.rotateX(CONFIG.rotSpeedX);
        heroCube.transform.rotateY(CONFIG.rotSpeedY);
        heroCube.transform.rotateZ(CONFIG.rotSpeedZ);
      }

      // Execute Active Visual Art Mode
      switch (CONFIG.mode) {
        case 'tesseract':
          updateTesseract(t);
          break;
        case 'swarm':
          updateSwarm(t);
          break;
        case 'wave':
          updateWave(t);
          break;
        case 'escher':
          updateEscher(t);
          break;
        case 'kaleidoscope':
          updateKaleidoscope(t);
          break;
        case 'meteor':
          updateMeteor(t, dt);
          break;
      }

      // Apply Perspective Lab Tricks
      applyPerspectiveTricks(t, dt);

      // Audio Engine modulation
      if (audioSys) {
        audioSys.update(t);
      }
    };

    // Showtime!
    r.render();
    console.log('🚀 XTK Engine Running Successfully!');
  };

})();
