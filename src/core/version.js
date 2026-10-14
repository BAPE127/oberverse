// Single source of truth for version identifiers inside the running game.
// tests/version.test.mjs asserts these agree with VERSION, package.json and
// oberverse-manifest.json — update all four together (see docs/DEVELOPMENT_WORKFLOW.md).
export const GAME_VERSION = '0.19.0';
/** 'development' builds show a "dev" tag; 'stable' builds do not. */
export const BUILD_CHANNEL = 'development';
export const SAVE_SCHEMA_VERSION = 1;
export const CONTENT_SCHEMA_VERSION = 1;

export function versionLabel() {
  return BUILD_CHANNEL === 'stable' ? `v${GAME_VERSION}` : `v${GAME_VERSION} (dev build)`;
}
