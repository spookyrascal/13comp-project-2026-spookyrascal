import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { collection, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const tbody = document.querySelector("#leaderboardTable tbody");
const profileImage = document.getElementById("profileImage");
const profileName = document.getElementById("profileName");

const DEFAULT_PFP = "./Images/defaultPFP.jpg";

onAuthStateChanged(auth, (user) => {
  if (!user) return;

  profileImage.src = user.photoURL || DEFAULT_PFP;
  profileName.textContent = user.displayName || "Player";
});

function num(v) {
  return Number(v) || 0;
}

function winRate(wins, games) {
  return games ? ((wins / games) * 100).toFixed(1) : "0.0";
}

onSnapshot(collection(db, "users"), (snap) => {
  const players = [];

  snap.forEach((docSnap) => {
    const u = docSnap.data() || {};

    players.push({
      name: u.displayName || "Player",
      photo: u.photoURL || DEFAULT_PFP,
      wins: num(u.wins),
      games: num(u.gamesPlayed),
      best: num(u.bestScore),
      rate: winRate(u.wins, u.gamesPlayed)
    });
  });

  players.sort((a, b) =>
    b.wins - a.wins ||
    b.rate - a.rate ||
    b.best - a.best
  );

  render(players);
});

function render(players) {
  if (!tbody) return;

  tbody.innerHTML = players.length
    ? players.map((p, i) => `
      <tr>
        <td>#${i + 1}</td>
        <td>
          <img src="${p.photo}" class="lb-pfp" />
          ${p.name}
        </td>
        <td>${p.wins}</td>
        <td>${p.games}</td>
        <td>${p.rate}%</td>
        <td>${p.best}</td>
      </tr>
    `).join("")
    : `<tr><td colspan="6">No players yet</td></tr>`;
}