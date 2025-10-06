import {
  PhysicsObject,
  PhysicsScene,
  GraphicsBundle,
  Scene,
  vec3,
  AnimatedGraphicsBundle,
  quat,
  vec2,
} from "praccen-web-engine";
import { roomSize } from "../Generators/Map/ProceduralMapGenerator";

export enum ItemType {
  GRAIL,
  CROWN,
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
  HAUNT,
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
  private graphicsBundle: GraphicsBundle;
  name: string;
  type: ItemType;
  startPosition: vec3;
  curse: Curse;
  floorFoundOn: number;

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
    curse: Curse,
    floorFoundOn: number,
    itemInstancedObjects: Map<ItemType, GraphicsBundle>,
    graphicsLayer: { enabled: boolean }[][][]
  ) {
    this.scene = scene;
    this.physicsScene = physicsScene;
    this.startPosition = vec3.clone(spawnPosition);
    this.type = type;
    this.graphicsBundle = itemInstancedObjects.get(this.type) || null;
    this.name = name;
    this.curse = curse;
    this.rarity = rarity;
    this.description = description;
    this.floorFoundOn = floorFoundOn;
    this.quantity = 1;

    if (this.graphicsBundle == undefined) {
      return;
    }
    let scale: number = 1.0;
    switch (this.type) {
      case ItemType.GRAIL:
        scale = 0.1;
        break;
      case ItemType.CROWN:
        break;
      case ItemType.COIN:
        this.quantity = Math.ceil(Math.random() * 100 * (1 + this.floorFoundOn));
        break;
      case ItemType.WEAPON:
        break;
      case ItemType.SKULL:
        break;
      case ItemType.SCEPTER:
        break;
    }

    let transform = this.scene.addNewInstanceOfInstancedMesh(this.graphicsBundle);
    transform.position = this.startPosition;
    transform.scale = vec3.fromValues(scale, scale, scale);

    // Add random rotation around Y-axis (0-360 degrees)
    const randomYRotationRadians = Math.random() * Math.PI * 2;
    quat.rotateY(
      transform.rotation,
      transform.rotation,
      randomYRotationRadians
    );
    
    this.graphicsBundle.updateMinAndMaxPositions();
    transform.position[1] -=
      this.graphicsBundle.getMinAndMaxPositions().min[1];
    transform.calculateMatrices();
    let roomCoords = vec2.fromValues(Math.floor(this.startPosition[0] / roomSize), Math.floor(this.startPosition[2] / roomSize));
    roomCoords[0] = Math.max(0, Math.min(roomCoords[0], graphicsLayer.length - 1));
    roomCoords[1] = Math.max(0, Math.min(roomCoords[1], graphicsLayer[0].length - 1));
    graphicsLayer[roomCoords[0]][roomCoords[1]].push(transform);

    this.physicsObject = this.physicsScene.addNewPhysicsObject(transform);
    this.physicsObject.mass = 0.3;
    this.physicsObject.frictionCoefficient = 1.0;
    this.physicsObject.isStatic = true;
    this.physicsObject.boundingBox.setMinAndMaxVectors(vec3.fromValues(-0.5 * 1.0/scale, -0.5 * 1.0/scale, -0.5 * 1.0/scale), vec3.fromValues(0.5 * 1.0/scale, 0.5 * 1.0/scale, 0.5 * 1.0/scale));

    this.physicsScene.update(0.0, true, false); // Since the item is static, make sure the physics scene has a static update after updating the item placement and size
  }

  destroy() {
    if (this.graphicsBundle) {
      this.graphicsBundle.instancedTransforms = this.graphicsBundle.instancedTransforms.filter((transform) => {return transform != this.physicsObject.transform});
      this.graphicsBundle.updateInstanceBuffer()
    }
    if (this.physicsObject) {
      this.physicsScene.removePhysicsObject(this.physicsObject);
    }
  }

  getPhysicsObject(): PhysicsObject {
    return this.physicsObject;
  }
}
