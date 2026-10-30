// Government bonds (v0.69.0). Pure functions — no game state, no DOM, no RNG.
//
//   premium(years)                      what a longer bond yields over the policy rate
//   yieldFor(rate, years)               the yield for a bond with this long to run
//   couponAt(rate, years)               the coupon a new bond is issued with (the yield, to the quarter-point)
//   valueOf(lot, today, rate)           what a bond is worth today: the cash it still pays, discounted at today's yield
//   cashFlows(lot, today)               the coupons and the face still to come, in months from today
//
// A bond pays a month's coupon (face × coupon ÷ 12) every thirty days and the face at the end. It is worth the cash it still
// pays, discounted at today's yield for the time left: new at par when the coupon is the yield, less when yields rise, more when they fall.

export const MONTH = 30;
export const YEAR = 360;
export const TERMS = [1, 3, 5]; // years
const POINTS = [[0, 0], [1, 0.0025], [3, 0.0075], [5, 0.0125]];

export function premium(years) {
  if (years <= 0) return 0;
  if (years >= 5) return 0.0125;
  for (let i = 1; i < POINTS.length; i++) {
    const [x0, y0] = POINTS[i - 1]; const [x1, y1] = POINTS[i];
    if (years <= x1) return y0 + ((y1 - y0) * (years - x0)) / (x1 - x0);
  }
  return 0.0125;
}

export const yieldFor = (rate, years) => Math.max(0.0025, rate + premium(years));
export const couponAt = (rate, years) => Math.round(yieldFor(rate, years) / 0.0025) * 0.0025;

/** The cash a bond still pays: [{ months (from today, fractional), amount }]. lot: { face, coupon, due (the next coupon's day), end (the last day) }. */
export function cashFlows(lot, today) {
  const out = [];
  const c = (lot.face * lot.coupon) / 12;
  for (let d = lot.due; d <= lot.end; d += MONTH) {
    const last = d + MONTH > lot.end;
    out.push({ months: Math.max(0, (d - today) / MONTH), amount: c + (last ? lot.face : 0) });
    if (last) break;
  }
  return out;
}

export function valueOf(lot, today, rate) {
  const flows = cashFlows(lot, today);
  if (!flows.length) return 0;
  const y = yieldFor(rate, Math.max(0, (lot.end - today) / YEAR)) / 12;
  return Math.round(flows.reduce((a, f) => a + f.amount / (1 + y) ** f.months, 0));
}
