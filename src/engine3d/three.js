// The single door to the vendored three.js (r160, MIT, src/vendor/). Every 3D module imports THREE from here,
// so the library is bundled once and swapping or upgrading it touches one line.
import * as THREE from '../vendor/three.module.min.js';
export { THREE };
