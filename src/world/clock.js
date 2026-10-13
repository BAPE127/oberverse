// World clock. Time is stored as integer-ish "total game minutes" since the
// start of day 1 (00:00). Every system that cares about time reads this single
// clock, so schedules, events and quest timers can never disagree.
export const MINUTES_PER_DAY = 1440;
export const START_TIME = 8 * 60; // day 1, 08:00
export const DEFAULT_RATE = 1; // game minutes per real second

export function parseTime(hhmm) {
  if (typeof hhmm === 'number') return hhmm;
  const [h, m] = String(hhmm).split(':').map(Number);
  return (h * 60 + (m || 0)) % MINUTES_PER_DAY;
}

export function formatTime(minuteOfDay) {
  const m = ((Math.floor(minuteOfDay) % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  const h = Math.floor(m / 60);
  return `${String(h).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

/** True when minuteOfDay lies in [from, to). Windows may wrap past midnight. */
export function inWindow(minuteOfDay, from, to) {
  const f = parseTime(from);
  const t = parseTime(to);
  const m = ((minuteOfDay % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  if (f === t) return true;
  return f < t ? m >= f && m < t : m >= f || m < t;
}

export const WEEKDAYS = ['Moonday', 'Tideday', 'Wickday', 'Thornday', 'Fairday', 'Sunsday', 'Restday'];

export class WorldClock {
  constructor(total = START_TIME, rate = DEFAULT_RATE) {
    this.total = total;
    this.rate = rate;
    this.paused = false;
  }
  get minuteOfDay() {
    return Math.floor(this.total) % MINUTES_PER_DAY;
  }
  get day() {
    return Math.floor(this.total / MINUTES_PER_DAY) + 1;
  }
  get weekday() {
    return WEEKDAYS[(this.day - 1) % WEEKDAYS.length];
  }
  get hour() {
    return Math.floor(this.minuteOfDay / 60);
  }
  get timeString() {
    return formatTime(this.minuteOfDay);
  }
  /** 0 = full day, 1 = full night, with dusk/dawn ramps. */
  get darkness() {
    const m = this.total % MINUTES_PER_DAY;
    const ramp = (a, b) => (m - a) / (b - a);
    if (m < 300) return 1; // before 05:00
    if (m < 420) return 1 - ramp(300, 420); // dawn 05:00–07:00
    if (m < 1110) return 0; // day until 18:30
    if (m < 1260) return ramp(1110, 1260); // dusk until 21:00
    return 1;
  }
  get isNight() {
    return this.darkness > 0.5;
  }
  /** Advance by real seconds. Returns the list of whole game minutes crossed. */
  tick(realSeconds) {
    if (this.paused) return 0;
    const before = Math.floor(this.total);
    this.total += realSeconds * this.rate;
    return Math.floor(this.total) - before;
  }
  /** Minutes until the given time of day (always > 0, up to one day). */
  minutesUntil(hhmm) {
    const target = parseTime(hhmm);
    let diff = target - (this.total % MINUTES_PER_DAY);
    if (diff <= 0) diff += MINUTES_PER_DAY;
    return diff;
  }
  serialize() {
    return { total: this.total, rate: this.rate };
  }
  static from(data) {
    return new WorldClock(Number.isFinite(data?.total) ? data.total : START_TIME, Number.isFinite(data?.rate) ? data.rate : DEFAULT_RATE);
  }
}
