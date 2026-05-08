import { auth, db } from "./firebase.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  collection,
  onSnapshot,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* =========================
   DOM
========================= */

const tableBody =
  document.querySelector("#LeaderboardTable tbody");

const profileImage =
  document.getElementById("profileImage");

const profileName =
  document.getElementById("profileName");

/* =========================
   HELPERS
========================= */

function num(v) {
  return Number(v) || 0;
}

function winRate(wins, games) {
  return games ? wins / games : 0;
}

/* =========================
   AUTH HEADER
========================= */

onAuthStateChanged(auth, async (user) => {

  if (!user) {

    profileImage.src = "./Images/defaultPFP.jpg";
    profileName.textContent = "Guest";

    return;
  }

  const snap =
    await getDoc(doc(db, "leaderboard", user.uid));

  const data = snap.data() || {};

  profileImage.src =
    data.photoURL ||
    user.photoURL ||
    "./Images/defaultPFP.jpg";

  profileName.textContent =
    data.displayName ||
    user.displayName ||
    "Player";
});

/* =========================
   LOAD LEADERBOARD (LIVE)
========================= */

function loadLeaderboard() {

  const ref = collection(db, "leaderboard");

  onSnapshot(ref, (snapshot) => {

    const players = [];

    snapshot.forEach((docSnap) => {

      const d = docSnap.data();

      const wins = num(d.wins);
      const games = num(d.gamesPlayed);
      const best = num(d.bestScore);

      const rate = winRate(wins, games);

      // ranking score (NOT stored, just computed)
      const rankPoints =
        (wins * 10) +
        (best * 2) +
        (rate * 50);

      players.push({

        id: docSnap.id,
        name: d.displayName || "Player",
        photo: d.photoURL || "./Images/defaultPFP.jpg",

        wins,
        games,
        best,
        rate,
        rankPoints

      });
    });

    if (!players.length) {

      tableBody.innerHTML = `
        <tr>
          <td colspan="6">
            No players yet 😭
          </td>
        </tr>
      `;

      return;
    }

    // SORT BY RANK POINTS
    players.sort((a, b) =>
      b.rankPoints - a.rankPoints
    );

    render(players);
  });
}

/* =========================
   RENDER TABLE
========================= */

function render(players) {

  tableBody.innerHTML = "";

  players.forEach((p, i) => {

    const percent =
      (p.rate * 100).toFixed(1);

    const row =
      document.createElement("tr");

    row.innerHTML = `

      <td><strong>#${i + 1}</strong></td>

      <td class="playerCell">

        <img
          class="lb-pfp"
          src="${p.photo}"
        />

        <span>${p.name}</span>

      </td>

      <td>${p.wins}</td>
      <td>${p.games}</td>
      <td>${percent}%</td>
      <td>${p.best}</td>

    `;

    tableBody.appendChild(row);
  });
}

/* =========================
   INIT
========================= */

loadLeaderboard();
