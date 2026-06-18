import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { collection, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* =========================
   DOM
========================= */
const el = {
  tbody: document.querySelector("#LeaderboardTable tbody"),
  profileImage: document.getElementById("profileImage"),
  profileName: document.getElementById("profileName")
};

/* =========================
   PROFILE HEADER
========================= */
onAuthStateChanged(auth, (user) => {
  if (!user) return;

  el.profileImage.src = user.photoURL || "./Images/defaultPFP.jpg";
  el.profileName.textContent = user.displayName || "Player";
});

/* =========================
   HELPERS
========================= */
const num = (v) => Number(v) || 0;

const winRate = (wins, games) =>
  games ? ((wins / games) * 100).toFixed(1) : "0.0";

/* =========================
   LEADERBOARD STREAM
========================= */
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
      best: num(u.bestScore),
      rate: winRate(wins, games)
    });
  });

  players.sort((a, b) => b.wins - a.wins);

  render(players);
});

/* =========================
   RENDER
========================= */
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