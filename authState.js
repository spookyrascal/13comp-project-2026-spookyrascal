import { auth } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getUserProfile } from "./user.js";

export function initAuth(callback) {
  onAuthStateChanged(auth, async (user) => {

    if (!user) {
      callback(null);
      return;
    }

    try {
      const profile = await getUserProfile(user);
      callback(profile);

    } catch (err) {
      callback({
        uid: user.uid,
        name: user.displayName || "Player",
        photo: user.photoURL || "./Images/defaultPFP.jpg"
      });
    }
  });
}

export function initProfileNav() { document.getElementById("profileBtn")?.addEventListener("click", () =>
 { window.location.href = "profile.html"; });
}

