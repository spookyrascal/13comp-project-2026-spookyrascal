import { auth } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const profileImage = document.getElementById("profileImage");

/* =========================
   AUTH CHECK
========================= */
onAuthStateChanged(auth, (user) => {
  if (!user) {
    alert("Please sign in first.");
    window.location.href = "index.html";
    return;
  }

  profileImage.src = user.photoURL || "./Images/defaultPFP.jpg";
});

/* =========================
  PROFILE   
========================= */
onAuthStateChanged(auth, (user) => {
  const profileImage = document.getElementById("profileImage");

  if (!user) {
    window.location.href = "index.html";
    return;
  }

  profileImage.src = user.photoURL || "./Images/defaultPFP.jpg";
});
