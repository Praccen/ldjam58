import Item, { ItemType, Curse, CurseType } from "../Objects/Item";
import {
  PhysicsObject,
  PhysicsScene,
  Scene,
  vec3,
  Ray,
} from "praccen-web-engine";
import Inventory from "./Inventory";
import PlayerController from "../Objects/PlayerController";

export default class ItemHandler {
  private items = new Map<number, Item>();

  private scene: Scene;
  private physicsScene: PhysicsScene;
  private inventory: Inventory;
  private player: PlayerController;

  constructor(scene: Scene, physicsScene: PhysicsScene, inventory: Inventory) {
    this.scene = scene;
    this.physicsScene = physicsScene;
    this.inventory = inventory;
  }

  setPlayer(player: PlayerController) {
    this.player = player;
  }

  //TODO spawn random item
  spawnItem(position: vec3) {
    const item = new Item(
      this.scene,
      this.physicsScene,
      position,
      ItemType.COIN,
      "Old Coin",
      "legendary",
      "A rusty old coin",
      {
        name: "Curse of SPEED",
        description: "",
        type: CurseType.SPEED,
        severity: "critical",
      }
    );
    this.items.set(item.getPhysicsObject().physicsObjectId, item);
  }

  getSeverityModifier(severity?: "minor" | "major" | "critical"): number {
    switch (severity) {
      case "minor":
        return Math.floor(Math.random() * 3) + 1; // Random: 1-3
      case "major":
        return Math.floor(Math.random() * 4) + 3; // Random: 3-6
      case "critical":
        return Math.floor(Math.random() * 6) + 5; // Random: 5-10
      default:
        return Math.floor(Math.random() * 3) + 1; // Default: 1-3
    }
  }

  triggerCurse(curse: Curse) {
    const severity = this.getSeverityModifier(curse.severity);
    switch (curse.type) {
      // case CurseType.LUCK:
      //   break;
      case CurseType.PROTECTIONCHARMS:
        switch (curse.severity) {
          case "minor":
            this.player.setProtectionCharms(
              this.player.getProtectionCharms() - 1
            );
            break;
          case "major":
            this.player.setProtectionCharms(
              this.player.getProtectionCharms() - 2
            );
            break;
          case "critical":
            this.player.setProtectionCharms(
              this.player.getProtectionCharms() - 3
            );
            break;
        }
        break;
      case CurseType.SPEED:
        this.player.setSpeed(this.player.getSpeed() - severity / 100.0);
        break;
      case CurseType.TORCH:
        this.player.setTorch(this.player.getTorch() - severity / 100.0);
        break;
      case CurseType.SIGHT:
        this.player.setSight(this.player.getSight() - severity / 50.0);
        break;
      // case CurseType.HAUNTEDCOUNT:
      //   break;
      // case CurseType.SANITY:
      //   break;
      // case CurseType.VERTIGO:
      //   break;
      // case CurseType.HYPER:
      //   break;
      case CurseType.JUMPY:
        this.player.setJumpy(false);
        break;
      // case CurseType.FIRECURSED:
      //   break;
      case CurseType.CANEXTRACT:
        this.player.setCanExtract(false);
        break;
    }
  }

  pickupItem(ray: Ray, player: PhysicsObject) {
    let hit = this.physicsScene.doRayCast(ray, false, [player], 2);
    if (hit.distance != Infinity) {
      const item = this.items.get(hit.object.physicsObjectId);
      if (item) {
        this.inventory.addItem(item);
        this.inventory.addCurse(item.curse);
        this.triggerCurse(item.curse);
        item.destroy();
        this.items.delete(hit.object.physicsObjectId);
      }
    }
  }
}
