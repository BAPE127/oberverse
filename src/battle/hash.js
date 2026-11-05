// Chance for the battle: a hash of strings, never a draw. The same key gives the same number, so a replay reproduces a battle. (No Math.random, no clock.)
export function unit(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  h ^= h >>> 15; h = Math.imul(h, 2246822519); h ^= h >>> 13; h = Math.imul(h, 3266489917); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
export const pick = (arr, u) => arr[Math.min(arr.length - 1, Math.floor(u * arr.length))];
export const between = (a, b, u) => a + Math.floor(u * (b - a + 1));
