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
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  updateProfile
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
  increment
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* =========================
   STATE
========================= */

let user = null;
let gameId = null;
let unsub = null;
let ended = false;
let processingWin = false;

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

onAuthStateChanged(auth, function (u) {
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

/* =========================
   HELPERS
========================= */

function safeArray(v) {
  if (Array.isArray(v)) {
    return v;
  }
  return [];
}

function getHint(distance, last) {
  let msg = "";

  if (distance === 0) {
    msg = "Correct!";
  } else if (distance <= 3) {
    msg = "Very hot";
  } else if (distance <= 10) {
    msg = "Warm";
  } else {
    msg = "Cold";
  }

  if (last != null && distance !== 0) {
    if (distance < last) {
      msg = msg + " (closer)";
    } else {
      msg = msg + " (colder)";
    }
  }

  return msg;
}

/* =========================
   ENTER KEY
========================= */

guessInput.addEventListener("keydown", function (e) {
  if (e.key === "Enter") {
    guessBtn.click();
  }
});

/* =========================
   CREATE GAME
========================= */

createBtn.addEventListener("click", async function () {
  let name = lobbyInput.value;

  if (!name) {
    name = "Lobby";
  }

  const ref = await addDoc(collection(db, "games"), {
    lobbyName: name,

    player1Id: user.uid,
    player1Name: user.name,

    player2Id: "",
    player2Name: "",

    secretNumber: Math.floor(Math.random() * 100) + 1,

    currentTurn: user.uid,
    status: "waiting",

    player1Guesses: [],
    player2Guesses: [],

    player1LastDistance: null,
    player2LastDistance: null,

    winnerId: "",

    createdAt: serverTimestamp(),
    lastActive: serverTimestamp()
  });

  join(ref.id);
});

/* =========================
   LOBBY
========================= */

function loadLobby() {
  const q = query(collection(db, "games"), where("status", "==", "waiting"));

  onSnapshot(q, function (snap) {
    lobbyList.innerHTML = "";

    snap.forEach(function (docSnap) {
      const game = docSnap.data();

      if (!game.player1Id) {
        return;
      }

      if (game.player1Id === user.uid) {
        return;
      }

      const card = document.createElement("div");
      card.className = "lobbyCard";

      card.innerHTML =
        "<h3>" +
        game.lobbyName +
        "</h3>" +
        "<p>Host: " +
        game.player1Name +
        "</p>" +
        "<button>Join</button>";

      card.querySelector("button").onclick = async function () {
        await updateDoc(doc(db, "games", docSnap.id), {
          player2Id: user.uid,
          player2Name: user.name,
          status: "playing",
          lastActive: serverTimestamp()
        });

        join(docSnap.id);
      };

      lobbyList.appendChild(card);
    });
  });
}

/* =========================
   JOIN
========================= */

function join(id) {
  gameId = id;
  ended = false;
  processingWin = false;

  lobbySection.classList.add("hidden");
  gameSection.classList.remove("hidden");
  winScreen.classList.add("hidden");

  if (unsub) {
    unsub();
  }

  listen(id);
}

/* =========================
   GUESS
========================= */

guessBtn.addEventListener("click", async function () {
  if (!gameId) {
    return;
  }

  if (ended) {
    return;
  }

  const guess = Number(guessInput.value);

  if (!Number.isInteger(guess)) {
    return;
  }

  const ref = doc(db, "games", gameId);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    return;
  }

  const game = snap.data();

  if (game.status !== "playing") {
    return;
  }

  if (!game.player2Id) {
    return;
  }

  if (game.currentTurn !== user.uid) {
    return;
  }

  const isP1 = game.player1Id === user.uid;

  const last =
    isP1 === true
      ? game.player1LastDistance
      : game.player2LastDistance;

  const distance = Math.abs(guess - game.secretNumber);
  const hint = getHint(distance, last);

  feedback.textContent = hint;

  const field =
    isP1 === true ? "player1Guesses" : "player2Guesses";

  const updates = {};
  updates[field] = arrayUnion({
    value: guess,
    hint: hint,
    distance: distance
  });

  if (isP1 === true) {
    updates.currentTurn = game.player2Id;
    updates.player1LastDistance = distance;
  } else {
    updates.currentTurn = game.player1Id;
    updates.player2LastDistance = distance;
  }

  updates.lastActive = serverTimestamp();

  /* WIN */
  if (distance === 0 && processingWin === false) {
    processingWin = true;

    updates.status = "finished";
    updates.winnerId = user.uid;
    updates.currentTurn = "";

    const loserId =
      isP1 === true ? game.player2Id : game.player1Id;

    await updateDoc(doc(db, "users", user.uid), {
      wins: increment(1),
      gamesPlayed: increment(1),
      lastActive: serverTimestamp()
    });

    if (loserId) {
      await updateDoc(doc(db, "users", loserId), {
        losses: increment(1),
        gamesPlayed: increment(1),
        lastActive: serverTimestamp()
      });
    }
  }

  await updateDoc(ref, updates);

  guessInput.value = "";
});

/* =========================
   LISTENER
========================= */

function listen(id) {
  const ref = doc(db, "games", id);

  unsub = onSnapshot(ref, function (snap) {
    const game = snap.data();

    if (!game) {
      return;
    }

    const isP1 = game.player1Id === user.uid;

    let oppName = "";

    if (isP1 === true) {
      oppName = game.player2Name;
    } else {
      oppName = game.player1Name;
    }

    if (!oppName) {
      oppName = "Waiting...";
    }

    opponent.textContent = oppName;

    let myTurn = false;

    if (game.currentTurn === user.uid) {
      myTurn = true;
    }

    if (game.status === "waiting") {
      turn.textContent = "Waiting for opponent...";
    } else if (game.status === "finished") {
      turn.textContent = "Game finished";
    } else if (myTurn === true) {
      turn.textContent = "Your turn";
    } else {
      turn.textContent = "Opponent turn";
    }

    guessInput.disabled = !myTurn;
    guessBtn.disabled = !myTurn;

    const own =
      isP1 === true
        ? game.player1Guesses
        : game.player2Guesses;

    const opp =
      isP1 === true
        ? game.player2Guesses
        : game.player1Guesses;

    const yourList = safeArray(own);
    const oppList = safeArray(opp);

    history.innerHTML = "";

    let yourHTML = "<strong>You</strong>";
    for (let i = 0; i < yourList.length; i++) {
      yourHTML +=
        "<div>#" +
        (i + 1) +
        " " +
        yourList[i].value +
        " — " +
        yourList[i].hint +
        "</div>";
    }

    let oppHTML = "<strong>Opponent</strong>";
    for (let i = 0; i < oppList.length; i++) {
      oppHTML +=
        "<div>#" +
        (i + 1) +
        " " +
        (oppList[i].value || "") +
        "</div>";
    }

    history.innerHTML = yourHTML + oppHTML;

    if (game.status === "finished" && ended === false) {
      ended = true;

      gameSection.classList.add("hidden");
      winScreen.classList.remove("hidden");

      if (game.winnerId === user.uid) {
        winText.textContent = "You win 🎉";
      } else {
        winText.textContent = "You lose 💀";
      }
    }
  });
}