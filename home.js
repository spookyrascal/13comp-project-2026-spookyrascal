// Firebase Core (required to initialize Firebase in the app)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-analytics.js";

// Firebase Auth (handles login, logout, and auth state)
import {
getAuth,
GoogleAuthProvider,
signInWithPopup,
signOut,
onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// Firestore (database for storing user data)
import {
getFirestore,
doc,
setDoc,
getDoc,
serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// 🔥 CONFIG
// Firebase project configuration (connects this app to your Firebase project)
const firebaseConfig = {
apiKey: "AIzaSyDh5jFP6KcIzuEMHrXgaHUL4RcKhrx5L4M",
authDomain: "comp-carmen.firebaseapp.com",
projectId: "comp-carmen",
storageBucket: "comp-carmen.firebasestorage.app",
messagingSenderId: "477005803846",
appId: "1:477005803846:web:f1f3a01fef6e8d4a3f7547",
measurementId: "G-112075NKRL"
};

// Initialize Firebase services
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app); // tracks usage analytics
const auth = getAuth(app); // authentication system
const db = getFirestore(app); // Firestore database
const provider = new GoogleAuthProvider(); // Google login provider

// DOM Elements (buttons and UI elements from the HTML)
const profileBtn = document.getElementById("profileBtn");
const dropdownMenu = document.getElementById("dropdownMenu");
const signInBtn = document.getElementById("signInBtn");
const signUpBtn = document.getElementById("signUpBtn");
const signOutBtn = document.getElementById("signOutBtn");
const playBtn = document.getElementById("playBtn");
const profileImage = document.getElementById("profileImage");
const defaultIcon = document.getElementById("defaultIcon");

// Toggle dropdown menu when the profile icon is clicked
profileBtn.addEventListener("click", () => {
dropdownMenu.classList.toggle("hidden");
});

// 🔐 Sign In / Sign Up
// Handles both sign in and sign up since Google auth manages both automatically
async function handleSignIn() {
try {

// Opens Google sign-in popup
const result = await signInWithPopup(auth, provider);
const user = result.user;

// Reference to the user document in Firestore
const userRef = doc(db, "users", user.uid);
const userSnap = await getDoc(userRef);

// If the user does not already exist in the database, create them
if (!userSnap.exists()) {
await setDoc(userRef, {
displayName: user.displayName,
email: user.email,
uid: user.uid,
isAdmin: false, // default permission
createdAt: serverTimestamp() // timestamp from Firebase server
});
}

} catch (err) {
// Error handling if login fails
console.error("Error signing in:", err);
}
}

// Both buttons use the same sign-in function
signInBtn.addEventListener("click", handleSignIn);
signUpBtn.addEventListener("click", handleSignIn);

// 🚪 Sign Out
// Logs the user out of Firebase
signOutBtn.addEventListener("click", async () => {
await signOut(auth);
});

// 🔄 Auth State Listener
// Runs automatically whenever login state changes
onAuthStateChanged(auth, (user) => {

if (user) {
// User is logged in → update UI

signInBtn.classList.add("hidden");
signUpBtn.classList.add("hidden");
signOutBtn.classList.remove("hidden");

// Store user info in session storage for use on other pages
sessionStorage.setItem("userId", user.uid);
sessionStorage.setItem("displayName", user.displayName);

// Show profile picture if Google account has one
if (user.photoURL) {
profileImage.src = user.photoURL;
profileImage.classList.remove("hidden");
defaultIcon.classList.add("hidden");
}

} else {
// User is logged out → reset UI

signInBtn.classList.remove("hidden");
signUpBtn.classList.remove("hidden");
signOutBtn.classList.add("hidden");

// Clear stored session data
sessionStorage.clear();

// Show default profile icon
profileImage.classList.add("hidden");
defaultIcon.classList.remove("hidden");
}
});

// 🎮 Play Button
// Prevents users from entering the game without signing in
playBtn.addEventListener("click", () => {

if (!sessionStorage.getItem("userId")) {
alert("Please sign in first.");
return;
}

// Redirect to the game selection page
window.location.href = "games.html";
});