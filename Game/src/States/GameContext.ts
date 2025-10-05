import { Div, GUIRenderer, Renderer3D } from "praccen-web-engine";
import { wallPieceModels } from "../Generators/Map/ProceduralMapGenerator.js";
import Game from "./Game.js";
import MetaGUI from "../GUI/MetaGUI.js";
import { SetCookie } from "../Utils/WebUtils.js";
import { Input } from "../Input.js";

export let sensitivity = 1.0;

export default class GameContext {
  renderer: Renderer3D;
  guiRenderer: GUIRenderer;

  game: Game;

  metaGui: MetaGUI;

  private oWasPressed = false;

  constructor() {
    // Create a renderer and attach it to the document body
    this.renderer = new Renderer3D();
    document.body.appendChild(this.renderer.domElement);

    // Make the renderer canvas focusable for keyboard input
    this.renderer.domElement.setAttribute("tabindex", "0");
    this.renderer.domElement.style.outline = "none"; // Remove focus outline

    this.renderer.useVolumetric = true;
    this.renderer.setFogTexture("Assets/Textures/Fog.png");

    // Create a GUI renderer and attach it to the document body
    this.guiRenderer = new GUIRenderer();
    document.body.appendChild(this.guiRenderer.domElement);

    // Set the class to apply style defined in index.css
    this.guiRenderer.domElement.className = "guiContainer";

    this.game = new Game(this.renderer, this.guiRenderer);

    this.metaGui = new MetaGUI(this.guiRenderer);
  }

  resize(width: number, height: number) {
    this.game.resize(width, height);
  }

  onExit() {
    this.game.onExit();

    SetCookie(
      "volumetricRenderScale",
      this.metaGui.volumetricRenderScaleSlider.getValue()
    );
    SetCookie(
      "volumetricBlur",
      this.metaGui.volumetricBlurCheckbox.getChecked()
    );
    SetCookie("fogDensity", this.metaGui.densitySlider.getValue());
    SetCookie("sensitivity", this.metaGui.sensitivitySlider.getValue());
    SetCookie("ambientMultiplier", this.metaGui.ambientSlider.getValue());
    SetCookie(
      "volumetric",
      this.metaGui.volumetricLightingCheckbox.getChecked()
    );
    SetCookie("cameraFollow", this.metaGui.cameraFollowCheckbox.getChecked());
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

  start() {}

  update(dt: number) {
    this.game.update(dt);
    if (Input.keys["O"]) {
      if (!this.oWasPressed) {
        this.metaGui.metaGuiDiv.toggleHidden();
      }
      this.oWasPressed = true;
    } else {
      this.oWasPressed = false;
    }
  }

  preRendereringUpdate(dt: number) {
    this.game.preRenderingUpdate(dt);

    // Update sensitivity according to sensitivity slider
    sensitivity = this.metaGui.sensitivitySlider.getValue() * 0.04;

    // Update blur of volumetric pass based on blur checkbox
    this.renderer.setFogBlur(this.metaGui.volumetricBlurCheckbox.getChecked());

    // Update fog render scale according to render scale slider
    this.renderer.setFogRenderScale(
      this.metaGui.volumetricRenderScaleSlider.getValue() * 0.01
    );

    // Update fog density according to density slider
    this.renderer.setFogDensity(this.metaGui.densitySlider.getValue() * 0.005);

    // Update usage of volumetric lighting based on checkbox
    this.renderer.useVolumetric =
      this.metaGui.volumetricLightingCheckbox.getChecked();

    // Update ambient multiplier based on ambient slider
    this.game.getLevel().scene.getDirectionalLight().ambientMultiplier =
      this.metaGui.ambientSlider.getValue() * 0.01;
  }

  draw() {
    this.game.draw();
  }

  loadNewGame() {
    delete this.game;
    this.game = new Game(this.renderer, this.guiRenderer);
  }
}
