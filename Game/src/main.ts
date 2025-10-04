import GameContext from "./States/GameContext.js";
import MainMenu from "./States/Menu.js";
import SplashScreen from "./States/SplashScreen.js";

window.addEventListener("contextmenu", function (e: Event) {
  e.preventDefault();
});

let splashScreen = new SplashScreen();
let mainMenu = new MainMenu();

export let gameContext = new GameContext();

// Game state management
enum GameState {
  MAIN_MENU,
  LOADING,
  PLAYING,
}

let currentState = GameState.MAIN_MENU;
let assetsLoaded = false;

/**
 * Function to start the game - called from the main menu
 */
function startGame() {
  if (assetsLoaded) {
    // Assets are ready, start game immediately
    currentState = GameState.PLAYING;
    mainMenu.mainMenu.style.display = "none";
    gameContext.start();

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
    splashScreen.splashScreen.style.display = "block";
    loadingScreenAnimate();
  }
}

// Make startGame available globally for the HTML
(window as any).startGame = startGame;

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

// Start asset loading in background
gameContext.loadMeshes(progress).then(() => {
  assetsLoaded = true;
  if (currentState === GameState.LOADING) {
    // If user clicked start and we're showing loading screen, start game now
    splashScreen.destroy();
    currentState = GameState.PLAYING;
    gameContext.start();

    // Focus the main document to enable keyboard input
    if (gameContext.renderer && gameContext.renderer.domElement) {
      gameContext.renderer.domElement.focus();
    } else {
      document.body.focus();
    }

    animate();
  }
});

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
