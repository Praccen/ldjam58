import {
    GraphicsBundle,
    PhysicsObject,
    PhysicsScene,
    Scene,
    vec3,
    quat,
} from "praccen-web-engine";
import { roomHeight } from "../Generators/Map/ProceduralMapGenerator";

export interface Ghost {
    physicsObject: PhysicsObject;
    graphicsBundle: GraphicsBundle;
}

export default class GhostManager {
    private scene: Scene = null;
    private physicsScene: PhysicsScene = null;
    private ghosts: Ghost[] = new Array<Ghost>();
    private anger: number = 0;

    constructor(scene: Scene, physicsScene: PhysicsScene) {
        this.scene = scene;
        this.physicsScene = physicsScene;
    }

    private getFloorFromYPosition(yPos: number): number {
        return Math.max(0, Math.ceil(-(yPos + 0.1) / roomHeight));
    }

    addGhost(spawn: vec3) {
        //TODO set spawnPositon to a position on the same floor but outside the map somewhere
        let spawnPosition: vec3 = spawn;
        let physicsObject = this.physicsScene.addNewPhysicsObject();

        physicsObject.isImmovable = true;
        physicsObject.ignoreGravity = true;
        physicsObject.isCollidable = false;
        let graphicsBundle: GraphicsBundle;

        this.scene
            .addNewMesh(
                "Assets/objs/CharacterGhost.obj",
                "CSS:rgba(255,255,255,200)",
                "CSS:rgb(0, 0, 0)"
            )
            .then((bundle: GraphicsBundle) => {
                graphicsBundle = bundle;

                vec3.add(
                    spawnPosition,
                    spawnPosition,
                    vec3.fromValues(0.0, 0.4, 0.0)
                );

                graphicsBundle.transform.position = spawnPosition;
                graphicsBundle.transform.scale = vec3.fromValues(0.3, 0.3, 0.3);

                physicsObject.setupBoundingBoxFromGraphicsBundle(
                    graphicsBundle
                );

                graphicsBundle.transform.position[1] -=
                    graphicsBundle.getMinAndMaxPositions().min[1];
                physicsObject.transform = graphicsBundle.transform;
                physicsObject.boundingBox.setTransformMatrix(
                    graphicsBundle.transform.matrix
                );
            });

        this.ghosts.push({ physicsObject, graphicsBundle });
    }

    moveGhost(ghost: Ghost, playerPosition: vec3, dt: number) {
        if (!ghost.physicsObject) {
            return;
        }

        const ghostPos = ghost.physicsObject.transform.position;

        // Movement speed
        const ySpeed = 2.0; // Speed for Y movement
        const xzSpeed = 1.5; // Speed for XZ movement

        if (playerPosition[1] < ghostPos[1]) {
            // Move towards player's Y position
            const dy = playerPosition[1] - ghostPos[1];
            const yMovement = Math.sign(dy) * ySpeed * dt;
            const yDistance = Math.abs(dy);
            // Don't overshoot
            if (Math.abs(yMovement) > yDistance) {
                ghostPos[1] = playerPosition[1];
            } else {
                ghostPos[1] += yMovement;
            }
        } else {
            // Y position is close enough, now move in XZ plane
            const dx = playerPosition[0] - ghostPos[0];
            const dz = playerPosition[2] - ghostPos[2];
            const xzDistance = Math.sqrt(dx * dx + dz * dz);

            if (xzDistance > 0.1) {
                // Normalize direction and move
                const moveAmount = xzSpeed * dt;
                const normalizedDx = dx / xzDistance;
                const normalizedDz = dz / xzDistance;

                if (moveAmount > xzDistance) {
                    ghostPos[0] = playerPosition[0];
                    ghostPos[2] = playerPosition[2];
                } else {
                    ghostPos[0] += normalizedDx * moveAmount;
                    ghostPos[2] += normalizedDz * moveAmount;
                }
            }
        }

        // Rotate to face player
        const dx = playerPosition[0] - ghostPos[0];
        const dz = playerPosition[2] - ghostPos[2];
        const angle = Math.atan2(dx, dz);

        const rotationQuat = quat.create();
        quat.rotateY(rotationQuat, rotationQuat, angle);
        ghost.physicsObject.transform.rotation = rotationQuat;
    }

    update(dt: number, playerPosition: vec3) {
        this.ghosts.forEach((ghost) => {
            this.moveGhost(ghost, playerPosition, dt);
        });
    }
}
