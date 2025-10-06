import {
  AnimatedGraphicsBundle,
  Camera,
  ParticleSpawner,
  PhysicsObject,
  PhysicsScene,
  quat,
  Ray,
  Renderer3D,
  Scene,
  Shape,
  Transform,
  vec3,
} from "praccen-web-engine";
import ProceduralMap, {
  convertCoordIncludingWallsToRoomIndex,
  roomHeight,
  roomSize,
} from "../Generators/Map/ProceduralMapGenerator";
import Game from "../States/Game";
import { vec2 } from "gl-matrix";
import PlayerController from "./PlayerController";
import ItemHandler from "../Systems/ItemHandler";
import { triggerAsyncId } from "async_hooks";
import GhostManager from "./GhostManager";
import ArrowTrap, { TrapDirection } from "./ArrowTrap";
import { GraphicsBundle } from "../../../dist/Engine";
import { Factories } from "../Utils/Factories";
import ShopManager from "../Systems/ShopManager";
import { ItemType } from "./Item";

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
  onGameLose?: () => void;
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

  private arrowTraps: ArrowTrap[] = [];
  private trapTriggers: Map<CollisionTrigger, ArrowTrap> = new Map();

  private currentFloorShaft: vec2;
  private game: Game;

  private arrowDispenserInstancedObject: GraphicsBundle;
  private tripWireInstancedObject: GraphicsBundle;
  private itemInstancedObjects = new Map<ItemType, GraphicsBundle>();

  constructor(renderer: Renderer3D, game: Game) {
    this.game = game;
    // Create a scene. It will automatically have a directional light, so let's set the ambient multiplier for it.
    this.scene = new Scene(renderer);
    this.scene.directionalLight.ambientMultiplier = 0.0;
    vec3.set(this.scene.directionalLight.colour, 0.6, 0.6, 0.6);
    vec3.set(this.scene.directionalLight.direction, 0.001, -1.0, -0.6);

    this.scene.directionalLight.shadowCameraDistance = 100;
    this.scene.directionalLight.lightProjectionBoxSideLength = 100;

    this.physicsScene = new PhysicsScene();
    this.itemHandler = new ItemHandler(this.scene, game.inventory, game.gui);
    this.ghostManager = new GhostManager(
      this.scene,
      this.physicsScene,
      game.gui
    );
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
      this,
      game.soundManager
    );
    this.itemHandler.setPlayer(this.playerController);

    this.scene.renderer.meshStore
      .loadMeshes([
        "Assets/objs/cube.obj", 
        "Assets/objs/cube2.obj",
        "Assets/objs/grail/Untitled.obj",
        "Assets/objs/scepter/Untitled.obj",
        "Assets/objs/sword/Untitled.obj",
        "Assets/objs/crown/Untitled.obj",
        "Assets/objs/skull/Untitled.obj",
        "Assets/objs/coins/Untitled.obj"
      ], { loaded: 0 })
      .then(async () => {
        this.tripWireInstancedObject = await Factories.createInstancedMesh(this.scene, 
        "Assets/objs/cube2.obj", 
        "CSS:rgb(0,0,0)",
        "CSS:rgb(255,255,255)");

        this.arrowDispenserInstancedObject = await Factories.createInstancedMesh(this.scene, 
        "Assets/objs/cube.obj", 
        "CSS:rgb(0,0,0)",
        "CSS:rgb(20,20,20)");

        this.itemInstancedObjects.set(ItemType.GRAIL, await Factories.createInstancedMesh(
          this.scene,
          "Assets/objs/grail/Untitled.obj",
          "Assets/objs/grail/Scene_-_Root_baseColor.png",
          "Assets/objs/grail/Scene_-_Root_metallicRoughness.png"
        ));

        this.itemInstancedObjects.set(ItemType.SCEPTER, await Factories.createInstancedMesh(
          this.scene,
          "Assets/objs/scepter/Untitled.obj",
          "CSS:rgba(177, 121, 0, 1)",
          "CSS:rgb(255, 255, 255)"
        ));

        this.itemInstancedObjects.set(ItemType.WEAPON, await Factories.createInstancedMesh(
          this.scene,
          "Assets/objs/sword/Untitled.obj",
          "Assets/objs/sword/Moonbrand_Mat_baseColor.jpeg",
          "Assets/objs/sword/Moonbrand_Mat_metallicRoughness.png"
        ));

        this.itemInstancedObjects.set(ItemType.CROWN, await Factories.createInstancedMesh(
          this.scene,
          "Assets/objs/crown/Untitled.obj",
          "Assets/objs/crown/Crown_BaseColor.png",
          "Assets/objs/crown/Crown_Metallic.png"
        ));

        this.itemInstancedObjects.set(ItemType.SKULL, await Factories.createInstancedMesh(
          this.scene,
          "Assets/objs/skull/Untitled.obj",
          "CSS:rgba(192, 184, 156, 1)",
          "CSS:rgb(10, 10, 10)"
        ));

        this.itemInstancedObjects.set(ItemType.COIN, await Factories.createInstancedMesh(
          this.scene,
          "Assets/objs/coins/Untitled.obj",
          "Assets/objs/coins/Bag_LP_Albedo.tga.png",
          "Assets/objs/coins/Bag_LP_Specular.tga.png"
        ));
          

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
            this.itemInstancedObjects,
            this.map.getGraphicsLayer(floor),
            floorPhysicsScene
          );

          // Spawn traps
          const trapRooms = this.map.getAccessibleRooms(floor);
          for (const trapRoom of trapRooms) {
            if (Math.random() * (((floor + 2) * 2)  / this.map.endFloor) < 0.5) {
              continue;
            }

            // Never put a trap on the wall leading into the shaft
            if (this.map.getFloorShaftCoords(floor)[0] == convertCoordIncludingWallsToRoomIndex(trapRoom[0]) && this.map.getFloorShaftCoords(floor)[1] == convertCoordIncludingWallsToRoomIndex(trapRoom[1]) + 1) {
              continue;
            }

            // Consider spawning trap
            // Check for a wall to put arrow dispenser on
            let directions = [];
            if (this.map.getMapForFloor(floor)[trapRoom[0] - 1][trapRoom[1]]%16 == 2 && this.map.getMapForFloor(floor)[trapRoom[0] + 1][trapRoom[1]]%16 == 2) {
              directions.push(TrapDirection.EAST); 
              directions.push(TrapDirection.WEST);
            }
            if (this.map.getMapForFloor(floor)[trapRoom[0]][trapRoom[1] - 1]%16 == 1 && this.map.getMapForFloor(floor)[trapRoom[0]][trapRoom[1] + 1]%16 == 1) {
              directions.push(TrapDirection.SOUTH);
              directions.push(TrapDirection.NORTH);
            }

            if (directions.length == 0) {
              continue;
            }

            const direction = directions[Math.floor(Math.random() * directions.length)];
            this.addArrowTrap(this.map.getRoomCenterWorldPos(floor, trapRoom), direction, this.map.getGraphicsLayer(floor), floorPhysicsScene);
          }
        }
      );
      }
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
  }

  update(camera: Camera, dt: number) {
    this.playerController.update(camera, dt);

    if (this.bucketBundle != undefined) {
      const target = -roomHeight * this.map.getCurrentFloor() - 1.0 + Number(this.map.endFloor == this.map.getCurrentFloor());
      const current = this.bucketBundle.transform.position[1];

      this.bucketBundle.transform.position[1] += (target - current) * dt;
    }

    // Update physics
    this.physicsScene.update(dt);

    this.map.updateFocusRoom(camera.getPosition());

    if (this.map.floorPhysicsScenes.has(this.map.getCurrentFloor())) {
      this.map.floorPhysicsScenes.get(this.map.getCurrentFloor()).update(0.0);
    }

    // Spawn new ghosts
    if (
      this.ghostManager.getActiveGhosts() <
      this.playerController.getHauntedCount()
    ) {
      const shaftRoomPos = this.map.getfloorShaftRoomPos(
        this.map.getCurrentFloor()
      );
      this.ghostManager.addGhost(
        this.playerController.getPhysicsObject().transform.position,
        shaftRoomPos
      );
    }

    const quadratic = 0.3 / this.playerController.getTorch();
    const torchRadius = Math.sqrt(9.0 / quadratic);
    this.ghostManager.update(
      dt,
      this.playerController.getPhysicsObject().transform.position,
      vec3.clone(camera.getDir()),
      torchRadius,
      this.playerController.getHauntModifier()
    );

    // Update arrow traps
    this.arrowTraps.forEach((trap) => {
      const playerHit = trap.update(dt, this.playerController);
      if (playerHit) {
        this.damagePlayer();
      }
    });

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

  getGhostManager(): GhostManager {
    return this.ghostManager;
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

  /**
   * Adds an arrow trap to the level with an area trigger
   * @param trapRoomPosition Position of the center of the room that the trap should be in
   * @param direction Direction arrows will fly
   * @param triggerSize Size of the trigger area (half-width/height)
   */
  addArrowTrap(
    trapRoomPosition: vec3,
    direction: TrapDirection,
    graphicsLayer: { enabled: boolean }[][][],
    physicsScene: PhysicsScene
  ): void {
    let offset = vec3.create();
    let tripwireRotation = 0.0;
    if (direction == TrapDirection.EAST) {
      vec3.set(offset, -roomSize * 0.45, 1.0, 0.0);
    }
    else if (direction == TrapDirection.NORTH) {
      vec3.set(offset, 0.0, 1.0, roomSize * 0.45);
      tripwireRotation = 90;
    }
    else if (direction == TrapDirection.SOUTH) {
      vec3.set(offset, 0.0, 1.0, -roomSize * 0.45);
      tripwireRotation = 90;
    }
    else if (direction == TrapDirection.WEST) {
      vec3.set(offset, roomSize * 0.45, 1.0, 0.0);
    }

    let trapPosition = vec3.add(vec3.create(), trapRoomPosition, offset);

    const trap = new ArrowTrap(
      this.scene,
      this.physicsScene,
      trapPosition,
      direction,
      this.game.soundManager
    );
    this.arrowTraps.push(trap);

    // Add visual trip wire
    let tripwireTransform = this.scene.addNewInstanceOfInstancedMesh(this.tripWireInstancedObject)
    vec3.set(
      tripwireTransform.position,
      trapRoomPosition[0],
      trapRoomPosition[1] + 0.4,
      trapRoomPosition[2]
    );
    vec3.set(
      tripwireTransform.scale,
      roomSize,
      0.05,
      0.05
    );
    quat.fromEuler(tripwireTransform.rotation, 0.0, tripwireRotation, 0.0);
    tripwireTransform.calculateMatrices();
    graphicsLayer[Math.floor(trapRoomPosition[0] / roomSize)][Math.floor(trapRoomPosition[2] / roomSize)].push(tripwireTransform);

    let tripwirePhysObj = physicsScene.addNewPhysicsObject(tripwireTransform);
    tripwirePhysObj.isStatic = true;
    tripwirePhysObj.isCollidable = false;
    physicsScene.update(0.0, true, false);

    const trigger: CollisionTrigger = {
      name: `arrow_trap_${this.arrowTraps.length}`,
      collisionObject: tripwirePhysObj,
      callback: () => {
        trap.trigger();
      },
    };
    this.collisionTriggers.push(trigger);
    this.trapTriggers.set(trigger, trap);


    // Add arrow slit on the wall
    // TODO Add better model
    let dispenserTransform = this.scene.addNewInstanceOfInstancedMesh(this.arrowDispenserInstancedObject)
    vec3.set(
      dispenserTransform.position,
      trapPosition[0],
      trapPosition[1],
      trapPosition[2]
    );
    vec3.set(
      dispenserTransform.scale,
      0.15, 0.6, 0.15
    );
    quat.fromEuler(dispenserTransform.rotation, 0.0, tripwireRotation, 0.0);
    dispenserTransform.calculateMatrices();
    dispenserTransform.enabled = true;
    graphicsLayer[Math.floor(trapRoomPosition[0] / roomSize)][Math.floor(trapRoomPosition[2] / roomSize)].push(dispenserTransform);
    trap.holePosition = dispenserTransform.position;
  }

  private damagePlayer(): void {
    const currentCharms = this.playerController.getProtectionCharms();
    if (currentCharms > -1) {
      // Check for death ward before applying fatal damage
      if (currentCharms === 0 && ShopManager.hasDeathWard() && !ShopManager.hasUsedDeathWard()) {
        // Death ward saves the player once
        ShopManager.useDeathWard();
        this.game.gui.showHauntedMessage("The Death Ward protects you!");
        this.game.gui.showDamageEffect();
        // Don't reduce charms, player survives with 0 charms
        return;
      }

      this.playerController.setProtectionCharms(currentCharms - 1);

      // Show damage effect
      this.game.gui.showDamageEffect();

      if (currentCharms <= 0) {
        if (this.callbacks.onGameLose) {
          this.callbacks.onGameLose();
        }
      }
    }
  }
}
