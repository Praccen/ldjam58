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
import { Input } from "../Input.js";
import { sensitivity } from "./GameContext.js";
import Level from "../Objects/Level.js";
import { roomSize } from "../Generators/Map/ProceduralMapGenerator.js";
import PlayerController from "../Objects/PlayerController.js";

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
  private worldEditor: WorldEditor;
  private playerController: PlayerController;

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
      this.camera.setPitchJawDegrees(
        parseFloat(camDirCookie.split(":")[0]),
        parseFloat(camDirCookie.split(":")[1])
      );
    }

    this.gui = new GameGUI(this.guiRenderer);
    this.gui.gameGuiDiv.setHidden(true);

    this.createLevel(1);

    this.worldEditor = new WorldEditor(
      this.camera,
      this.level.scene,
      this.level.physicsScene,
      this.guiRenderer
    );
    this.playerController = new PlayerController(
      this.level.scene,
      this.level.physicsScene,
      this.renderer,
      this,
      vec3.fromValues(5.0, 1.0, 5.0)
    );
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
    if (this.worldEditor.interacting()) {
      return;
    }
    this.gameTimer += dt;

    this.level.update(this.camera, dt);
    this.playerController.update(dt);
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
