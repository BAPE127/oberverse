// Influence (v0.95.0): the rules, pure. Chance comes only from a hash of the offer's own key, so an offer's outcome is fixed when it is made and cannot be re-rolled.
//
//   standingScore(x)                  one number for how you read to the capital (reputation, support, relationships, minus exposure)
//   tierOf(score)                     Unknown / Known / Trusted / Inner circle
//   accessOpen(contact, x)            does the door open? a relationship of `rel`, or the support AND reputation (never money alone)
//   priceOf(request, contact, n)      what a bribe costs: its worth × the contact's price × (1 + repeats)
//   takeOdds(x)                       the chance the contact takes the offer (bounded)
//   outcomes(p, illicit)              the chances of each outcome
//   pickOutcome(outcomes, u)          one outcome from a number in [0,1)
//   band(p)                           'low' | 'medium' | 'high' for the screen
import { INFLUENCE as I } from '../content/influence.js';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const unit = (str) => { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } h ^= h >>> 15; h = Math.imul(h, 2246822519); h ^= h >>> 13; return (h >>> 0) / 4294967296; };

export function standingScore({ rep, support, rel, heat }) {
  return rep * 0.6 + support * 0.5 + rel * 0.5 - heat * 1.5;
}

export function tierOf(score) {
  let t = I.tiers[0];
  for (const x of I.tiers) if (score >= x.from) t = x;
  return t;
}

/** x: { rel (the person's disposition toward you), support (your support for their party), rep }. A relationship alone, or support together with reputation. Never money alone. */
export function accessOpen(contact, x) {
  const n = contact.needs;
  return x.rel >= n.rel || (x.support >= n.support && x.rep >= n.rep);
}

/** What stands between you and the door, in words. */
export function needsText(contact) {
  const n = contact.needs;
  const rep = n.rep > 0 ? ` and a reputation of ${n.rep}` : '';
  return `a friendship (${n.rel}), or ${n.support} points of support${rep}`;
}

/** The price of a bribe: the request's worth × the contact's price × (1 + 0.35 per earlier offer to them in the last two months), rounded to a hundred. */
export function priceOf(request, contact, repeats) {
  const mult = 1 + Math.min(I.repeatCap, repeats) * 0.35;
  return Math.max(500, Math.round((request.worth * contact.price * mult) / 100) * 100);
}

/**
 * x: { rel, support, rep, repeats, pressure (0..1), gatekeeper (0..1), favours (what you have in credit), illicit, contact }
 * The chance that the contact takes it up (accepted, half done or delayed). Bounded.
 */
export function takeOdds(x) {
  const O = I.odds;
  const base = x.illicit ? O.base : O.lobbyBase;
  const p = base - x.contact.integrity * (x.illicit ? 1 : 0.4) + O.perRel * x.rel + O.perSupport * x.support + O.perRep * x.rep + (x.illicit ? 0 : O.favour * x.favours) - O.repeat * Math.min(I.repeatCap, x.repeats) * (x.illicit ? 1 : 0.5) - O.pressure * x.pressure - O.gatekeeper * x.gatekeeper;
  return clamp(p, O.floor, O.ceiling);
}

/** Every outcome and its chance. A request that is not a bribe cannot be "reported": its share is a plain refusal. */
export function outcomes(p, illicit) {
  const S = I.split;
  const out = {};
  for (const [k, v] of Object.entries(S.take)) out[k] = p * v;
  for (const [k, v] of Object.entries(S.refuse)) out[k] = (1 - p) * v;
  if (!illicit) { out.refused += out.reported; out.reported = 0; }
  return out;
}

export function pickOutcome(o, u) {
  let acc = 0;
  const keys = Object.keys(o);
  for (const k of keys) { acc += o[k]; if (u < acc) return k; }
  return keys[keys.length - 1];
}

export const band = (p) => (p >= 0.55 ? 'high' : p >= 0.3 ? 'medium' : 'low');

/** What a request is allowed to touch: a contact's issues bound the policies that can be asked of them (null = any). */
export const mayAsk = (contact, policy) => !contact.issues || contact.issues.includes(policy.issue);
