import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  collection,
  getDocs,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


const profilePic = document.getElementById("profileImage");
const tableBody = document.querySelector("#LeaderboardTable tbody");


/* =========================
   PROFILE
========================= */
import { auth } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

onAuthStateChanged(auth, (user) => {
  const profileImage = document.getElementById("profileImage");

  if (!user) {
    window.location.href = "index.html";
    return;
  }

  profileImage.src = user.photoURL || "./Images/defaultPFP.jpg";
});
/* =========================
   LOAD LEADERBOARD
========================= */
async function loadLeaderboard() {
  const ref = collection(db, "leaderboard");
  const q = query(ref, orderBy("wins", "desc"));

  const snapshot = await getDocs(q);

  tableBody.innerHTML = "";

  let rank = 1;

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();

    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${rank}</td>
      <td class="playerCell">
        <img src="${data.photoURL || './Images/defaultPFP.jpg'}" class="lb-pfp">
        <span>${data.displayName || "Anonymous"}</span>
      </td>
      <td>${data.wins ?? 0}</td>
      <td>${data.gamesPlayed ?? 0}</td>
      <td>${data.bestScore ?? "-"}</td>
    `;

    tableBody.appendChild(row);
    rank++;
  });
}

loadLeaderboard();
setInterval(loadLeaderboard, 15000);

