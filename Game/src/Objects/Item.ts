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

export default class Item {
    private scene: Scene;
    private physicsScene: PhysicsScene;
    private physicsObject: PhysicsObject;
    private name: string;
    private type: ItemType;
    private graphicsBundle: GraphicsBundle;
    startPosition: vec3;

    constructor(
        scene: Scene,
        physicsScene: PhysicsScene,
        spawnPosition: vec3,
        type: ItemType,
        name: string
    ) {
        this.scene = scene;
        this.physicsScene = physicsScene;
        this.startPosition = vec3.clone(spawnPosition);
        this.type = type;
        this.name = name;

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
