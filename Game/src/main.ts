import GameContext from "./States/GameContext.js";
import MainMenu from "./States/Menu.js";
import SplashScreen from "./States/SplashScreen.js";
import EndGame from "./States/EndGame.js";
import LoseGame from "./States/LoseGame.js";
import Settings from "./States/Settings.js";
import Game from "./States/Game.js";
import { Howler } from "howler";
import SoundManager from "./Audio/SoundManager.js";
import ShopManager from "./Systems/ShopManager.js";
import ShopScreen from "./States/ShopScreen.js";

window.addEventListener("contextmenu", function (e: Event) {
  e.preventDefault();
});

// Game sound manager - persists across game sessions
// Initialize with saved volumes from localStorage
const savedMusicVolume = localStorage.getItem("musicVolume");
const savedSfxVolume = localStorage.getItem("sfxVolume");
export let soundManager = new SoundManager();
// Set initial volumes from localStorage
if (savedMusicVolume) {
  soundManager.setMusicVolume(parseInt(savedMusicVolume) / 100);
}
if (savedSfxVolume) {
  soundManager.setSfxVolume(parseInt(savedSfxVolume) / 100);
}

// Load menu music into sound manager
soundManager.loadSound(
  "menu_music",
  {
    src: ["Assets/Audio/forgotten-echoes-338507.mp3"],
    loop: true,
    volume: 1.0, // Base volume, will be multiplied by music category volume
  },
  "music"
);

let menuMusicStarted = false;

let splashScreen = new SplashScreen();
let mainMenu = new MainMenu();
let settingsScreen = new Settings();
let shopScreen = new ShopScreen();
let endGameScreen = new EndGame();
let loseGameScreen = new LoseGame();

export let gameContext: GameContext = null;

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
let gameFullyInitialized = false;
let gameStartTime = 0;

/**
 * Function to start the game - called from the main menu
 */
async function startGame() {
  // Stop particles and music immediately before state change
  if ((window as any).stopParticleSystem) {
    (window as any).stopParticleSystem();
  }

  // Stop menu music
  soundManager.stopMusic(2000);
  menuMusicStarted = false;

  // If game is already initialized, start immediately without loading screen
  if (gameFullyInitialized) {
    currentState = GameState.PLAYING;
    mainMenu.mainMenu.style.display = "none";
    endGameScreen.hide();
    loseGameScreen.hide();

    // Resume audio context and start ambient sound
    if (Howler.ctx && Howler.ctx.state === "suspended") {
      await Howler.ctx.resume();
      gameContext.game.startAmbientSound();
    } else {
      gameContext.game.startAmbientSound();
    }

    // Reset death ward for new run
    ShopManager.resetDeathWard();

    gameContext.start();
    gameStartTime = Date.now();

    // Focus the main document to enable keyboard input
    if (gameContext.renderer && gameContext.renderer.domElement) {
      gameContext.renderer.domElement.focus();
    } else {
      document.body.focus();
    }

    animate();
    return;
  }

  // First time loading - show loading screen
  currentState = GameState.LOADING;
  mainMenu.mainMenu.style.display = "none";
  endGameScreen.hide();
  loseGameScreen.hide();
  splashScreen.splashScreen.style.display = "block";

  // Start loading animation
  loadingScreenAnimate();

  // Initialize game context
  gameContext = new GameContext(soundManager);
  setupGameCallbacks();

  // Load assets
  await gameContext.loadMeshes(progress);
  assetsLoaded = true;

  // Wait for level to fully initialize (items, traps, bucket, etc.)
  await gameContext.game.getLevel().waitForInitialization();

  // Ensure proper resize
  resize();

  // Resume audio context and start ambient sound
  if (Howler.ctx && Howler.ctx.state === "suspended") {
    await Howler.ctx.resume();
    gameContext.game.startAmbientSound();
  } else {
    gameContext.game.startAmbientSound();
  }

  // Hide loading screen and start game
  splashScreen.destroy();
  currentState = GameState.PLAYING;

  // Reset death ward for new run
  ShopManager.resetDeathWard();

  gameContext.start();
  gameStartTime = Date.now();

  // Focus the main document to enable keyboard input
  if (gameContext.renderer && gameContext.renderer.domElement) {
    gameContext.renderer.domElement.focus();
  } else {
    document.body.focus();
  }

  gameFullyInitialized = true;

  animate();
}

function startMenuMusic() {
  if (currentState === GameState.MAIN_MENU && !menuMusicStarted) {
    menuMusicStarted = true;

    // Resume audio context before playing
    if (Howler.ctx && Howler.ctx.state === "suspended") {
      Howler.ctx.resume().then(() => {
        soundManager.playMusic("menu_music", 1000); // 1 second fade in
      });
    } else {
      soundManager.playMusic("menu_music", 1000); // 1 second fade in
    }
  }
}

function setMusicVolume(volume: number) {
  // Update sound manager (this will update all music including menu music)
  soundManager.setMusicVolume(volume);
}

function setSfxVolume(volume: number) {
  soundManager.setSfxVolume(volume);
}

function setSensitivity(value: number) {
  if (gameContext) {
    gameContext.game.getLevel().getPlayerController().sensitivity = value;
  }
}

function showSettings() {
  mainMenu.mainMenu.style.display = "none";
  settingsScreen.show();
}

function closeSettings() {
  settingsScreen.hide();
  mainMenu.mainMenu.style.display = "block";
}

function showShop() {
  mainMenu.mainMenu.style.display = "none";
  shopScreen.show();
}

function closeShop() {
  shopScreen.hide();
  mainMenu.mainMenu.style.display = "block";
}

// Make functions available globally for the HTML
(window as any).startGame = startGame;
(window as any).startMenuMusic = startMenuMusic;
(window as any).setMusicVolume = setMusicVolume;
(window as any).setSfxVolume = setSfxVolume;
(window as any).setSensitivity = setSensitivity;
(window as any).showSettings = showSettings;
(window as any).closeSettings = closeSettings;
(window as any).showShop = showShop;
(window as any).closeShop = closeShop;

/**
 * Function to return to main menu - called from the end game screen
 */
async function returnToMenu() {
  currentState = GameState.MAIN_MENU;
  endGameScreen.hide();
  loseGameScreen.hide();
  mainMenu.mainMenu.style.display = "block";

  // Reset and create new game context (loadNewGame already stops ambient sound)
  if (gameContext) {
    gameContext.loadNewGame();
    setupGameCallbacks();
  }

  // Restart particles for main menu
  if ((window as any).startParticleSystem) {
    (window as any).startParticleSystem();
  }

  // Restart menu music with fade in
  menuMusicStarted = false;
  soundManager.playMusic("menu_music", 2000); // 2 second fade in
}

// Make returnToMenu available globally for the HTML
(window as any).returnToMenu = returnToMenu;

function onGameComplete() {
  currentState = GameState.END_GAME;

  const timePlayedMs = Date.now() - gameStartTime;
  const minutes = Math.floor(timePlayedMs / 60000);
  const seconds = Math.floor((timePlayedMs % 60000) / 1000);
  const timeString = `${minutes}:${seconds.toString().padStart(2, "0")}`;

  const artifactsCollected = gameContext?.game.inventory.getItemCount() || 0;

  const floorsExplored =
    gameContext?.game.getLevel().map.getCurrentFloor() || 0;

  if (gameContext) {
    gameContext.game.soundManager.stop("footsteps");
  }
  // Get items and curses data, but serialize only necessary fields
  // Also calculate value for each item based on rarity
  const items =
    gameContext?.game.inventory.getItems().map((item) => ({
      name: item.name,
      type: item.type,
      quantity: item.quantity,
      rarity: item.rarity,
      description: item.description,
      value: calculateItemValue(item.rarity, item.type, item.quantity),
    })) || [];

  const curses = gameContext?.game.inventory.getAggregatedCurses() || [];

  // Calculate total value from this run
  const currentRunValue = items.reduce((total, item) => total + item.value, 0);

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

  document.exitPointerLock();
}

function onGameLose() {
  currentState = GameState.LOSE_GAME;

  const timePlayedMs = Date.now() - gameStartTime;
  const minutes = Math.floor(timePlayedMs / 60000);
  const seconds = Math.floor((timePlayedMs % 60000) / 1000);
  const timeString = `${minutes}:${seconds.toString().padStart(2, "0")}`;

  if (gameContext) {
    gameContext.game.soundManager.stop("footsteps");
  }
  const curses = gameContext?.game.inventory.getAggregatedCurses() || [];

  // Get current floor depth
  const currentFloor = gameContext?.game.getLevel().map.getCurrentFloor() || 0;

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

  document.exitPointerLock();
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
    1: 300, // CROWN
    2: 10, // COIN
    3: 400, // WEAPON
    4: 250, // SKULL
    5: 600, // SCEPTER
  };

  const baseValue = typeBaseValues[type] || 100;
  const multiplier = rarityMultipliers[rarity || "common"];

  // Add some randomness (±20%)
  const randomFactor = 0.8 + Math.random() * 0.4;

  // Apply shop upgrade bonus
  const shopMultiplier = ShopManager.getArtifactValueMultiplier();

  return Math.floor(
    baseValue * multiplier * randomFactor * quantity * shopMultiplier
  );
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
  if (gameContext?.game?.inventory) {
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

  if (gameContext) {
    gameContext.resize(width, height);
  }
}

// Run the resize function once to sync with the current size of the browser window
resize();

// Also add the resize function to run automatically when the browser window is resized
window.addEventListener("resize", () => {
  resize();
});

window.addEventListener("beforeunload", function (e: BeforeUnloadEvent) {
  if (gameContext) {
    gameContext.onExit();
  }
});

// A timer to keep track of frame time
let lastUpdateTime = Date.now();

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

// Start menu music on first click anywhere
document.addEventListener(
  "click",
  function () {
    startMenuMusic();
  },
  { once: true }
);

function loadingScreenAnimate() {
  if (currentState !== GameState.LOADING) {
    return;
  }

  // Update progress display
  splashScreen.draw(progress);

  // Continue animating while loading
  if (!gameFullyInitialized) {
    requestAnimationFrame(loadingScreenAnimate);
  }
}
