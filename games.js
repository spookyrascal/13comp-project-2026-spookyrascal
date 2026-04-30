import "./auth.js";
import { getCurrentUser } from "./auth.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const profileImage = document.getElementById("profileImage");
const leaderboardBtn = document.getElementById("leaderBoardBtn"); 
const user = getCurrentUser();
/* =========================
   NAVIGATE TO LEADERBOARD
========================= */
leaderboardBtn?.addEventListener("click", () => {
  window.location.href = "leaderboard.html";
});