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
  lifetime: number;
  active: boolean;
  physicsObject: PhysicsObject;
  swishSoundId: number | null;
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
  private projectile: ArrowProjectile = null;
  private arrowSpeed = 15.0;
  private projectileLifetime = 3.0;
  private soundManager: SoundManager | null = null;

  holePosition: vec3;


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
    physicsObject.isImmovable = true;
    physicsObject.boundingBox.setMinAndMaxVectors(
      vec3.fromValues(-0.3, -0.01, -0.3),
      vec3.fromValues(0.3, 0.01, 0.3)
    );

    return {
      bundle,
      lifetime: 0,
      active: false,
      physicsObject,
      swishSoundId: null,
    };
  }

  private fireArrow() {
    // Find an inactive projectile from the pool
    this.createProjectile().then((projectile) => {
      this.projectile = projectile;

      if (this.soundManager) {
        this.soundManager.playSpatialSfx("arrow_twang", this.holePosition);
      }

      // Set initial position and activate
      vec3.copy(projectile.bundle.transform.position, this.position);
      projectile.lifetime = this.projectileLifetime;
      projectile.active = true;

      if (this.soundManager) {
        projectile.swishSoundId = this.soundManager.playSpatialSfx(
          "arrow_swish",
          projectile.bundle.transform.position
        );
      }

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
      vec3.copy(projectile.physicsObject.velocity, velocity);
    });
  }

  update(dt: number, playerController: PlayerController): boolean {
    if (this.cooldownTimer > 0) {
      this.cooldownTimer -= dt;
    } else if (this.triggered) {
      // Start cooldown if we fired
      if (this.triggered) {
        this.cooldownTimer = this.cooldownDuration;
      }
      this.triggered = false;
    }

    let playerHit = false;

    if (this.projectile != undefined && this.projectile.active) {
      this.projectile.lifetime -= dt;

      // Check if projectile hit player
      if (
        this.projectile.physicsObject.collisionsLastUpdate.has(
          playerController.getPhysicsObject().physicsObjectId
        )
      ) {
        playerHit = true;
        this.projectile.active = false;

        // Stop swish sound
        if (this.soundManager && this.projectile.swishSoundId !== null) {
          this.soundManager.stop("arrow_swish", this.projectile.swishSoundId);
          this.projectile.swishSoundId = null;
        }
      }

      // Deactivate if lifetime expired
      if (this.projectile.lifetime <= 0) {
        this.projectile.active = false;

        // Stop swish sound
        if (this.soundManager && this.projectile.swishSoundId !== null) {
          this.soundManager.stop("arrow_swish", this.projectile.swishSoundId);
          this.projectile.swishSoundId = null;
        }
      }

    };

    if (this.projectile && !this.projectile.active) {
      this.cleanup();
    }

    return playerHit;
  }

  getPosition(): vec3 {
    return this.position;
  }

  cleanup() {
    this.scene.deleteGraphicsBundle(this.projectile.bundle);
    this.physicsScene.removePhysicsObject(this.projectile.physicsObject);

    this.projectile = null;
  }
}
