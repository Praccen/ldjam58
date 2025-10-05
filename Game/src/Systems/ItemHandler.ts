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
  private inventory: Inventory;
  private player: PlayerController;

  constructor(scene: Scene, inventory: Inventory) {
    this.scene = scene;
    this.inventory = inventory;
  }

  setPlayer(player: PlayerController) {
    this.player = player;
  }

  private getRandomItemType(): ItemType {
    const types = [
      ItemType.GRAIL,
      ItemType.RING,
      ItemType.COIN,
      ItemType.WEAPON,
      ItemType.SKULL,
      ItemType.SCEPTER,
    ];
    return types[Math.floor(Math.random() * types.length)];
  }

  private getRandomCurseType(floor: number): CurseType {
    // Common curses available at all floors
    const commonCurses = [
      CurseType.SPEED,
      CurseType.TORCH,
      CurseType.SIGHT,
      CurseType.HAUNT,
    ];

    // Rare devastating curses only available after floor 8
    const rareCurses = [
      CurseType.PROTECTIONCHARMS,
      CurseType.JUMPY,
      CurseType.CANEXTRACT,
    ];

    // After floor 8, 20% chance for a rare curse
    if (floor >= 8 && Math.random() < 0.2) {
      return rareCurses[Math.floor(Math.random() * rareCurses.length)];
    }

    return commonCurses[Math.floor(Math.random() * commonCurses.length)];
  }

  private getCurseNameFromType(type: CurseType): string {
    switch (type) {
      case CurseType.PROTECTIONCHARMS:
        return "Curse of Vulnerability";
      case CurseType.SPEED:
        return "Curse of Lethargy";
      case CurseType.TORCH:
        return "Curse of Darkness";
      case CurseType.SIGHT:
        return "Curse of Blindness";
      case CurseType.JUMPY:
        return "Curse of Weight";
      case CurseType.CANEXTRACT:
        return "Curse of Binding";
      case CurseType.HAUNT:
        return "Haunted";
      default:
        return "Unknown Curse";
    }
  }

  private getCurseDescription(
    type: CurseType,
    severity: "minor" | "major" | "critical"
  ): string {
    const severityText = "";
    // TODO Fix this so that it depends on the current severity of the curse
    // severity === "minor"
    //   ? "slightly"
    //   : severity === "major"
    //   ? "significantly"
    //   : "drastically";

    switch (type) {
      case CurseType.PROTECTIONCHARMS:
        return `Reduces your protection charms ${severityText}`;
      case CurseType.SPEED:
        return `Slows your movement ${severityText}`;
      case CurseType.TORCH:
        return `Dims your torch light ${severityText}`;
      case CurseType.SIGHT:
        return `Reduces your vision range ${severityText}`;
      case CurseType.JUMPY:
        return "Prevents you from jumping";
      case CurseType.CANEXTRACT:
        return "Prevents you from extracting artifacts";
      case CurseType.HAUNT:
        return "A vengeful spirit stalks you through the darkness.";
      default:
        return "Unknown effect";
    }
  }

  private getItemName(type: ItemType, rarity: string): string {
    const adjectives = {
      common: ["Old", "Worn", "Simple", "Plain"],
      rare: ["Ancient", "Ornate", "Gilded", "Engraved"],
      epic: ["Mystical", "Legendary", "Powerful", "Sacred"],
      legendary: ["Divine", "Otherworldly", "Celestial", "Mythical"],
    };

    const names = {
      [ItemType.GRAIL]: ["Chalice", "Cup", "Goblet", "Vessel"],
      [ItemType.RING]: ["Ring", "Band", "Circlet", "Loop"],
      [ItemType.COIN]: ["Coin", "Medallion", "Token", "Piece"],
      [ItemType.WEAPON]: ["Blade", "Dagger", "Sword", "Knife"],
      [ItemType.SKULL]: ["Skull", "Cranium", "Death Mask", "Relic"],
      [ItemType.SCEPTER]: ["Scepter", "Staff", "Rod", "Wand"],
    };

    const adj =
      adjectives[rarity][Math.floor(Math.random() * adjectives[rarity].length)];
    const name = names[type][Math.floor(Math.random() * names[type].length)];
    return `${adj} ${name}`;
  }

  private getRarityForFloor(
    floor: number
  ): "common" | "rare" | "epic" | "legendary" {
    // Deeper floors have better items, but legendaries are very rare
    const roll = Math.random() * 100;

    // Floor 1-3: Mostly common, some rare
    if (floor <= 3) {
      if (roll < 70) return "common";
      if (roll < 95) return "rare";
      return "epic"; // No legendaries
    }

    // Floor 4-6: Less common, more rare, some epic
    if (floor <= 6) {
      if (roll < 50) return "common";
      if (roll < 85) return "rare";
      if (roll < 98) return "epic";
      return "legendary"; // Very rare
    }

    // Floor 7-9: Balanced distribution
    if (floor <= 9) {
      if (roll < 35) return "common";
      if (roll < 70) return "rare";
      if (roll < 93) return "epic";
      return "legendary"; // Still rare
    }

    // Floor 10+: Better items, but legendary still rare
    if (roll < 20) return "common";
    if (roll < 55) return "rare";
    if (roll < 88) return "epic";
    return "legendary"; // 12% chance
  }

  private getSeverityForFloor(floor: number): "minor" | "major" | "critical" {
    // Deeper floors have more dangerous curses
    const roll = Math.random() * 100;
    const floorBonus = Math.min(floor * 5, 40); // Max 40% bonus at floor 8

    if (roll < 60 - floorBonus) return "minor";
    if (roll < 90 - floorBonus) return "major";
    return "critical";
  }

  spawnItemsForFloor(
    accessibleRooms: { x: number; y: number; z: number }[],
    floor: number,
    physicsScene: PhysicsScene
  ) {
    // Calculate number of items based on floor size
    // Approximately 1 item per 3-4 rooms, with some randomness
    const numRooms = accessibleRooms.length;
    const baseItemCount = Math.floor(numRooms / 6.5);
    const itemCount = Math.max(
      2,
      Math.min(15, baseItemCount + Math.floor(Math.random() * 3) - 1)
    );

    // Shuffle rooms to get random selection
    const shuffledRooms = [...accessibleRooms].sort(() => Math.random() - 0.5);

    for (let i = 0; i < Math.min(itemCount, shuffledRooms.length); i++) {
      const room = shuffledRooms[i];

      // Random position within the room (not too close to walls)
      const offsetX = (Math.random() - 0.5) * 9;
      const offsetZ = (Math.random() - 0.5) * 9;

      const position = vec3.fromValues(
        room.x + offsetX,
        room.y, // Slightly above ground
        room.z + offsetZ
      );

      this.spawnItem(position, floor, physicsScene);
    }
  }

  spawnItem(position: vec3, currentFloor: number, physicsScene: PhysicsScene) {
    const itemType = this.getRandomItemType();
    const curseType = this.getRandomCurseType(currentFloor);
    let rarity = this.getRarityForFloor(currentFloor);
    let severity = this.getSeverityForFloor(currentFloor);

    // Rare curses (PROTECTIONCHARMS, JUMPY, CANEXTRACT) are always legendary + critical
    const isRareCurse =
      curseType === CurseType.PROTECTIONCHARMS ||
      curseType === CurseType.JUMPY ||
      curseType === CurseType.CANEXTRACT;

    if (isRareCurse) {
      rarity = "legendary";
      severity = "critical";
    }

    const curse: Curse = {
      name: this.getCurseNameFromType(curseType),
      description: this.getCurseDescription(curseType, severity),
      type: curseType,
      severity: severity,
    };

    const item = new Item(
      this.scene,
      physicsScene,
      position,
      itemType,
      this.getItemName(itemType, rarity),
      rarity,
      `A ${rarity} artifact from the depths`,
      curse
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
      case CurseType.HAUNT:
        const roll = Math.random() * 100;
        // First time always spawn ghost
        // 20% risk of spawning new ghost
        // 80% risk of angering ghost
        if (this.player.getHauntedCount() == 0) {
          this.player.setHauntedCount(this.player.getHauntedCount() + 1);
        } else if (roll < 20) {
          this.player.setHauntedCount(this.player.getHauntedCount() + 1);
        } else {
          this.player.setHauntModifier(
            this.player.getHauntModifier() + severity / 100.0
          );
        }
        break;
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

  pickupItem(ray: Ray, player: PhysicsObject, physicsScene: PhysicsScene) {
    let hit = physicsScene.doRayCast(ray, false, [player], 2);
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
