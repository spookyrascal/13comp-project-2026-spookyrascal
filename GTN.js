/*
========================================
FILE: GTN.js

PURPOSE:
This file runs the "Guess The Number" multiplayer game.

BIG PICTURE:
It handles:
- Authentication
- Lobby creation + joining
- Real-time multiplayer gameplay
- Guess checking logic
- Win/loss tracking
- Game state syncing via Firestore
========================================
*/


import { auth, db } from "./firebase.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  collection,
  addDoc,
  updateDoc,
  getDoc,
  doc,
  onSnapshot,
  query,
  where,
  serverTimestamp,
  arrayUnion,
  increment,
  runTransaction
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* =========================
   STATE
========================= */

let user = null;
let gameId = null;
let unsub = null;

let ended = false;
let processingWin = false;
let guessCooldown = false;

/* =========================
   DOM
========================= */

const lobbySection = document.getElementById("lobbySection");
const gameSection = document.getElementById("gameSection");
const winScreen = document.getElementById("winScreen");

const lobbyList = document.getElementById("lobbyList");
const createBtn = document.getElementById("createGameBtn");
const lobbyInput = document.getElementById("lobbyNameInput");

const guessInput = document.getElementById("guessInput");
const guessBtn = document.getElementById("guessBtn");

const feedback = document.getElementById("feedback");
const history = document.getElementById("guessHistory");

const opponent = document.getElementById("opponentInfo");
const turn = document.getElementById("turnInfo");

const winText = document.getElementById("winText");

const DEFAULT_PFP = "./Images/defaultPFP.jpg";

/* =========================
   AUTH
========================= */

onAuthStateChanged(auth, (u) => {
  if (!u) {
    location.href = "index.html";
    return;
  }

  user = {
    uid: u.uid,
    name: u.displayName || "Player",
    photo: u.photoURL || DEFAULT_PFP
  };

  loadLobby();
});

document.body.dataset.turn = myTurn ? "your" : "enemy";

/* =========================
   BOOT SCREEN
========================= */

window.addEventListener("load", () => {
  const boot = document.getElementById("bootScreen");
  if (!boot) return;

  setTimeout(() => {
    boot.style.display = "none";
  }, 2800);
});

/* =========================
   HELPERS
========================= */

function safeArray(v) {
  return Array.isArray(v) ? v : [];
}

function getHint(distance, last) {
  let msg;

  if (distance === 0) msg = "Correct!";
  else if (distance <= 3) msg = "Very hot";
  else if (distance <= 10) msg = "Warm";
  else msg = "Cold";

  if (last != null && distance !== 0) {
    msg += distance < last ? " (closer)" : " (colder)";
  }

  return msg;
}

/* =========================
   CREATE GAME
========================= */

createBtn.addEventListener("click", async () => {
  if (!user) return;

  const name = lobbyInput.value || "Lobby";

  try {
    const ref = await addDoc(collection(db, "games"), {
      lobbyName: name,

      player1Id: user.uid,
      player1Name: user.name,

      player2Id: null,
      player2Name: null,

      secretNumber: Math.floor(Math.random() * 100) + 1,

      currentTurn: user.uid,
      status: "waiting",

      player1Guesses: [],
      player2Guesses: [],

      player1LastDistance: null,
      player2LastDistance: null,

      winnerId: null,
      joinLocked: false,

      createdAt: serverTimestamp(),
      lastActive: serverTimestamp()
    });

    join(ref.id);
  } catch (err) {
    console.error("Create game failed:", err);
  }
});

/* =========================
   LOBBY
========================= */

function loadLobby() {
  const q = query(collection(db, "games"), where("status", "==", "waiting"));

  onSnapshot(
    q,
    (snap) => {
      lobbyList.innerHTML = "";

      snap.forEach((docSnap) => {
        const game = docSnap.data();

        if (game.player1Id === user.uid) return;
        if (game.joinLocked) return;

        const card = document.createElement("div");
        card.className = "lobbyCard";

        card.innerHTML = `
          <h3>${game.lobbyName}</h3>
          <p>Host: ${game.player1Name}</p>
          <button>Join</button>
        `;

        card.querySelector("button").onclick = async () => {
          const ref = doc(db, "games", docSnap.id);

          try {
            await runTransaction(db, async (tx) => {
              const snap = await tx.get(ref);
              if (!snap.exists()) return;

              const data = snap.data();

              if (data.player2Id || data.joinLocked) {
                throw new Error("Game unavailable");
              }

              tx.update(ref, {
                player2Id: user.uid,
                player2Name: user.name,
                status: "playing",
                joinLocked: true,
                lastActive: serverTimestamp()
              });
            });

            join(docSnap.id);
          } catch (err) {
            console.log("Join failed:", err.message);
          }
        };

        lobbyList.appendChild(card);
      });
    },
    (err) => {
      console.error("Lobby listener error:", err);
    }
  );
}

/* =========================
   JOIN GAME
========================= */

function join(id) {
  gameId = id;
  ended = false;
  processingWin = false;

  lobbySection.classList.add("hidden");
  gameSection.classList.remove("hidden");
  winScreen.classList.add("hidden");

  if (unsub) unsub();

  listen(id);
}

/* =========================
   GUESS SYSTEM
========================= */

guessBtn.addEventListener("click", async () => {
  if (!gameId || ended || guessCooldown) return;

  const guess = Number(guessInput.value);
  if (!Number.isInteger(guess) || guess < 1 || guess > 100) return;

  guessCooldown = true;
  setTimeout(() => (guessCooldown = false), 500);

  const ref = doc(db, "games", gameId);
  const snap = await getDoc(ref);

  if (!snap.exists()) return;

  const game = snap.data();

  if (game.status !== "playing") return;
  if (game.currentTurn !== user.uid) return;

  const isP1 = game.player1Id === user.uid;

  const last = isP1
    ? game.player1LastDistance
    : game.player2LastDistance;

  const distance = Math.abs(guess - game.secretNumber);
  const hint = getHint(distance, last);

  feedback.textContent = hint;

  const field = isP1 ? "player1Guesses" : "player2Guesses";

  const updates = {
    [field]: arrayUnion({
      value: guess,
      hint,
      distance
    }),
    currentTurn: isP1 ? game.player2Id : game.player1Id,
    lastActive: serverTimestamp()
  };

  if (isP1) updates.player1LastDistance = distance;
  else updates.player2LastDistance = distance;

  /* =========================
     WIN CHECK (SAFE)
  ========================= */

  if (distance === 0 && !processingWin) {
    processingWin = true;

    try {
      await runTransaction(db, async (tx) => {
        const fresh = await tx.get(ref);
        if (!fresh.exists()) return;

        const g = fresh.data();
        if (g.status === "finished") return;

        const loserId = isP1 ? g.player2Id : g.player1Id;

        tx.update(ref, {
          status: "finished",
          winnerId: user.uid,
          currentTurn: null,
          lastActive: serverTimestamp()
        });

        const winnerRef = doc(db, "users", user.uid);

        tx.update(winnerRef, {
          wins: increment(1),
          gamesPlayed: increment(1),
          lastActive: serverTimestamp()
        });

        if (loserId) {
          const loserRef = doc(db, "users", loserId);

          tx.update(loserRef, {
            losses: increment(1),
            gamesPlayed: increment(1),
            lastActive: serverTimestamp()
          });
        }
      });

      ended = true;
    } catch (err) {
      console.error("Win transaction failed:", err);
    }
  }

  try {
    await updateDoc(ref, updates);
  } catch (err) {
    console.error("Guess update failed:", err);
  }

  guessInput.value = "";
});

/* =========================
   LISTENER (FIXED)
========================= */

function listen(id) {
  const ref = doc(db, "games", id);

  unsub = onSnapshot(
    ref,
    (snap) => {
      if (!snap.exists()) return;

      const game = snap.data();

      const isP1 = game.player1Id === user.uid;

      const oppName = isP1
        ? game.player2Name
        : game.player1Name;

      opponent.textContent = oppName || "Waiting...";

      const myTurn = game.currentTurn === user.uid;

      if (game.status === "waiting") turn.textContent = "Waiting for opponent...";
      else if (game.status === "finished") turn.textContent = "Game finished";
      else turn.textContent = myTurn ? "Your turn" : "Opponent turn";

      guessInput.disabled = !myTurn;
      guessBtn.disabled = !myTurn;

      const yourList = safeArray(isP1 ? game.player1Guesses : game.player2Guesses);
      const oppList = safeArray(isP1 ? game.player2Guesses : game.player1Guesses);

      let yourHTML = "<strong>You</strong>";
      for (let i = 0; i < yourList.length; i++) {
        yourHTML += `<div>#${i + 1} ${yourList[i].value} — ${yourList[i].hint}</div>`;
      }

      let oppHTML = "<strong>Opponent</strong>";
      for (let i = 0; i < oppList.length; i++) {
        oppHTML += `<div>#${i + 1} ${oppList[i].value}</div>`;
      }

      history.innerHTML = yourHTML + oppHTML;

      if (game.status === "finished" && !ended) {
        ended = true;

        gameSection.classList.add("hidden");
        winScreen.classList.remove("hidden");

        winText.textContent =
          game.winnerId === user.uid ? "You win 🎉" : "You lose 💀";
      }
    },
    (err) => {
      console.error("Game listener error:", err);
    }
  );
}