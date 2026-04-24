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
    serverTimestamp,
    getDoc,
    setDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { onAuthStateChanged } 
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

/* =========================
   STATE
========================= */
let currentUser = null;
let currentGameId = null;
let gameData = null;

/* =========================
   CONSTANTS
========================= */
const TURN_LIMIT = 30;

/* =========================
   UI ELEMENTS
========================= */
const lobbySection = document.getElementById("lobbySection");
const gameSection = document.getElementById("gameSection");
const winScreen = document.getElementById("winScreen");

const lobbyList = document.getElementById("lobbyList");

const createGameBtn = document.getElementById("createGameBtn");
const guessBtn = document.getElementById("guessBtn");
const guessInput = document.getElementById("guessInput");

const feedback = document.getElementById("feedback");
const guessHistory = document.getElementById("guessHistory");

const gameStatus = document.getElementById("gameStatus");
const opponentInfo = document.getElementById("opponentInfo");
const turnInfo = document.getElementById("turnInfo");

const winText = document.getElementById("winText");
const rematchBtn = document.getElementById("rematchBtn");

const leaveBtn = document.getElementById("leaveBtn");

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
createGameBtn.addEventListener("click", async () => {

    const ref = await addDoc(collection(db, "games"), {
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

        rematchRequestPlayer1: false,
        rematchRequestPlayer2: false,

        createdAt: serverTimestamp(),
        lastActive: serverTimestamp(),
        turnStartTime: serverTimestamp()
    });

    joinGame(ref.id);
});

/* =========================
   LOBBY
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
async function joinGame(gameId, isJoin = false) {

    currentGameId = gameId;
    const ref = doc(db, "games", gameId);

    if (isJoin) {
        await updateDoc(ref, {
            player2Id: currentUser.uid,
            player2Name: currentUser.displayName || "Player 2",
            status: "playing",
            currentTurn: gameData?.player1Id || currentUser.uid,
            turnStartTime: serverTimestamp()
        });
    }

    listenToGame(gameId);

    lobbySection.classList.add("hidden");
    gameSection.classList.remove("hidden");
}

/* =========================
   REALTIME GAME LISTENER
========================= */
function listenToGame(gameId) {

    const ref = doc(db, "games", gameId);

    onSnapshot(ref, async (snap) => {

        gameData = snap.data();
        if (!gameData) return;

        /* =========================
           WIN SCREEN
        ========================= */
        if (gameData.status === "finished") {

            gameSection.classList.add("hidden");
            winScreen.classList.remove("hidden");

            winText.textContent =
                gameData.winnerId === currentUser.uid
                    ? "🏆 YOU WON!"
                    : "💀 YOU LOST";

            return;
        }

        /* =========================
           OPPONENT INFO
        ========================= */
        const opponent =
            currentUser.uid === gameData.player1Id
                ? gameData.player2Name
                : gameData.player1Name;

        opponentInfo.textContent = `Opponent: ${opponent || "Waiting..."}`;

        gameStatus.textContent = `Status: ${gameData.status}`;

        /* =========================
           TURN DISPLAY
        ========================= */
        const myTurn = gameData.currentTurn === currentUser.uid;

        turnInfo.textContent = myTurn
            ? "🎯 Your Turn"
            : "⏳ Opponent's Turn";

        /* =========================
           GUESS HISTORY
        ========================= */
        const myGuesses =
            currentUser.uid === gameData.player1Id
                ? gameData.player1Guesses
                : gameData.player2Guesses;

        guessHistory.innerHTML = myGuesses
            .map(g => `<p>${g}</p>`)
            .join("");

        /* =========================
           TURN TIMER (ANTI STALL)
        ========================= */
        const now = Date.now();
        const start = gameData.turnStartTime?.toDate()?.getTime();

        if (start && gameData.status === "playing") {

            const diff = (now - start) / 1000;

            if (diff > TURN_LIMIT) {

                const nextTurn =
                    gameData.currentTurn === gameData.player1Id
                        ? gameData.player2Id
                        : gameData.player1Id;

                await updateDoc(ref, {
                    currentTurn: nextTurn,
                    turnStartTime: serverTimestamp()
                });
            }
        }

        /* =========================
           REMATCH AUTO START
        ========================= */
        if (
            gameData.rematchRequestPlayer1 &&
            gameData.rematchRequestPlayer2
        ) {
            await updateDoc(ref, {
                status: "playing",
                secretNumber: Math.floor(Math.random() * 100) + 1,

                player1Guesses: [],
                player2Guesses: [],

                player1Attempts: 0,
                player2Attempts: 0,

                winnerId: null,

                rematchRequestPlayer1: false,
                rematchRequestPlayer2: false,

                currentTurn: gameData.player1Id,
                turnStartTime: serverTimestamp()
            });
        }
    });
}

/* =========================
   MAKE GUESS
========================= */
guessBtn.addEventListener("click", async () => {

    const guess = Number(guessInput.value);

    if (!gameData) return;
    if (!Number.isInteger(guess)) return;
    if (guess < 1 || guess > 100) {
        feedback.textContent = "Only 1–100 allowed";
        return;
    }

    if (gameData.status !== "playing") return;
    if (gameData.currentTurn !== currentUser.uid) return;

    const ref = doc(db, "games", currentGameId);

    const isP1 = currentUser.uid === gameData.player1Id;

    const guessField = isP1 ? "player1Guesses" : "player2Guesses";
    const attemptField = isP1 ? "player1Attempts" : "player2Attempts";

    await updateDoc(ref, {
        [guessField]: arrayUnion(guess),
        [attemptField]: increment(1),
        lastActive: serverTimestamp()
    });

    /* =========================
       WIN CHECK
    ========================= */
    if (guess === gameData.secretNumber) {

        const totalAttempts =
            (gameData.player1Attempts || 0) +
            (gameData.player2Attempts || 0) + 1;

        await updateDoc(ref, {
            status: "finished",
            winnerId: currentUser.uid
        });

        await updateLeaderboard(currentUser.uid, totalAttempts);

        return;
    }

    /* =========================
       FEEDBACK SYSTEM
    ========================= */
    const diff = Math.abs(guess - gameData.secretNumber);

    if (diff <= 5) feedback.textContent = "🔥 Very close!";
    else if (diff <= 15) feedback.textContent = "👀 Warm";
    else feedback.textContent =
        guess > gameData.secretNumber ? "Too high 📈" : "Too low 📉";

    /* =========================
       SWITCH TURN
    ========================= */
    const nextTurn =
        gameData.currentTurn === gameData.player1Id
            ? gameData.player2Id
            : gameData.player1Id;

    await updateDoc(ref, {
        currentTurn: nextTurn,
        turnStartTime: serverTimestamp()
    });
});

/* =========================
   LEADERBOARD UPDATE
========================= */
async function updateLeaderboard(userId, attempts) {

    const ref = doc(db, "leaderboard", userId);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
        await setDoc(ref, {
            wins: 1,
            gamesPlayed: 1,
            bestScore: attempts
        });
    } else {
        const data = snap.data();

        await updateDoc(ref, {
            wins: increment(1),
            gamesPlayed: increment(1),
            bestScore: Math.min(data.bestScore || attempts, attempts)
        });
    }
}

/* =========================
   REMATCH BUTTON
========================= */
rematchBtn.addEventListener("click", async () => {

    const ref = doc(db, "games", currentGameId);

    const field =
        currentUser.uid === gameData.player1Id
            ? "rematchRequestPlayer1"
            : "rematchRequestPlayer2";

    await updateDoc(ref, {
        [field]: true
    });
});