// Bounded, importance-based character memory.
// - recent: short FIFO of everyday happenings (cap RECENT_CAP)
// - significant: important events (importance >= SIGNIFICANT_AT), evicted by
//   lowest importance, then oldest, once SIGNIFICANT_CAP is reached.
export const RECENT_CAP = 12;
export const SIGNIFICANT_CAP = 24;
export const SIGNIFICANT_AT = 6;

export function emptyMemory() {
  return { recent: [], significant: [] };
}

export function remember(npc, entry, now) {
  const mem = npc.memory || (npc.memory = emptyMemory());
  const item = { text: entry.text || '', tag: entry.tag || null, about: entry.about || null, importance: entry.importance ?? 3, at: now };
  if (item.importance >= SIGNIFICANT_AT) {
    mem.significant.push(item);
    if (mem.significant.length > SIGNIFICANT_CAP) {
      let worst = 0;
      for (let i = 1; i < mem.significant.length; i++) {
        const a = mem.significant[i];
        const w = mem.significant[worst];
        if (a.importance < w.importance || (a.importance === w.importance && a.at < w.at)) worst = i;
      }
      mem.significant.splice(worst, 1);
    }
  } else {
    mem.recent.push(item);
    if (mem.recent.length > RECENT_CAP) mem.recent.shift();
  }
  return item;
}

/** Find the most recent memory with a tag, optionally no older than `withinMinutes`. */
export function recall(npc, tag, now, withinMinutes = Infinity) {
  const mem = npc.memory || emptyMemory();
  let best = null;
  for (const m of [...mem.recent, ...mem.significant]) {
    if (m.tag !== tag) continue;
    if (now - m.at > withinMinutes) continue;
    if (!best || m.at > best.at) best = m;
  }
  return best;
}

export function allMemories(npc) {
  const mem = npc.memory || emptyMemory();
  return [...mem.significant, ...mem.recent].sort((a, b) => b.at - a.at);
}
