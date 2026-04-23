import { auth } from "..firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const profileImage = document.getElementById("profileImage");
const leaderboardBtn = document.getElementById("leaderBoardBtn"); // matches HTML

// Profile picture
onAuthStateChanged(auth, (user) => {
  profileImage.src = user?.photoURL || "defaultPFP.jpg";
});

// Navigate to leaderboard
leaderboardBtn?.addEventListener("click", () => {
  window.location.href = "leaderboard.html";
});

// Optional: protect page
onAuthStateChanged(auth, (user) => {
  if (!user) {
    alert("Please sign in first.");
    window.location.href = "index.html";
  }
});