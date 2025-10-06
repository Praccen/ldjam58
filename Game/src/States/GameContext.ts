import { Div, GUIRenderer, Renderer3D } from "praccen-web-engine";
import { wallPieceModels } from "../Generators/Map/ProceduralMapGenerator.js";
import Game from "./Game.js";
import { SetCookie } from "../Utils/WebUtils.js";
import { Input } from "../Input.js";
import SoundManager from "../Audio/SoundManager.js";

export default class GameContext {
  renderer: Renderer3D;
  guiRenderer: GUIRenderer;

  game: Game;

  private soundManager: SoundManager;

  sensitivity: number = 0.5;

  constructor(soundManager: SoundManager) {
    this.soundManager = soundManager;

    // Create a renderer and attach it to the document body
    this.renderer = new Renderer3D();
    document.body.appendChild(this.renderer.domElement);

    // Make the renderer canvas focusable for keyboard input
    this.renderer.domElement.setAttribute("tabindex", "0");
    this.renderer.domElement.style.outline = "none"; // Remove focus outline

    this.renderer.useVolumetric = true;
    this.renderer.setFogTexture("Assets/Textures/Fog.png");
    this.renderer.setFogDensity(60 * 0.005)
    this.renderer.setFogBlur(true);
    this.renderer.setFogRenderScale(0.5);

    // Create a GUI renderer and attach it to the document body
    this.guiRenderer = new GUIRenderer();
    document.body.appendChild(this.guiRenderer.domElement);

    // Set the class to apply style defined in index.css
    this.guiRenderer.domElement.className = "guiContainer";

    this.game = new Game(this.renderer, this.guiRenderer, this.soundManager);
  }

  resize(width: number, height: number) {
    this.game.resize(width, height);
  }

  onExit() {
    this.game.onExit();
  }

  async loadMeshes(progress: {
    requested: number;
    loaded: number;
  }): Promise<void> {
    return new Promise<void>((resolve, rejects) => {
      let meshes = [
        "Assets/objs/cube.obj",
        "Assets/gltf/NPCS/Ghost Skull.glb",
        "Assets/gltf/Bucket.glb",
        "Assets/objs/Boxes/wall_doorway.obj",
        "Assets/objs/grail/Untitled.obj",
        "Assets/objs/scepter/Untitled.obj",
        "Assets/objs/sword/Untitled.obj",
        "Assets/objs/crown/Untitled.obj",
        "Assets/objs/skull/Untitled.obj",
        "Assets/objs/coins/Untitled.obj",
      ];
      for (const mapPieces of wallPieceModels) {
        for (const path of mapPieces.paths) {
          meshes.push(path);
        }
      }
      progress.requested = meshes.length;

      this.renderer.meshStore.loadMeshes(meshes, progress).then(() => {
        resolve();
      });
    });
  }

  start() {
    document.body.requestPointerLock();
  }

  update(dt: number) {
    if (Input.mouseClicked) {
      document.body.requestPointerLock();
    }
    this.game.update(dt);
  }

  preRendereringUpdate(dt: number) {
    this.game.preRenderingUpdate(dt);
  }

  draw() {
    this.game.draw();
  }

  loadNewGame() {
    this.game.stopAmbientSound();
    delete this.game;
    this.game = new Game(this.renderer, this.guiRenderer, this.soundManager);
  }
}
