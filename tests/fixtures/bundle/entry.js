import * as NS from './lib.js';
import './effect.js';
import { alpha as al, b } from './lib.js';
import * as MINI from './mini.js';
globalThis.__bundleTest.result = { ns: Object.keys(NS).sort(), al, b, c: NS.c, quick: MINI.Quick, wide: MINI.Wide };
