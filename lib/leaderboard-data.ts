// Demo leaderboard. In the next phase this comes from the Supabase `players` table
// (telegram_id, display_name, score, resources, created_at). "Friends" are players
// linked through the `referrals` table (inviter_id / invitee_id).
//
// IMPORTANT (design constraint): competitive groupings use fictional CAMPAIGN
// regiment names only. Never group players by real ethnic or regional identity.

export interface LeaderPlayer {
  id: string
  name: string
  regiment: string
  score: number
  isFriend: boolean
}

const NAMES = [
  "Selam", "Dawit", "Meron", "Yohannes", "Hana", "Bereket", "Tsion", "Abel",
  "Liya", "Kaleb", "Ruth", "Nahom", "Eden", "Samuel", "Feven", "Yonas",
  "Bethlehem", "Amanuel", "Saba", "Dagmawi", "Rahel", "Kidus", "Mahlet", "Elias",
  "Genet", "Robel", "Sara", "Nathan", "Lidya", "Henok", "Hiwot", "Girma",
  "Tigist", "Fitsum", "Marta", "Bruk", "Selamawit", "Teddy", "Aster", "Micky",
  "Rediet", "Yared", "Bezawit", "Naod", "Kalkidan", "Surafel", "Mimi", "Daniel",
  "Betty", "Fasil",
]

// Fictional campaign regiment names — not tied to any real group.
const REGIMENTS = ["Dawn Vanguard", "Highland Watch", "Iron Shields", "Free Wind", "Lion Banner"]

let seed = 20240301
function rand() {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff
  return seed / 0x7fffffff
}

export const DEMO_LEADERBOARD: LeaderPlayer[] = NAMES.map((name, i) => ({
  id: `p_${i}`,
  name,
  regiment: REGIMENTS[i % REGIMENTS.length],
  score: Math.floor(4200 - i * 70 - rand() * 45),
  // A handful marked as friends (joined via referral link) for the demo.
  isFriend: [2, 5, 9, 14, 21].includes(i),
})).sort((a, b) => b.score - a.score)
