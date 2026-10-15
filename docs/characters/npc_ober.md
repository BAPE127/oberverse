# Captain Ober (`npc_ober`) — imported 2026-10-15

**Supplied:** a photo (stored with permission: `assets/portraits/reference/npc_ober_reference.jpg`; portrait crop `assets/portraits/npc_ober.jpg`) and "Captain Ober is a very stereotypical sailor", plus the shipping-company brief (he sells you his company).

**Interview answers (owner):** import him now; store the photo; talks like an **old salt** (nautical jargon, weather lore — not a pirate); **no relation** to Ober's Oil; he's **retiring** and selling to a worthy successor; based at **new docks at Mill Road Yards**; **he/him**; Wrath: **the kraken**; **jolly from the start**, treats everyone as crew; on your arms business: **an old smuggler** who winks at it; nothing to avoid. Company name: **Ober & Sons Maritime**; his ship: the **Salty Ober** (the owner named both).

**From the image (visual facts only):** navy peaked captain's cap with a gold anchor badge and braid; auburn beard; dark-rimmed glasses; navy double-breasted uniform with gold cuff stripes; white shirt, navy tie; broad build. Mapped to the new `hairStyle: 'captain'` cap and existing fields.

**Invented (approved in the design preview):** the Sons became accountants (why he's selling); he lives aboard the Salty Ober, an old red harbour tug; superstitions (no whistling indoors, no bananas aboard); a smuggling past with Lucas Eastrise ("agricultural machinery", "very pointy tractors"); Mason's Os built his harbour office; a rivalry with Sir Moneybucks over the name; the motif "Hoist Away" on a squeezebox reed.

**Routine:** tea aboard (07:00), the harbour office (08:00–17:30, lunch on the quay), a pipe by the bollards (17:30–22:00), asleep aboard the Salty Ober.

**Mechanics:** sells the company (topic `t_ober_sale` → the sale sheet; the purchase is `Logistics.buyCompany`, which also works from the terminal); afterwards gives shipowner's advice and opens the books. Protected; Wrath `kraken` (seawater floods the cobbles, tentacles slam down, a whirlpool, the kraken's eye, dragged under; foghorn, shanty, waves and a gurgle in the score).
