// What the policies in force do (v0.96.0). Pure: from the ids of the policies in force, the bounded multipliers and levies, and the lines that say so.
//
//   effectsOf(active, E)        → { farmFee, portFees, sundArms, publicBudgets, sundDisputes, worldTension, relations, sentiment: { sector: share }, lines: [{ policy, text }] }  (neutral when E.enabled is false)
//   sentimentFor(fx, sector)    the policy's share of a sector's expected earnings (bounded)
//   debtPremium(debt, revenue, deficit, E)   what the state's debt and deficit add to the yield of its bond (a rate; 0 when comfortable)
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export function effectsOf(active, E) {
  const KEYS = ['farmFee', 'portFees', 'sundArms', 'publicBudgets', 'sundDisputes', 'worldTension', 'relations', 'policeDelay', 'fineFactor', 'sentenceFactor', 'heatFactor'];
  const out = { farmFee: 0, portFees: 0, sundArms: 0, publicBudgets: 0, sundDisputes: 0, worldTension: 0, relations: 0, policeDelay: 0, fineFactor: 0, sentenceFactor: 0, heatFactor: 0, sentiment: {}, lines: [] };
  if (!E.enabled) return out;
  for (const id of [...active].sort()) {
    const p = E.policies[id];
    if (!p) continue;
    for (const k of KEYS) out[k] += p[k] || 0;
    for (const [s, v] of Object.entries(p.sentiment || {})) out.sentiment[s] = (out.sentiment[s] || 0) + v;
    if (p.line) out.lines.push({ policy: id, text: p.line });
  }
  const B = E.bounds;
  for (const k of KEYS) out[k] = clamp(out[k], B[k][0], B[k][1]);
  for (const s of Object.keys(out.sentiment)) out.sentiment[s] = clamp(out.sentiment[s], -B.sentiment, B.sentiment);
  return out;
}

export function sentimentFor(fx, sector) {
  return clamp((fx.sentiment[sector] || 0) + (fx.sentiment._all || 0), -0.05, 0.05);
}

/** debt, revenue in thousands; deficit is the month's (positive = in deficit). */
export function debtPremium(debt, revenue, deficit, E) {
  if (!E.enabled || !(revenue > 0)) return 0;
  const D = E.debt;
  const yearRatio = debt / (revenue * 12);
  const p = Math.max(0, yearRatio - D.debtFrom) * D.perYear + Math.max(0, deficit / revenue) * D.deficitPerShare;
  return Math.round(clamp(p, 0, D.max) / 0.0001) * 0.0001;
}
