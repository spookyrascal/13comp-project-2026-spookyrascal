import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { collection, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* =========================
   DOM CACHE
========================= */

// TODO:
// - move into a shared UI module if reused elsewhere

const el = {
  tbody: document.querySelector("#LeaderboardTable tbody"),
  profileImage: document.getElementById("profileImage"),
  profileName: document.getElementById("profileName")
};

/* =========================
   PROFILE HEADER
========================= */

// Displays current logged-in user at top of leaderboard
// TODO:
// - handle loading state (before auth resolves)
// - add fallback avatar UI if missing image

onAuthStateChanged(auth, (user) => {
  if (!user) return;

  el.profileImage.src = user.photoURL || "./Images/defaultPFP.jpg";
  el.profileName.textContent = user.displayName || "Player";
});

/* =========================
   HELPERS
========================= */

// Safe number conversion (prevents NaN bugs)
// TODO: central utility file if reused across game

const num = (v) => Number(v) || 0;

// Calculates win percentage
// TODO: round styling or progress bar UI later

const winRate = (wins, games) =>
  games ? ((wins / games) * 100).toFixed(1) : "0.0";

/* =========================
   LEADERBOARD STREAM
========================= */

// Real-time leaderboard updates from Firestore
// TODO:
// - limit top 50 players (performance)
// - add pagination or "load more"
// - cache leaderboard locally to reduce reads
// - highlight current user row

onSnapshot(collection(db, "users"), (snap) => {
  const players = [];

  snap.forEach((docSnap) => {
    const u = docSnap.data();

    const wins = num(u.wins);
    const games = num(u.gamesPlayed);

    players.push({
      name: u.displayName || "Player",
      photo: u.photoURL || "./Images/defaultPFP.jpg",
      wins,
      games,
      best: num(u.bestScore), // TODO: define what "bestScore" means in game logic
      rate: winRate(wins, games)
    });
  });

  // Sort leaderboard (highest wins first)
  players.sort((a, b) => b.wins - a.wins);

  render(players);
});

/* =========================
   RENDER FUNCTION
========================= */

// Builds leaderboard table UI
// TODO:
// - animate row changes (smooth reordering)
// - highlight top 3 players
// - highlight current user row
// - add rank icons (🥇🥈🥉)

function render(players) {
  const tbody = el.tbody;
  if (!tbody) return;

  if (!players.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6">No players yet 😭</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = players
    .map((p, i) => `
      <tr>
        <td><strong>#${i + 1}</strong></td>

        <td class="playerCell">
          <img class="lb-pfp" src="${p.photo}" alt="profile" />
          <span>${p.name}</span>
        </td>

        <td>${p.wins}</td>
        <td>${p.games}</td>
        <td>${p.rate}%</td>
        <td>${p.best}</td>
      </tr>
    `)
    .join("");
}
