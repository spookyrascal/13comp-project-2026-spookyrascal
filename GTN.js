import { auth, db } from "./firebase.js";
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
  serverTimestamp,
  getDoc,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


let currentUser = null;
let currentGameId = null;
let gameData = null;


/* =========================
   AUTH
========================= */
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "../../index.html";
    return;
  }

  currentUser = user;
  loadLobby();
});


/* =========================
   CREATE GAME
========================= */
document.getElementById("createGameBtn").addEventListener("click", async () => {

  const lobbyName =
    document.getElementById("lobbyNameInput").value.trim() || "Lobby";

  const ref = await addDoc(collection(db, "games"), {
    lobbyName,
    player1Id: currentUser.uid,
    player1Name: currentUser.displayName || "Player",
    player1Photo: currentUser.photoURL || "./Images/defaultPFP.jpg",

    player2Id: null,
    player2Name: null,

    secretNumber: Math.floor(Math.random() * 100) + 1,

    currentTurn: currentUser.uid,
    status: "waiting",

    player1Guesses: [],
    player2Guesses: [],

    player1Attempts: 0,
    player2Attempts: 0,

    winnerId: null,
    createdAt: serverTimestamp()
  });

  joinGame(ref.id);
});


/* =========================
   LOBBY
========================= */
function loadLobby() {
  const q = query(collection(db, "games"), where("status", "==", "waiting"));

  onSnapshot(q, (snapshot) => {
    const lobbyList = document.getElementById("lobbyList");
    lobbyList.innerHTML = "";

    snapshot.forEach((docSnap) => {
      const game = docSnap.data();

      const card = document.createElement("div");
      card.className = "lobbyCard";

      card.innerHTML = `
        <h3>${game.lobbyName}</h3>
        <p>${game.player1Name}</p>
        <button>Join</button>
      `;

      card.querySelector("button").onclick = async () => {
        await updateDoc(doc(db, "games", docSnap.id), {
          player2Id: currentUser.uid,
          player2Name: currentUser.displayName,
          status: "playing"
        });

        joinGame(docSnap.id);
      };

      lobbyList.appendChild(card);
    });
  });
}


/* =========================
   JOIN GAME
========================= */
function joinGame(id) {
  currentGameId = id;

  document.getElementById("lobbySection").classList.add("hidden");
  document.getElementById("gameSection").classList.remove("hidden");

  listenToGame(id);
}


/* =========================
   GAME LISTENER
========================= */
function listenToGame(id) {
  const ref = doc(db, "games", id);

  onSnapshot(ref, (snap) => {
    gameData = snap.data();
    if (!gameData) return;

    const opponent =
      currentUser.uid === gameData.player1Id
        ? gameData.player2Name
        : gameData.player1Name;

    document.getElementById("opponentInfo").textContent =
      "Opponent: " + (opponent || "Waiting...");

    document.getElementById("turnInfo").textContent =
      gameData.currentTurn === currentUser.uid
        ? "Your Turn"
        : "Opponent Turn";
  });
}

/* =========================
  PROFILE   
========================= */
onAuthStateChanged(auth, (user) => {
    if (!user) {
      window.location.href = "../../index.html";
      return;
    }
  
    currentUser = user;
  
    // Set profile image safely
    const profileImage = document.getElementById("profileImage");
    if (profileImage) {
      profileImage.src = user.photoURL || "./Images/defaultPFP.jpg";
    }
  
    loadLobby();
  });