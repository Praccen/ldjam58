import {
  GraphicsBundle,
  ParticleSpawner,
  PhysicsObject,
  PhysicsScene,
  Scene,
  vec3,
  quat,
} from "praccen-web-engine";
import { roomHeight, roomSize } from "../Generators/Map/ProceduralMapGenerator";
import GameGUI from "../GUI/GameGUI";
import ShopManager from "../Systems/ShopManager";

export interface Ghost {
  physicsObject: PhysicsObject;
  graphicsBundle: GraphicsBundle;
  fireParticleSpawner: ParticleSpawner;
}

export default class GhostManager {
  private scene: Scene = null;
  private physicsScene: PhysicsScene = null;
  private ghosts: Ghost[] = new Array<Ghost>();
  private anger: number = 1;
  private angerTimer: number = 0;
  private gui: GameGUI | null = null;
  private angeredText: boolean = false;

  constructor(scene: Scene, physicsScene: PhysicsScene, gui?: GameGUI) {
    this.scene = scene;
    this.physicsScene = physicsScene;
    this.gui = gui;
  }

  getActiveGhosts(): number {
    return this.ghosts.length;
  }

  checkPlayerCollision(playerPos: vec3, damageRadius: number = 1.0): boolean {
    for (const ghost of this.ghosts) {
      if (!ghost.physicsObject) continue;

      const ghostPos = ghost.physicsObject.transform.position;
      const dx = playerPos[0] - ghostPos[0];
      const dy = playerPos[1] - ghostPos[1];
      const dz = playerPos[2] - ghostPos[2];
      const distSq = dx * dx + dy * dy + dz * dz;

      if (distSq < damageRadius * damageRadius) {
        return true;
      }
    }
    return false;
  }

  private getFloorFromYPosition(yPos: number): number {
    return Math.max(0, Math.ceil(-(yPos + 0.1) / roomHeight));
  }

  addGhost(spawn: vec3, shaftRoomPos: vec3) {
    // Set spawn position some rooms away from shaft room in random direction
    const floor = this.getFloorFromYPosition(spawn[1]);
    const angle = Math.random() * Math.PI * 2; // Random direction
    const offsetDistance = roomSize * 4;

    let spawnPosition: vec3 = vec3.fromValues(
      shaftRoomPos[0] + Math.cos(angle) * offsetDistance,
      -floor * roomHeight,
      shaftRoomPos[2] + Math.sin(angle) * offsetDistance
    );
    let physicsObject = this.physicsScene.addNewPhysicsObject();

    physicsObject.isImmovable = true;
    physicsObject.ignoreGravity = true;
    physicsObject.isCollidable = false;
    let graphicsBundle: GraphicsBundle;

    let fireParticleSpawner = this.scene.addNewParticleSpawner(
      "Assets/Textures/fire.png",
      5
    );
    fireParticleSpawner.lifeTime = 0.8;
    fireParticleSpawner.fadePerSecond = 1.0 / 0.8;
    vec3.set(
      fireParticleSpawner.randomPositionModifier.min,
      -0.05,
      -0.05,
      -0.05
    );
    vec3.set(fireParticleSpawner.randomPositionModifier.max, 0.05, 0.05, 0.05);
    fireParticleSpawner.sizeChangePerSecond = -0.0001;
    fireParticleSpawner.initAllParticles(
      {
        startPosMin: vec3.fromValues(-0.05, -0.05, -0.05),
        startPosMax: vec3.fromValues(0.05, 0.05, 0.05),
      },
      { sizeMin: 0.05, sizeMax: 0.1 },
      {
        startVelMin: vec3.fromValues(0.0, 0.05, 0.0),
        startVelMax: vec3.fromValues(0.0, 0.15, 0.0),
      },
      {
        accelerationMin: vec3.fromValues(0.0, 0.0, 0.0),
        accelerationMax: vec3.fromValues(0.0, 0.0, 0.0),
      }
    );

    this.scene
      .addNewMesh(
        "Assets/objs/CharacterGhost.obj",
        "CSS:rgba(255,255,255,200)",
        "CSS:rgb(0, 0, 0)"
      )
      .then((bundle: GraphicsBundle) => {
        graphicsBundle = bundle;

        vec3.add(spawnPosition, spawnPosition, vec3.fromValues(0.0, 0.4, 0.0));

        graphicsBundle.transform.position = spawnPosition;
        graphicsBundle.transform.scale = vec3.fromValues(0.3, 0.3, 0.3);

        physicsObject.setupBoundingBoxFromGraphicsBundle(graphicsBundle);

        graphicsBundle.transform.position[1] -=
          graphicsBundle.getMinAndMaxPositions().min[1];
        physicsObject.transform = graphicsBundle.transform;
        physicsObject.boundingBox.setTransformMatrix(
          graphicsBundle.transform.matrix
        );
      });

    this.ghosts.push({
      physicsObject,
      graphicsBundle,
      fireParticleSpawner,
    });
  }

  moveGhost(
    ghost: Ghost,
    playerPosition: vec3,
    playerViewDir: vec3,
    torchRadius: number,
    dt: number
  ) {
    if (!ghost.physicsObject) {
      return;
    }

    const ghostPos = ghost.physicsObject.transform.position;
    // Apply bobbing motion
    const bobSpeed = 2.0;
    const bobAmount = 0.0015;
    const bobOffset = Math.sin(Date.now() * 0.001 * bobSpeed) * bobAmount;
    ghostPos[1] = ghostPos[1] + bobOffset;

    // Update fire particle spawner position to follow ghost
    vec3.copy(ghost.fireParticleSpawner.position, ghostPos);
    ghost.fireParticleSpawner.position[1] += 1.5;

    // Calculate direction from player to ghost
    const toGhost = vec3.create();
    vec3.subtract(toGhost, ghostPos, playerPosition);
    const distanceToPlayer = vec3.length(toGhost);
    vec3.normalize(toGhost, toGhost);

    // Check if ghost is within torch radius and player is looking at it
    const isInTorchRadius = distanceToPlayer <= torchRadius;
    const dotProduct = vec3.dot(toGhost, playerViewDir);
    const isLookingAt = dotProduct > 0.7; // About 45 degree cone

    const shouldFlee = isInTorchRadius && isLookingAt;

    // Calculate separation force from other ghosts
    const separationForce = vec3.create();
    const separationRadius = 1.5; // Minimum distance to maintain between ghosts

    for (const otherGhost of this.ghosts) {
      if (otherGhost === ghost || !otherGhost.physicsObject) {
        continue;
      }

      const otherPos = otherGhost.physicsObject.transform.position;
      const toOther = vec3.create();
      vec3.subtract(toOther, ghostPos, otherPos);
      const distance = vec3.length(toOther);

      // Only apply separation if ghosts are too close
      if (distance < separationRadius && distance > 0.001) {
        vec3.normalize(toOther, toOther);
        // Stronger repulsion when closer
        const strength = (separationRadius - distance) / separationRadius;
        vec3.scaleAndAdd(separationForce, separationForce, toOther, strength);
      }
    }

    // Movement speed
    const ySpeed = 2.0; // Speed for Y movement
    const xzSpeed = Math.min(3, 1.5 * this.anger); // Speed for XZ movement, increesed with anger
    const fleeSpeed = 5.0; // Speed when fleeing
    const separationSpeed = 2.0; // Speed for separation from other ghosts

    if (shouldFlee) {
      // Flee away from player in XZ plane
      const dx = ghostPos[0] - playerPosition[0];
      const dz = ghostPos[2] - playerPosition[2];
      const xzDistance = Math.sqrt(dx * dx + dz * dz);

      if (xzDistance > 0.001) {
        const normalizedDx = dx / xzDistance;
        const normalizedDz = dz / xzDistance;

        ghostPos[0] += normalizedDx * fleeSpeed * dt;
        ghostPos[2] += normalizedDz * fleeSpeed * dt;
      }
    } else {
      // Normal behavior - move towards player
      if (playerPosition[1] < ghostPos[1]) {
        // Move towards player's Y position
        const dy = playerPosition[1] - ghostPos[1];
        const yMovement = Math.sign(dy) * ySpeed * dt;
        const yDistance = Math.abs(dy);
        // Don't overshoot
        if (Math.abs(yMovement) > yDistance) {
          ghostPos[1] = playerPosition[1];
        } else {
          ghostPos[1] += yMovement;
        }
      } else {
        // Y position is close enough, now move in XZ plane
        const dx = playerPosition[0] - ghostPos[0];
        const dz = playerPosition[2] - ghostPos[2];
        const xzDistance = Math.sqrt(dx * dx + dz * dz);

        // Anger reduces the distance the ghost is willing to travel towards the player
        // Apply fear aura upgrade (keeps ghosts further away)
        const fearDistance = ShopManager.getGhostFearDistance();
        let playerDistance = Math.max(0.1, 10 - this.anger * this.anger) + fearDistance;
        if (playerDistance < 1.0 + fearDistance && !this.angeredText) {
          this.gui.showHauntedMessage(
            "Your actions have angered the spirits greatly.."
          );
          this.angeredText = true;
        }
        if (xzDistance > playerDistance) {
          // Normalize direction and move
          const moveAmount = xzSpeed * dt;
          const normalizedDx = dx / xzDistance;
          const normalizedDz = dz / xzDistance;
          ghostPos[0] += normalizedDx * moveAmount;
          ghostPos[2] += normalizedDz * moveAmount;
        }
      }
    }

    // Apply separation force to prevent ghost overlap
    ghostPos[0] += separationForce[0] * separationSpeed * dt;
    ghostPos[2] += separationForce[2] * separationSpeed * dt;

    // Rotate to face player
    const dx = playerPosition[0] - ghostPos[0];
    const dz = playerPosition[2] - ghostPos[2];
    const angle = Math.atan2(dx, dz);

    const rotationQuat = quat.create();
    quat.rotateY(rotationQuat, rotationQuat, angle);
    ghost.physicsObject.transform.rotation = rotationQuat;
  }

  update(
    dt: number,
    playerPosition: vec3,
    playerViewDir: vec3,
    torchRadius: number,
    hauntModifier: number
  ) {
    this.angerTimer += dt;
    if (this.angerTimer >= 10) {
      this.anger += hauntModifier;
      this.angerTimer = 0;
    }

    this.ghosts.forEach((ghost) => {
      this.moveGhost(ghost, playerPosition, playerViewDir, torchRadius, dt);
    });
  }
}
