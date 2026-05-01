import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics.js";


// ==========================
// CONFIG
// ==========================
const firebaseConfig = {
  apiKey: "AIzaSyDh5jFP6KcIzuEMHrXgaHUL4RcKhrx5L4M",
  authDomain: "comp-carmen.firebaseapp.com",
  projectId: "comp-carmen",
  storageBucket: "comp-carmen.firebasestorage.app",
  messagingSenderId: "477005803846",
  appId: "1:477005803846:web:f1f3a01fef6e8d4a3f7547",
  measurementId: "G-112075NKRL"
};


// ==========================
// INIT
// ==========================
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);


// ==========================
// OPTIONAL ANON LOGIN (SAFE)
// ==========================
// ⚠️ NOTE: This is NOT needed for your game login system,
// but kept safe here so it won't interfere with Google/email users.
signInAnonymously(auth).catch(() => {
  console.warn("Anonymous auth not used / failed (safe to ignore)");
});


// ==========================
// ANALYTICS
// ==========================
try {
  getAnalytics(app);
} catch {
  console.warn("Analytics not available");
}


// ==========================
// USER NORMALISATION (IMPORTANT FIX)
// ==========================
function getSafeName(user, snapData) {
  return (
    snapData?.displayName ||
    user?.displayName ||
    user?.email?.split("@")[0] ||
    "Player"
  );
}


// ==========================
// SINGLE SOURCE USER SYNC
// ==========================
onAuthStateChanged(auth, async (user) => {
  if (!user) return;

  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  const data = snap.exists() ? snap.data() : {};

  const safeName = getSafeName(user, data);

  // Create user if doesn't exist
  if (!snap.exists()) {
    await setDoc(ref, {
      uid: user.uid,
      displayName: safeName,
      email: user.email || "",
      age: null,
      photoURL: user.photoURL || "./Images/defaultPFP.jpg",
      isAdmin: false,
      createdAt: serverTimestamp()
    });
  } else {
    if (!data.displayName && user.displayName) {
      await setDoc(ref, { displayName: user.displayName }, { merge: true });
    }
  }
});


// ==========================
// EXPORT
// ==========================
export { auth, db };