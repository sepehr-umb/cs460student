# 🧊 CS460 Assignment 02 // XTK 3D Cube Demonstrations

Two complete, interactive WebGL 3D graphics experiences built using **The X Toolkit (XTK)**:

---

## 📁 Project Structure

| File | Demo Description |
|---|---|
| [**`index.html`**](file:///Users/sepehr/Documents/Classes/460/cs460student/02/index.html) | **Hello Tesseract (Pearlescent Shell & Vantablack Core)**<br>Faithfully modeled after your hand-drawn sketch ([`IMG_0111.jpg`](file:///Users/sepehr/Documents/Classes/460/cs460student/02/IMG_0111.jpg)): **Outer cube faces have the shimmering pearlescent angle-dependent effect** (~76% sheer luster), with an ultra-dense **Vantablack void cube** suspended inside, connected by **8 vivid electric-blue struts**! |
| [**`agent.html`**](file:///Users/sepehr/Documents/Classes/460/cs460student/02/agent.html) | **XTK Hypercube (3D Psychedelic Visualizer & Perspective Lab)**<br>The multi-mode visualizer featuring 360+ flying cubes, the Hitchcock **Vertigo Dolly-Zoom**, **Zero-G Barrel Roll**, **Matrix Shearing Glitch**, and integrated **generative Web Audio synthesizer**! |
| [**`tesseract.html`**](file:///Users/sepehr/Documents/Classes/460/cs460student/02/tesseract.html) | Dedicated standalone copy of the Pearlescent Shell / Vantablack Core Tesseract demo. |

---

## 🎨 1. Hello Tesseract (`index.html`)

Faithfully engineered from [`IMG_0111.jpg`](file:///Users/sepehr/Documents/Classes/460/cs460student/02/IMG_0111.jpg) with inverted pearlescent/void contrast:

* **Outer Pearlescent Shell**: 6 large outer face plates with **angle-dependent thin-film iridescence** (~76% opacity).
  * **Dynamic Fresnel Shading**: Real-time dot product between each outer face's transformed normal $\mathbf{N}$ and the camera view vector $\mathbf{V}$.
  * **Opal Luster**: Faces dynamically shift across rose quartz, champagne gold, opal mint, aquamarine, and ethereal lavender as the tesseract spins or as you orbit with your mouse.
  * **Slightly Less Transparent**: Tuned opacity (~$76\%$) gives richer pearlescent specular luster across the larger outer surface while keeping the interior structure clearly visible.
* **Inner Vantablack Core**: An ominous, ultra-dense light-absorbing cube (`color: [0.012, 0.012, 0.018]`, `opacity: 98%`) floating at the center of the tesseract.
* **8 Connecting Struts**: Bright electric cyan-blue cylinders (`#0084ff`), plunging from the outer pearlescent corners directly into the pitch-black Vantablack core.
* **Outer Frame**: 12 charcoal ink edges and **8 black corner node spheres** directly matching the dot markers in your drawing.
* **Sketchbook Paper Dotted Grid**: Warm parchment background with dotted grid matching your drawing paper, with a one-click toggle to Dark Cosmic mode.
* **Sketch Comparison Drawer**: Press <kbd>S</kbd> or click `[🖼 ORIGINAL SKETCH]` in the top bar to inspect your hand-drawn sketch side-by-side with the live 3D model!

---

## 🌀 2. XTK Hypercube Visualizer (`agent.html`)

The multi-mode non-Euclidean perspective laboratory:

* **6 Visual Art Modes**: 4D Tesseract Fold, Quantum Vortex, Psychedelic Wave Matrix, Escher's Impossible Staircase, Kaleido-Octahedron Mandala, Chaos Meteor Storm.
* **5 Perspective Tricks**:
  * **Hitchcock Vertigo Dolly-Zoom** (<kbd>V</kbd>)
  * **Zero-G Barrel Roll** (<kbd>B</kbd>)
  * **Matrix Shear Glitch** (<kbd>G</kbd>)
  * **Forced Perspective Alignment** (<kbd>E</kbd>)
  * **Nova Blast Explosion** (<kbd>F</kbd> or Click Canvas)
* **Generative Web Audio Synthesizer**: Sub-bass drone and harmonic chord pad with real-time audio-reactive filter modulation (<kbd>M</kbd> to toggle).

---

## 🚀 Quick Launch

```bash
# Launch the new Pearlescent Shell / Vantablack Core demo
open index.html

# Launch the previous psychedelic visualizer demo
open agent.html
```

---

*Crafted for CS460 Computer Graphics using The X Toolkit (XTK).*
