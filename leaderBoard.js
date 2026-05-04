import { auth, db } from "./firebase.js";
import { getUserProfile } from "./user.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* =========================
   DOM
========================= */
const tableBody = document.querySelector("#LeaderboardTable tbody");
const profilePic = document.getElementById("profileImage");

/* =========================
   PROFILE SYNC
========================= */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  try {
    const profile = await getUserProfile(user);
    profilePic.src = profile.photo;
  } catch (err) {
    console.warn("Profile load failed:", err);
    profilePic.src = user.photoURL || "./Images/defaultPFP.jpg";

    profileImage.src = user.photo;
    document.getElementById("profileName").textContent = user.name;
  }
});

/* =========================
   SAFE CALC HELPERS
========================= */
function safeNumber(value) {
  const num = Number(value);
  return isNaN(num) ? 0 : num;
}

function calculateWinRate(wins, games) {
  const w = safeNumber(wins);
  const g = safeNumber(games);

  if (g <= 0) return 0;
  return w / g;
}

/* =========================
   LOAD LEADERBOARD
========================= */
async function loadLeaderboard() {
  try {
    const snapshot = await getDocs(collection(db, "leaderboard"));

    const players = [];

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();

      const wins = safeNumber(data.wins);
      const games = safeNumber(data.gamesPlayed);
      const winRate = calculateWinRate(wins, games);

      players.push({
        uid: data.uid,
        displayName: data.displayName || "Player",
        photoURL: data.photoURL || "./Images/defaultPFP.jpg",
        wins,
        gamesPlayed: games,
        winRate
      });
    });

    // SORT: highest win rate first
    players.sort((a, b) => b.winRate - a.winRate);

    renderTable(players);

  } catch (err) {
    console.error("Leaderboard load error:", err);
  }
}

/* =========================
   RENDER
========================= */
function renderTable(players) {
  if (!tableBody) return;

  tableBody.innerHTML = "";

  players.forEach((p, index) => {
    const winRatePercent = (p.winRate * 100).toFixed(1);

    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${index + 1}</td>

      <td class="playerCell">
        <img src="${p.photoURL}" class="lb-pfp">
        <span>${p.displayName}</span>
      </td>

      <td>${p.wins}</td>
      <td>${p.gamesPlayed}</td>
      <td>${winRatePercent}%</td>
    `;

    tableBody.appendChild(row);
  });
}

/* =========================
   INIT
========================= */
loadLeaderboard();
setInterval(loadLeaderboard, 15000);