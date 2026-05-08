import { auth } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

/* =========================
   DOM
========================= */
const profileImage = document.getElementById("profileImage");

/* =========================
   AUTH STATE
========================= */
onAuthStateChanged(auth, (user) => {

  if (!user) {
    if (profileImage) {
      profileImage.src = "./Images/defaultPFP.jpg";
    }
    return;
  }

  const photo =
    user.photoURL || "./Images/defaultPFP.jpg";

  if (profileImage) {
    profileImage.src = photo;
  }
});