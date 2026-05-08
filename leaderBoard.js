import { auth, db } from "./firebase.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  collection,
  getDocs,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* =========================
   DOM
========================= */

const tableBody =
  document.querySelector(
    "#LeaderboardTable tbody"
  );

const profileImage =
  document.getElementById(
    "profileImage"
  );

const profileName =
  document.getElementById(
    "profileName"
  );

/* =========================
   HELPERS
========================= */

function num(v) {

  const n = Number(v);

  return isNaN(n) ? 0 : n;
}

function calcRate(wins, games) {

  if (!games) return 0;

  return wins / games;
}

/* =========================
   AUTH
========================= */

onAuthStateChanged(auth, async (user) => {

  // guest
  if (!user) {

    profileImage.src =
      "./Images/defaultPFP.jpg";

    profileName.textContent =
      "Guest";

    return;
  }

  try {

    const userRef = doc(
      db,
      "users",
      user.uid
    );

    const snap =
      await getDoc(userRef);

    const data =
      snap.data() || {};

    profileImage.src =
      data.photoURL ||
      user.photoURL ||
      "./Images/defaultPFP.jpg";

    profileName.textContent =
      data.username ||
      user.displayName ||
      "Player";

  } catch (err) {

    console.error(err);

  }
});

/* =========================
   LOAD LEADERBOARD
========================= */

async function loadLeaderboard() {

  if (!tableBody) return;

  tableBody.innerHTML = `
    <tr>
      <td colspan="5">
        Loading leaderboard...
      </td>
    </tr>
  `;

  try {

    const snapshot =
      await getDocs(
        collection(db, "leaderboard")
      );

    const players = [];

    snapshot.forEach((docSnap) => {

      const d = docSnap.data();

      const wins =
        num(d.wins);

      const games =
        num(d.gamesPlayed);

      players.push({

        uid:
          d.uid || "",

        name:
          d.username ||
          d.displayName ||
          "Player",

        photo:
          d.photoURL ||
          "./Images/defaultPFP.jpg",

        wins,

        games,

        rate:
          calcRate(wins, games)

      });

    });

    // no players
    if (!players.length) {

      tableBody.innerHTML = `
        <tr>
          <td colspan="5">
            No players yet 😭
          </td>
        </tr>
      `;

      return;
    }

    // ranking
    players.sort((a, b) => {

      // highest winrate first
      if (b.rate !== a.rate) {
        return b.rate - a.rate;
      }

      // then wins
      return b.wins - a.wins;
    });

    renderLeaderboard(players);

  } catch (err) {

    console.error(err);

    tableBody.innerHTML = `
      <tr>
        <td colspan="5">
          Failed to load leaderboard
        </td>
      </tr>
    `;
  }
}

/* =========================
   RENDER
========================= */

function renderLeaderboard(players) {

  tableBody.innerHTML = "";

  players.forEach((player, index) => {

    const row =
      document.createElement("tr");

    const percent =
      (player.rate * 100).toFixed(1);

    row.innerHTML = `

      <td>
        <strong>
          #${index + 1}
        </strong>
      </td>

      <td class="playerCell">

        <img
          class="lb-pfp"
          src="${player.photo}"
          alt="PFP"
        >

        <span>
          ${player.name}
        </span>

      </td>

      <td>
        ${player.wins}
      </td>

      <td>
        ${player.games}
      </td>

      <td>
        ${percent}%
      </td>
    `;

    tableBody.appendChild(row);

  });
}

/* =========================
   INIT
========================= */

loadLeaderboard();