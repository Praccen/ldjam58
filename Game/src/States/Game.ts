import {
  Camera,
  Frustum,
  GUIRenderer,
  Renderer3D,
  vec3,
} from "praccen-web-engine";
import { GetCookie, SetCookie } from "../Utils/WebUtils.js";
import GameGUI from "../GUI/GameGUI.js";
import { Input } from "../Input.js";
import { sensitivity } from "./GameContext.js";
import Level from "../Objects/Level.js";
import { roomSize } from "../Generators/Map/ProceduralMapGenerator.js";

type TriggerCallback = (triggerName: string) => void;

interface AreaTrigger {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  callback: TriggerCallback;
}

export default class Game {
  private renderer: Renderer3D;
  guiRenderer: GUIRenderer;

  camera: Camera;
  dbgFrustum: Frustum;

  gui: GameGUI;

  private level: Level;

  private pitch = -30.0;
  private jaw = 210.0;
  private gameTimer = 0.0;

  private saveScreenshot = false;

  private triggers: AreaTrigger[] = [];

  constructor(renderer: Renderer3D, guiRenderer: GUIRenderer) {
    this.renderer = renderer;
    this.guiRenderer = guiRenderer;

    this.renderer.useVolumetric = true;
    this.renderer.setFogTexture("Assets/Textures/Fog.png");

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
      this.pitch = parseFloat(camDirCookie.split(":")[0]);
      this.jaw = parseFloat(camDirCookie.split(":")[1]);
    }

    this.gui = new GameGUI(this.guiRenderer);
    this.gui.gameGuiDiv.setHidden(true);

    this.createLevel(1);
  }

  createLevel(levelNumber: number) {
    this.triggers.length = 0;
    this.level = new Level(this.renderer, this, levelNumber);

    this.triggers.push({
      name: "exit",
      x: this.getLevel().map.getExitRoomPos()[0],
      y: this.getLevel().map.getExitRoomPos()[2],
      width: roomSize * 0.5,
      height: roomSize * 0.5,
      callback: this.onExitLevel,
    });
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
    this.gameTimer += dt;

    this.level.update(this.camera, dt);
  }

  preRenderingUpdate(dt: number) {
    // Move camera with WASD (W and S will move along the direction of the camera, not along the xz plane)
    const cameraSpeed = 10.0;
    if (Input.keys["W"]) {
      this.camera.translate(
        vec3.scale(vec3.create(), this.camera.getDir(), cameraSpeed * dt)
      );
    }
    if (Input.keys["S"]) {
      this.camera.translate(
        vec3.scale(vec3.create(), this.camera.getDir(), -cameraSpeed * dt)
      );
    }
    if (Input.keys["D"]) {
      this.camera.translate(
        vec3.scale(vec3.create(), this.camera.getRight(), cameraSpeed * dt)
      );
    }
    if (Input.keys["A"]) {
      this.camera.translate(
        vec3.scale(vec3.create(), this.camera.getRight(), -cameraSpeed * dt)
      );
    }

    SetCookie(
      "camPos",
      this.camera.getPosition()[0] +
        ":" +
        this.camera.getPosition()[1] +
        ":" +
        this.camera.getPosition()[2]
    );

    // Rotate camera with mouse click and drag
    let mouseDiff = Input.getMouseMovement();
    if (Input.mouseClicked) {
      // Make sure the user is not changing a slider
      this.pitch -= mouseDiff[1] * sensitivity;
      this.jaw -= mouseDiff[0] * sensitivity;
    }

    SetCookie("camDir", this.pitch + ":" + this.jaw);

    // Move camera up and down with spacebar and shift
    if (Input.keys[" "]) {
      this.camera.translate(vec3.fromValues(0.0, 10.0 * dt, 0.0));
    }
    if (Input.keys["SHIFT"]) {
      this.camera.translate(vec3.fromValues(0.0, -10.0 * dt, 0.0));
    }

    this.pitch = Math.max(Math.min(this.pitch, 89), -89); // Don't allow the camera to go past 89 degrees
    this.jaw = this.jaw % 360;

    this.camera.setPitchJawDegrees(this.pitch, this.jaw); // Update the rotation of the camera
    this.camera.getFrustum(this.dbgFrustum);

    this.level.preRenderingUpdate(dt, this.camera);
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

  private onExitLevel: TriggerCallback = () => {
    this.level.cleanUp();
    this.createLevel(this.level.map.getCurrentFloor() + 1);
  };
}
