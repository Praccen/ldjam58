import {
  Camera,
  ParticleSpawner,
  PhysicsScene,
  Ray,
  Renderer3D,
  Scene,
  Shape,
  vec3,
} from "praccen-web-engine";
import ProceduralMap, {
  roomSize,
} from "../Generators/Map/ProceduralMapGenerator";
import Game from "../States/Game";
import { vec2 } from "gl-matrix";
import PlayerController from "./PlayerController";
import ItemHandler from "../Systems/ItemHandler";

type TriggerCallback = (triggerName: string) => void;

export interface AreaTrigger {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  callback: TriggerCallback;
}

export default class Level {
  scene: Scene;
  physicsScene: PhysicsScene;

  map: ProceduralMap;

  private moodParticleSpawner: ParticleSpawner;

  private playerController: PlayerController;
  private itemHandler: ItemHandler;

  triggers: AreaTrigger[] = [];

  constructor(renderer: Renderer3D, game: Game) {
    // Create a scene. It will automatically have a directional light, so let's set the ambient multiplier for it.
    this.scene = new Scene(renderer);
    this.scene.directionalLight.ambientMultiplier = 0.0;
    // vec3.set(this.scene.directionalLight.colour, 0.2, 0.2, 0.2);
    vec3.set(this.scene.directionalLight.colour, 0.0, 0.0, 0.0);
    vec3.set(this.scene.directionalLight.direction, 1.1, -1.0, 0.3);

    this.scene.directionalLight.shadowCameraDistance = 100;
    this.scene.directionalLight.lightProjectionBoxSideLength = 100;

    this.physicsScene = new PhysicsScene();
    this.itemHandler = new ItemHandler(
      this.scene,
      this.physicsScene,
      game.inventory
    );
    this.map = new ProceduralMap(this.scene, [0, 1, 2]);

    let level = this;
    this.scene.useTrees = false;
    let lastFloor = -1;
    this.scene.customFrustumCulling = (frustums: Shape[]) => {
      if (level.map.getCurrentFloor() != lastFloor) {
        this.scene.disableInstancedBundles();
        level.map.doFrustumCulling();
        this.scene.updateInstanceBuffers();
      }
      lastFloor = level.map.getCurrentFloor();
    };

    this.moodParticleSpawner = this.scene.addNewParticleSpawner(
      "Assets/Textures/Lava1.png",
      1000
    );
    this.moodParticleSpawner.lifeTime = 15.0;
    this.moodParticleSpawner.fadePerSecond = 1.0 / 15.0;
    vec3.set(
      this.moodParticleSpawner.randomPositionModifier.min,
      -50.0,
      0.0,
      -50.0
    );
    vec3.set(
      this.moodParticleSpawner.randomPositionModifier.max,
      50.0,
      5.0,
      50.0
    );
    this.moodParticleSpawner.sizeChangePerSecond = 0.0;
    this.moodParticleSpawner.initAllParticles(
      {
        startPosMin: vec3.add(
          vec3.create(),
          this.moodParticleSpawner.position,
          this.moodParticleSpawner.randomPositionModifier.min
        ),
        startPosMax: vec3.add(
          vec3.create(),
          this.moodParticleSpawner.position,
          this.moodParticleSpawner.randomPositionModifier.max
        ),
      },
      { sizeMin: 0.05, sizeMax: 0.1 },
      {
        startVelMin: vec3.fromValues(-0.2, -0.2, -0.2),
        startVelMax: vec3.fromValues(0.2, 0.2, 0.2),
      },
      {
        accelerationMin: vec3.fromValues(-0.2, -0.2, -0.2),
        accelerationMax: vec3.fromValues(0.2, 0.2, 0.2),
      }
    );

    this.playerController = new PlayerController(
      this.scene,
      this.physicsScene,
      renderer,
      vec3.fromValues(
        this.map.getPlayerSpawnRoom()[0] * roomSize + roomSize / 2,
        0.2,
        this.map.getPlayerSpawnRoom()[1] * roomSize + roomSize / 2
      ),
      this.itemHandler
    );
    this.itemHandler.setPlayer(this.playerController);
    this.itemHandler.setCurrentFloor(this.map.getCurrentFloor());
    
    for (const floorPhysicsScene of this.map.floorPhysicsScenes) {
      floorPhysicsScene[1].addNewPhysicsObject(this.playerController.getPhysicsObject().transform, this.playerController.getPhysicsObject());
    }

    this.itemHandler.spawnItem(vec3.fromValues(7.0, 0.5, 5.0));
    this.itemHandler.spawnItem(vec3.fromValues(9.0, 0.5, 5.0));
    this.itemHandler.spawnItem(vec3.fromValues(11.0, 0.5, 5.0));
    this.itemHandler.spawnItem(vec3.fromValues(13.0, 0.5, 5.0));
    this.itemHandler.spawnItem(vec3.fromValues(15.0, 0.5, 5.0));

    this.physicsScene.update(0.0, true);

    this.triggers.push({
      name: "exit",
      x: this.map.getExitRoomPos(this.map.getCurrentFloor())[0],
      y: this.map.getExitRoomPos(this.map.getCurrentFloor())[2],
      width: roomSize * 0.5,
      height: roomSize * 0.5,
      callback: () => {
        if (this.playerController.getCanExtract()) {
          console.log("Exited!");
        }
      },
    });
  }

  update(camera: Camera, dt: number) {
    this.playerController.update(camera, dt);

    // Update physics
    this.physicsScene.update(dt);
    
    this.map.updateFocusRoom(camera.getPosition());

    if (this.map.floorPhysicsScenes.has(this.map.getCurrentFloor())) {
      this.map.floorPhysicsScenes.get(this.map.getCurrentFloor()).update(0.0);
    }

    this.scene.updateParticleSpawners(dt);

    this.checkTriggers();
  }

  preRenderingUpdate(dt: number, camera: Camera) {
    this.moodParticleSpawner.position = camera.getPosition();

    this.scene.getDirectionalLight().shadowFocusPos = vec3.fromValues(
      this.map.focusRoom[0] * 10.0 + 5.0,
      0.0,
      this.map.focusRoom[1] * 10.0 + 5.0
    );
  }

  cleanUp() {}

  getPlayerController(): PlayerController {
    return this.playerController;
  }

  private isPlayerInArea(trigger: AreaTrigger): boolean {
    return (
      this.playerController.getPhysicsObject().transform.position[0] >=
        trigger.x - trigger.width &&
      this.playerController.getPhysicsObject().transform.position[0] <=
        trigger.x + trigger.width &&
      this.playerController.getPhysicsObject().transform.position[1] >=
        trigger.y - trigger.height &&
      this.playerController.getPhysicsObject().transform.position[1] <=
        trigger.y + trigger.height
    );
  }

  private checkTriggers(): void {
    this.triggers.forEach((trigger: AreaTrigger) => {
      if (this.isPlayerInArea(trigger)) {
        trigger.callback(trigger.name);
      }
    });
  }
}
