import { auth } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

export function initAuthUI(callback) {
  onAuthStateChanged(auth, (user) => {
    callback(user);
  });
}

