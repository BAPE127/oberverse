# The world's geography (v0.28.0)

Fictional continents and islands with real-looking coastlines, used by every map of the world: the arms terminal's globe (and the tablet's Business app, which shows the same screen), Fleet Command's chart, sea routes and ports.

Code: `src/world/geography.js` (the shapes, pure), `src/world/globe.js` (the half-degree grid everything samples: `landGrid`, `elevationAt`, `landValue`, `isLand`), `src/engine/drawGlobeSurface.js` (drawing: `surfaceTexture`, `drawSphere`, `flatCanvas`).

## How the land is made

- **Skeletons.** Each landmass is a few chains of `[lat, lon, coast radius]` nodes (`LAND`), laid out around the countries and ports: the long western continent (Westreach, Lirre, Sunmouth, down an isthmus to Cape Low and Greyhook); the home island (Halvermouth) and its neighbour; Sund's long northern island; Pallas; the eastern continent (Ostmark, the northern plains, Varn's and Teshvar's peninsulas); Caldera's southern continent with its horn; Meridian's long island; the south-eastern continent (Coral Sound); Dunmere's island, Southwind Isle, arctic islands and the southern ice.
- **Real coasts.** The skeleton field is pushed about by domain-warping noise (±6°) and roughened by fractal noise at two scales, so coasts get bays, capes, peninsulas and offshore islets — no circles.
- **Seas and straits** are carved the same way (`SEAS`): the Ostmark Sea, the Halden Gulf and Port Varn's sea, the Kestrel Gulf, Marrow Strait.
- **Islands.** Archipelagos come from high-frequency noise inside their regions (`ARCHIPELAGOS`: the Morrow Isles, the Spice Isles, the Lantern Keys, the Marrow reefs, the Ice Teeth), plus the Morrow harbours' islands (`ISLANDS`) and a scatter of lone islands in the open ocean.
- It's sampled once onto a 720 × 361 grid (about 0.8 s, on first use); everything reads the grid (bilinear between samples).

## How it's drawn

- **The arms terminal's globe**: the grid baked into a texture in the terminal's green (sea darker offshore, hill-shaded land, a bright coastline, country borders), rendered per pixel onto a lit sphere with an atmosphere's glow — coasts are their true shapes at any rotation and zoom. Hovering any land lights up its country (the nearest capital on that land, within 32°).
- **Fleet Command's chart** stays flat (the owner's choice): the same texture in the ops-room palette, at a quarter degree, smoothed.

## Ports

Every port was moved onto the new coast nearest its old position (most by under 300 km); each is tested to be on land, on the coast, within 30° of its country's capital, and reachable by sea from Mill Road Docks.
