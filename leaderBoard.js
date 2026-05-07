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
const profileName = document.getElementById("profileName");

/* =========================
   AUTH + PROFILE
========================= */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  try {
    const profile = await getUserProfile(user);

    if (profilePic) profilePic.src = profile.photo || "./Images/defaultPFP.jpg";
    if (profileName) profileName.textContent = profile.name || "Player";

  } catch (err) {
    console.warn("Profile load failed:", err);

    if (profilePic) profilePic.src = user.photoURL || "./Images/defaultPFP.jpg";
    if (profileName) profileName.textContent = user.displayName || "Player";
  }
});

/* =========================
   HELPERS
========================= */
function num(v) {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

function winRate(wins, games) {
  if (!games) return 0;
  return wins / games;
}

/* =========================
   LOAD LEADERBOARD
========================= */
async function loadLeaderboard() {
  if (!tableBody) return;

  tableBody.innerHTML = `
    <tr>
      <td colspan="5">Loading leaderboard...</td>
    </tr>
  `;

  try {
    const snapshot = await getDocs(collection(db, "leaderboard"));

    const players = [];

    snapshot.forEach((docSnap) => {
      const d = docSnap.data();

      const wins = num(d.wins);
      const games = num(d.gamesPlayed);

      players.push({
        uid: d.uid,
        name: d.displayName || "Player",
        photo: d.photoURL || "./Images/defaultPFP.jpg",
        wins,
        games,
        rate: winRate(wins, games)
      });
    });

    if (players.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="5">No players yet 😭</td>
        </tr>
      `;
      return;
    }

    players.sort((a, b) => {
      // better ranking logic: win rate first, then wins
      if (b.rate === a.rate) return b.wins - a.wins;
      return b.rate - a.rate;
    });

    render(players);

  } catch (err) {
    console.error(err);

    tableBody.innerHTML = `
      <tr>
        <td colspan="5">Failed to load leaderboard</td>
      </tr>
    `;
  }
}

/* =========================
   RENDER
========================= */
function render(players) {
  tableBody.innerHTML = "";

  players.forEach((p, i) => {
    const row = document.createElement("tr");

    const percent = (p.rate * 100).toFixed(1);

    row.innerHTML = `
      <td><strong>#${i + 1}</strong></td>

      <td class="playerCell">
        <img class="lb-pfp" src="${p.photo}">
        <span>${p.name}</span>
      </td>

      <td>${p.wins}</td>
      <td>${p.games}</td>
      <td>${percent}%</td>
    `;

    tableBody.appendChild(row);
  });
}

/* =========================
   INIT
========================= */
loadLeaderboard();
setInterval(loadLeaderboard, 15000);