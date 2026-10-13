// Builds the standalone game: one self-contained index.html (CSS + all code
// inlined) that runs by double-clicking it — no server, no internet — and is
// also what GitHub Pages serves. Zero dependencies.
//
//   npm run build        writes index.html from dev.html + src/
//
// The bundler supports exactly the module forms this project uses:
//   import { a, b as c } from './x.js';   import X from './x.js';
//   export const|let|function|class NAME   export default <expr>   export { a, b };
// tests/build.test.mjs fails if index.html is out of date with the sources.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve, posix } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function transform(code, id, resolveDep) {
  const exportsList = [];
  let hasDefault = false;
  let out = code.replace(/^import\s*\{([^}]*)\}\s*from\s*['"]([^'"]+)['"];?/gm, (_, names, spec) => {
    const binds = names.split(',').map((s) => s.trim()).filter(Boolean).map((s) => s.replace(/^(\w+)\s+as\s+(\w+)$/, '$1: $2'));
    return `const { ${binds.join(', ')} } = __m[${JSON.stringify(resolveDep(spec))}];`;
  });
  out = out.replace(/^import\s+(\w+)\s+from\s*['"]([^'"]+)['"];?/gm, (_, name, spec) => `const ${name} = __m[${JSON.stringify(resolveDep(spec))}].default;`);
  out = out.replace(/^export\s+(const|let|function|class)\s+([A-Za-z_$][\w$]*)/gm, (_, kind, name) => {
    exportsList.push(name);
    return `${kind} ${name}`;
  });
  out = out.replace(/^export\s+default\s+/gm, () => {
    hasDefault = true;
    return 'const __default = ';
  });
  out = out.replace(/^export\s*\{([^}]*)\};?/gm, (_, names) => {
    exportsList.push(...names.split(',').map((s) => s.trim()).filter(Boolean));
    return '';
  });
  if (/^\s*(import|export)\b/m.test(out)) throw new Error(`${id}: unsupported import/export form remains`);
  const ret = [...exportsList, ...(hasDefault ? ['default: __default'] : [])];
  return `// ---- ${id}\n__m[${JSON.stringify(id)}] = (function () {\n${out}\nreturn { ${ret.join(', ')} };\n})();\n`;
}

/** Bundle starting from an entry module. Returns the script text. */
export function bundle(entry = 'src/main.js') {
  const order = [];
  const state = new Map(); // id -> 'visiting' | 'done'
  const sources = new Map();
  const visit = (id, from) => {
    if (state.get(id) === 'done') return;
    if (state.get(id) === 'visiting') throw new Error(`Circular import: ${from} -> ${id}`);
    state.set(id, 'visiting');
    const code = readFileSync(join(ROOT, id), 'utf8');
    const deps = [];
    const resolveDep = (spec) => {
      if (!spec.startsWith('.')) throw new Error(`${id}: only relative imports can be bundled (${spec})`);
      return posix.normalize(posix.join(posix.dirname(id), spec));
    };
    for (const m of code.matchAll(/^import[^'"]*['"]([^'"]+)['"]/gm)) deps.push(resolveDep(m[1]));
    for (const d of deps) visit(d, id);
    sources.set(id, transform(code, id, resolveDep));
    state.set(id, 'done');
    order.push(id);
  };
  visit(entry, '(entry)');
  return `(function () {\n'use strict';\nconst __m = Object.create(null);\n${order.map((id) => sources.get(id)).join('\n')}\n})();\n`;
}

/** Produce the standalone HTML text. */
export function buildHtml() {
  const shell = readFileSync(join(ROOT, 'dev.html'), 'utf8');
  const css = readFileSync(join(ROOT, 'styles.css'), 'utf8');
  const js = bundle('src/main.js').replace(/<\/(script)/gi, '<\\/$1');
  const cssTag = '<link rel="stylesheet" href="styles.css" />';
  const jsTag = '<script type="module" src="src/main.js"></script>';
  if (!shell.includes(cssTag) || !shell.includes(jsTag)) throw new Error('dev.html no longer contains the expected stylesheet/script tags');
  return shell
    .replace('<!doctype html>', '<!doctype html>\n<!-- GENERATED FILE — do not edit. Edit dev.html, styles.css or src/, then run `npm run build`. -->')
    .replace(cssTag, () => `<style>\n${css}</style>`)
    .replace(jsTag, () => `<script>\n${js}</script>`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const html = buildHtml();
  writeFileSync(join(ROOT, 'index.html'), html);
  console.log(`Wrote index.html (${(html.length / 1024).toFixed(0)} KB) — open it directly in a browser.`);
}
