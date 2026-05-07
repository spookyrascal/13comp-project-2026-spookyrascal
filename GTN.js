import { auth, db } from "./firebase.js";
import { getUserProfile } from "./user.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  collection,
  addDoc,
  doc,
  getDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  serverTimestamp,
  arrayUnion
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* =========================
   STATE
========================= */
let currentUser = null;
let currentGameId = null;

/* =========================
   DOM
========================= */
const createGameBtn = document.getElementById("createGameBtn");
const lobbyNameInput = document.getElementById("lobbyNameInput");

const guessInput = document.getElementById("guessInput");
const guessBtn = document.getElementById("guessBtn");

const feedback = document.getElementById("feedback");
const guessHistory = document.getElementById("guessHistory");

const gameSection = document.getElementById("gameSection");
const lobbySection = document.getElementById("lobbySection");
const winScreen = document.getElementById("winScreen");
const winText = document.getElementById("winText");

/* =========================
   AUTH
========================= */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  try {
    currentUser = await getUserProfile(user);
  } catch {
    currentUser = {
      uid: user.uid,
      name: user.displayName || "Player",
      photo: user.photoURL || "./Images/defaultPFP.jpg"
    };
  }

  loadLobby();
});

/* =========================
   CREATE GAME
========================= */
createGameBtn?.addEventListener("click", async () => {
  if (!currentUser) return;

  const lobbyName = lobbyNameInput?.value?.trim() || "Lobby";

  const ref = await addDoc(collection(db, "games"), {
    lobbyName,

    player1Id: currentUser.uid,
    player1Name: currentUser.name,
    player1Photo: currentUser.photo,

    player2Id: null,
    player2Name: null,

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

/* =========================
   LOBBY
========================= */
function loadLobby() {
  const lobbyList = document.getElementById("lobbyList");
  if (!lobbyList) return;

  const q = query(collection(db, "games"), where("status", "==", "waiting"));

  onSnapshot(q, (snapshot) => {
    lobbyList.innerHTML = "";

    snapshot.forEach((docSnap) => {
      const game = docSnap.data();

      const card = document.createElement("div");
      card.className = "lobbyCard";

      card.innerHTML = `
        <h3>${game.lobbyName}</h3>
        <p>Host: ${game.player1Name}</p>
        <button class="joinBtn">Join</button>
      `;

      card.querySelector(".joinBtn")?.addEventListener("click", async () => {
        if (!currentUser) return;

        await updateDoc(doc(db, "games", docSnap.id), {
          player2Id: currentUser.uid,
          player2Name: currentUser.name,
          status: "playing"
        });

        joinGame(docSnap.id);
      });

      lobbyList.appendChild(card);
    });
  });
}

/* =========================
   JOIN GAME
========================= */
function joinGame(id) {
  currentGameId = id;

  lobbySection?.classList.add("hidden");
  gameSection?.classList.remove("hidden");
  winScreen?.classList.add("hidden");

  listenToGame(id);
}

/* =========================
   GUESS SYSTEM
========================= */
guessBtn?.addEventListener("click", async () => {
  if (!currentGameId || !currentUser) return;

  const guess = Number(guessInput.value);
  if (!guess) return;

  const ref = doc(db, "games", currentGameId);
  const snap = await getDoc(ref);
  const data = snap.data();

  if (!data || data.status !== "playing") return;

  const isPlayer1 = currentUser.uid === data.player1Id;

  if (data.currentTurn !== currentUser.uid) {
    feedback.textContent = "⏳ Not your turn!";
    return;
  }

  let result = "";

  if (guess === data.secretNumber) {
    result = "🎉 Correct! You win!";
  } else if (guess < data.secretNumber) {
    result = "📉 Too low!";
  } else {
    result = "📈 Too high!";
  }

  feedback.textContent = result;

  await updateDoc(ref, {
    [isPlayer1 ? "player1Guesses" : "player2Guesses"]: arrayUnion(guess),

    currentTurn:
      data.currentTurn === data.player1Id
        ? data.player2Id
        : data.player1Id,

    winnerId: guess === data.secretNumber ? currentUser.uid : data.winnerId,

    status: guess === data.secretNumber ? "finished" : "playing"
  });

  guessInput.value = "";
});

/* =========================
   GAME LISTENER
========================= */
function listenToGame(id) {
  const ref = doc(db, "games", id);

  onSnapshot(ref, (snap) => {
    const data = snap.data();
    if (!data) return;

    const opponent =
      currentUser.uid === data.player1Id
        ? data.player2Name
        : data.player1Name;

    document.getElementById("opponentInfo").textContent =
      "Opponent: " + (opponent || "Waiting...");

    document.getElementById("turnInfo").textContent =
      data.currentTurn === currentUser.uid
        ? "🎯 Your Turn"
        : "⏳ Opponent Turn";

    /* =========================
       GUESS HISTORY
    ========================= */
    const guesses =
      currentUser.uid === data.player1Id
        ? data.player1Guesses
        : data.player2Guesses;

    if (guessHistory) {
      guessHistory.innerHTML = guesses
        .map(g => `<div class="guessChip">${g}</div>`)
        .join("");
    }

    /* =========================
       GAME OVER
    ========================= */
    if (data.status === "finished") {
      const win = data.winnerId === currentUser.uid;

      gameSection?.classList.add("hidden");
      winScreen?.classList.remove("hidden");

      winText.textContent = win
        ? "🏆 YOU WON!"
        : "💀 YOU LOST";

      feedback.textContent = win
        ? "Clean win 😎"
        : "Unlucky… try again 💀";
    }
  });
}