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
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  console.log("🔥 APP INIT");

  const provider = new GoogleAuthProvider();
  const $ = (id) => document.getElementById(id);

  // =========================
  // ELEMENTS
  // =========================
  const el = {
    authPopup: $("authPopup"),
    authButtons: $("authButtons"),
    profileArea: $("profileArea"),

    openAuthBtn: $("openAuthBtn"),
    closePopupBtn: $("closePopupBtn"),

    loginEmail: $("loginEmail"),
    loginPassword: $("loginPassword"),
    loginBtn: $("loginBtn"),

    signupEmail: $("signupEmail"),
    signupPassword: $("signupPassword"),
    signupUsername: $("signupUsername"),
    signupAge: $("signupAge"),
    signupBtn: $("signupBtn"),

    googleLoginBtn: $("googleLoginBtn"),
    googleSignupBtn: $("googleSignupBtn"),

    logoutBtn: $("logoutBtn"),

    profileBtn: $("profileBtn"),
    dropdownMenu: $("dropdownMenu"),

    menuName: $("menuName"),
    menuEmail: $("menuEmail"),
    profileImage: $("profileImage"),
    menuPfp: $("menuPfp"),

    quickStats: $("quickStats"),
    statWins: $("statWins"),
    statGames: $("statGames"),
    statRate: $("statRate"),

    loginForm: $("loginForm"),
    signupForm: $("signupForm"),

    loginTab: $("loginTab"),
    signupTab: $("signupTab"),

    toast: $("toast")
  };

  // =========================
  // TOAST SYSTEM
  // =========================
  function toast(msg, type = "info") {
    if (!el.toast) return;

    console.log("TOAST:", msg);

    el.toast.textContent = msg;
    el.toast.className = `toast show ${type}`;

    setTimeout(() => {
      el.toast.className = "toast";
    }, 2500);
  }

  // =========================
  // TAB SYSTEM (FIXED)
  // =========================
  function setTab(tab) {
    if (!el.loginForm || !el.signupForm) return;

    if (tab === "login") {
      el.loginForm.classList.remove("hidden");
      el.signupForm.classList.add("hidden");

      el.loginTab?.classList.add("active");
      el.signupTab?.classList.remove("active");

      console.log("🔵 LOGIN TAB");
    }

    if (tab === "signup") {
      el.signupForm.classList.remove("hidden");
      el.loginForm.classList.add("hidden");

      el.signupTab?.classList.add("active");
      el.loginTab?.classList.remove("active");

      console.log("🟣 SIGNUP TAB");
    }
  }

  el.loginTab?.addEventListener("click", () => setTab("login"));
  el.signupTab?.addEventListener("click", () => setTab("signup"));

  // default tab
  setTab("login");

  // =========================
  // UI STATES
  // =========================
  function showLoggedOut() {
    el.authButtons?.classList.remove("hidden");
    el.profileArea?.classList.add("hidden");
    el.quickStats?.classList.add("hidden");
  }

  function showLoggedIn(user, data) {
    el.authButtons?.classList.add("hidden");
    el.profileArea?.classList.remove("hidden");
    el.quickStats?.classList.remove("hidden");

    const photo =
      data?.photoURL ||
      user.photoURL ||
      "./Images/defaultPFP.jpg";

    if (el.profileImage) el.profileImage.src = photo;
    if (el.menuPfp) el.menuPfp.src = photo;

    if (el.menuName)
      el.menuName.textContent =
        data?.displayName || user.displayName || "Player";

    if (el.menuEmail)
      el.menuEmail.textContent = user.email;

    const wins = data?.wins ?? 0;
    const games = data?.gamesPlayed ?? 0;
    const rate = games ? Math.round((wins / games) * 100) : 0;

    if (el.statWins) el.statWins.textContent = wins;
    if (el.statGames) el.statGames.textContent = games;
    if (el.statRate) el.statRate.textContent = rate + "%";
  }

  // =========================
  // POPUP
  // =========================
  el.openAuthBtn?.addEventListener("click", () => {
    el.authPopup?.classList.remove("hidden");
  });

  el.closePopupBtn?.addEventListener("click", () => {
    el.authPopup?.classList.add("hidden");
  });

  // =========================
  // PROFILE DROPDOWN
  // =========================
  el.profileBtn?.addEventListener("click", () => {
    el.dropdownMenu?.classList.toggle("hidden");
  });

  // =========================
  // LOGIN
  // =========================
  el.loginBtn?.addEventListener("click", async () => {
    try {
      const cred = await signInWithEmailAndPassword(
        auth,
        el.loginEmail.value,
        el.loginPassword.value
      );

      console.log("✅ LOGIN:", cred.user.email);
      toast("Logged in 🔥", "success");

      el.authPopup?.classList.add("hidden");

    } catch (err) {
      console.error("LOGIN ERROR:", err);
      toast(err.message, "error");
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

      await setDoc(doc(db, "users", cred.user.uid), {
        uid: cred.user.uid,
        email: cred.user.email,
        displayName: el.signupUsername.value || "Player",
        age: Number(el.signupAge.value) || 0,
        wins: 0,
        gamesPlayed: 0,
        createdAt: serverTimestamp()
      });

      console.log("✅ SIGNUP:", cred.user.email);
      toast("Account created 🎉", "success");

      el.authPopup?.classList.add("hidden");

    } catch (err) {
      console.error("SIGNUP ERROR:", err);
      toast(err.message, "error");
    }
  });

  // =========================
  // GOOGLE AUTH
  // =========================
  async function googleAuth() {
    try {
      const result = await signInWithPopup(auth, provider);

      console.log("✅ GOOGLE:", result.user.email);
      toast("Google login 👋", "success");

      el.authPopup?.classList.add("hidden");

    } catch (err) {
      console.error("GOOGLE ERROR:", err);
      toast(err.message, "error");
    }
  }

  el.googleLoginBtn?.addEventListener("click", googleAuth);
  el.googleSignupBtn?.addEventListener("click", googleAuth);

  // =========================
  // LOGOUT
  // =========================
  el.logoutBtn?.addEventListener("click", async () => {
    await signOut(auth);
    toast("Logged out");
  });

  // =========================
  // AUTH STATE
  // =========================
  onAuthStateChanged(auth, async (user) => {
    console.log("AUTH:", user?.email || "logged out");

    if (!user) return showLoggedOut();

    const snap = await getDoc(doc(db, "users", user.uid));
    const data = snap.exists() ? snap.data() : null;

    showLoggedIn(user, data);
  });

});