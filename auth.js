import { auth } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getUserProfile } from "./user.js";

/* =========================
   AUTH WRAPPER 
========================= */
export function initAuthUI(callback) {

  onAuthStateChanged(auth, async (user) => {

    // not logged in
    if (!user) {
      callback(null);
      return;
    }

    try {
      // convert Firebase user → unified profile
      const profile = await getUserProfile(user);

      callback(profile);

    } catch (err) {
      console.warn("Auth profile fallback triggered:", err);

      // emergency fallback (never breaks UI)
      callback({
        uid: user.uid,
        name: user.displayName || user.email?.split("@")[0] || "Player",
        email: user.email || "",
        photo: user.photoURL || "./Images/defaultPFP.jpg",
        age: null
      });
    }
  });
}