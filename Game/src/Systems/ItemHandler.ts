import Item, { ItemType } from "../Objects/Item";
import {
    PhysicsObject,
    PhysicsScene,
    Scene,
    vec3,
    Ray,
} from "praccen-web-engine";

export default class ItemHandler {
    private items = new Map<number, Item>();

    private scene: Scene;
    private physicsScene: PhysicsScene;
    constructor(scene: Scene, physicsScene: PhysicsScene) {
        this.scene = scene;
        this.physicsScene = physicsScene;
    }

    //TODO spawn random item
    spawnItem(position: vec3) {
        const item = new Item(
            this.scene,
            this.physicsScene,
            position,
            ItemType.GRAIL,
            "Test Grail"
        );
        this.items.set(item.getPhysicsObject().physicsObjectId, item);
    }

    pickupItem(ray: Ray, player: PhysicsObject) {
        let hit = this.physicsScene.doRayCast(ray, false, [player], 2);
        if (hit.distance != Infinity) {
            const item = this.items.get(hit.object.physicsObjectId);
            if (item) {
                item.destroy();
                this.items.delete(hit.object.physicsObjectId);
            }
        }
    }
}
