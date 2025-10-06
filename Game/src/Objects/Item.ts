import {
  PhysicsObject,
  PhysicsScene,
  GraphicsBundle,
  Scene,
  vec3,
  AnimatedGraphicsBundle,
  quat,
} from "praccen-web-engine";

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
  name: string;
  type: ItemType;
  private graphicsBundle: GraphicsBundle;
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
  ) {
    this.scene = scene;
    this.physicsScene = physicsScene;
    this.startPosition = vec3.clone(spawnPosition);
    this.type = type;
    this.name = name;
    this.curse = curse;
    this.rarity = rarity;
    this.description = description;
    this.floorFoundOn = floorFoundOn;
    this.quantity = 1;

    let model: string = "Assets/objs/cube.obj";
    let diffuse: string = "CSS:rgb(255, 196, 0)";
    let specular: string = "CSS:rgb(255, 255, 255)";
    let scale: number = 1.0;
    switch (this.type) {
      case ItemType.GRAIL:
        model = "Assets/objs/grail/Untitled.obj";
        diffuse = "Assets/objs/grail/Scene_-_Root_baseColor.png";
        specular = "Assets/objs/grail/Scene_-_Root_metallicRoughness.png";
        scale = 0.1;
        break;
      case ItemType.CROWN:
        model = "Assets/objs/crown/Untitled.obj";
        diffuse = "Assets/objs/crown/Crown_BaseColor.png";
        specular = "Assets/objs/crown/Crown_Metallic.png";
        break;
      case ItemType.COIN:
        this.quantity = Math.ceil(Math.random() * 100 * (1 + this.floorFoundOn));
        model = "Assets/objs/coins/Untitled.obj";
        diffuse = "Assets/objs/coins/Bag_LP_Albedo.tga.png";
        specular = "Assets/objs/coins/Bag_LP_Specular.tga.png";
        break;
      case ItemType.WEAPON:
        model = "Assets/objs/sword/Untitled.obj";
        diffuse = "Assets/objs/sword/Moonbrand_Mat_baseColor.jpeg";
        specular = "Assets/objs/sword/Moonbrand_Mat_metallicRoughness.png";
        break;
      case ItemType.SKULL:
        model = "Assets/objs/skull/Untitled.obj";
        diffuse = "CSS:rgba(192, 184, 156, 1)";
        specular = "CSS:rgb(10, 10, 10)";
        break;
      case ItemType.SCEPTER:
        model = "Assets/objs/scepter/Untitled.obj";
        diffuse = "CSS:rgba(177, 121, 0, 1)";
         specular = "CSS:rgb(255, 255, 255)";
        break;
    }

    this.physicsObject = this.physicsScene.addNewPhysicsObject();
    this.physicsObject.mass = 0.3;
    this.physicsObject.frictionCoefficient = 1.0;
    this.physicsObject.isStatic = true;

    this.scene
      .addNewMesh(
        model,
        diffuse,
        specular
      )
      .then((bundle: AnimatedGraphicsBundle) => {
        this.graphicsBundle = bundle;
        this.graphicsBundle.transform.position = this.startPosition;

        this.graphicsBundle.transform.scale = vec3.fromValues(scale, scale, scale);

        // Add random rotation around Y-axis (0-360 degrees)
        const randomYRotationRadians = Math.random() * Math.PI * 2;
        quat.rotateY(
          this.graphicsBundle.transform.rotation,
          this.graphicsBundle.transform.rotation,
          randomYRotationRadians
        );

        this.physicsObject.boundingBox.setMinAndMaxVectors(vec3.fromValues(-0.5 * 1.0/scale, -0.5 * 1.0/scale, -0.5 * 1.0/scale), vec3.fromValues(0.5 * 1.0/scale, 0.5 * 1.0/scale, 0.5 * 1.0/scale));

        this.graphicsBundle.transform.position[1] -=
          this.graphicsBundle.getMinAndMaxPositions().min[1];
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
