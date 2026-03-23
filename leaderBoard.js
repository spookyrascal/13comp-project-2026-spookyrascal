// ==========================
// Firebase
// ==========================
import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


// ==========================
// DOM Elements
// ==========================
const profilePic = document.getElementById("profileImage");
const tableBody = document.querySelector("#LeaderboardTable tbody");


// ==========================
// Profile Picture
// ==========================
onAuthStateChanged(auth, (user) => {
  if (user) {
    profilePic.src = user.photoURL || "defaultPFP.jpg";
  } else {
    profilePic.src = "defaultPFP.jpg";
  }
});


// ==========================
// Load Leaderboard
// ==========================
async function loadLeaderboard() {
  try {
    // Reference to "leaderboard" collection
    const leaderboardRef = collection(db, "leaderboard");

    // Order by wins descending
    const q = query(leaderboardRef, orderBy("wins", "desc"));

    const querySnapshot = await getDocs(q);

    // Clear previous rows
    tableBody.innerHTML = "";

    let rank = 1;

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();

      const row = document.createElement("tr");

      row.innerHTML = `
        <td>${rank}</td>
        <td>${data.displayName || "Anonymous"}</td>
        <td>${data.wins || 0}</td>
        <td>${data.gamesPlayed || 0}</td>
        <td>${data.bestScore || 0}</td>
      `;

      tableBody.appendChild(row);
      rank++;
    });

  } catch (error) {
    console.error("Error loading leaderboard:", error);
  }
}

// Load leaderboard on page load
loadLeaderboard();