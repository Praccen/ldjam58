import {
  PhysicsObject,
  PhysicsScene,
  GraphicsBundle,
  Scene,
  vec3,
} from "praccen-web-engine";

export enum ItemType {
  GRAIL,
  RING,
  COIN,
  WEAPON,
  SKULL,
  SCEPTER,
}
export enum CurseType {
  // LUCK,
  PROTECTIONCHARMS,
  SPEED,
  TORCH,
  SIGHT,
  // HAUNTEDCOUNT,
  // SANITY,
  // VERTIGO,
  // HYPER,
  JUMPY,
  // FIRECURSED,
  CANEXTRACT,
}

export interface Curse {
  name: string;
  description: string;
  type: CurseType;
  severity?: "minor" | "major" | "critical";
  modifier?: number; // Optional: for displaying static modifiers if not calculated from player stats
}

export default class Item {
  private scene: Scene;
  private physicsScene: PhysicsScene;
  private physicsObject: PhysicsObject;
  name: string;
  type: ItemType;
  private graphicsBundle: GraphicsBundle;
  startPosition: vec3;
  curse: Curse;

  description?: string;
  quantity: number;
  rarity?: "common" | "rare" | "epic" | "legendary";

  constructor(
    scene: Scene,
    physicsScene: PhysicsScene,
    spawnPosition: vec3,
    type: ItemType,
    name: string,
    rarity: "common" | "rare" | "epic" | "legendary",
    description: string,
    curse: Curse
  ) {
    this.scene = scene;
    this.physicsScene = physicsScene;
    this.startPosition = vec3.clone(spawnPosition);
    this.type = type;
    this.name = name;
    this.curse = curse;
    this.rarity = rarity;
    this.description = description;
    this.quantity = 1;

    var model: string = "Assets/objs/cube.obj";
    // TODO: Add models
    switch (this.type) {
      case ItemType.GRAIL:
        break;
      case ItemType.RING:
        break;
      case ItemType.COIN:
        break;
      case ItemType.WEAPON:
        break;
      case ItemType.SKULL:
        break;
      case ItemType.SCEPTER:
        break;
    }

    this.physicsObject = this.physicsScene.addNewPhysicsObject();
    this.physicsObject.mass = 0.3;
    this.physicsObject.frictionCoefficient = 1.0;
    this.physicsObject.isStatic = true;

    this.scene
      .addNewMesh(model, "CSS:rgb(0, 0, 0)", "CSS:rgb(0, 0, 0)")
      .then((bundle: GraphicsBundle) => {
        this.graphicsBundle = bundle;
        this.graphicsBundle.transform.position = this.startPosition;

        this.physicsObject.setupBoundingBoxFromGraphicsBundle(
          this.graphicsBundle
        );
        this.physicsObject.transform = this.graphicsBundle.transform;
        this.physicsObject.boundingBox.setTransformMatrix(
          this.graphicsBundle.transform.matrix
        );
        this.physicsScene.update(0.0, true, false); // Since the item is static, make sure the physics scene has a static update after updating the item placement and size
      });
  }

  destroy() {
    this.scene.deleteGraphicsBundle(this.graphicsBundle);
    this.physicsScene.removePhysicsObject(this.physicsObject);
  }

  getPhysicsObject(): PhysicsObject {
    return this.physicsObject;
  }
}
