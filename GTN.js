import { auth, db } from "../../firebase.js";
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

import { onAuthStateChanged } 
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

/* =========================
   GLOBAL STATE
========================= */
let currentUser = null;
let currentGameId = null;
let gameData = null;

/* =========================
   ELEMENTS
========================= */
const lobbySection = document.getElementById("lobbySection");
const gameSection = document.getElementById("gameSection");

const lobbyList = document.getElementById("lobbyList");

const createGameBtn = document.getElementById("createGameBtn");

const guessInput = document.getElementById("guessInput");
const guessBtn = document.getElementById("guessBtn");

const feedback = document.getElementById("feedback");
const guessHistory = document.getElementById("guessHistory");

const gameStatus = document.getElementById("gameStatus");
const opponentInfo = document.getElementById("opponentInfo");
const turnInfo = document.getElementById("turnInfo");

const leaveBtn = document.getElementById("leaveBtn");

/* =========================
   AUTH CHECK
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
createGameBtn.addEventListener("click", async () => {

    const docRef = await addDoc(collection(db, "games"), {
        player1Id: currentUser.uid,
        player1Name: currentUser.displayName || "Player 1",

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

        createdAt: serverTimestamp(),
        lastActive: serverTimestamp()
    });

    joinGame(docRef.id);
});

/* =========================
   LOAD LOBBY
========================= */
function loadLobby() {

    const q = query(collection(db, "games"), where("status", "==", "waiting"));

    onSnapshot(q, (snapshot) => {

        lobbyList.innerHTML = "";

        snapshot.forEach((gameDoc) => {

            const game = gameDoc.data();

            const btn = document.createElement("button");

            btn.textContent = `Join ${game.player1Name}'s Game`;

            btn.onclick = () => joinGame(gameDoc.id, true);

            lobbyList.appendChild(btn);
        });
    });
}

/* =========================
   JOIN GAME
========================= */
async function joinGame(gameId, isJoiner = false) {

    currentGameId = gameId;

    const ref = doc(db, "games", gameId);

    if (isJoiner) {
        await updateDoc(ref, {
            player2Id: currentUser.uid,
            player2Name: currentUser.displayName || "Player 2",
            status: "playing",
            lastActive: serverTimestamp()
        });
    }

    listenToGame(gameId);

    lobbySection.classList.add("hidden");
    gameSection.classList.remove("hidden");
}

/* =========================
   REALTIME LISTENER
========================= */
function listenToGame(gameId) {

    const ref = doc(db, "games", gameId);

    onSnapshot(ref, (snapshot) => {

        gameData = snapshot.data();
        if (!gameData) return;

        // opponent info
        const opponent =
            currentUser.uid === gameData.player1Id
            ? gameData.player2Name
            : gameData.player1Name;

        opponentInfo.textContent = `Opponent: ${opponent || "Waiting..."}`;

        gameStatus.textContent = `Status: ${gameData.status}`;

        // turn system
        turnInfo.textContent =
            gameData.currentTurn === currentUser.uid
            ? "🎯 Your Turn"
            : "⏳ Opponent's Turn";

        // guess history
        const myGuesses =
            currentUser.uid === gameData.player1Id
            ? gameData.player1Guesses
            : gameData.player2Guesses;

        guessHistory.innerHTML = myGuesses
            .map(g => `<p>${g}</p>`)
            .join("");

        // win state
        if (gameData.status === "finished") {
            feedback.textContent =
                gameData.winnerId === currentUser.uid
                ? "🏆 You Win!"
                : "💀 You Lose";
        }
    });
}

/* =========================
   MAKE A GUESS
========================= */
guessBtn.addEventListener("click", async () => {

    const guess = Number(guessInput.value);

    if (!gameData) return;

    if (guess < 1 || guess > 100) {
        feedback.textContent = "Only 1–100 allowed";
        return;
    }

    if (gameData.currentTurn !== currentUser.uid) return;

    const ref = doc(db, "games", currentGameId);

    const isPlayer1 = currentUser.uid === gameData.player1Id;

    const guessField = isPlayer1 ? "player1Guesses" : "player2Guesses";
    const attemptField = isPlayer1 ? "player1Attempts" : "player2Attempts";

    await updateDoc(ref, {
        [guessField]: arrayUnion(guess),
        [attemptField]: increment(1),
        lastActive: serverTimestamp()
    });

    // WIN CHECK
    if (guess === gameData.secretNumber) {

        await updateDoc(ref, {
            status: "finished",
            winnerId: currentUser.uid
        });

        return;
    }

    feedback.textContent =
        guess > gameData.secretNumber ? "Too high 📈" : "Too low 📉";

    // SWITCH TURN
    const nextTurn =
        gameData.currentTurn === gameData.player1Id
        ? gameData.player2Id
        : gameData.player1Id;

    await updateDoc(ref, {
        currentTurn: nextTurn
    });
});

/* =========================
   LEAVE GAME
========================= */
leaveBtn.addEventListener("click", () => {
    location.reload();
});

