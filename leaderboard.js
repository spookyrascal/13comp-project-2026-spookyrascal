import { auth, db } from "./firebase.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  collection,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* =========================
   DOM
========================= */
const tbody = document.querySelector("#LeaderboardTable tbody");
const profileImage = document.getElementById("profileImage");
const profileName = document.getElementById("profileName");

/* =========================
   PROFILE HEADER
========================= */
onAuthStateChanged(auth, (user) => {
  if (!user) return;

  profileImage.src = user.photoURL || "./Images/defaultPFP.jpg";
  profileName.textContent = user.displayName || "Player";
});

/* =========================
   HELPERS
========================= */
function safeNum(v) {
  return typeof v === "number" ? v : Number(v || 0);
}

function winRate(wins, games) {
  return games ? ((wins / games) * 100).toFixed(1) : "0.0";
}

/* =========================
   LIVE USERS LEADERBOARD
========================= */
onSnapshot(collection(db, "users"), (snap) => {

  const players = [];

  snap.forEach(doc => {

    const u = doc.data();

    const wins = safeNum(u.wins);
    const games = safeNum(u.gamesPlayed);
    const best = safeNum(u.bestScore);

    players.push({
      name: u.displayName || "Player",
      photo: u.photoURL || "./Images/defaultPFP.jpg",
      wins,
      games,
      best,
      rate: winRate(wins, games)
    });
  });

  // SORT BY WINS (simple + reliable)
  players.sort((a, b) => b.wins - a.wins);

  render(players);
});

/* =========================
   RENDER TABLE
========================= */
function render(players) {

  if (!players.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6">No players yet 😭</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = "";

  players.forEach((p, i) => {

    const row = document.createElement("tr");

    row.innerHTML = `
      <td><strong>#${i + 1}</strong></td>

      <td class="playerCell">
        <img class="lb-pfp" src="${p.photo}" />
        <span>${p.name}</span>
      </td>

      <td>${p.wins}</td>
      <td>${p.games}</td>
      <td>${p.rate}%</td>
      <td>${p.best}</td>
    `;

    tbody.appendChild(row);
  });
}