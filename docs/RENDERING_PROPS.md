# Rendering categories for props

Every prop type in `src/content/props.js` put in one drawing category for the isometric move (see `docs/RENDERING.md` section 2.2). Footprints are the content defaults: `*` = one side not stated, 1 assumed; `-` = not stated. `workbench` is declared twice in `props.js`; the later entry (w 3) is used.

Counts: FLAT 21, LINEAR 12, UPRIGHT 30, BOXY 48, LARGE 23, UNSURE 25. Total 159.

## FLAT: lies on the ground (markings, rugs, pads)

| type | footprint | where drawn | note |
|---|---|---|---|
| `flowerbed` | - | propSprites (+drawPixelProps) | in FLAT_PROPS |
| `crops` | - | drawWorld (drawFarm) | field rows, lie on ground |
| `gangway` | - | drawWorld | ship ramp; in FLAT_PROPS |
| `companionway` | - | drawWorld | ship stairway; in FLAT_PROPS |
| `chair` | - | propSprites (+drawPixelProps) | in FLAT_PROPS; sprite stands up |
| `rug` | 2 x 2 | propSprites (+drawPixelProps) | floor covering |
| `lift` | - | drawPixelProps | in FLAT_PROPS; solid platform, check |
| `helipad` | 4 x 4 | drawPixelProps | painted pad |
| `window` | - | propSprites (+drawPixelProps) | wall feature; in FLAT_PROPS |
| `item` | - | drawWorld | dropped item on ground |
| `painting` | - | propSprites | wall-hung; in FLAT_PROPS |
| `trash` | - | propSprites (+drawPixelProps) | rubbish heap; in FLAT_PROPS |
| `crosswalk` | - | drawWorld | road marking |
| `loadingbay` | 2 x 2 | drawWorld (drawFactory) | dashed floor pad; solid, drawn flat |
| `inserter` | - | drawWorld (drawFactory) | in FLAT_PROPS; arm stands up |
| `vent` | - | propSprites | floor grate; low sprite |
| `trench` | 2 x 1* | drawWorld | dug ground |
| `board` | - | drawWorld | in FLAT_PROPS; may stand upright |
| `magic_circle` | 5 x 5 | propSprites | painted circle |
| `runway_light` | - | propSprites | in FLAT_PROPS; ground light |
| `bay_slot` | - | propSprites | assembly floor slot |

## LINEAR: joins neighbours in runs

| type | footprint | where drawn | note |
|---|---|---|---|
| `bush` | - | propSprites (+drawPixelProps) | labelled Hedge; no connect painter |
| `ranchgate` | 6 x 2 | drawWorld (drawFarm) | gate across a fence run |
| `ranchfence` | - | propSprites | connect: true |
| `fence` | - | propSprites | connect: true |
| `pipe` | - | propSprites | run of pipe; no connect painter |
| `laundry` | 3 x 1* | propSprites | line strung between posts |
| `chainfence` | - | propSprites | connect: true |
| `cellbars` | - | propSprites | bars in a wall run |
| `belt` | - | drawWorld (drawFactory) | in FLAT_PROPS; belt runs |
| `sorter` | - | drawWorld (drawFactory) | in FLAT_PROPS; sits in belt runs |
| `velvet_rope` | 2 x 1* | propSprites | rope between posts |
| `blast_wall` | - | propSprites | wall piece |

## UPRIGHT: small or roundish, taller than wide

| type | footprint | where drawn | note |
|---|---|---|---|
| `tree` | - | propSprites (+drawPixelProps) |  |
| `pine` | - | propSprites (+drawPixelProps) |  |
| `streetlamp` | - | propSprites (+drawPixelProps) |  |
| `noticeboard` | - | propSprites |  |
| `sign` | - | propSprites |  |
| `barrel` | - | propSprites (+drawPixelProps) |  |
| `rock` | - | propSprites (+drawPixelProps) |  |
| `bollard` | - | propSprites |  |
| `chicken` | - | drawWorld (drawFarm) | animal |
| `goat` | - | drawWorld (drawFarm) | animal |
| `ranchpost` | - | drawWorld (drawFarm) |  |
| `haybale` | - | propSprites | round bale |
| `shipwheel` | - | drawWorld | on a stand |
| `mailbox` | - | propSprites |  |
| `plant` | - | propSprites (+drawPixelProps) |  |
| `floorlamp` | - | drawPixelProps | pixel-only sprite |
| `flagpole` | - | propSprites | tall pole |
| `busstop` | - | propSprites |  |
| `trafficlight` | - | propSprites |  |
| `statue` | 2 x 2 | propSprites | person-like |
| `barrelfire` | - | propSprites | oil drum |
| `hydrant` | - | propSprites (+drawPixelProps) |  |
| `gatepost` | - | propSprites | post; joins fence |
| `stake` | - | drawWorld | thin post |
| `pillar` | - | propSprites | column |
| `crystal_ball` | - | propSprites | on a stand |
| `candelabra` | - | propSprites | tall candles |
| `marquee_pylon` | - | propSprites | tall sign pylon |
| `windsock` | - | propSprites | on a pole |
| `runway_sign` | - | propSprites |  |

## BOXY: furniture or machine with a rectangular footprint

| type | footprint | where drawn | note |
|---|---|---|---|
| `bench` | - | propSprites (+drawPixelProps) | outdoor furniture |
| `crate` | - | propSprites (+drawPixelProps) |  |
| `trough` | 2 x 1* | propSprites | long low tub |
| `milkstall` | 2 x 2 | drawWorld (drawFarm) |  |
| `cheesevat` | 3 x 2 | drawWorld (drawFarm) |  |
| `cheesepress` | 2 x 2 | drawWorld (drawFarm) |  |
| `cheeserack` | 6 x 2 | drawWorld (drawFarm) | long racks |
| `bed` | 1 x 2 | propSprites (+drawPixelProps) |  |
| `wardrobe` | - | propSprites (+drawPixelProps) |  |
| `desk` | 2 x 1* | propSprites (+drawPixelProps) |  |
| `table` | - | propSprites (+drawPixelProps) |  |
| `counter` | - | propSprites (+drawPixelProps) |  |
| `oven` | - | propSprites (+drawPixelProps) |  |
| `shelf` | - | propSprites (+drawPixelProps) |  |
| `cabinet` | - | propSprites (+drawPixelProps) |  |
| `stove` | - | propSprites (+drawPixelProps) |  |
| `workbench` | 3 x 1* | propSprites (+drawPixelProps) |  |
| `engine` | 2 x 1* | drawWorld |  |
| `toolrack` | 2 x 1* | drawPixelProps |  |
| `cot` | 1 x 2 | propSprites (+drawPixelProps) |  |
| `chest` | - | propSprites |  |
| `lamp_mechanism` | 2 x 2 | drawWorld |  |
| `lectern` | - | propSprites (+drawPixelProps) | stand |
| `display` | 2 x 1* | propSprites (+drawPixelProps) |  |
| `booth` | - | drawWorld | gatehouse |
| `valve` | 3 x 1* | drawWorld | valve bank |
| `barrelline` | 3 x 1* | drawWorld | machine line |
| `vault` | - | drawWorld | safe-like box |
| `dumpster` | 2 x 1* | propSprites (+drawPixelProps) | container |
| `gunrack` | 2 x 1* | drawWorld |  |
| `outbin` | 2 x 2 | drawWorld (drawFactory) |  |
| `terminal` | 2 x 1* | drawWorld (drawFactory) |  |
| `storage` | - | drawWorld (drawFactory) |  |
| `machine` | 2 x 2 | drawWorld (drawFactory) |  |
| `generator` | 2 x 2 | drawWorld (drawFactory) |  |
| `lumber` | 2 x 1* | drawWorld |  |
| `bricks` | 2 x 1* | drawWorld |  |
| `roulette_table` | 4 x 2 | propSprites |  |
| `blackjack_table` | 3 x 2 | propSprites |  |
| `poker_table` | 4 x 3 | propSprites | 4x3 table |
| `spade_table` | 4 x 2 | propSprites |  |
| `cashier_cage` | 6 x 1* | propSprites | glass cage, 6x1 |
| `slot_machine` | - | propSprites | tall, 1x1 |
| `piano` | 3 x 2 | propSprites |  |
| `phone_dock` | - | propSprites | small unit |
| `luggage_cart` | - | propSprites | trolley |
| `engine_stand` | - | propSprites | engine on a stand |
| `valet_stand` | - | propSprites | podium |

## LARGE: over about 3x3 tiles or a special structure

| type | footprint | where drawn | note |
|---|---|---|---|
| `crane` | 3 x 2 | drawWorld | dock crane; named in brief |
| `shipberth` | 12 x 11 | drawWorld | in FLAT_PROPS; berth structure, not flat |
| `moored_ship` | 4 x 9 | drawWorld | in FLAT_PROPS; ship, not flat |
| `slipway` | 4 x 12 | drawWorld | in FLAT_PROPS; ramp structure, not flat |
| `watertower` | 4 x 5 | propSprites | tall tower |
| `silo` | 2 x 3 | propSprites | named in brief |
| `windmill` | 3 x 4 | propSprites | tall structure |
| `tractor` | 3 x 2 | drawWorld (drawFarm) | vehicle, like excavator |
| `milktank` | 2 x 2 | drawWorld (drawFarm) | tank class |
| `deckhouse` | - | drawWorld | ship bridge |
| `derrick` | 2 x 2 | drawWorld | named in brief |
| `tank` | 2 x 2 | drawWorld | named in brief |
| `scaffold` | 2 x 2 | drawWorld | lattice structure |
| `excavator` | 2 x 2 | drawWorld | named in brief |
| `control_tower` | 3 x 3 | propSprites | special structure |
| `radar` | 2 x 2 | propSprites | mast and dish |
| `aircraft` | - | propSprites | named in brief |
| `launch_pad` | 10 x 10 | propSprites | named in brief; solid false |
| `aero_facility` | 3 x 3 | propSprites | special structure |
| `launch_tower` | 2 x 3 | propSprites | service tower |
| `propellant_sphere` | 3 x 3 | propSprites | tank class |
| `gantry` | - | propSprites | crane class; solid false |
| `test_stand` | 3 x 3 | propSprites | special structure |

## UNSURE: could not tell

| type | footprint | where drawn | note |
|---|---|---|---|
| `fountain` | 2 x 2 | propSprites | tall spray on 2x2 basin |
| `boat` | 2 x 1* | drawWorld | small vessel; shape ambiguous |
| `roadsign` | 4 x 2 | drawWorld (drawFarm) | sign drawn tall; 4x2 footprint |
| `bigsign` | 4 x 2 | drawWorld (drawFarm) | sign drawn tall; 4x2 footprint |
| `cow` | - | drawWorld (drawFarm) | animal, wider than tall |
| `deckpart` | - | drawWorld | ship fitting; shape not stated |
| `logbook` | - | drawWorld | small deck item; stand height unclear |
| `hatch` | - | drawWorld | solid deck hatch; flat or raised |
| `scrap` | - | drawWorld | heap; low and wide |
| `stairs` | - | drawWorld | spiral; footprint and height unstated |
| `pumpjack` | 2 x 1* | drawWorld | oil machine; tall beam, small footprint |
| `gauge` | 3 x 1* | drawWorld | panel; may be wall-mounted |
| `column` | 2 x 3 | drawWorld | tall column; footprint unstated |
| `car` | 2 x 1* | drawWorld | parked vehicle; rule unclear |
| `car_display` | 3 x 2 | drawWorld | display vehicle; rule unclear |
| `tent` | 2 x 1* | propSprites | low wide shelter |
| `loosebrick` | - | drawWorld | wall or ground; unclear |
| `wallcrack` | - | drawWorld | wall decal, not ground |
| `mixer` | - | drawWorld | drum on wheels; shape unclear |
| `floating_cards` | - | propSprites | floating effect, no ground contact |
| `monitor_wall` | 4 x 1* | propSprites | screen bank; linear or boxy |
| `hall_site` | - | propSprites | building site; height unstated |
| `tug` | 2 x 1 | propSprites | vehicle, small footprint |
| `boom_barrier` | 4 x 1 | propSprites | barrier arm; could be linear |
| `dish` | 2 x 2 | propSprites | dish on mast or ground |
