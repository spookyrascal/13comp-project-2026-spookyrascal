import { auth, db } from "./firebase.js";
import { getUserProfile } from "./user.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const tableBody = document.querySelector("#LeaderboardTable tbody");
const profilePic = document.getElementById("profileImage");

/* =========================
   PROFILE
========================= */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  const profile = await getUserProfile(user);
  profilePic.src = profile.photo;
});

/* =========================
   LOAD + SORT BY WIN RATE
========================= */
async function loadLeaderboard() {
  const snapshot = await getDocs(collection(db, "leaderboard"));

  let players = [];

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();

    const wins = data.wins || 0;
    const games = data.gamesPlayed || 0;

    const winRate = games > 0 ? wins / games : 0;

    players.push({
      ...data,
      winRate
    });
  });

  // SORT BY WIN RATE (highest first)
  players.sort((a, b) => b.winRate - a.winRate);

  tableBody.innerHTML = "";

  players.forEach((p, index) => {
    const row = document.createElement("tr");

    const winRatePercent = (p.winRate * 100).toFixed(1);

    row.innerHTML = `
      <td>${index + 1}</td>

      <td class="playerCell">
        <img src="${p.photoURL || './Images/defaultPFP.jpg'}" class="lb-pfp">
        <span>${p.displayName || "Player"}</span>
      </td>

      <td>${p.wins || 0}</td>
      <td>${p.gamesPlayed || 0}</td>
      <td>${winRatePercent}%</td>
    `;

    tableBody.appendChild(row);
  });
}

loadLeaderboard();
setInterval(loadLeaderboard, 15000);