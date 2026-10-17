# Art direction mock-up: a Streets of Rogue 2–style look (2026-10-17)

Owner's request: try making the Oberverse look like *Streets of Rogue 2*, and experiment with skyscrapers and multi-level buildings — a mock-up with screenshots before revamping the whole game. The ships' and gun-running terminals stay as they are.

**The mock-up** is `mockups/sor2/index.html` — a standalone page (open it in a browser; buttons switch scenes). It is not part of the game build and changes nothing in the game. Everything is drawn procedurally, like the game, so no image assets are needed.

| Scene | File |
|---|---|
| Today's look, for comparison | `current-halvermouth.png` |
| The street (Halvermouth crossroads, by day) | `mock-street.png` |
| Night lighting (the Abacus) | `mock-bar.png` |
| Ober's Oil Tower — the lobby (street level) | `mock-lobby.png` |
| Ober's Oil Tower — floor 14 (the city far below) | `mock-floor14.png` |
| Ober's Oil Tower — the roof | `mock-roof.png` |

## What changes
- **Real pixel art.** The world is drawn at a low resolution (480×270 here) and scaled up 4× with no smoothing, so every edge lands on a crisp pixel; 1-px dark outlines on everything; a palette with lit tops and shaded faces.
- **Roofless buildings.** You always see into buildings from the street — walls are thin, with a light top edge and a short front face, like SoR. (Today interiors are separate maps you walk into.)
- **Streets with depth:** kerbs with a lip and a face, dashed lines, crossings, drains, lamps with long diagonal shadows, cars with roofs and windscreens, drop shadows under everything.
- **Chibi people:** big heads, small bodies, hats and badges that read at a glance.
- **Lighting:** night is a dark wash with smooth pools of light cut out for lamps, windows and neon.
- **HUD in the same style:** a chunky health bar, clock and money, a framed minimap, a hotbar, the current objective, and a floor indicator.

## Multi-level buildings (the experiment)
- The **ground floor** of a tower is just another roofless room on the street.
- **Each upper floor is its own level**, drawn as a floor plate floating over the city: the street far below (the same art, shrunk and hazed, drifting slower than the floor as you move — parallax), the building's facade falling away under its south edge, a deep drop shadow, clouds passing between. Lifts and stairs change floor; the HUD says which.
- The **roof** works the same way, higher still (smaller, hazier city): a helipad, plant and an antenna.
- In the engine this maps onto what exists: a floor is an interior map with a `floor` number and a `building`; the renderer draws the parent outdoor map underneath it at a scale and haze set by the floor number.

## If we go ahead (rough plan)
1. A pixel renderer: render the world to a low-resolution buffer and scale up; port each draw function (ground, walls, props, people, cars) to the pixel style. The biggest job — every map, prop and character is drawn in code.
2. Roofless buildings: move each building's interior onto the street map (or draw interiors in place), so you walk in without a scene change.
3. Floors for tall buildings (Ober's Oil Tower first), with lifts and stairs.
4. Lighting, the new HUD, then the menus and panels (keeping the ships' and gun-running terminals as they are).
