// ==========================
// FIREBASE CORE
// ==========================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

// ==========================
// AUTH
// ==========================
import {
  getAuth,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// ==========================
// FIRESTORE
// ==========================
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ==========================
// ANALYTICS
// ==========================
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
//  PERSISTENT LOGIN 
// ==========================
setPersistence(auth, browserLocalPersistence)
  .then(() => {
    console.log(" Persistent login enabled");
  })
  .catch((err) => {
    console.error("Persistence error:", err);
  });


// ==========================
// ANALYTICS (SAFE)
// ==========================
try {
  getAnalytics(app);
} catch {
  console.warn("Analytics not supported here");
}


// ==========================
// SAFE NAME HELPER
// ==========================
function getSafeName(user, data) {
  return (
    data?.displayName ||
    user?.displayName ||
    user?.email?.split("@")[0] ||
    "Player"
  );
}


// ==========================
// GLOBAL USER SYNC (FIXED)
// ==========================
onAuthStateChanged(auth, async (user) => {
  if (!user) return;

  try {
    const ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref);
    const data = snap.exists() ? snap.data() : {};

    const safeName = getSafeName(user, data);

    // ======================
    // CREATE USER
    // ======================
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

      console.log("🆕 User created:", safeName);
    }

    // ======================
    // FIX MISSING NAME
    // ======================
    else if (!data.displayName && user.displayName) {
      await setDoc(ref, {
        displayName: user.displayName
      }, { merge: true });

      console.log("🔧 Fixed missing displayName");
    }

  } catch (err) {
    console.error("User sync error:", err);
  }
});


// ==========================
// EXPORT
// ==========================
export { auth, db };