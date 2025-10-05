import {
  GraphicsBundle,
  Scene,
  vec3,
  PhysicsScene,
  PhysicsObject,
  quat,
} from "praccen-web-engine";
import PlayerController from "./PlayerController";
import SoundManager from "../Audio/SoundManager";

export interface ArrowProjectile {
  bundle: GraphicsBundle;
  velocity: vec3;
  lifetime: number;
  active: boolean;
  physicsObject: PhysicsObject;
}

export enum TrapDirection {
  NORTH = 0,
  EAST = 1,
  SOUTH = 2,
  WEST = 3,
}

export default class ArrowTrap {
  private scene: Scene;
  private physicsScene: PhysicsScene;
  private position: vec3;
  private direction: TrapDirection;
  private triggered = false;
  private cooldownTimer = 0;
  private cooldownDuration = 3.0; // Seconds before trap can trigger again
  private projectiles: ArrowProjectile[] = [];
  private maxProjectiles = 1;
  private arrowSpeed = 15.0;
  private projectileLifetime = 3.0;
  private soundManager: SoundManager | null = null;

  constructor(
    scene: Scene,
    physicsScene: PhysicsScene,
    position: vec3,
    direction: TrapDirection,
    soundManager?: SoundManager
  ) {
    this.scene = scene;
    this.physicsScene = physicsScene;
    this.position = vec3.clone(position);
    this.direction = direction;
    this.soundManager = soundManager || null;

    // Pre-create projectile pool
    this.initializeProjectilePool();
  }

  private async initializeProjectilePool() {
    for (let i = 0; i < this.maxProjectiles; i++) {
      const projectile = await this.createProjectile();
      this.projectiles.push(projectile);
    }
  }

  trigger() {
    if (this.triggered || this.cooldownTimer > 0) {
      return;
    }

    this.triggered = true;
    this.fireArrow();
  }

  private async createProjectile(): Promise<ArrowProjectile> {
    const bundle = await this.scene.addNewMesh(
      "Assets/objs/arrow_cube.obj",
      "Assets/Textures/Items/Arrow.png",
      "CSS:rgb(0,0,0)"
    );

    vec3.set(bundle.transform.scale, 0.6, 0.6, 0.01);

    const physicsObject = this.physicsScene.addNewPhysicsObject(
      bundle.transform
    );
    physicsObject.ignoreGravity = true;
    physicsObject.boundingBox.setMinAndMaxVectors(
      vec3.fromValues(-0.3, -0.01, -0.3),
      vec3.fromValues(0.3, 0.01, 0.3)
    );

    return {
      bundle,
      velocity: vec3.create(),
      lifetime: 0,
      active: false,
      physicsObject,
    };
  }

  private fireArrow() {
    // Find an inactive projectile from the pool
    const projectile = this.projectiles.find((p) => !p.active);

    if (!projectile) {
      return; // No available projectiles
    }

    // Play arrow fire sound
    if (this.soundManager) {
      this.soundManager.playSpatialSfx("arrow_fire", this.position);
    }

    // Set initial position and activate
    vec3.copy(projectile.bundle.transform.position, this.position);
    projectile.lifetime = this.projectileLifetime;
    projectile.active = true;

    const velocity = vec3.create();
    switch (this.direction) {
      case TrapDirection.NORTH:
        vec3.set(velocity, 0, 0, -this.arrowSpeed);
        quat.fromEuler(projectile.bundle.transform.rotation, 0, 90, 0);
        break;
      case TrapDirection.EAST:
        vec3.set(velocity, this.arrowSpeed, 0, 0);
        quat.fromEuler(projectile.bundle.transform.rotation, 0, 0, 0);
        break;
      case TrapDirection.SOUTH:
        vec3.set(velocity, 0, 0, this.arrowSpeed);
        quat.fromEuler(projectile.bundle.transform.rotation, 0, -90, 0);
        break;
      case TrapDirection.WEST:
        vec3.set(velocity, -this.arrowSpeed, 0, 0);
        quat.fromEuler(projectile.bundle.transform.rotation, 0, 180, 0);
        break;
    }
    vec3.copy(projectile.velocity, velocity);
    vec3.copy(projectile.physicsObject.velocity, velocity);
  }

  update(dt: number, playerController: PlayerController): boolean {
    if (this.cooldownTimer > 0) {
      this.cooldownTimer -= dt;
    } else if (this.triggered) {
      this.triggered = false;
    }

    let playerHit = false;

    this.projectiles.forEach((projectile) => {
      if (!projectile.active) {
        return;
      }

      projectile.lifetime -= dt;

      // Check if projectile hit player
      if (
        projectile.physicsObject.collisionsLastUpdate.has(
          playerController.getPhysicsObject().physicsObjectId
        )
      ) {
        playerHit = true;
        projectile.active = false;

        // Play arrow hit sound
        if (this.soundManager) {
          this.soundManager.playSpatialSfx(
            "arrow_hit",
            projectile.bundle.transform.position
          );
        }

        // Move offscreen when hit
        vec3.set(projectile.bundle.transform.position, 0, -10000, 0);
        vec3.zero(projectile.physicsObject.velocity);
      }

      // Deactivate if lifetime expired
      if (projectile.lifetime <= 0) {
        projectile.active = false;
        // Move offscreen when inactive
        vec3.set(projectile.bundle.transform.position, 0, -10000, 0);
        vec3.zero(projectile.physicsObject.velocity);
      }

      // Move projectile
      if (projectile.active) {
        vec3.scaleAndAdd(
          projectile.bundle.transform.position,
          projectile.bundle.transform.position,
          projectile.velocity,
          dt
        );
      }
    });

    // Start cooldown if we fired
    if (playerHit || this.triggered) {
      this.cooldownTimer = this.cooldownDuration;
    }

    return playerHit;
  }

  getPosition(): vec3 {
    return this.position;
  }

  cleanup() {
    this.projectiles.forEach((projectile) => {
      this.scene.deleteGraphicsBundle(projectile.bundle);
      this.physicsScene.removePhysicsObject(projectile.physicsObject);
    });
    this.projectiles = [];
  }
}
