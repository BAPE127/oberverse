// Single source of truth for version identifiers inside the running game.
// tests/version.test.mjs asserts these agree with VERSION, package.json and
// oberverse-manifest.json — update all four together (see docs/DEVELOPMENT_WORKFLOW.md).
export const GAME_VERSION = '0.29.0';
/** 'development' builds show a "dev" tag; 'stable' builds do not. */
export const BUILD_CHANNEL = 'development';
export const SAVE_SCHEMA_VERSION = 1;
export const CONTENT_SCHEMA_VERSION = 1;

export function versionLabel() {
  return BUILD_CHANNEL === 'stable' ? `v${GAME_VERSION}` : `v${GAME_VERSION} (dev build)`;
}

/** Is version `a` older than `b`? (MAJOR.MINOR.PATCH; a missing version counts as oldest.) */
export function olderThan(a, b) {
  if (!a) return true;
  const pa = String(a).split('.').map(Number);
  const pb = String(b).split('.').map(Number);
  for (let i = 0; i < 3; i++) if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) < (pb[i] || 0);
  return false;
}
