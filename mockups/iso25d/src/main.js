// CONCEPT STUDY ONLY — the viewer: ?scene=<id>[&w=1920&h=1080&px=2&nav=0]
import { THREE } from './lib.js';
import { buildScene } from './scene.js';
import { SCENES } from './scenes.js';
import { drawOverlay } from './overlay.js';

const q = new URLSearchParams(location.search);
const id = q.get('scene') || Object.keys(SCENES)[0];
const spec = { ...SCENES[id] };
spec.width = Number(q.get('w')) || 1920; spec.height = Number(q.get('h')) || 1080;
const px = Number(q.get('px')) || spec.px || 2; // device pixels per art pixel: the world is rendered small and scaled up crisp, as the game does today
if (q.get('nav') !== '0') for (const k of Object.keys(SCENES)) { const a = document.createElement('a'); a.href = `?scene=${k}`; a.textContent = k; document.getElementById('nav').append(a); }

const gl = document.getElementById('gl'), ov = document.getElementById('ov');
const stage = document.getElementById('stage'); stage.style.width = spec.width + 'px'; stage.style.height = spec.height + 'px';
const renderer = new THREE.WebGLRenderer({ canvas: gl, antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(spec.width / px, spec.height / px, false);
gl.style.width = spec.width + 'px'; gl.style.height = spec.height + 'px';
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = spec.exposure || 1.0;
ov.width = spec.width; ov.height = spec.height;

const data = await (await fetch(`./data/${spec.map}.json`)).json();
const t0 = performance.now();
const built = await buildScene(spec, data, renderer);
renderer.render(built.scene, built.cam);
// the finished picture: the small world scaled up crisp, a gentle grade, then weather and text at full resolution
{ const c = ov.getContext('2d'); c.imageSmoothingEnabled = false; c.filter = spec.grade || 'saturate(0.88) contrast(1.04)'; c.drawImage(gl, 0, 0, spec.width, spec.height); c.filter = 'none'; }
drawOverlay(ov, spec, built, data);
window.__info = { id, ms: Math.round(performance.now() - t0), calls: renderer.info.render.calls, tris: renderer.info.render.triangles };
window.__ready = true;
