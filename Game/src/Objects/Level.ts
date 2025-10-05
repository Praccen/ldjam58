import {
  AnimatedGraphicsBundle,
  Camera,
  ParticleSpawner,
  PhysicsObject,
  PhysicsScene,
  Ray,
  Renderer3D,
  Scene,
  Shape,
  vec3,
} from "praccen-web-engine";
import ProceduralMap, {
  roomHeight,
  roomSize,
} from "../Generators/Map/ProceduralMapGenerator";
import Game from "../States/Game";
import { vec2 } from "gl-matrix";
import PlayerController from "./PlayerController";
import ItemHandler from "../Systems/ItemHandler";
import { triggerAsyncId } from "async_hooks";
import GhostManager from "./GhostManager";

type TriggerCallback = (triggerName: string) => void;

export interface Trigger {
  name: string;
  callback: TriggerCallback;
}

export interface AreaTrigger extends Trigger {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CollisionTrigger extends Trigger {
  collisionObject: PhysicsObject;
}

export interface LevelCallbacks {
  onGameComplete?: () => void;
}

export default class Level {
  scene: Scene;
  physicsScene: PhysicsScene;

  map: ProceduralMap;

  private moodParticleSpawner: ParticleSpawner;

  private playerController: PlayerController;
  private itemHandler: ItemHandler;
  private bucketBundle: AnimatedGraphicsBundle;
  private ghostManager: GhostManager;

  areaTriggers: AreaTrigger[] = [];
  collisionTriggers: CollisionTrigger[] = [];
  callbacks: LevelCallbacks = {};

  private currentFloorShaft: vec2;

  constructor(renderer: Renderer3D, game: Game) {
    // Create a scene. It will automatically have a directional light, so let's set the ambient multiplier for it.
    this.scene = new Scene(renderer);
    this.scene.directionalLight.ambientMultiplier = 0.0;
    // vec3.set(this.scene.directionalLight.colour, 0.0, 0.0, 0.0);
    vec3.set(this.scene.directionalLight.colour, 0.3, 0.3, 0.3);
    vec3.set(this.scene.directionalLight.direction, 0.001, -1.0, -0.6);

    this.scene.directionalLight.shadowCameraDistance = 100;
    this.scene.directionalLight.lightProjectionBoxSideLength = 100;

    this.physicsScene = new PhysicsScene();
    this.itemHandler = new ItemHandler(this.scene, game.inventory);
    this.ghostManager = new GhostManager(this.scene, this.physicsScene);
    this.map = new ProceduralMap(
      this.scene,
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]
    );

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
      this.itemHandler,
      this
    );
    this.itemHandler.setPlayer(this.playerController);

    this.map.floorPhysicsScenes.forEach(
      (floorPhysicsScene: PhysicsScene, floor: number) => {
        floorPhysicsScene.addNewPhysicsObject(
          this.playerController.getPhysicsObject().transform,
          this.playerController.getPhysicsObject()
        );

        // Spawn items
        const accessibleRooms = this.map.getAccessibleRooms(floor);

        const worldRooms = accessibleRooms.map((room) => {
          const worldPos = this.map.getRoomCenterWorldPos(floor, room);
          return { x: worldPos[0], y: worldPos[1], z: worldPos[2] };
        });

        this.itemHandler.spawnItemsForFloor(
          worldRooms,
          floor,
          floorPhysicsScene
        );
      }
    );
    // this.playerController.getPhysicsObject().transform.position
    this.ghostManager.addGhost(
      vec3.add(
        vec3.create(),
        this.playerController.getPhysicsObject().transform.position,
        vec3.fromValues(1, 0, 0)
      )
    );

    this.scene
      .addNewAnimatedMesh(
        "Assets/gltf/Bucket.glb",
        "Atlas_Pirate",
        "CSS:rgb(0,0,0)",
        false
      )
      .then((bundle) => {
        this.bucketBundle = bundle;
        this.bucketBundle.emission =
          this.scene.renderer.textureStore.getTexture("Atlas_Pirate");
        vec3.set(
          this.bucketBundle.transform.position,
          roomSize * 3.5,
          0.0,
          roomSize * 3.5
        );
        this.bucketBundle.updateMinAndMaxPositions();
        const width =
          this.bucketBundle.getMinAndMaxPositions().max[0] -
          this.bucketBundle.getMinAndMaxPositions().min[0];
        const scaleFactor = 2.0 / width;
        vec3.set(
          this.bucketBundle.transform.scale,
          scaleFactor,
          scaleFactor,
          scaleFactor
        );
        const bucketPhysicsObject = this.physicsScene.addNewPhysicsObject(
          this.bucketBundle.transform
        );
        bucketPhysicsObject.boundingBox.setMinAndMaxVectors(
          vec3.fromValues(-width * 0.5, 0, -width * 0.5),
          vec3.fromValues(width * 0.5, width, width * 0.5)
        );
        bucketPhysicsObject.ignoreGravity = true;
        bucketPhysicsObject.isImmovable = true;

        this.collisionTriggers.push({
          name: "exit",
          collisionObject: bucketPhysicsObject,
          callback: () => {
            if (this.playerController.getCanExtract()) {
              if (this.callbacks.onGameComplete) {
                this.callbacks.onGameComplete();
              }
            } else {
              console.log("Cannot extract - cursed with Binding!");
            }
          },
        });
      });

    this.physicsScene.update(0.0, true);

    const shaft = this.map.getfloorShaftRoomPos(this.map.getCurrentFloor());
    this.currentFloorShaft = vec2.fromValues(shaft[0], shaft[2]);

    // this.areaTriggers.push({
    //   name: "exit",
    //   x: this.currentFloorShaft[0],
    //   y: this.currentFloorShaft[1],
    //   width: roomSize * 0.5,
    //   height: roomSize * 0.5,
    //   callback: () => {
    //     if (this.playerController.getCanExtract()) {
    //       if (this.callbacks.onGameComplete) {
    //         this.callbacks.onGameComplete();
    //       }
    //     } else {
    //       console.log("Cannot extract - cursed with Binding!");
    //     }
    //   },
    // });
  }

  update(camera: Camera, dt: number) {
    this.playerController.update(camera, dt);

    if (this.bucketBundle != undefined) {
      const target = -roomHeight * this.map.getCurrentFloor() - 1.0;
      const current = this.bucketBundle.transform.position[1];

      this.bucketBundle.transform.position[1] += (target - current) * dt;
    }

    // Update physics
    this.physicsScene.update(dt);

    this.map.updateFocusRoom(camera.getPosition());

    if (this.map.floorPhysicsScenes.has(this.map.getCurrentFloor())) {
      this.map.floorPhysicsScenes.get(this.map.getCurrentFloor()).update(0.0);
    }

    // Update ghost manager with player position
    this.ghostManager.update(
      dt,
      this.playerController.getPhysicsObject().transform.position
    );

    const shaft = this.map.getfloorShaftRoomPos(this.map.getCurrentFloor());
    this.currentFloorShaft = vec2.fromValues(shaft[0], shaft[2]);

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
    const pos = this.playerController.getPosition();
    return (
      pos[0] >= trigger.x - trigger.width &&
      pos[0] <= trigger.x + trigger.width &&
      pos[2] >= trigger.y - trigger.height &&
      pos[2] <= trigger.y + trigger.height
    );
  }

  private checkTriggers(): void {
    this.areaTriggers.forEach((trigger: AreaTrigger) => {
      if (this.isPlayerInArea(trigger)) {
        trigger.callback(trigger.name);
      }
    });
    this.collisionTriggers.forEach((trigger: CollisionTrigger) => {
      if (
        trigger.collisionObject.collisionsLastUpdate.has(
          this.playerController.getPhysicsObject().physicsObjectId
        )
      ) {
        trigger.callback(trigger.name);
      }
    });
  }
}
