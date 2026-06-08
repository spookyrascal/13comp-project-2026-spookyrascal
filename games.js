import { auth } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

/* =========================
   DOM ELEMENTS
========================= */
const profileImage = document.getElementById("profileImage");

/* =========================
   CONSTANTS
========================= */
const DEFAULT_PFP = "./Images/defaultPFP.jpg";

/* =========================
   HELPERS
========================= */
function setProfileImage(url) {
  if (!profileImage) return;

  profileImage.src = url && url.trim() !== ""
    ? url
    : DEFAULT_PFP;
}

/* =========================
   AUTH LISTENER
========================= */
onAuthStateChanged(auth, (user) => {
  if (!user) {
    setProfileImage(DEFAULT_PFP);
    return;
  }

  setProfileImage(user.photoURL);
});

if (!auth.currentUser) return;
