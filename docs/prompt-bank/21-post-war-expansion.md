# Prompt 21 — The Post-War Expansion (Atlas, living Sund, quests, events, intelligence missions, Neumina, noir mob city)

**Purpose.** The owner's full brief for the Post-War Expansion, saved word for word. It is a **plan-first** brief: the owner's instruction with it was "create only simple mockups, save the prompt, and create an implementation plan, but do not implement." Nothing in `src/` has been built from it. Work from `docs/POST_WAR_EXPANSION_PLAN.md`, which maps its twelve stages to releases and lists the questions that must be answered first.

**Required input.** The owner's "go" for a named stage. The brief itself says "implement", but that was overruled for now; the plan is the working document. Start no stage without the owner's go.

**Read first.** `docs/POST_WAR_EXPANSION_PLAN.md`, `docs/ROADMAP.md` (the single master release list; this expansion is placed in it), `docs/WORLD_ATLAS_PROPOSAL.md` (the Atlas this brief's Part II overlaps), `docs/ARCHITECTURE.md`, `docs/prompt-bank/05-world-expansion.md`, `19-world-simulation.md` and `06-quest-and-minigame.md`.

**Mockups.** `docs/mockups/proposal-postwar-game-*.png` (Neumina street, plaza, underground and map; Saint Halloran street, docks and map; all drawn by the game's own engine from mock-only maps in `docs/mockups/postwar-src/`) and `proposal-postwar-atlas-and-instances.png`.

**Note on the reference image.** The brief says a Neumina reference image was supplied (a dense pixel-art cyberpunk street). It was attached to the owner's message but the assistant could not see it. Neumina's look must be confirmed against that image before any art is made; the mockup is layout only.

**Scope & constraints.** Everything in the brief below, plus the standing rules: ask before guessing, accuracy over speed, every edited existing test listed, existing saves load and nothing is granted by migration, no money from nothing, commits end with the attribution lines, push only to `claude/funny-mayer-52dll8`.

---

THE OBERVERSE — POST-WAR EXPANSION
World Atlas, Living World, Narrative Questlines & International Intelligence Operations
Act as the lead game director, senior gameplay engineer, world designer, narrative designer, and technical architect for The Oberverse.
I want you to implement a substantial Post-War Expansion that fundamentally improves the world exploration, storytelling, quest density, random events, and international gameplay of the existing game.
This is not a request for a design proposal. I want you to inspect the current project, develop a comprehensive implementation plan, and then implement the features in working, tested stages.
The expansion has four central objectives:

1. Replace the current world map with a zoomable global Atlas.
2. Make the existing world feel substantially more alive through NPCs, buildings, storylines, quests, and random events.
3. Introduce international travel through a central intelligence agency, beginning with two unique foreign cities.
4. Create self-contained, highly interactive international missions inspired by the systemic sandbox design of the Hitman games.

The corporations and economic systems are important parts of The Oberverse, but they must not become the primary purpose of the game. The player should have compelling activities available regardless of whether they want to operate businesses, explore, commit crimes, participate in politics, work for intelligence agencies, or simply interact with the world.
PART I — PROJECT AUDIT AND DESIGN PRINCIPLES
Before writing code:

1. Inspect the entire existing project and identify the canonical working version.
2. Review the existing world map, Atlas, navigation, buildings, interiors, NPC systems, dialogue, quest systems, inventory, clothing, wanted-level mechanics, save architecture, and user interface.
3. Identify existing mechanics that can be extended rather than recreated.
4. Identify empty buildings and underdeveloped areas that can be populated.
5. Review the existing post-war world state and determine how this expansion should fit into it.
6. Preserve existing maps, characters, businesses, political systems, military systems, player progress, and save files.

Do not replace newer project files with older versions or rebuild existing systems unnecessarily.
Core design philosophy
The Oberverse should feel like a living sandbox rather than a collection of disconnected business-management minigames.
The player should be able to:

* Explore cities and discover unexpected situations.
* Meet interesting NPCs with individual personalities and motivations.
* Become involved in criminal activity, investigations, disputes, and personal stories.
* Complete meaningful quests without being forced into a linear storyline.
* Travel internationally and participate in intelligence operations.
* Exploit conflicts between organizations.
* Ignore all of these activities and continue playing the existing game.

Do not introduce mandatory chapters or force the player to follow a primary storyline.
The world should generate interesting opportunities organically.
PART II — THE WORLD ATLAS
1. Replace the current world map
The Atlas should become the primary global navigation interface.
The current playable map of Sund should become a location within the Atlas rather than functioning as the entire world.
The Atlas should display:

* Countries.
* Major cities.
* International borders.
* Oceans and geographical features.
* Important military installations.
* Major ports.
* Airports.
* Intelligence agency facilities.
* Significant locations and points of interest.

The map should communicate that The Oberverse is a much larger world than the currently playable area.
Use the existing game's visual style for the global Atlas. It should feel like a proper geographic world map rather than a simple menu listing destinations.
2. Seamless zooming
The Atlas must support multiple levels of navigation:
Level 1: Global Atlas

* View the entire world.
* Select countries.
* See international relationships and major geographic regions.
* Identify locations available for travel.

Level 2: Country View

* Zoom into a selected country.
* Display its cities, infrastructure, borders, and important locations.
* Highlight the cities that are currently accessible.

Level 3: City View

* Zoom into a city.
* Display its detailed map.
* Allow the player to select a destination or enter the playable environment.

Level 4: Playable Map

* Transition into the actual playable map.
* Preserve the existing movement, exploration, minimap, NPC, and interaction systems.

Zooming should feel like navigating a continuous geographic system, even if the underlying maps are separate representations.
Do not simply make the Atlas a series of unrelated static screens.
3. Sund geography
The existing playable map of Sund must be represented as a connected landmass.
This is particularly important:

* Sund should not be surrounded by artificial water barriers that divide the existing playable areas.
* All currently connected playable districts should remain connected by land.
* Streets, roads, neighborhoods, industrial areas, and other existing locations should retain their geographical relationships.
* The global Atlas must accurately represent Sund as a country or geographic region within the larger world.

Do not redesign the existing playable map unnecessarily just to accommodate the Atlas.
The Atlas should be a larger navigation layer built around the existing world.
4. Future expansion compatibility
The Atlas must support future countries and cities without requiring a complete redesign.
Create a reusable geographic data model containing:

* Country ID.
* Country name.
* Region.
* Geographic boundaries.
* Cities.
* City IDs.
* City maps.
* Population estimates.
* Government information.
* Political relationships.
* Economic characteristics.
* Travel availability.
* Mission availability.
* Points of interest.

The first international cities described below should be implemented using this system.
PART III — MAKE SUND A LIVING WORLD
1. The central problem
The current world needs more things to do.
There are buildings that feel empty, locations that lack meaningful interactions, and too few opportunities for the player to encounter interesting situations while exploring.
I want to significantly increase the amount of narrative and interactive content.
Use the density and variety of side activities found in large narrative-driven open-world RPGs as a benchmark. Cyberpunk-style quest density is a useful reference, but do not copy its characters, stories, dialogue, missions, or protected assets.
The goal is to make ordinary exploration rewarding.
2. Populate empty buildings
Audit the existing map and identify buildings that currently serve little or no gameplay purpose.
Develop a building-population system that allows these locations to become meaningful places.
Possible uses include:

* Apartments.
* Houses.
* Small businesses.
* Bars.
* Restaurants.
* Offices.
* Workshops.
* Clinics.
* Pawn shops.
* Illegal businesses.
* Warehouses.
* Clubs.
* Government offices.
* Community centers.
* Private residences.
* Gang-controlled properties.
* Abandoned buildings.
* Informal meeting locations.

Not every building needs a complicated interior.
However, buildings selected for meaningful interactions should have appropriate interiors, NPCs, dialogue, activities, or quest opportunities.
Reuse existing building and interior systems wherever possible.
3. NPC personalities and individual storylines
NPCs should become more than background characters.
Create a system for persistent named NPCs with:

* Names.
* Occupations.
* Personalities.
* Homes.
* Relationships.
* Daily schedules.
* Financial circumstances.
* Personal motivations.
* Problems or conflicts.
* Dialogue.
* Quest availability.
* Reputation and relationships with the player.

Examples of possible NPC stories:
The indebted business owner
A small business owner is struggling with debt and receives pressure from a criminal organization. The player can help, exploit the situation, or ignore it.
The corrupt police officer
An officer is secretly accepting money from a local gang. The player may uncover the arrangement, blackmail the officer, expose the corruption, or become involved.
The missing neighbor
A seemingly ordinary resident disappears. Their apartment, relationships, and previous activities provide clues to what happened.
The aspiring musician
An NPC is trying to establish a career but faces financial problems, criminal pressure, or personal conflicts.
The former soldier
A former military member struggles to reintegrate into civilian life after the war. Their story can develop into several different quest opportunities.
The small-time criminal
A low-level criminal wants to become more influential but lacks the connections and resources to do so.
These are examples, not a restrictive list.
Create a broad variety of characters and stories.
NPCs should have believable motivations. Avoid making every NPC's storyline revolve around murder, gangs, or corruption.
4. Quest system
Create a substantial quest framework that supports both authored storylines and smaller activities.
Quest categories should include:

* Personal stories.
* Investigation.
* Missing persons.
* Criminal activity.
* Police-related activities.
* Business disputes.
* Deliveries.
* Escort missions.
* Theft.
* Recovery missions.
* Political opportunities.
* Social interactions.
* Financial disputes.
* Gang-related activities.
* Random encounters.
* Intelligence-related leads.

Quests should support multiple approaches.
For example, a missing-person investigation could be resolved through:

* Talking to witnesses.
* Searching an apartment.
* Bribing an informant.
* Breaking into a building.
* Following a suspect.
* Using force.
* Finding an alternative explanation.

Avoid making every quest a simple marker-to-marker fetch quest.
5. Meaningful consequences
NPCs and quests should respond to player decisions.
Possible consequences:

* NPCs become friendly or hostile.
* Organizations change their opinion of the player.
* Businesses become available or unavailable.
* New quests become accessible.
* Police investigations begin.
* Criminal organizations retaliate.
* NPCs relocate, disappear, or change schedules.
* Certain storylines become unavailable.
* New opportunities emerge.

Use persistent state for Sund's NPCs and questlines.
The world should remember important things the player has done.
6. Quest discovery
Do not rely exclusively on traditional quest markers.
Allow quests to be discovered through:

* Conversations.
* Environmental clues.
* Newspapers or broadcasts.
* Advertisements.
* Text messages.
* Phone calls.
* NPC arguments.
* Random encounters.
* Visiting locations.
* Observing suspicious activity.
* Existing relationships.

Create an optional journal that tracks discovered quests, leads, objectives, and relevant NPCs.
The journal should not reveal information the player has not discovered.
PART IV — DYNAMIC WORLD EVENTS
1. Random event framework
Introduce a persistent dynamic-event system that generates situations around the player.
Events should occur independently of the player's quest progression.
The objective is to make the world feel unpredictable and active.
Examples include:
Criminal activity

* Gangs fighting over territory.
* Gang members attacking civilians.
* Armed robberies.
* Store break-ins.
* Vehicle theft.
* Drug deals.
* Criminal intimidation.
* Organized ambushes.

Police activity

* Police pursuing suspects.
* Officers responding to robberies.
* Gang members fighting police.
* Police conducting investigations.
* Roadblocks.
* Arrests.
* Hostage situations.
* Police responding to disturbances.

Civilian activity

* Arguments.
* Public disturbances.
* Car accidents.
* Medical emergencies.
* Protests.
* Street performers.
* Random acts of kindness.
* Disputes between neighbors.
* Suspicious activity reported by residents.

Economic activity

* Store closures.
* Business disputes.
* Failed deliveries.
* Strikes.
* Public demonstrations.
* Sudden shortages.
* Illegal business operations.

These are examples of event types, not a finite list.
2. Player involvement
Events should provide opportunities for the player to intervene.
For example, when a store is robbed:

* The player can intervene.
* Help the criminals escape.
* Call the police.
* Rob the store themselves.
* Ignore the incident.
* Exploit the distraction to commit another crime.

When gangs fight police:

* Assist the police.
* Assist the gang.
* Attack both groups.
* Steal vehicles or equipment.
* Use the situation as a distraction.
* Leave the area.

Events should not require player participation.
The world should continue functioning when the player ignores them.
3. Dynamic event simulation
Events should have:

* Unique event IDs.
* Location.
* Participating NPCs.
* Organizations involved.
* Start time.
* Duration.
* Current state.
* Possible outcomes.
* Rewards and consequences.
* Cleanup and resolution logic.

Events should progress according to their circumstances.
For example, a gang conflict should not continue indefinitely after all participants have left or died.
Police should respond according to their actual capabilities and existing wanted-level mechanics.
NPCs should react to nearby danger.
Civilians should flee, hide, call authorities, or otherwise respond appropriately.
4. Variety and performance
Avoid repeating the same event in the same location constantly.
Implement:

* Event cooldowns.
* Geographic variation.
* Weighted event selection.
* Time-of-day modifiers.
* Faction-based event probabilities.
* Population-based event probabilities.
* Player proximity and activity checks.
* Event resolution when the player leaves.

Do not simulate every event with expensive continuous calculations.
Use efficient state transitions and distance-based simulation.
5. Dynamic event reporting
Events may be communicated through:

* Local news.
* Radio.
* Phone notifications.
* NPC conversations.
* Police reports.
* Newspapers.

These reports should reflect events that actually occurred.
Do not generate fake news describing events that never happened.
PART V — INTERNATIONAL TRAVEL AND THE CENTRAL INTELLIGENCE AGENCY
1. Introduce international operations
The player should eventually be able to travel to other countries.
For the initial implementation, international access should be organized through a central intelligence agency.
The agency hires the player to perform contracts outside Sund.
The intelligence agency should serve as a gateway into international gameplay, not as a mandatory main storyline.
The player should have to establish contact and gain access to available contracts.
2. Intelligence agency headquarters
Create a central intelligence agency with:

* A physical headquarters in Sund.
* An identifiable agency name and original visual identity.
* A director.
* Mission handlers.
* Analysts.
* Administrative personnel.
* Security personnel.
* Briefing rooms.
* Mission planning facilities.

Create persistent agency NPCs with dialogue and schedules.
The agency should feel like an actual institution rather than a mission-selection menu.
The player should be able to interact with agency personnel, learn about international situations, and receive contracts.
3. Intelligence contracts
Create a contract system capable of supporting a wide variety of operations.
Examples include:

* Assassinations.
* Target surveillance.
* Information gathering.
* Document recovery.
* Data theft.
* Asset extraction.
* Hostage recovery.
* Sabotage.
* Evidence destruction.
* Infiltration.
* Political intelligence.
* Corporate espionage.
* Smuggling.
* Interrogation.
* Tracking individuals.
* Recovering stolen property.
* Protecting informants.
* Eliminating or disrupting criminal networks.

Do not restrict the player to combat-oriented missions.
Stealth, deception, hacking, disguise, social interaction, and environmental manipulation should all be viable approaches where appropriate.
4. Mission briefings
Every major contract should have a briefing.
Include:

* Target location.
* Country.
* City.
* Mission objective.
* Known target information.
* Relevant organizations.
* Available intelligence.
* Known security arrangements.
* Optional objectives.
* Expected payment.
* Potential complications.

Information should be incomplete where appropriate.
The player should be able to discover additional intelligence through exploration.
5. International mission structure
International missions should operate differently from ordinary Sund gameplay.
The foreign city should be loaded as a mission environment.
The player travels there for a specific contract or operation.
The mission should have:

* An entry point.
* A defined operational area.
* Primary objectives.
* Optional objectives.
* NPC routines.
* Security arrangements.
* Environmental opportunities.
* Extraction or completion conditions.

The player should be able to approach objectives in different ways.
A successful mission should not require following one predetermined route.
PART VI — MISSION INSTANCING AND HITMAN-STYLE GAMEPLAY
This is one of the most important parts of the expansion.
International operations should feel like self-contained sandbox missions inspired by Hitman.
Do not simply copy Hitman's level layouts, characters, or assets. The goal is to reproduce the systemic gameplay philosophy.
1. Mission-contained world state
The international mission environment should have its own isolated state.
During a mission, the player can:

* Kill NPCs.
* Steal clothing.
* Change disguises.
* Trigger alarms.
* Hack devices.
* Cause gang conflicts.
* Manipulate security systems.
* Destroy objects.
* Change NPC schedules.
* Cause panic.
* Create distractions.
* Alter the environment.

These changes should affect the remainder of the current mission.
However, the foreign city's mission-specific state should reset when the player leaves or completes the operation.
This includes:

* NPC deaths.
* NPC injuries.
* Stolen clothing.
* Disguise changes.
* Destroyed objects.
* Altered security states.
* Hacked devices.
* Triggered events.
* Local police activity.
* Local gang conflicts.
* Temporary environmental damage.
* Mission-specific inventory changes.

The player should not permanently alter the foreign city through ordinary mission actions.
2. Persistent exceptions
The following information should persist outside the mission:

* Mission completion.
* Contract rewards.
* Agency reputation.
* Intelligence gathered.
* Unlocked missions.
* Permanent player progression.
* Explicitly designed campaign-level consequences.

For example, if the player steals intelligence during a mission, the intelligence can remain available after returning to Sund.
However, the hacked computer should return to its original state the next time the city is loaded.
Use a strict separation between mission-local state and persistent player state.
3. Reset architecture
Create a clear mission lifecycle:

1. Generate or load the city template.
2. Instantiate the mission-specific environment.
3. Initialize NPCs, schedules, security, equipment, and objects.
4. Execute the mission.
5. Record the outcome and permitted persistent rewards.
6. Unload the mission instance.
7. Restore the original city template.
8. Return the player to Sund or the appropriate staging location.

Avoid saving mission-local damage or NPC deaths into the permanent foreign-city template.
This should be enforced through the data architecture rather than relying on developers remembering to reset individual objects.
4. Sandbox mission design
Every major mission should have multiple possible approaches.
For example, an assassination could involve:

* Direct combat.
* A disguised approach.
* Infiltration through a restricted entrance.
* Manipulating an NPC's schedule.
* Creating a distraction.
* Using environmental hazards.
* Acquiring information from another NPC.
* Finding an alternative route.

NPCs should react to the player's behavior.
Disguises should not provide universal invisibility.
Security personnel should notice suspicious behavior, restricted-area access, weapons, and inconsistencies where appropriate.
The mission should reward creativity rather than requiring one exact solution.
PART VII — FIRST INTERNATIONAL CITY: NEUMINA
1. City identity
The first international destination should be Neumina.
Claude should select an appropriate fictional country for Neumina to belong to.
Create a country profile explaining:

* Its name.
* Government.
* Economic structure.
* Political environment.
* International relationships.
* Technological development.
* Criminal environment.
* Why the intelligence agency is operating there.

Neumina should be a highly developed cyberpunk city.
It must feel visually and mechanically distinct from Sund.
The city should have a strong identity rather than simply using purple lighting and neon signs.
2. Visual reference
Use the image attached to this request as the visual reference for Neumina.
The reference depicts a dense, stylized 2D pixel-art cyberpunk environment with:

* Dense urban construction.
* Multi-level streets and buildings.
* Neon signs.
* Purple and blue lighting.
* Dark city architecture.
* Bright storefronts.
* Pedestrians.
* Street-level businesses.
* Industrial and technological infrastructure.
* Detailed environmental objects.
* A distinctive nighttime atmosphere.

Use this as an art-direction reference.
Do not reproduce the image exactly.
Create original buildings, streets, signs, businesses, characters, architecture, and environmental details.
Maintain compatibility with the existing game's 2D visual style and rendering technology.
3. Dynamic city map
Claude must design and implement an actual playable map for Neumina.
The map should not be a small decorative environment or a single mission room.
Create a city with several distinct districts, such as:

* Corporate district.
* Residential district.
* Commercial entertainment district.
* Industrial district.
* Underground or service infrastructure.
* Criminal-controlled areas.
* Public transportation areas.
* Restricted technological facilities.

The exact layout is up to Claude, but the districts must connect logically.
The map should support exploration, missions, NPC schedules, and multiple approaches to objectives.
4. Verticality and urban density
Neumina should feel dense.
Include:

* Narrow streets.
* Alleys.
* Rooftops.
* Elevated walkways.
* Multi-level buildings.
* Underground passages.
* Commercial interiors.
* Residential interiors.
* Corporate facilities.
* Security checkpoints.
* Public transit locations.

Where the existing game supports it, allow the player to enter buildings and use different vertical levels.
Do not create inaccessible visual scenery that suggests gameplay but has no interaction.
Use detailed environmental art, signs, lighting, props, windows, advertisements, and background activity.
5. Cybernetic technology
Neumina should introduce cybernetic technology as a real gameplay system.
NPCs should have cybernetic implants and technological augmentations.
Examples include:

* Cybernetic eyes.
* Neural interfaces.
* Communication implants.
* Biometric identification.
* Smart weapons.
* Cybernetic limbs.
* Personal data systems.
* Security implants.
* Medical implants.

These should not all be cosmetic.
Certain implants should create gameplay opportunities.
6. Hacking and cybernetic manipulation
The player should be able to hack into certain cybernetic devices and technological systems.
Potential actions include:

* Temporarily disabling an implant.
* Disrupting an NPC's communications.
* Accessing personal information.
* Interfering with targeting systems.
* Disabling security enhancements.
* Triggering temporary sensory disruption.
* Causing a device to malfunction.
* Creating distractions.
* Manipulating nearby connected systems.

Hacking should require appropriate access, tools, skills, or mission-specific opportunities.
Create meaningful limitations:

* Some devices are protected.
* Some systems have detection mechanisms.
* Failed attempts can alert security.
* Higher-level systems require better equipment or intelligence.
* Certain targets may have countermeasures.

Do not make hacking an unlimited button that automatically solves every encounter.
7. Hacking consequences and chaos
The player should be able to use cybernetic interference to create unexpected situations.
For example:

* Disrupt an enemy's communications before entering a facility.
* Cause a security guard's implant to malfunction.
* Trigger a distraction in a crowded area.
* Interfere with a target's technological equipment.
* Create confusion among security personnel.
* Exploit connected security devices.

These actions should be simulated using clear game rules.
Avoid arbitrary outcomes.
NPCs should respond according to their roles, awareness, equipment, and current circumstances.
8. Neumina NPCs and factions
Create a population with:

* Ordinary residents.
* Corporate employees.
* Security personnel.
* Technicians.
* Hackers.
* Criminal organizations.
* Informants.
* Street vendors.
* Intelligence assets.
* Government personnel.

Each group should have distinct behavior and relationships.
Include persistent city-template NPC identities and mission-local NPC instances.
The city should feel populated and active even when the player is not pursuing a mission.
9. Neumina intelligence missions
Create an initial collection of missions that demonstrate the city's systems.
Examples:

* Infiltrate a corporation and retrieve classified information.
* Assassinate a protected individual with cybernetic security.
* Identify an intelligence asset who has stopped communicating.
* Disable a technological surveillance network.
* Recover a stolen data package.
* Extract an informant.
* Manipulate a corporate security system.
* Investigate a suspicious technological experiment.

These are examples.
Create several fully developed missions with meaningful objectives, different approaches, and optional opportunities.
Do not create a large quantity of shallow missions just to inflate the mission count.
PART VIII — SECOND INTERNATIONAL CITY: THE NOIR MOB CITY
1. City identity
The next international destination should be a noir-inspired city controlled by three rival criminal organizations.
Claude should choose the city name and country.
The city should feel distinctly different from both Sund and Neumina.
Its visual direction should evoke classic crime noir:

* Dark streets.
* Rainy weather.
* Neon signs.
* Vintage architecture.
* Nightclubs.
* Casinos.
* Hotels.
* Alleys.
* Warehouses.
* Docks.
* Private clubs.
* Police stations.
* Mob-controlled businesses.

Use a distinctive palette, architecture, lighting, and environmental design.
Do not simply make Neumina with less technology.
2. Three rival mob organizations
Create three major criminal organizations that effectively control the city.
Each organization needs:

* A unique name.
* A leader.
* Senior lieutenants.
* Members.
* Businesses.
* Territory.
* Safehouses.
* Financial interests.
* Distinctive clothing.
* Vehicles.
* Reputation.
* Relationships with the police.
* Rivalries with the other organizations.

Give each mob a different identity and operating style.
For example, one may specialize in gambling and financial crime, another in smuggling and dock operations, and another in protection rackets and political corruption.
Claude should develop original organizations with their own histories, characters, and visual identities.
3. Disguise and clothing system
The player should be able to acquire and wear clothing associated with the three rival organizations.
Disguises should affect how NPCs perceive the player.
The player should be able to:

* Steal clothing from a mob member.
* Obtain uniforms through other means.
* Wear rival gang colors.
* Enter certain areas with reduced suspicion.
* Impersonate a member of a rival organization.
* Use disguises to create conflict.

However, disguises must not automatically fool every NPC.
Recognition should depend on:

* Whether the NPC knows the player.
* Whether the NPC recognizes the disguise.
* Whether the player is wearing the correct clothing.
* Whether the player is carrying suspicious equipment.
* Whether the player behaves appropriately.
* Whether the NPC belongs to the organization being impersonated.
* Whether the NPC has a reason to be suspicious.

4. Provoking mob wars
This is a central gameplay feature.
The player should be able to deliberately cause conflict between the three criminal organizations.
One particularly important mechanic:
The player can dress as a member of one mob and commit hostile acts against another organization.
If discovered, the victim organization may believe the attack was carried out by the rival group.
This should create an opportunity for the player to manipulate the city's criminal politics.
Examples:

* Dress as Mob A and attack a Mob B business.
* Steal a vehicle associated with Mob C.
* Plant evidence suggesting another organization committed a crime.
* Attack a rival member while disguised.
* Manipulate communications or information.
* Create a confrontation between rival members.

The system should evaluate evidence and suspicion.
Not every attack should automatically start a full-scale war.
However, sufficiently convincing incidents can trigger retaliation.
5. Escalating conflict system
Mob conflicts should escalate dynamically.
Possible stages:
Stage 1: Suspicion
One organization suspects another of interference.
Stage 2: Retaliation
A business, vehicle, member, or territory is attacked.
Stage 3: Street Conflict
Armed members begin confronting one another.
Stage 4: Open Mob War
The organizations actively attack each other's operations.
Stage 5: Citywide Chaos
Multiple areas become dangerous. Police response increases. Civilians react. Businesses close or become inaccessible.
The player should be able to exploit the chaos.
For example:

* Infiltrate a weakened mob headquarters.
* Steal money or documents during a conflict.
* Eliminate a target while security is distracted.
* Recover an object from a contested location.
* Extract an informant.
* Help one organization defeat another.
* Manipulate the conflict to weaken all three.

The player should also be able to calm, redirect, or prevent conflicts where appropriate.
6. Living criminal ecosystem
The three organizations should not simply spawn enemies when a mission starts.
They should have an underlying city-template simulation:

* Businesses.
* Territory.
* Leadership.
* Membership.
* Security.
* Relationships.
* Criminal operations.
* Police contacts.
* Rivalries.

Within each mission, the city should instantiate a mission-specific version of this world.
Mob members should have schedules and roles.
The player should be able to observe and exploit their routines.
7. Noir mission examples
Create several fully developed missions that demonstrate the mob-conflict system.
Examples:

* Assassinate a mob lieutenant during a private club meeting.
* Recover a ledger from a heavily guarded warehouse.
* Infiltrate a casino owned by one of the organizations.
* Manipulate two mobs into attacking one another.
* Extract an informant from a hostile neighborhood.
* Steal evidence from a police-controlled evidence room.
* Eliminate a target while making the death appear to be the work of a rival organization.
* Sabotage a criminal operation without exposing the player.

These should be open-ended missions with multiple solutions.
PART IX — INTERNATIONAL CITY DESIGN STANDARD
Both international cities must meet a higher standard of environmental and gameplay detail than a simple prototype map.
Each city needs:

* A distinctive map layout.
* Multiple connected districts.
* Recognizable landmarks.
* Commercial interiors.
* Residential interiors.
* NPC populations.
* Factions and organizations.
* Environmental storytelling.
* Side activities.
* Mission locations.
* Alternative routes.
* Security systems.
* Distinctive ambient audio.
* Unique visual identity.

Each city should be reusable across multiple missions.
Do not create a separate copy of the same city for every contract.
Instead, load the same city template and instantiate different mission configurations.
The mission system should determine:

* Which NPCs are present.
* Which NPCs are targets.
* Which factions are active.
* Which buildings are accessible.
* Which security systems are enabled.
* Which objects are mission-critical.
* Which events can occur.

The same city should produce different experiences depending on the mission.
PART X — QUEST AND MISSION CONTENT QUALITY
I want a meaningful amount of content, not just the infrastructure for content.
Do not finish this expansion with empty buildings and a mission-selection screen.
Create actual playable content.
Sund
Populate a substantial selection of currently empty buildings.
Introduce a meaningful collection of named NPCs with interconnected personal stories.
Add a broad variety of questlines and dynamic events.
Neumina
Create a playable city map with distinct districts, meaningful hacking opportunities, cybernetic interactions, and several fully developed intelligence contracts.
Noir city
Create a playable city map with three rival mobs, disguise mechanics, escalating conflicts, and several fully developed intelligence contracts.
Every major mission should include:

* A clear objective.
* Relevant NPCs.
* Environmental opportunities.
* Multiple approaches.
* Optional objectives.
* A meaningful completion state.
* Appropriate rewards.
* A tested reset process.

Avoid placeholder dialogue and generic mission descriptions.
PART XI — USER INTERFACE
Integrate the new systems into the existing interface rather than creating disconnected menus.
Atlas interface
Provide:

* Global map.
* Country selection.
* City selection.
* Zoom controls.
* Location details.
* Travel availability.
* Mission availability.
* Geographic points of interest.

Journal
Expand the existing journal or create one if necessary.
Include:

* Main discoveries.
* Personal quests.
* Side quests.
* Intelligence contracts.
* Mission objectives.
* NPC information.
* Leads.
* Completed activities.
* Relevant notes.

Keep undiscovered information hidden.
Intelligence agency interface
Provide:

* Available contracts.
* Mission briefings.
* Intelligence reports.
* Agency contacts.
* Mission rewards.
* Reputation.
* Completed operations.

Mission interface
Keep mission objectives clear but unobtrusive.
The player should not need to stare at a checklist to understand the environment.
Use environmental cues and NPC behavior to communicate opportunities.
PART XII — TECHNICAL ARCHITECTURE AND PERSISTENCE
This expansion introduces a critical distinction between persistent world simulation and temporary mission simulation.
Implement this deliberately.
1. Persistent Sund state
Sund retains:

* NPC identities and outcomes.
* Quest progression.
* Relationships.
* World events.
* Business state.
* Political state.
* Crime and wanted-level consequences.
* Player progression.
* Important discoveries.

2. Foreign city templates
Each foreign city should have an authoritative baseline template.
It contains:

* Buildings.
* Districts.
* NPC definitions.
* Faction definitions.
* Schedules.
* Security layouts.
* Environmental objects.
* Mission locations.

This baseline should not be overwritten by temporary mission actions.
3. Mission instances
Each mission instance should have its own state.
It may temporarily modify:

* NPC health and location.
* NPC deaths.
* Clothing.
* Disguises.
* Faction hostility.
* Building access.
* Security.
* Hacking.
* Environmental destruction.
* Mission events.
* Local inventory.
* Mission-specific objects.

4. Persistent mission results
When a mission ends, explicitly extract only approved persistent results.
Examples:

* Mission completion.
* Payment.
* Agency reputation.
* Intelligence files.
* New contract unlocks.
* Permanent player equipment.
* Explicit campaign consequences.

Do not accidentally persist temporary NPC deaths, destruction, stolen local clothing, or temporary faction hostility.
5. Save/load and migration
Implement:

* Stable IDs.
* Explicit save migrations.
* Validation.
* Error handling.
* Safe handling of interrupted missions.
* Prevention of duplicate rewards.
* Prevention of duplicate mission instances.
* Consistent mission cleanup.

Test save/load both inside and outside international missions.
PART XIII — IMPLEMENTATION STAGES
Implement the expansion in the following order.
Stage 1: Existing project audit

* Inspect current project and architecture.
* Document current map, systems, saves, and integration points.
* Identify empty buildings and reusable mechanics.
* Establish a preservation and migration strategy.

Stage 2: World Atlas

* Implement global Atlas.
* Add country and city navigation.
* Integrate Sund into the Atlas.
* Ensure the existing Sund map remains connected by land.
* Test zoom transitions and map navigation.

Stage 3: Sund population and buildings

* Populate selected empty buildings.
* Create reusable NPC identity and schedule systems.
* Add meaningful interiors and interactions.
* Preserve existing NPC systems.

Stage 4: Quest and narrative framework

* Implement quest data models.
* Add NPC storylines.
* Add discovery methods.
* Add journal integration.
* Create actual playable Sund quests.

Stage 5: Dynamic events

* Implement the random-event framework.
* Add gang and police encounters.
* Add robberies and civilian incidents.
* Implement event outcomes and cooldowns.
* Connect events to NPC and faction systems.

Stage 6: Intelligence agency

* Create the agency headquarters.
* Add persistent agency personnel.
* Add contract management.
* Add mission briefings.
* Implement international travel access.

Stage 7: Mission-instance architecture

* Implement city templates.
* Implement mission-local state.
* Implement mission initialization.
* Implement cleanup and reset.
* Test that temporary state never contaminates permanent city data.

Stage 8: Neumina

* Design and build the city map.
* Implement districts and interiors.
* Add cybernetic technology.
* Add hacking mechanics.
* Add NPCs and factions.
* Create playable intelligence contracts.

Stage 9: Noir city

* Design and build the city map.
* Implement three rival mob organizations.
* Implement disguises.
* Implement suspicion and recognition.
* Implement conflict escalation.
* Create playable intelligence contracts.

Stage 10: Content expansion

* Add additional Sund stories.
* Add more random events.
* Add more foreign contracts.
* Improve environmental storytelling.
* Add optional activities.

Stage 11: Testing and polish

* Test map navigation.
* Test quests.
* Test NPC schedules.
* Test event resolution.
* Test hacking.
* Test disguises.
* Test mob wars.
* Test mission resets.
* Test save/load.
* Test performance.
* Test existing game functionality.

Stage 12: Documentation and release

* Update the game version.
* Update the changelog.
* Document new systems.
* Document new data structures.
* Document save migrations.
* Update the existing prompt bank with this expansion prompt and implementation notes.

PART XIV — ACCEPTANCE TESTS
The expansion is not complete until the following can be demonstrated.
Atlas

* The Atlas displays multiple countries.
* The player can zoom from global view to country and city views.
* Sund is accessible through the Atlas.
* Sund's playable districts remain connected by land.
* The Atlas supports additional future cities.

Sund

* Previously empty buildings have been meaningfully populated.
* Named NPCs have individual identities and routines.
* NPCs offer discoverable quests.
* Quest decisions produce meaningful consequences.
* The player can ignore quests without breaking the world.
* Dynamic events occur independently of quest progression.
* Police, gangs, and civilians react appropriately to events.
* Events resolve and do not continue indefinitely.

Intelligence agency

* The agency exists as a physical location.
* Agency NPCs have persistent identities.
* The player can obtain contracts.
* Contracts have briefings and meaningful objectives.
* The player can travel to the designated international city.

Neumina

* Neumina has its own country and city identity.
* The map is playable and distinct from Sund.
* The visual direction reflects the supplied reference.
* The city has multiple connected districts.
* Cybernetic implants exist as gameplay objects.
* Hacking has real consequences and limitations.
* Multiple intelligence missions are playable.

Noir city

* The city has a distinct visual identity.
* Three rival mob organizations exist.
* Each organization has territory, leadership, members, and businesses.
* The player can acquire disguises.
* NPC recognition and suspicion function correctly.
* The player can provoke conflicts between rival mobs.
* Conflicts escalate through defined stages.
* The player can exploit these conflicts during missions.

Mission instances

* Temporary mission actions affect the current mission.
* Foreign city templates remain unchanged.
* NPCs and environmental changes reset after leaving.
* Mission rewards and approved discoveries persist.
* Mission outcomes cannot be duplicated.
* Interrupted missions clean up safely.

Existing game

* Existing Sund gameplay remains functional.
* Existing corporations and financial systems remain functional.
* Existing political and military systems remain functional.
* Existing NPCs and player progression remain intact.
* Existing saves load correctly.

PART XV — QUALITY EXPECTATIONS AND FINAL INSTRUCTIONS
Do not compromise the quality of the implementation simply to complete every stage quickly.
I would rather have fewer fully functional missions and a detailed city than a large number of empty maps and generic contracts.
Visual quality matters.
The international cities should feel handcrafted, populated, and recognizable. Neumina should have the dense cyberpunk atmosphere of the supplied reference. The noir city should have its own recognizable architecture and atmosphere.
Gameplay quality matters just as much.
NPCs need meaningful behavior. Quests need interesting objectives. Random events need real outcomes. Hacking needs functional consequences. Disguises need a recognition system. Mob conflicts need an actual escalation model.
Do not implement features as decorative menus or buttons that do nothing.
Do not create artificial complexity that damages performance.
Do not replace working systems unnecessarily.
Do not claim a feature is complete unless it has been implemented and tested.
Most importantly, do not let this expansion turn The Oberverse into a business simulator with occasional side activities.
The world should be the main attraction.
The player should be able to spend hours exploring Sund, meeting characters, completing quests, witnessing random events, and getting involved in unexpected situations without ever needing to manage a corporation.
International operations should provide an entirely different experience: carefully designed, self-contained, replayable sandbox missions where planning, disguises, stealth, hacking, deception, and improvisation are all viable.
Build a living world with stories happening everywhere, and make international operations feel like stepping into a completely different game without leaving The Oberverse.
At the end, provide:

1. A summary of implemented features.
2. A list of modified and created files.
3. A description of the Atlas and geographic structure.
4. A list of populated buildings, NPCs, and completed Sund quests.
5. A list of dynamic events implemented.
6. Details of Neumina and its playable missions.
7. Details of the noir city and its playable missions.
8. An explanation of mission-local versus persistent data.
9. Tests performed and their results.
10. Known limitations and unfinished work.
11. Save migration details.
12. Recommended next expansion priorities.
