import { auth, db } from "./firebase.js";
import { onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, setDoc, serverTimestamp, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const $ = (id) => document.getElementById(id);

const el = {
  headerImg: $("headerProfileImage"),
  preview: $("profilePreview"),
  live: $("livePreview"),
  name: $("profileDisplayName"),
  email: $("profileEmail"),
  age: $("profileAge"),
  wins: $("winsStat"),
  losses: $("lossesStat"),
  games: $("gamesStat"),
  rate: $("rateStat")
};

const DEFAULT_PFP = "./Images/defaultPFP.jpg";

let userRef;
let unsub;

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.replace("index.html");
    return;
  }

  userRef = doc(db, "users", user.uid);

  if (unsub) unsub();

  unsub = onSnapshot(userRef, async (snap) => {
    if (!snap.exists()) {
      await setDoc(userRef, {
        displayName: user.displayName || "Player",
        email: user.email || "",
        photoURL: user.photoURL || DEFAULT_PFP,
        wins: 0,
        losses: 0,
        gamesPlayed: 0,
        createdAt: serverTimestamp()
      });

      return;
    }

    render(user, snap.data());
  });
});

function render(u, p) {
  const photo = p.photoURL || DEFAULT_PFP;

  [el.headerImg, el.preview, el.live].forEach(i => {
    if (i) i.src = photo;
  });

  el.name.textContent = p.displayName || "Player";
  el.email.textContent = p.email || u.email;
  el.age.textContent = p.age ? `Age: ${p.age}` : "Age: Not set";

  const wins = p.wins || 0;
  const losses = p.losses || 0;
  const games = p.gamesPlayed || 0;

  el.wins.textContent = wins;
  el.losses.textContent = losses;
  el.games.textContent = games;
  el.rate.textContent = games ? `${Math.round((wins / games) * 100)}%` : "0%";
}