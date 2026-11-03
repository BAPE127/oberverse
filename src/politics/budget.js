// The state's budget (v0.94.0): one month's revenue and spending, from the active policies. Pure.
//
//   monthly(B, { policies, wars, embargoes, debt, rate })  → { revenue, spending: { …lines, policies, interest }, deficit, headroom }
// Revenue is a model of the country (a fixed base reduced by wars and embargoes); it is never taken from the player. A positive policy cost spends,
// a negative one saves. Interest is the policy rate plus a premium on the debt stock, a twelfth a month.
export function monthly(B, { policies, wars = 0, embargoes = 0, debt = 0, rate = 0.03 }) {
  const revenue = Math.round(B.revenue * Math.max(0.6, 1 - B.warPenalty * wars - B.embargoPenalty * embargoes));
  const standing = Object.values(B.standing).reduce((a, b) => a + b, 0);
  const policy = policies.reduce((a, p) => a + p.cost, 0);
  const interest = Math.round((debt * (rate + B.premium)) / 12);
  const total = standing + policy + interest;
  const deficit = total - revenue;
  return { revenue, spending: { ...B.standing, policies: policy, interest, total }, deficit, headroom: Math.round(B.revenue * B.deficitLimit) - deficit };
}
