import {
  Camera,
  Frustum,
  GUIRenderer,
  Renderer3D,
  vec3,
  WorldEditor,
} from "praccen-web-engine";
import { GetCookie, SetCookie } from "../Utils/WebUtils.js";
import GameGUI from "../GUI/GameGUI.js";
import Level from "../Objects/Level.js";
import PlayerController from "../Objects/PlayerController.js";
import Inventory from "../Systems/Inventory.js";
import { Input } from "../Input.js";
import SoundManager from "../Audio/SoundManager.js";

export default class Game {
  private renderer: Renderer3D;
  guiRenderer: GUIRenderer;

  camera: Camera;
  dbgFrustum: Frustum;

  gui: GameGUI;
  inventory: Inventory;
  soundManager: SoundManager;

  private level: Level;
  private worldEditor: WorldEditor;

  private gameTimer = 0.0;

  private saveScreenshot = false;
  private iWasPressed = false;

  constructor(renderer: Renderer3D, guiRenderer: GUIRenderer, soundManager: SoundManager) {
    this.renderer = renderer;
    this.guiRenderer = guiRenderer;
    this.soundManager = soundManager;

    this.renderer.useVolumetric = true;
    this.renderer.setFogTexture("Assets/Textures/Fog.png");
    this.renderer.setFogMaxDistance(20);

    // Create a camera and set it's starting position
    this.camera = new Camera();
    this.camera.setPosition(vec3.fromValues(4.0, 4.0, 7.0));
    this.camera.setFarPlaneDistance(150);
    this.camera.setFOV(50);

    this.dbgFrustum = new Frustum();

    const camPosCookie = GetCookie("camPos");
    const camDirCookie = GetCookie("camDir");
    if (camPosCookie != "") {
      this.camera.setPosition(
        vec3.fromValues(
          parseFloat(camPosCookie.split(":")[0]),
          parseFloat(camPosCookie.split(":")[1]),
          parseFloat(camPosCookie.split(":")[2])
        )
      );
    }
    if (camDirCookie != "") {
      this.camera.setPitchJawDegrees(
        parseFloat(camDirCookie.split(":")[0]),
        parseFloat(camDirCookie.split(":")[1])
      );
    }

    this.gui = new GameGUI();

    this.inventory = new Inventory();

    this.loadSounds();

    this.createLevel();

    // Connect inventory to player controller after level is created
    this.inventory.setPlayerController(this.level.getPlayerController());

    this.worldEditor = new WorldEditor(
      this.camera,
      this.level.scene,
      this.level.physicsScene,
      this.guiRenderer
    );

    // this.worldEditor.setEnabled(true);
    // Initialize HUD with correct values from shop upgrades
    this.gui.updateCharms(
      this.level.getPlayerController().getProtectionCharms(),
      this.level.getPlayerController().getMaxProtectionCharms()
    );
    this.gui.updateFloor(this.level.map.getCurrentFloor());
  }

  loadSounds() {
    this.soundManager.loadSound("arrow_twang", {
      src: ["Assets/Audio/arrow-twang_01-306041.mp3"],
      volume: 0.5,
    }, 'sfx');

    this.soundManager.loadSound("arrow_swish", {
      src: ["Assets/Audio/arrow-swish_03-306040.mp3"],
      volume: 0.4,
    }, 'sfx');

    // Load ambient cave sound as music with reduced volume
    this.soundManager.loadSound("cave_ambient", {
      src: ["Assets/Audio/cave-temple-fantasy-dark-20185.mp3"],
      volume: 0.15, // 15% of music volume - ambient should be subtle
      loop: false, // Manual looping with crossfade
    }, 'music');

    // Load footstep sound
    this.soundManager.loadSound("footsteps", {
      src: ["Assets/Audio/concrete-footsteps-6752.mp3"],
      volume: 0.4,
      loop: true,
    }, 'sfx');
  }

  createLevel() {
    this.level = new Level(this.renderer, this);
  }

  resize(width: number, height: number) {
    // Update the camera aspect ratio to fit the new size
    this.camera.setAspectRatio(width / height);

    // Update the size of both the renderer and GUI renderer
    this.renderer.setSize(width, height, true);
    this.guiRenderer.setSize(width, height);
  }

  onExit() {}

  getLevel(): Level {
    return this.level;
  }

  update(dt: number) {
    if (this.worldEditor.interacting()) {
      this.level.map.updateFocusRoom(this.camera.getPosition());
      return;
    }

    this.gameTimer += dt;

    // Handle inventory toggle (I key)
    if (Input.keys["I"] && !this.iWasPressed) {
      this.inventory.toggle();
      this.iWasPressed = true;
    } else if (!Input.keys["I"]) {
      this.iWasPressed = false;
    }

    this.level.update(this.camera, dt);
    this.renderer.setFogMaxDistance(
      20 * this.level.getPlayerController().getSight()
    );

    // Update sound listener position
    this.soundManager.updateListener(
      this.camera.getPosition(),
      vec3.clone(this.camera.getDir())
    );
  }

  preRenderingUpdate(dt: number) {
    SetCookie(
      "camPos",
      this.camera.getPosition()[0] +
        ":" +
        this.camera.getPosition()[1] +
        ":" +
        this.camera.getPosition()[2]
    );

    SetCookie(
      "camDir",
      this.camera.getPitchJawDegrees()[0] +
        ":" +
        this.camera.getPitchJawDegrees()[1]
    );

    this.camera.getFrustum(this.dbgFrustum);
    this.level.preRenderingUpdate(dt, this.camera);

    // Update HUD
    this.gui.updateFloor(this.level.map.getCurrentFloor());
    this.gui.updateCharms(
      this.level.getPlayerController().getProtectionCharms(),
      this.level.getPlayerController().getMaxProtectionCharms()
    );
  }

  draw() {
    if (this.saveScreenshot) {
      this.renderer.render(
        this.getLevel().scene,
        this.camera,
        this.dbgFrustum,
        true,
        "captureScreen.png"
      );
      this.saveScreenshot = false;
    } else {
      this.renderer.render(this.getLevel().scene, this.camera, this.dbgFrustum);
    }

    this.guiRenderer.draw(this.camera);
  }

  startAmbientSound() {
    this.soundManager.playMusic("cave_ambient");
  }

  stopAmbientSound() {
    this.soundManager.stopMusic(2000); // 2 second fade out
  }
}
