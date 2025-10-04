import {
  Camera,
  mat4,
  PhysicsObject,
  PhysicsScene,
  PointLight,
  Renderer3D,
  Scene,
  vec2,
  vec3,
  Ray,
} from "praccen-web-engine";
import { Input } from "../Input";
import ItemHandler from "../Systems/ItemHandler";

const sensitivity = 0.4;
const accelerationForce = 75.0;
const jumpForce = 5.0;

export default class PlayerController {
  private scene: Scene;
  private rendering: Renderer3D;

  private mouseMovement: vec2;

  private pitch = 0.0;
  private jaw = 0.0;

  private phyiscsScene: PhysicsScene;
  private physicsObject: PhysicsObject;

  private light: PointLight;

  private itemHandler: ItemHandler;

  startPosition: vec3;

  constructor(
    scene: Scene,
    physicsScene: PhysicsScene,
    rendering: Renderer3D,
    spawnPosition: vec3,
    itemHandler: ItemHandler
  ) {
    this.scene = scene;
    this.phyiscsScene = physicsScene;
    this.rendering = rendering;
    this.itemHandler = itemHandler;

    this.mouseMovement = vec2.create();
    Input.mouseMoveCallBack = (event: MouseEvent) => {
      let movX = event.movementX;
      let movY = event.movementY;

      if (Math.abs(movX) > window.innerWidth * 0.3) {
        movX = 0.0;
      }

      if (Math.abs(movY) > window.innerHeight * 0.3) {
        movY = 0.0;
      }

      this.mouseMovement[0] += movX;
      this.mouseMovement[1] += movY;
    };

    this.physicsObject = this.phyiscsScene.addNewPhysicsObject();
    this.physicsObject.frictionCoefficient = 0.0;
    this.physicsObject.drag = 0.0;
    this.physicsObject.collisionCoefficient = 0.0;

    this.physicsObject.boundingBox.setMinAndMaxVectors(
      vec3.fromValues(-0.5, 0.0, -0.5),
      vec3.fromValues(0.5, 1.8, 0.5)
    );

    this.light = scene.addNewPointLight();
    this.light.castShadow = true;
    vec3.set(this.light.colour, 0.7, 0.5, 0.4);
    // vec3.scale(this.light.colour, this.light.colour, 0.5);
    this.light.quadratic = 0.3;
    this.light.position = this.physicsObject.transform.position;

    this.startPosition = spawnPosition;
    this.respawn();
  }

  respawn() {
    vec3.copy(this.physicsObject.transform.position, this.startPosition);
    vec3.zero(this.physicsObject.velocity);
    vec3.zero(this.physicsObject.force);
    vec3.zero(this.physicsObject.impulse);
    this.pitch = 0.0;
    this.jaw = 0.0;
    vec2.set(this.mouseMovement, 0.0, 0.0);
  }

  getPosition(): vec3 {
    return this.physicsObject.transform.position;
  }

  getVelocity(): vec3 {
    return this.physicsObject.velocity;
  }

  update(camera: Camera, dt: number) {
    // Rotate camera with mouse
    let mouseDiff = Input.getMouseMovement();

    if (Input.keys["ARROWUP"]) {
      mouseDiff[1] -= 5;
    }

    if (Input.keys["ARROWDOWN"]) {
      mouseDiff[1] += 5;
    }

    if (Input.keys["ARROWRIGHT"]) {
      mouseDiff[0] += 5;
    }

    if (Input.keys["ARROWLEFT"]) {
      mouseDiff[0] -= 5;
    }

    if (document.pointerLockElement == document.getElementById("gameDiv")) {
      // Make sure the user is not changing a slider
      this.pitch -= mouseDiff[1] * sensitivity;
      this.jaw -= mouseDiff[0] * sensitivity;
    }

    this.pitch = Math.max(Math.min(this.pitch, 89), -89); // Don't allow the camera to go past 89 degrees
    this.jaw = this.jaw % 360;

    camera.setPitchJawDegrees(this.pitch, this.jaw); // Update the rotation of the camera

    let accVec = vec3.create();

    // Movement input
    let forward = vec3.clone(camera.getDir());
    forward[1] = 0.0;
    vec3.normalize(forward, forward);

    // Touch / joystick control
    Input.updateGamepad();
    if (
      vec2.squaredLength(
        vec2.fromValues(
          Input.joystickLeftDirection[0],
          Input.joystickLeftDirection[1]
        )
      ) > 0.001
    ) {
      vec3.scaleAndAdd(
        accVec,
        accVec,
        camera.getRight(),
        Input.joystickLeftDirection[0] * 2.0
      );
      vec3.scaleAndAdd(
        accVec,
        accVec,
        forward,
        -Input.joystickLeftDirection[1] * 2.0
      );
    }
    // Keyboard control
    else {
      if (Input.keys["W"]) {
        vec3.add(accVec, accVec, forward);
      }

      if (Input.keys["S"]) {
        vec3.sub(accVec, accVec, forward);
      }

      if (Input.keys["A"]) {
        vec3.sub(accVec, accVec, camera.getRight());
      }

      if (Input.keys["D"]) {
        vec3.add(accVec, accVec, camera.getRight());
      }
      if (Input.keys["E"]) {
        let ray = new Ray();
        ray.setDir(vec3.clone(camera.getDir()));
        ray.setStart(vec3.clone(camera.getPosition()));
        this.itemHandler.pickupItem(ray, this.physicsObject);
      }
    }

    vec3.normalize(accVec, accVec);
    vec3.scaleAndAdd(
      this.physicsObject.force,
      vec3.create(),
      accVec,
      accelerationForce
    );

    // Jumping
    if (
      (Input.keys[" "] || Input.buttons.get("A")) &&
      this.physicsObject.onGround
    ) {
      this.physicsObject.velocity[1] = 0.0;
      vec3.set(this.physicsObject.impulse, 0.0, jumpForce, 0.0);
    }

    let xzVelocity = vec3.clone(this.physicsObject.velocity);
    xzVelocity[1] = 0.0;
    vec3.scaleAndAdd(
      this.physicsObject.force,
      this.physicsObject.force,
      xzVelocity,
      -10.0
    );

    // Update camera
    camera.setPosition(
      vec3.fromValues(
        this.physicsObject.transform.position[0],
        this.physicsObject.transform.position[1] + 1.7,
        this.physicsObject.transform.position[2]
      )
    );

    vec3.scaleAndAdd(this.light.offset, vec3.create(), camera.getRight(), -0.5);
    vec3.scaleAndAdd(this.light.offset, this.light.offset, forward, 1.0);
    vec3.add(
      this.light.offset,
      this.light.offset,
      vec3.fromValues(0.0, 1.0, 0.0)
    );
  }
}
