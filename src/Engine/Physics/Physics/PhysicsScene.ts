import { mat4, vec3 } from "../../../Engine";
import Tree, {
  TreeNode,
  TreeNodeContentElement,
} from "../../Shared/Trees/Tree";
import Transform from "../../Shared/Transform";
import { CollisionSolver } from "./CollisionSolver";
import { IntersectionTester } from "./IntersectionTester";
import PhysicsObject from "./Objects/PhysicsObject";
import Ray from "./Shapes/Ray";
import Shape from "./Shapes/Shape";

export class TreePhysicsContentElement extends TreeNodeContentElement {
  physicsObject: PhysicsObject;
  constructor(physicsObject: PhysicsObject) {
    super(physicsObject.boundingBox);
    this.physicsObject = physicsObject;
  }
}

export default class PhysicsScene {
  gravity: vec3;

  physicsObjects: Array<PhysicsObject>;
  tree: Tree;

  constructor() {
    this.gravity = vec3.fromValues(0.0, -9.8, 0.0);
    this.physicsObjects = new Array<PhysicsObject>();
    this.tree = new Tree(
      new TreeNode(200, vec3.fromValues(0, 0, 0), 40, 50, [true, false, true])
    );
  }

  /**
   * Will add a physics object to the PhysicsScene. Will create a new object if none is passed as a parameter.
   * @param physicsObject Optional: Already existing physics object, maybe from another physics scene
   * @returns the physics object
   */
  addNewPhysicsObject(
    transform?: Transform,
    physicsObject?: PhysicsObject
  ): PhysicsObject {
    let length = -1;
    if (physicsObject != undefined) {
      length = this.physicsObjects.push(physicsObject);
    } else {
      length = this.physicsObjects.push(new PhysicsObject(transform));
    }

    const treeContent = new TreePhysicsContentElement(
      this.physicsObjects[length - 1]
    );
    this.tree.addContent(treeContent);

    return this.physicsObjects[length - 1];
  }

  removePhysicsObject(physicsObject: PhysicsObject) {
    this.tree.removeContent((value: TreePhysicsContentElement) => {
      return (
        physicsObject.physicsObjectId == value.physicsObject.physicsObjectId
      );
    });

    this.physicsObjects = this.physicsObjects.filter((o) => {
      return physicsObject.physicsObjectId !== o.physicsObjectId;
    });
  }

  doRayCast(
    ray: Ray,
    ignoreNonCollidableObjects = false,
    ignoreObjectsList: PhysicsObject[] = [],
    maxDistance: number = Infinity
  ): { distance: number; object: PhysicsObject } {
    let treeContentToTestAgainst = new Array<TreePhysicsContentElement>();
    this.tree.getContentForRayCast(ray, treeContentToTestAgainst, maxDistance);

    let closestHit = Infinity;
    let closestObj: PhysicsObject = null;

    for (let treeContent of treeContentToTestAgainst) {
      if (
        ignoreObjectsList.find((value) => {
          return (
            value.physicsObjectId == treeContent.physicsObject.physicsObjectId
          );
        }) != undefined
      ) {
        continue;
      }

      if (ignoreNonCollidableObjects && !treeContent.physicsObject.isCollidable) {
        continue;
      }

      let hit = IntersectionTester.doRayCast(
        ray,
        [treeContent.physicsObject.boundingBox],
        Math.min(maxDistance, closestHit)
      );
      if (closestHit > hit) {
        if (treeContent.physicsObject.internalTree != undefined) {
          // TODO: Doesn't work, fix

          // set inverse matrix for ray
          ray.setInverseMatrix(mat4.invert(mat4.create(), treeContent.physicsObject.transform.matrix));

          // get the shapes in the internal tree that intersects with the ray
          let internalTreeContentToTestAgainst = new Array<TreePhysicsContentElement>();
          treeContent.physicsObject.internalTree.getContentForRayCast(ray, internalTreeContentToTestAgainst, Math.min(maxDistance, closestHit));

          hit = IntersectionTester.doRayCast(
            ray,
            internalTreeContentToTestAgainst.map((value) => {return value.shape}),
            Math.min(maxDistance, closestHit)
          );

          // reset the inverse matrix for the ray
          ray.setInverseMatrix(mat4.create());
          
        }

        if (closestHit > hit) {
          closestHit = hit;
          closestObj = treeContent.physicsObject;
        }
      }
    }

    return { distance: closestHit, object: closestObj };
  }

  update(
    dt: number,
    updateStaticObjects: boolean = false,
    calculatePhysics: boolean = true
  ) {
    // Update all bounding boxes
    for (let physicsObject of this.physicsObjects) {
      physicsObject.collisionsLastUpdate.clear();
      if (!physicsObject.isStatic || updateStaticObjects) {
        physicsObject.transform.calculateMatrices();
        physicsObject.boundingBox.setUpdateNeeded();
        physicsObject.onGround = false; // Also mark them as in the air until a potential collision will set them as on ground
      }
    }

    this.tree.recalculate();
    this.tree.prune();

    if (!calculatePhysics) {
      return;
    }

    for (let i = 0; i < this.physicsObjects.length; i++) {
      let physicsObject = this.physicsObjects[i];
      if (physicsObject.isStatic) {
        continue;
      }
      const oldVelocity = vec3.clone(physicsObject.velocity);

      if (!physicsObject.isImmovable && physicsObject.checksForCollisions) {
        // Calculate collisions with other objects
        let otherObjects = new Array<TreePhysicsContentElement>();
        this.tree.getContentFromIntersection(
          [physicsObject.boundingBox],
          otherObjects
        );

        for (let otherObject of otherObjects) {
          if (
            physicsObject.physicsObjectId ==
            otherObject.physicsObject.physicsObjectId
          ) {
            continue; // Don't collide with self.
          }

          // Continue if the objects bounding boxes doesn't intersect
          if (
            !IntersectionTester.identifyIntersection(
              [physicsObject.boundingBox],
              [otherObject.physicsObject.boundingBox]
            )
          ) {
            continue;
          }

          // The bounding boxes are intersecting
          let physicsObjectTestShapes: Array<TreeNodeContentElement> = [
            new TreeNodeContentElement(physicsObject.boundingBox),
          ];
          let otherObjectTestShapes: Array<TreeNodeContentElement> = [
            new TreeNodeContentElement(otherObject.physicsObject.boundingBox),
          ];

          if (physicsObject.internalTree != undefined) {
            physicsObjectTestShapes.length = 0;

            // set inverse matrix for otherObject.physicsObject.boundingBox to the one of physicsObject
            otherObject.physicsObject.boundingBox.setInverseMatrix(mat4.invert(mat4.create(), physicsObject.transform.matrix));

            // get the shapes in the tree that intersects with the bounding box of otherObject
            physicsObject.internalTree.getContentFromIntersection([otherObject.physicsObject.boundingBox], physicsObjectTestShapes);
            // physicsObject.internalTree.getAllContent(physicsObjectTestShapes);

            for (let internalTreeNode of physicsObjectTestShapes) {
              internalTreeNode.shape.setTransformMatrix(physicsObject.transform.matrix);
            }

            // reset the inverse matrix for the otherObject bounding box
            otherObject.physicsObject.boundingBox.setInverseMatrix(mat4.create());
          }

          if (otherObject.physicsObject.internalTree != undefined) {
            otherObjectTestShapes.length = 0;

            // set inverse matrix for physicsObject.boundingBox to the one of otherObject
            physicsObject.boundingBox.setInverseMatrix(mat4.invert(mat4.create(), otherObject.physicsObject.transform.matrix));

            // get the shapes in the tree that intersects with the bounding box of physicsObject
            otherObject.physicsObject.internalTree.getContentFromIntersection([physicsObject.boundingBox], otherObjectTestShapes);
            // otherObject.physicsObject.internalTree.getAllContent(otherObjectTestShapes);

            for (let internalTreeNode of otherObjectTestShapes) {
              internalTreeNode.shape.setTransformMatrix(otherObject.physicsObject.transform.matrix);
            }

            // reset the inverse matrix for the physicsObject bounding box
            physicsObject.boundingBox.setInverseMatrix(mat4.create());
          }

          let inf = new Array<IntersectionTester.IntersectionInformation>();
          IntersectionTester.identifyIntersectionInformation(
            physicsObjectTestShapes.map((value) => {
              return value.shape;
            }),
            otherObjectTestShapes.map((value) => {
              return value.shape;
            }),
            inf
          );

          if (physicsObject.internalTree != undefined) {
            for (let shape of physicsObjectTestShapes) {
              shape.shape.setTransformMatrix(mat4.create());
            }
          }

          if (otherObject.physicsObject.internalTree != undefined) {
            for (let shape of otherObjectTestShapes) {
              shape.shape.setTransformMatrix(mat4.create());
            }
          }

          if (inf.length > 0) {
            // Keep track of which collisions happened
            physicsObject.collisionsLastUpdate.add(
              otherObject.physicsObject.physicsObjectId
            );
            otherObject.physicsObject.collisionsLastUpdate.add(
              physicsObject.physicsObjectId
            );

            if (
              !physicsObject.isCollidable ||
              !otherObject.physicsObject.isCollidable
            ) {
              continue;
            }
            CollisionSolver.handleCollision(
              inf,
              physicsObject,
              otherObject.physicsObject
            );
          }
        }
      }

      if (!physicsObject.isStatic) {
        // Calculate new velocity based on gravity, forces and impulses
        if (!physicsObject.ignoreGravity) {
          vec3.scaleAndAdd(
            physicsObject.velocity,
            physicsObject.velocity,
            this.gravity,
            dt
          );
        }
        vec3.scaleAndAdd(
          physicsObject.velocity,
          physicsObject.velocity,
          physicsObject.force,
          dt / physicsObject.mass
        );
        vec3.scaleAndAdd(
          physicsObject.velocity,
          physicsObject.velocity,
          physicsObject.impulse,
          1.0 / physicsObject.mass
        );
        vec3.scaleAndAdd(
          physicsObject.velocity,
          physicsObject.velocity,
          physicsObject.velocity,
          -1.0 * physicsObject.drag * dt
        );

        vec3.zero(physicsObject.force);
        vec3.zero(physicsObject.impulse);

        let translation = vec3.scale(
          vec3.create(),
          vec3.add(vec3.create(), oldVelocity, physicsObject.velocity),
          0.5 * dt
        );
        if (vec3.len(translation) > 0.001) {
          physicsObject.transform.translate(translation);
          physicsObject.transform.calculateMatrices();
        }
      }
    }
  }
}
