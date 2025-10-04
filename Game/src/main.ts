import GameContext from "./States/GameContext.js";
import SplashScreen from "./States/SplashScreen.js";

window.addEventListener("contextmenu", function (e: Event) {
  e.preventDefault();
});

let splashScreen = new SplashScreen();

export let gameContext = new GameContext();

/**
 * Our update function, this will run every frame, and is responsible for moving the camera based on input.
 * This is where game logic would go if this was a complete game
 * @param dt - time elapsed since last frame.
 */
function update(dt: number) {
  gameContext.update(dt);
}

/**
 * This function runs just before rendering
 * Should update things that are only visual, contrary to game logic and physics for example.
 * This can be updating texture matrices etc
 * @param dt Time since last render call
 */
function preRendereringUpdate(dt: number) {
  gameContext.preRendereringUpdate(dt);
}

// Resize function to that will update the size of our game window when the browser window is resized
function resize() {
  let width = window.innerWidth;
  let height = window.innerHeight;

  splashScreen.guiRenderer.setSize(width, height);
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

let progress = {requested: 0, loaded: 0};
// Start animating!
gameContext.loadMeshes(progress).then(() => {
  splashScreen.destroy();
  gameContext.start();
  animate();
});

function loadingScreenAnimate() {
  if (progress.requested == 0 || progress.loaded < progress.requested) {
    splashScreen.draw(progress);
    requestAnimationFrame(loadingScreenAnimate);
  }
}

requestAnimationFrame(loadingScreenAnimate);


