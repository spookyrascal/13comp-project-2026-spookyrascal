import { auth, db } from "./firebase.js";
import {
 GoogleAuthProvider,
 signInWithPopup,
 createUserWithEmailAndPassword,
 signInWithEmailAndPassword,
 onAuthStateChanged,
  signOut,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  const provider = new GoogleAuthProvider();
  const $ = (id) => document.getElementById(id);

  const el = {
    profileImage: $("profileImage"),
    authPopup: $("authPopup"),
    authButtons: $("authButtons"),
    profileArea: $("profileArea"),
    quickStats: $("quickStats"),
    loginBtn: $("loginBtn"),
    signupBtn: $("signupBtn"),
    googleLoginBtn: $("googleLoginBtn"),
    googleSignupBtn: $("googleSignupBtn"),
    logoutBtn: $("logoutBtn"),
    loginEmail: $("loginEmail"),
    loginPassword: $("loginPassword"),
    signupEmail: $("signupEmail"),
    signupPassword: $("signupPassword"),
    signupUsername: $("signupUsername"),
    signupAge: $("signupAge"),
    toast: $("toast")
  };

  let authReady = false;
  let currentUser = null;

  const DEFAULT_PFP = "./Images/defaultPFP.jpg";

  function setProfileImage(url) {
    if (!el.profileImage) return;
    el.profileImage.src = url || DEFAULT_PFP;
  }

  function toast(msg) {
    if (!el.toast) return;
    el.toast.textContent = msg;
    el.toast.classList.add("show");
    setTimeout(() => el.toast.classList.remove("show"), 2500);
  }

  async function ensureUserProfile(user) {
    const ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      await setDoc(ref, {
        uid: user.uid,
        email: user.email || "",
        displayName: user.displayName || "Player",
        photoURL: user.photoURL || DEFAULT_PFP,
        wins: 0,
        losses: 0,
        gamesPlayed: 0,
        createdAt: serverTimestamp(),
        lastActive: serverTimestamp()
      });
    } else {
      await updateDoc(ref, {
        lastActive: serverTimestamp()
      });
    }
  }

  // =========================
  // GOOGLE AUTH FIXED
  // =========================
  async function googleAuth() {
    try {
      const result = await signInWithPopup(auth, provider);
      await ensureUserProfile(result.user);

      toast("Logged in with Google");
      el.authPopup?.classList.add("hidden");

    } catch (err) {
      toast(err.message);
    }
  }

  el.googleLoginBtn?.addEventListener("click", googleAuth);
  el.googleSignupBtn?.addEventListener("click", googleAuth);

  // =========================
  // EMAIL LOGIN
  // =========================
  el.loginBtn?.addEventListener("click", async () => {
    try {
      const cred = await signInWithEmailAndPassword(
        auth,
        el.loginEmail.value,
        el.loginPassword.value
      );

      await ensureUserProfile(cred.user);
      toast("Logged in");
      el.authPopup?.classList.add("hidden");

    } catch (err) {
      toast(err.message);
    }
  });

  // =========================
  // SIGNUP
  // =========================
  el.signupBtn?.addEventListener("click", async () => {
    try {
      const cred = await createUserWithEmailAndPassword(
        auth,
        el.signupEmail.value,
        el.signupPassword.value
      );

      await updateProfile(cred.user, {
        displayName: el.signupUsername.value || "Player"
      });

      await ensureUserProfile(cred.user);

      await setDoc(doc(db, "users", cred.user.uid), {
        displayName: el.signupUsername.value || "Player",
        age: Number(el.signupAge.value) || 0
      }, { merge: true });

      toast("Account created ");
      el.authPopup?.classList.add("hidden");

    } catch (err) {
      toast(err.message);
    }
  });

  // =========================
  // LOGOUT
  // =========================
  el.logoutBtn?.addEventListener("click", () => signOut(auth));

  // =========================
  // AUTH STATE
  // =========================
  onAuthStateChanged(auth, async (user) => {
    authReady = true;

    if (!user) {
      currentUser = null;
      setProfileImage(DEFAULT_PFP);
      return;
    }

    currentUser = user;

    await ensureUserProfile(user);

    setProfileImage(
      user.photoURL || DEFAULT_PFP
    );
  });
});