# Proposal: the OberPad's businesses, made simple (v0.90.0)

Status: **proposal, nothing built yet.** Mockups: `docs/mockups/proposal-v090-home-inbox.png` and `proposal-v090-businesses.png` (they use the game's own styles; the figures in them are samples).

## What is wrong now (measured in a built-out game)
- The Businesses group is **five tabs** (Business = arms, Ships, Farm, Aerospace, Companies), and each is built differently. Farm is a block of prices and a land list; Ships and Aerospace are another style; arms is a summary and a fold. You have to learn each one.
- Words per screen now: Bank 207, Group 107, Farm 88, Aerospace 76, World News 57, Business 44, Ships 37, Exchange 35. The target for every screen is **under 40 words and one clear next step.**
- "What needs you" is spread over four places (manager requests, a loan behind, materials short, tenders closing).

## The idea: three screens that all look the same
1. **Home → "Needs you" (the Inbox).** One yellow card on the home screen: "3 things need you". It opens a single list of cards, each a sentence, an amount and **Yes / No** (or Pay now / Later). Manager requests (expansion), a loan instalment due, parts short, a tender about to close. Nothing to read, nothing to navigate. When it is empty the card says "All quiet".
2. **Businesses.** One list, one look: icon, name, a status in two words with a coloured dot (Running · Short of 2 parts · No manager · Behind on a loan), cash, a little bar chart of the last days. Tap a row. A hero shows this month's result for all four.
3. **One business.** The same shape for arms, shipping, aerospace and farming: the month's result and cash; three tiles; **Do next** (one to three big rows, each with one button); the manager strip with the tick-boxes right there; and one fold, "the business in full ›", for everything the old pages did.

## "Do next" is what a manager would do
The planners behind the managers already work out what is worth doing — what to reorder, which contract to bid on, which research to start, what to expand into. **Do next shows the same list to you, with a button that does it now.** If you have a manager with that box ticked, the row says "Iris does this" instead. So: arms — order parts, start research; aerospace — buy parts, bid on a contract, start research; shipping and farming — expand (a port, a plot). Anything beyond that stays in the fold. (I will not invent suggestions that have no planner behind them.)

## Making it satisfying (small, and all real)
- Numbers count up when you open a screen and flash green or red when they have moved since you last looked.
- Every button gives a press response (a small squeeze) and a sound; a confirmed purchase pops a tick and slides a one-line receipt into the list ("Bought 2 parts · −3,100"), instead of reloading the page.
- Big hit areas (56 px), the same back arrow everywhere, the same yellow for "the thing to press".
- Anything that moves money still shows its price first (the two-step card, as now).
- Words: explanations live behind a "?"; no screen over 40 words.

## What is new, what is reused, what I would not do
- **Reused:** every number and button comes from a service that already exists (cash, the month's result, shortages, tenders, loans, the managers' planners). The old pages stay one tap down in the fold, so nothing is lost.
- **New, small:** a daily trail of each business's net result (14 numbers each, saved, no random numbers) for the little bar charts. Without it the charts would be monthly, which is too coarse for "the last days".
- **New, small:** the Inbox is a read of existing queues (manager requests, loans, shortages, tenders); it adds no state of its own.
- **Not doing:** a second set of businesses' own in-world terminals (the arms console, Fleet Command, the aerospace terminal) are untouched; this is the tablet only. Companies (the rivals) move to Markets, where they belong.

## Tests and risk
Pure functions for "status in two words" and the inbox list (with tests), a source scan that every business screen has the same parts and under 40 words, smoke checks that the Inbox shows a request and Yes buys it, parity (nothing about the economy changes). Existing tests that name the Business, Ships, Farm and Aerospace tablet tabs will be edited, and I will list them.

## Questions for you
1. Is the **Inbox** (one "Needs you" card on Home) the right front door?
2. Are four businesses in **one list** (instead of five tabs) what you want, with Companies (rivals) moved to Markets?
3. "Do next" shows only what a manager would also do. Enough, or do you want other suggestions, e.g. farming "plant" and shipping "send a ship"? Those need new planners.
