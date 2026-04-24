// 🎮 Grab everything we need from the page (buttons, canvas, etc)
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startBtn = document.querySelector('.start-btn');
const instructionsBtn = document.querySelector('.instructions-btn');
const instructionsModal = document.getElementById('instructions-modal');
const closeBtn = document.querySelector('.close-btn');
const startScreen = document.querySelector('.start-screen');
const pauseOverlay = document.querySelector('.pause-overlay');

// 🎮 Set up game values and objects
let gameRunning = false;
let paused = false;
let player = { x: 50, y: 100, w: 50, h: 50, speed: 5, dy: 0 }; // Player setup
let obstacles = []; 
let score = 0;
let lives = 3;
let earth = { show: false, x: 0 };
let startTime; // Game start time

// 🖼️ Load images
const playerImg = new Image();
const meteorImg = new Image();
const earthImg = new Image();
playerImg.src = '../Images/meteor.jpeg';
meteorImg.src = '../Images/spacerock.jpeg';
earthImg.src = '../Images/earth.jpeg';

// 🟢 When start is clicked, set up the game and run it
startBtn.onclick = () => {
  canvas.width = window.innerWidth; // Adjust canvas size to screen
  canvas.height = window.innerHeight;
  canvas.style.display = 'block';
  startScreen.style.display = 'none'; // Hide start screen

  // Reset game values
  score = 0;
  lives = 3;
  obstacles = [];
  earth.show = false;
  earth.x = canvas.width - 150; // Earth starts off-screen
  player.y = canvas.height / 2;
  gameRunning = true;
  startTime = Date.now();

  loop(); // Start the game loop
};

// 📜 Show/hide instructions popup
instructionsBtn.onclick = () => instructionsModal.style.display = 'flex';
closeBtn.onclick = () => instructionsModal.style.display = 'none';

// ⌨️ Controls (up/down arrows + pause)
document.addEventListener('keydown', e => {
  if (e.key === 'ArrowUp') player.dy = -player.speed;
  if (e.key === 'ArrowDown') player.dy = player.speed;
  if (e.key === 'p' || e.key === 'Escape') togglePause(); // Pause with P or Escape
});

document.addEventListener('keyup', e => {
  if (e.key === 'ArrowUp' || e.key === 'ArrowDown') player.dy = 0; // Stop player when keys are released
});

// ⏸️ Pausing game
function togglePause() {
  if (!gameRunning) return;
  paused = !paused;
  pauseOverlay.style.display = paused ? 'flex' : 'none';
  if (!paused) loop();
}

// 🔁 The game loop
function loop() {
  if (!gameRunning || paused) return; // Stop if the game isn't running or is paused
  ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear canvas

  player.y += player.dy; // Move player based on `dy`
  player.y = Math.max(0, Math.min(canvas.height - player.h, player.y)); // Prevent player from going off-screen
  ctx.drawImage(playerImg, player.x, player.y, player.w, player.h);

  // 🌍 Show Earth after 10 seconds
  let time = (Date.now() - startTime) / 1000;
  if (!earth.show && time > 10) earth.show = true;

  // Move Earth left and check if player touches it (win condition)
  if (earth.show) {
    earth.x -= 2;
    ctx.drawImage(earthImg, earth.x, canvas.height / 2 - 60, 120, 120);

    if (earth.x < player.x + player.w) {
      gameOver(true); // Player wins
      return;
    }
  }

  handleObstacles();
  drawText();
  requestAnimationFrame(loop); // Keep looping
}

// ☄️ Rock logic: create, move, and check crash
function handleObstacles() {
  if (Math.random() < 0.02) { // Random chance to create a new obstacle
    let size = 30 + Math.random() * 40;
    obstacles.push({
      x: canvas.width,
      y: Math.random() * (canvas.height - size),
      w: size,
      h: size,
      speed: 3 + score / 50
    });
  }

  for (let i = 0; i < obstacles.length; i++) {
  let rock = obstacles[i];
  rock.x -= rock.speed;
  ctx.drawImage(meteorImg, rock.x, rock.y, rock.w, rock.h);
  }

  obstacles = obstacles.filter(rock => {
    let hit = (
      player.x < rock.x + rock.w &&
      player.x + player.w > rock.x &&
      player.y < rock.y + rock.h &&
      player.y + player.h > rock.y
    );

    if (hit) {
      lives--; // Player hits an obstacle
      if (lives <= 0) {
        gameOver(false); // Game over if no lives left
        return false;
      }
      return false;
    }

    if (rock.x + rock.w > 0) return true; // Keep the rock if it's still on-screen
    score++; // Increase score if rock is dodged
    return false;
  });

} 
// 📝 Display score and lives
function drawText() {
  ctx.font = '30px Arial';
  ctx.fillStyle = 'white';
  ctx.fillText(`Score: ${score}`, 20, 40);
  ctx.fillText(`Lives: ${lives}`, canvas.width - 150, 40);
}

// 💀 Game over function
function gameOver(won) {
  gameRunning = false; // Stop the game
  ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear canvas

  ctx.font = '50px Arial';
  ctx.fillStyle = 'red';
  ctx.fillText('GAME OVER', canvas.width / 2 - 150, canvas.height / 2 - 60);

  ctx.font = '30px Arial';
  ctx.fillStyle = 'white';
  ctx.fillText(`Score: ${score}`, canvas.width / 2 - 70, canvas.height / 2);

  let msg = won ? '🌍 You reached Earth!' : '💥 Try again!';
  ctx.fillText(msg, canvas.width / 2 - 100, canvas.height / 2 + 60);
}