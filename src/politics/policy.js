// Policies and the administration (v0.94.0): how the government picks what to propose, and how a policy moves through its seven states. Pure.
//
//   fitOf(party platform, policy)            how well a policy suits a party's platform (-2 … +2)
//   score(policy, ctx)                       the administration's score for proposing it at a cabinet window: platform fit, affordability, election timing
//   chooseProposals(ctx, n)                  the best `n` candidates not already in progress, ties broken by id (no randomness)
//   advance(p, day, G)                       the next state of a policy in progress, if its wait is over: 'review' | 'vote' | 'implementing' | 'active'
import { POLICIES } from '../content/policies.js';

export const fitOf = (platform, policy) => (platform[policy.issue] || 0) * policy.dir;

/** ctx: { platform, headroom (the budget's, in thousands), campaign (bool: the election is near), approval (0..1, default .5), weights } */
export function score(policy, ctx) {
  const w = ctx.weights;
  const fit = fitOf(ctx.platform, policy);
  const afford = policy.cost <= 0 ? 0.4 : ctx.headroom >= policy.cost ? 0.2 : -Math.min(2, (policy.cost - ctx.headroom) / 150);
  const election = ctx.campaign ? (policy.cost > 0 ? -0.5 : 0.3) : 0; // before a vote a government avoids new spending and likes savings
  const approval = (ctx.approval - 0.5) * 2 * (fit > 0 ? 0.5 : -0.5);
  return fit * w.fit + afford * w.affordability + election * w.election + approval * w.approval;
}

const INPROGRESS = new Set(['proposed', 'review', 'approved', 'implementing', 'active', 'suspended']);
export const inProgress = (p) => INPROGRESS.has(p.state);

/** The best candidates. `held` is the list of policies in progress (including the active ones). A candidate whose opposite is active is a repeal: allowed only if it scores clearly better than keeping the old one. */
export function chooseProposals(ctx, held, n = 1) {
  const heldIds = new Set(held.filter(inProgress).map((p) => p.key));
  const rows = [];
  for (const policy of Object.values(POLICIES)) {
    if (heldIds.has(policy.id)) continue;
    const s = score(policy, ctx);
    const opp = held.find((p) => p.key === policy.opposes && inProgress(p));
    if (opp && s < score(POLICIES[opp.key], ctx) + 1) continue; // not worth reversing yet
    if (s <= 0.3) continue; // a government proposes only what it believes in
    rows.push({ policy, score: s, repeals: opp?.key || null });
  }
  rows.sort((a, b) => b.score - a.score || (a.policy.id < b.policy.id ? -1 : 1));
  return rows.slice(0, n);
}

/** What a policy in progress does today. */
export function advance(p, day, G) {
  const waited = day - p.since;
  if (p.state === 'proposed' && waited >= G.days.proposed) return 'review';
  if (p.state === 'review' && waited >= G.days.review) return 'vote';
  if (p.state === 'approved' && waited >= G.days.approved) return 'implementing';
  if (p.state === 'implementing' && waited >= G.days.implementing) return 'active';
  return null;
}
