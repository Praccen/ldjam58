import GameContext from "./States/GameContext.js";
import MainMenu from "./States/Menu.js";
import SplashScreen from "./States/SplashScreen.js";
import EndGame from "./States/EndGame.js";
import LoseGame from "./States/LoseGame.js";
import Settings from "./States/Settings.js";
import Game from "./States/Game.js";
import { Howl, Howler } from "howler";
import SoundManager from "./Audio/SoundManager.js";

window.addEventListener("contextmenu", function (e: Event) {
  e.preventDefault();
});

// Menu music - created on first click
let menuMusic: Howl | null = null;

// Game sound manager - persists across game sessions
export let soundManager = new SoundManager();

let splashScreen = new SplashScreen();
let mainMenu = new MainMenu();
let settingsScreen = new Settings();
let endGameScreen = new EndGame();
let loseGameScreen = new LoseGame();

export let gameContext = new GameContext(soundManager);

// Game state management
enum GameState {
  MAIN_MENU,
  LOADING,
  PLAYING,
  END_GAME,
  LOSE_GAME,
}

let currentState = GameState.MAIN_MENU;
let assetsLoaded = false;
let gameStartTime = 0;

/**
 * Function to start the game - called from the main menu
 */
function startGame() {
  if (assetsLoaded) {
    // Assets are ready, start game immediately
    currentState = GameState.PLAYING;
    mainMenu.mainMenu.style.display = "none";
    endGameScreen.hide();
    loseGameScreen.hide();

    // Stop menu music and particles when starting game
    if (menuMusic) {
      menuMusic.stop();
    }
    if ((window as any).stopParticleSystem) {
      (window as any).stopParticleSystem();
    }

    if (Howler.ctx && Howler.ctx.state === 'suspended') {
      Howler.ctx.resume();
    }

    setTimeout(() => {
      gameContext.game.startAmbientSound();
    }, 100);

    gameContext.start();
    gameStartTime = Date.now();

    // Focus the main document to enable keyboard input
    if (gameContext.renderer && gameContext.renderer.domElement) {
      gameContext.renderer.domElement.focus();
    } else {
      document.body.focus();
    }

    animate();
  } else {
    // Assets not ready, show loading screen
    currentState = GameState.LOADING;
    mainMenu.mainMenu.style.display = "none";
    endGameScreen.hide();
    loseGameScreen.hide();
    splashScreen.splashScreen.style.display = "block";

    // Stop menu music and particles when showing loading screen
    if (menuMusic) {
      menuMusic.stop();
    }
    if ((window as any).stopParticleSystem) {
      (window as any).stopParticleSystem();
    }

    loadingScreenAnimate();
  }
}

function startMenuMusic() {
  if (currentState === GameState.MAIN_MENU && !menuMusic) {
    // Get saved music volume or use default 
    const savedVolume = localStorage.getItem('musicVolume');
    const volume = savedVolume ? parseInt(savedVolume) / 100 : 0.3;

    menuMusic = new Howl({
      src: ['Assets/Audio/forgotten-echoes-338507.mp3'],
      loop: true,
      volume: volume
    });
    menuMusic.play();
  }
}

function setMusicVolume(volume: number) {
  // Update menu music volume (updates both default and all playing instances)
  if (menuMusic) {
    menuMusic.volume(volume);
  }

  // Update sound manager (this will update game ambient music)
  soundManager.setMusicVolume(volume);
}

function setSfxVolume(volume: number) {
  soundManager.setSfxVolume(volume);
}

function showSettings() {
  mainMenu.mainMenu.style.display = "none";
  settingsScreen.show();
}

function closeSettings() {
  settingsScreen.hide();
  mainMenu.mainMenu.style.display = "block";
}

// Make functions available globally for the HTML
(window as any).startGame = startGame;
(window as any).startMenuMusic = startMenuMusic;
(window as any).setMusicVolume = setMusicVolume;
(window as any).setSfxVolume = setSfxVolume;
(window as any).showSettings = showSettings;
(window as any).closeSettings = closeSettings;

/**
 * Function to return to main menu - called from the end game screen
 */
async function returnToMenu() {
  currentState = GameState.MAIN_MENU;
  endGameScreen.hide();
  loseGameScreen.hide();
  mainMenu.mainMenu.style.display = "block";

  // Reset and create new game context (loadNewGame already stops ambient sound)
  gameContext.loadNewGame();
  setupGameCallbacks();

  // Fade in menu music
  if (menuMusic) {
    // Fade in menu music over 2 seconds
    const savedVolume = localStorage.getItem('musicVolume');
    const targetVolume = savedVolume ? parseInt(savedVolume) / 100 : 0.3;

    // Only play if not already playing
    if (!menuMusic.playing()) {
      menuMusic.volume(0);
      menuMusic.play();
    } else {
      // If already playing, just fade from current volume
      menuMusic.volume(0);
    }
    menuMusic.fade(0, targetVolume, 2000);
  }

}

// Make returnToMenu available globally for the HTML
(window as any).returnToMenu = returnToMenu;

function onGameComplete() {
  currentState = GameState.END_GAME;

  const timePlayedMs = Date.now() - gameStartTime;
  const minutes = Math.floor(timePlayedMs / 60000);
  const seconds = Math.floor((timePlayedMs % 60000) / 1000);
  const timeString = `${minutes}:${seconds.toString().padStart(2, "0")}`;

  const artifactsCollected = gameContext.game.inventory.getItemCount();

  const floorsExplored = gameContext.game.getLevel().map.getCurrentFloor();

  gameContext.game.soundManager.stop("footsteps");
  // Get items and curses data, but serialize only necessary fields
  // Also calculate value for each item based on rarity
  const items = gameContext.game.inventory.getItems().map((item) => ({
    name: item.name,
    type: item.type,
    quantity: item.quantity,
    rarity: item.rarity,
    description: item.description,
    value: calculateItemValue(item.rarity, item.type, item.quantity),
  }));

  const curses = gameContext.game.inventory.getAggregatedCurses();

  // Calculate total value from this run
  const currentRunValue = items.reduce(
    (total, item) => total + item.value,
    0
  );

  // Get persistent total value from localStorage
  const storedTotalValue = parseInt(localStorage.getItem("totalValue") || "0");
  const newTotalValue = storedTotalValue + currentRunValue;

  // Store new total value
  localStorage.setItem("totalValue", newTotalValue.toString());

  // Keep cave ambient sound playing on end screen

  // Show end game screen with stats
  endGameScreen.show({
    time: timeString,
    artifacts: artifactsCollected,
    floors: floorsExplored,
    items: items,
    curses: curses,
    currentRunValue: currentRunValue,
    totalValue: newTotalValue,
  });

  // Restart particles for end game screen
  if ((window as any).startParticleSystem) {
    (window as any).startParticleSystem();
  }
}

function onGameLose() {
  currentState = GameState.LOSE_GAME;

  const timePlayedMs = Date.now() - gameStartTime;
  const minutes = Math.floor(timePlayedMs / 60000);
  const seconds = Math.floor((timePlayedMs % 60000) / 1000);
  const timeString = `${minutes}:${seconds.toString().padStart(2, "0")}`;


  gameContext.game.soundManager.stop("footsteps");
  const curses = gameContext.game.inventory.getAggregatedCurses();

  // Get current floor depth
  const currentFloor = gameContext.game.getLevel().map.getCurrentFloor();

  // Calculate gold penalty based on floor (deeper = more penalty)
  const goldPenalty = (currentFloor + 1) * 5000;

  // Get persistent total value from localStorage
  const storedTotalValue = parseInt(localStorage.getItem("totalValue") || "0");

  // Deduct gold, but don't go below 0
  const newTotalValue = Math.max(0, storedTotalValue - goldPenalty);

  // Save the new total value
  localStorage.setItem("totalValue", newTotalValue.toString());

  // Keep cave ambient sound playing on lose screen

  // Show lose game screen with stats
  loseGameScreen.show({
    time: timeString,
    curses: curses,
    totalValue: newTotalValue,
    goldPenalty: goldPenalty,
  });

  // Restart particles for lose game screen
  if ((window as any).startParticleSystem) {
    (window as any).startParticleSystem();
  }
}

/**
 * Calculate item value based on rarity and type
 */
function calculateItemValue(
  rarity: "common" | "rare" | "epic" | "legendary" | undefined,
  type: number,
  quantity: number
): number {
  // Base value multipliers by rarity
  const rarityMultipliers = {
    common: 1,
    rare: 3,
    epic: 8,
    legendary: 20,
  };

  // Base value by item type
  const typeBaseValues: { [key: number]: number } = {
    0: 1000, // GRAIL - very valuable
    1: 300, // RING
    2: 10, // COIN
    3: 400, // WEAPON
    4: 250, // SKULL
    5: 600, // SCEPTER
  };

  const baseValue = typeBaseValues[type] || 100;
  const multiplier = rarityMultipliers[rarity || "common"];

  // Add some randomness (±20%)
  const randomFactor = 0.8 + Math.random() * 0.4 ;

  return Math.floor(baseValue * multiplier * randomFactor * quantity);
}

/**
 * Setup callbacks for game events
 */
function setupGameCallbacks() {
  gameContext.game.getLevel().callbacks.onGameComplete = onGameComplete;
  gameContext.game.getLevel().callbacks.onGameLose = onGameLose;
}

/**
 * Function to close the inventory - called from the inventory iframe
 */
function closeInventory() {
  // Access the inventory through gameContext and close it
  if (gameContext && gameContext.game && gameContext.game.inventory) {
    gameContext.game.inventory.hide();
  }
}

// Make closeInventory available globally for the HTML
(window as any).closeInventory = closeInventory;

/**
 * Our update function, this will run every frame, and is responsible for moving the camera based on input.
 * This is where game logic would go if this was a complete game
 * @param dt - time elapsed since last frame.
 */
function update(dt: number) {
  if (currentState === GameState.PLAYING) {
    gameContext.update(dt);
  }
}

/**
 * This function runs just before rendering
 * Should update things that are only visual, contrary to game logic and physics for example.
 * This can be updating texture matrices etc
 * @param dt Time since last render call
 */
function preRendereringUpdate(dt: number) {
  if (currentState === GameState.PLAYING) {
    gameContext.preRendereringUpdate(dt);
  }
}

// Resize function to that will update the size of our game window when the browser window is resized
function resize() {
  let width = window.innerWidth;
  let height = window.innerHeight;

  gameContext.resize(width, height);
}

// Run the resize function once to sync with the current size of the browser window
resize();

// Also add the resize function to run automatically when the browser window is resized
window.addEventListener("resize", () => {
  resize();
});

window.addEventListener("beforeunload", function (e: BeforeUnloadEvent) {
  gameContext.onExit();
});

// A timer to keep track of frame time
let lastUpdateTime = Date.now();

let frames = 0;
let fpsUpdateTimer = 0.0;
let accumulativeDt = 0.0;

const tickRate = 1.0 / 144.0;
const maxUpdatesPerFrame = 20;

/**
 * Animation function that takes care of requesting animation frames, calculating frame time and calls both update and render functions.
 */
function animate() {
  if (currentState !== GameState.PLAYING) {
    return;
  }

  requestAnimationFrame(animate);
  let now = Date.now();
  let dt = (now - lastUpdateTime) * 0.001;
  frames++;
  fpsUpdateTimer += dt;
  if (fpsUpdateTimer > 0.5) {
    gameContext.metaGui.fpsDisplay.textString = Math.floor(
      frames / fpsUpdateTimer
    ).toString();
    frames = 0;
    fpsUpdateTimer = 0.0;
  }
  lastUpdateTime = now;

  accumulativeDt += dt;
  let updates = 0;
  while (accumulativeDt >= tickRate) {
    update(tickRate);
    accumulativeDt -= tickRate;
    updates++;
    if (updates >= maxUpdatesPerFrame) {
      accumulativeDt %= tickRate;
    }
  }

  preRendereringUpdate(dt);

  gameContext.draw();
}

let progress = { requested: 0, loaded: 0 };

// Initialize: Hide splash screen initially, show main menu
splashScreen.splashScreen.style.display = "none";
mainMenu.mainMenu.style.display = "block";

// Setup callbacks initially
setupGameCallbacks();

// Start asset loading in background
gameContext.loadMeshes(progress).then(() => {
  assetsLoaded = true;
});

// Start menu music on first click anywhere
document.addEventListener('click', function() {
  startMenuMusic();
}, { once: true });

function loadingScreenAnimate() {
  if (currentState !== GameState.LOADING) {
    return;
  }

  if (progress.requested == 0 || progress.loaded < progress.requested) {
    splashScreen.draw(progress);
    requestAnimationFrame(loadingScreenAnimate);
  } else if (assetsLoaded) {
    // Loading complete, start game
    splashScreen.destroy();
    currentState = GameState.PLAYING;
    gameStartTime = Date.now();
    gameContext.start();

    // Focus the main document to enable keyboard input
    if (gameContext.renderer && gameContext.renderer.domElement) {
      gameContext.renderer.domElement.focus();
    } else {
      document.body.focus();
    }

    animate();
  }
}
