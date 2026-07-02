/*
========================================
FILE: leaderboard.js

PURPOSE:
This file builds and updates the leaderboard page.

BIG PICTURE:
It:
- Listens to Firestore "users" collection
- Sorts players by wins
- Displays leaderboard table in real time
- Shows current logged-in user in header
- Renders podium for top 3 players
========================================
*/

import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  collection,
  onSnapshot,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* =========================
   DOM CACHE
========================= */

const el = {
  tbody: document.querySelector("#leaderboardTable tbody"),

  profileImage: document.getElementById("profileImage"),
  profileName: document.getElementById("profileName"),

  p1Img: document.getElementById("p1Img"),
  p1Name: document.getElementById("p1Name"),
  p1Wins: document.getElementById("p1Wins"),

  p2Img: document.getElementById("p2Img"),
  p2Name: document.getElementById("p2Name"),
  p2Wins: document.getElementById("p2Wins"),

  p3Img: document.getElementById("p3Img"),
  p3Name: document.getElementById("p3Name"),
  p3Wins: document.getElementById("p3Wins"),

  loadingText: document.getElementById("leaderboardLoading")
};

/* =========================
   STATE
========================= */

let currentUserId = null;
let unsubLeaderboard = null;

const DEFAULT_PFP = "./Images/defaultPFP.jpg";
/* =========================
   HEADER USER DISPLAY
========================= */

onAuthStateChanged(auth, (user) => {
  if (!user) return;

  currentUserId = user.uid;

  if (el.profileImage) {
    el.profileImage.src = user.photoURL || "DEFAULT_PFP";
  }

  if (el.profileName) {
    el.profileName.textContent = user.displayName || "Player";
  }
});

window.addEventListener("load", () => {
  const boot = document.getElementById("bootScreen");
  if (!boot) return;

  setTimeout(() => {
    boot.style.display = "none";
  }, 2800);
});
/* =========================
   HELPERS
========================= */

function num(v) {
  if (typeof v === "number") return v;
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return n;
}

function winRate(wins, games) {
  if (!games || games === 0) {
    return "0.0%";
  }
  return ((wins / games) * 100).toFixed(1) + "%";
}

/* =========================
   REAL-TIME LEADERBOARD
========================= */

function startLeaderboard() {
  try {
  
  const q = query(collection(db, "users"), orderBy("wins", "desc"));

    unsubLeaderboard = onSnapshot(
      q,
      (snap) => {
        if (el.loadingText) {
          el.loadingText.style.display = "none";
        }

        const players = [];

        snap.forEach((docSnap) => {
          const u = docSnap.data();

      players.push({
      id: docSnap.id,
      name: u.displayName || "Player",
      photo: u.photoURL || "DEFAULT_PFP",
      wins: num(u.wins),
      games: num(u.gamesPlayed),
      best: num(u.bestScore)
     });
  });


   renderPodium(players.slice(0, 3));
        renderTable(players);
      },
      (error) => {
        console.log("Leaderboard error:", error);

        if (el.loadingText) {
          el.loadingText.textContent = "Failed to load leaderboard 😭";
        }
      }
    );

  } catch (err) {
    console.log(err);
  }
}
/* =========================
   PODIUM
========================= */

function renderPodium(top) {
  const empty = {
    name: "---",
    photo: "./Images/defaultPFP.jpg",
    wins: 0
  };

  const first = top[0] || empty;
  const second = top[1] || empty;
  const third = top[2] || empty;

  if (el.p1Name) {
    el.p1Name.textContent = first.name;
    el.p1Img.src = first.photo;
    el.p1Wins.textContent = first.wins + " wins";
  }

  if (el.p2Name) {
    el.p2Name.textContent = second.name;
    el.p2Img.src = second.photo;
    el.p2Wins.textContent = second.wins + " wins";
  }

  if (el.p3Name) {
    el.p3Name.textContent = third.name;
    el.p3Img.src = third.photo;
    el.p3Wins.textContent = third.wins + " wins";
  }
}

/* =========================
   TABLE
========================= */

function renderTable(players) {
  const tbody = el.tbody;

  if (!tbody) return;

  if (!players || players.length === 0) {
    tbody.innerHTML =
      "<tr><td colspan='6'>No players yet 😭</td></tr>";
    return;
  }

  let html = "";

  for (let i = 0; i < players.length; i++) {
    const p = players[i];

    let isMe = false;

    if (p.id === currentUserId) {
      isMe = true;
    }

    html +=
      "<tr class='" + (isMe ? "meRow" : "") + "'>" +
      "<td><strong>#" + (i + 1) + "</strong></td>" +

      "<td class='playerCell'>" +
      "<img class='lb-pfp' src='" + p.photo + "' />" +
      "<span>" + p.name + "</span>" +
      "</td>" +

      "<td>" + p.wins + "</td>" +
      "<td>" + p.games + "</td>" +
      "<td>" + winRate(p.wins, p.games) + "</td>" +
      "<td>" + p.best + "</td>" +
      "</tr>";
  }

  tbody.innerHTML = html;
}

/* =========================
   INIT
========================= */

startLeaderboard();

window.addEventListener("beforeunload", () => { 
  if (unsubLeaderboard) {
    unsubLeaderboard();
  }
}); 

document.getElementById("backBtn").onclick = () => {
  window.location.href = "games.html";
};

document.getElementById("profileBtn").onclick = () => {
  window.location.href = "profile.html";
};

