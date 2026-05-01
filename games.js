import { auth, db } from "./firebase.js";
import { getUserProfile } from "./user.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  collection,
  addDoc,
  doc,
  updateDoc,
  onSnapshot,
  query,
  where,
  arrayUnion,
  increment,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

let currentUser = null;
let currentGameId = null;

// AUTH
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  currentUser = await getUserProfile(user);
  loadLobby();
});

// CREATE GAME
document.getElementById("createGameBtn").addEventListener("click", async () => {

  const lobbyName = document.getElementById("lobbyNameInput").value || "Lobby";

  const ref = await addDoc(collection(db, "games"), {
    lobbyName,
    player1Id: currentUser.uid,
    player1Name: currentUser.name,
    player1Photo: currentUser.photo,

    player2Id: null,

    secretNumber: Math.floor(Math.random() * 100) + 1,
    currentTurn: currentUser.uid,
    status: "waiting",

    player1Guesses: [],
    player2Guesses: [],

    winnerId: null,
    createdAt: serverTimestamp()
  });

  joinGame(ref.id);
});