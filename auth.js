import { auth } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getUserProfile } from "./user.js";

/* =========================
   AUTH WRAPPER
========================= */

export function initAuthUI(callback) {

  onAuthStateChanged(auth, async (user) => {

    if (!user) {
      callback(null);
      return;
    }

    try {

      const profile =
        await getUserProfile(user);

      callback(profile);

    } catch (err) {

      console.warn("Auth fallback:", err);

      callback({
        uid: user.uid,
        name:
          user.displayName ||
          user.email?.split("@")[0] ||
          "Player",
        email: user.email || "",
        photo:
          user.photoURL ||
          "./Images/defaultPFP.jpg"
      });
    }
  });
}