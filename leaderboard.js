import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { collection, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* =========================
   DOM
========================= */
const tbody = document.querySelector("#leaderboardTable tbody");
const profileImage = document.getElementById("profileImage");
const profileName = document.getElementById("profileName");

const DEFAULT_PFP = "./Images/defaultPFP.jpg";

/* =========================
   PROFILE HEADER
========================= */
onAuthStateChanged(auth, (user) => {
  if (!user) return;

  profileImage.src = user.photoURL || DEFAULT_PFP;
  profileName.textContent = user.displayName || "Player";
});

/* =========================
   HELPERS
========================= */
function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function winRate(wins, games) {
  if (!games) return "0.0";
  return ((wins / games) * 100).toFixed(1);
}

/* =========================
   LIVE LEADERBOARD
========================= */
onSnapshot(collection(db, "users"), (snap) => {

  const players = [];

  snap.forEach((docSnap) => {
    const u = docSnap.data() || {};

    const wins = num(u.wins);
    const games = num(u.gamesPlayed);
    const best = num(u.bestScore);

    players.push({
      name: u.displayName || "Player",
      photo: u.photoURL || DEFAULT_PFP,
      wins,
      games,
      best,
      rate: winRate(wins, games)
    });
  });

  // SORT: wins → win rate → best score
  players.sort((a, b) =>
    b.wins - a.wins ||
    b.rate - a.rate ||
    b.best - a.best
  );

  render(players);
});

/* =========================
   RENDER
========================= */
function render(players) {

  if (!tbody) return;

  if (!players.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6">No players yet</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = players.map((p, i) => `
    <tr>
      <td><strong>#${i + 1}</strong></td>

      <td class="playerCell">
        <img class="lb-pfp" src="${p.photo}" alt="Player photo" />
        <span>${p.name}</span>
      </td>

      <td>${p.wins}</td>
      <td>${p.games}</td>
      <td>${p.rate}%</td>
      <td>${p.best}</td>
    </tr>
  `).join("");
}
