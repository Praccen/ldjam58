import * as ENGINE from "praccen-web-engine";

export module Factories {
  export function createMesh(
    scene: ENGINE.Scene,
    meshPath: string,
    position: ENGINE.vec3,
    scale: ENGINE.vec3,
    diffuse: string,
    specular: string
  ): Promise<ENGINE.GraphicsBundle> {
    return new Promise<ENGINE.GraphicsBundle>((resolve, reject) => {
      scene.addNewMesh(meshPath, diffuse, specular).then((mesh) => {
        mesh.transform.translate(position);
        ENGINE.vec3.copy(mesh.transform.scale, scale);
        resolve(mesh);
      });
    });
  }

  export function createMeshWithPhysics(
    scene: ENGINE.Scene,
    meshPath: string,
    position: ENGINE.vec3,
    scale: ENGINE.vec3,
    diffuse: string,
    specular: string,
    physicsScene: ENGINE.PhysicsScene,
    frictionCoefficient: number
  ): Promise<{ gb: ENGINE.GraphicsBundle; po: ENGINE.PhysicsObject }> {
    return new Promise<{ gb: ENGINE.GraphicsBundle; po: ENGINE.PhysicsObject }>(
      (resolve, reject) => {
        createMesh(scene, meshPath, position, scale, diffuse, specular).then(
          (mesh) => {
            let meshPhysicsObj = physicsScene.addNewPhysicsObject(
              mesh.transform
            );
            meshPhysicsObj.isStatic = true;
            meshPhysicsObj.frictionCoefficient = frictionCoefficient;
            resolve({ gb: mesh, po: meshPhysicsObj });
          }
        );
      }
    );
  }

  export function createInstancedMesh(
    scene: ENGINE.Scene,
    meshPath: string,
    diffuse: string,
    specular: string
  ): Promise<ENGINE.GraphicsBundle> {
    return new Promise<ENGINE.GraphicsBundle>((resolve, reject) => {
      scene.addNewInstancedMesh(meshPath, diffuse, specular).then((mesh) => {
        resolve(mesh);
      });
    });
  }
}
