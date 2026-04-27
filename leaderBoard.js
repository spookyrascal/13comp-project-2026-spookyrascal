import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  collection,
  getDocs,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* =========================
   DOM
========================= */
const profilePic = document.getElementById("profileImage");
const tableBody = document.querySelector("#LeaderboardTable tbody");

/* =========================
   SAFE NAME FUNCTION
========================= */
function getSafeName(data, authUser) {
  return (
    data.displayName ||
    authUser?.displayName ||
    authUser?.email?.split("@")[0] ||
    "Anonymous"
  );
}

/* =========================
   SAFE PHOTO FUNCTION
========================= */
function getSafePhoto(data, authUser) {
  return (
    data.photoURL ||
    authUser?.photoURL ||
    "./Images/defaultPFP.jpg"
  );
}

/* =========================
   PROFILE ICON
========================= */
onAuthStateChanged(auth, (user) => {
  profilePic.src = user?.photoURL || "./Images/defaultPFP.jpg";
});

/* =========================
   LOAD LEADERBOARD
========================= */
async function loadLeaderboard() {
  try {
    const ref = collection(db, "leaderboard");
    const q = query(ref, orderBy("wins", "desc"));

    const snapshot = await getDocs(q);

    tableBody.innerHTML = "";

    let rank = 1;

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();

      const name = data.displayName || "Anonymous";
      const photo = data.photoURL || "./Images/defaultPFP.jpg";

      const row = document.createElement("tr");

      row.innerHTML = `
        <td>${rank}</td>

        <td class="playerCell">
          <img src="${photo}" class="lb-pfp" />
          <span>${name}</span>
        </td>

        <td>${data.wins ?? 0}</td>
        <td>${data.gamesPlayed ?? 0}</td>
        <td>${data.bestScore ?? "-"}</td>
      `;

      tableBody.appendChild(row);
      rank++;
    });

  } catch (err) {
    console.error("Leaderboard error:", err);
  }
}

/* =========================
   AUTO REFRESH (IMPORTANT)
   keeps leaderboard updated live-ish
========================= */
loadLeaderboard();
setInterval(loadLeaderboard, 15000);


