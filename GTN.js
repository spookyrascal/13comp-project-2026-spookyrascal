import { auth, db } from "./firebase.js";

import {
  collection,
  addDoc,
  updateDoc,
  doc,
  onSnapshot,
  getDocs,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

let currentGameId = null;
let currentUser = null;

// UI elements
const createBtn = document.getElementById("createGameBtn");
const gameList = document.getElementById("gameList");
const statusText = document.getElementById("status");
const gameArea = document.getElementById("gameArea");
const guessBtn = document.getElementById("guessBtn");
const guessInput = document.getElementById("guessInput");
const feedback = document.getElementById("feedback");
const turnText = document.getElementById("turnText");
const lobby = document.getElementById("lobby");

// AUTH
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    loadGames();
  }
});

// CREATE GAME
createBtn.addEventListener("click", async () => {
  const randomNumber = Math.floor(Math.random() * 100) + 1;

  const docRef = await addDoc(collection(db, "games"), {
    player1Id: currentUser.uid,
    player2Id: null,
    currentTurn: currentUser.uid,
    secretNumber: randomNumber,
    status: "waiting"
  });

  currentGameId = docRef.id;
  listenToGame(docRef.id);
});

// LOAD GAMES
async function loadGames() {
  const snapshot = await getDocs(collection(db, "games"));
  gameList.innerHTML = "";

  snapshot.forEach(docSnap => {
    const game = docSnap.data();

    if (game.status === "waiting") {
      const btn = document.createElement("button");
      btn.textContent = "Join Game";

      btn.onclick = async () => {
        await updateDoc(doc(db, "games", docSnap.id), {
          player2Id: currentUser.uid,
          status: "playing"
        });

        currentGameId = docSnap.id;
        listenToGame(docSnap.id);
      };

      gameList.appendChild(btn);
    }
  });
}

// REALTIME GAME LISTENER
function listenToGame(gameId) {
  onSnapshot(doc(db, "games", gameId), (docSnap) => {
    const game = docSnap.data();
    if (!game) return;

    if (game.status === "waiting") {
      statusText.textContent = "Waiting for Player 2...";
    }

    if (game.status === "playing") {
      lobby.style.display = "none";
      gameArea.classList.remove("hidden");

      turnText.textContent =
        game.currentTurn === currentUser.uid
          ? "Your Turn"
          : "Opponent's Turn";
    }

    if (game.status === "finished") {
      statusText.textContent =
        game.winnerId === currentUser.uid
          ? "🎉 You Win!"
          : "😢 You Lose";
    }
  });
}

// GUESS BUTTON
guessBtn.addEventListener("click", async () => {
  const guess = Number(guessInput.value);

  if (guess < 1 || guess > 100) {
    feedback.textContent = "Enter number 1-100";
    return;
  }

  const gameRef = doc(db, "games", currentGameId);
  const docSnap = await getDoc(gameRef);
  const game = docSnap.data();

  if (game.currentTurn !== currentUser.uid) {
    feedback.textContent = "Not your turn!";
    return;
  }

  if (guess === game.secretNumber) {
    await updateDoc(gameRef, {
      status: "finished",
      winnerId: currentUser.uid
    });

  } else {
    feedback.textContent =
      guess > game.secretNumber ? "Too high" : "Too low";

    const nextTurn =
      currentUser.uid === game.player1Id
        ? game.player2Id
        : game.player1Id;

    await updateDoc(gameRef, {
      currentTurn: nextTurn
    });
  }
});