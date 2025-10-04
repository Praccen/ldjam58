import Item, { ItemType, Curse } from "../Objects/Item";
import {
    PhysicsObject,
    PhysicsScene,
    Scene,
    vec3,
    Ray,
} from "praccen-web-engine";
import Inventory from "./Inventory";

export default class ItemHandler {
    private items = new Map<number, Item>();

    private scene: Scene;
    private physicsScene: PhysicsScene;
    private inventory: Inventory;

    constructor(
        scene: Scene,
        physicsScene: PhysicsScene,
        inventory: Inventory
    ) {
        this.scene = scene;
        this.physicsScene = physicsScene;
        this.inventory = inventory;
    }

    //TODO spawn random item
    spawnItem(position: vec3) {
        const item = new Item(
            this.scene,
            this.physicsScene,
            position,
            ItemType.GRAIL,
            "Test Grail",
            "legendary",
            "A really fancy grail",
            { name: "Curse of DEATH", description: "", severity: "minor" }
        );
        this.items.set(item.getPhysicsObject().physicsObjectId, item);
    }

    pickupItem(ray: Ray, player: PhysicsObject) {
        let hit = this.physicsScene.doRayCast(ray, false, [player], 2);
        if (hit.distance != Infinity) {
            const item = this.items.get(hit.object.physicsObjectId);
            if (item) {
                this.inventory.addItem(item);
                // TODO: Also apply curse modifiers to player
                this.inventory.addCurse(item.curse);
                item.destroy();
                this.items.delete(hit.object.physicsObjectId);
            }
        }
    }
}
