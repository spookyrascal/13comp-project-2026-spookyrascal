// Firebase Core
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-analytics.js";

// Firebase Auth
import {
getAuth,
GoogleAuthProvider,
signInWithPopup,
signOut,
onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// Firestore
import {
getFirestore,
doc,
setDoc,
getDoc,
serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// 🔥 YOUR CONFIG
const firebaseConfig = {
apiKey: "AIzaSyDh5jFP6KcIzuEMHrXgaHUL4RcKhrx5L4M",
authDomain: "comp-carmen.firebaseapp.com",
projectId: "comp-carmen",
storageBucket: "comp-carmen.firebasestorage.app",
messagingSenderId: "477005803846",
appId: "1:477005803846:web:f1f3a01fef6e8d4a3f7547",
measurementId: "G-112075NKRL"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// DOM Elements
const profileBtn = document.getElementById("profileBtn");
const dropdownMenu = document.getElementById("dropdownMenu");
const signInBtn = document.getElementById("signInBtn");
const signUpBtn = document.getElementById("signUpBtn");
const signOutBtn = document.getElementById("signOutBtn");
const playBtn = document.getElementById("playBtn");
const profileImage = document.getElementById("profileImage");
const defaultIcon = document.getElementById("defaultIcon");

// Toggle dropdown
profileBtn.addEventListener("click", () => {
dropdownMenu.classList.toggle("hidden");
});

// 🔐 Sign In / Sign Up
async function handleSignIn() {
try {
const result = await signInWithPopup(auth, provider);
const user = result.user;

// Check if user exists in Firestore
const userRef = doc(db, "users", user.uid);
const userSnap = await getDoc(userRef);

if (!userSnap.exists()) {
await setDoc(userRef, {
displayName: user.displayName,
email: user.email,
uid: user.uid,
isAdmin: false,
createdAt: serverTimestamp()
});
}
} catch (err) {
console.error("Error signing in:", err);
}
}

signInBtn.addEventListener("click", handleSignIn);
signUpBtn.addEventListener("click", handleSignIn);

// 🚪 Sign Out
signOutBtn.addEventListener("click", async () => {
await signOut(auth);
});

// 🔄 Auth State Listener
onAuthStateChanged(auth, (user) => {
if (user) {
signInBtn.classList.add("hidden");
signUpBtn.classList.add("hidden");
signOutBtn.classList.remove("hidden");

sessionStorage.setItem("userId", user.uid);
sessionStorage.setItem("displayName", user.displayName);

// Show profile picture
if (user.photoURL) {
profileImage.src = user.photoURL;
profileImage.classList.remove("hidden");
defaultIcon.classList.add("hidden");
}
} else {
signInBtn.classList.remove("hidden");
signUpBtn.classList.remove("hidden");
signOutBtn.classList.add("hidden");

sessionStorage.clear();

profileImage.classList.add("hidden");
defaultIcon.classList.remove("hidden");
}
});

// 🎮 Play Button
playBtn.addEventListener("click", () => {
if (!sessionStorage.getItem("userId")) {
alert("Please sign in first.");
return;
}
window.location.href = "gameSelection.html";
});

