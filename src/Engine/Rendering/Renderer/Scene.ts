import DirectionalLight from "../Objects/Lighting/DirectionalLight";
import PointLight from "../Objects/Lighting/PointLight";
import GraphicsBundle from "../Objects/Bundles/GraphicsBundle";
import ShaderProgram from "./ShaderPrograms/ShaderProgram";
import ParticleSpawner from "../Objects/InstancedGraphicsObjects/ParticleSpawner";
import { pointLightsToAllocate } from "./RendererBase";
import RendererBase from "./RendererBase";
import AnimatedGraphicsBundle from "../Objects/Bundles/AnimatedGraphicsBundle";
import Tree, {
  TreeNode,
  TreeNodeContentElement,
} from "../../Shared/Trees/Tree";
import OBB from "../../Physics/Physics/Shapes/OBB";
import { vec3 } from "gl-matrix";
import Shape from "../../Physics/Physics/Shapes/Shape";
import { IntersectionTester } from "../../Physics/Physics/IntersectionTester";
import ShapeGraphicsObject from "../Objects/GraphicsObjects/ShapeGraphicsObject";
import Heightmap from "../Objects/GraphicsObjects/Heightmap";
import Transform from "../../Shared/Transform";

export class TreeSceneContentElement extends TreeNodeContentElement {
  graphicsBundle: GraphicsBundle;
  constructor(graphicsBundle: GraphicsBundle) {
    let obb = new OBB();
    obb.setMinAndMaxVectors(
      graphicsBundle.getMinAndMaxPositions().min,
      graphicsBundle.getMinAndMaxPositions().max
    );
    obb.setTransformMatrix(graphicsBundle.transform.matrix);
    super(obb);
    this.graphicsBundle = graphicsBundle;
  }
}

export class InstancedTreeSceneContentElement extends TreeNodeContentElement {
  graphicsBundle: GraphicsBundle;
  transform: Transform;
  constructor(graphicsBundle: GraphicsBundle, transform: Transform) {
    let obb = new OBB();
    obb.setMinAndMaxVectors(
      graphicsBundle.getMinAndMaxPositions().min,
      graphicsBundle.getMinAndMaxPositions().max
    );
    obb.setTransformMatrix(transform.matrix);
    super(obb);
    this.graphicsBundle = graphicsBundle;
    this.transform = transform;
  }
}

export default class Scene {
  renderer: RendererBase;

  // ---- Graphics objects ----
  private graphicBundles: Array<GraphicsBundle>;
  private graphicBundlesInstanced: Array<GraphicsBundle>;
  private graphicBundlesAnimated: Array<AnimatedGraphicsBundle>;
  private shapeGraphicsObjects: Array<ShapeGraphicsObject>;
  particleSpawners: Array<ParticleSpawner>;
  // --------------------------

  // ---- Lights ----
  directionalLight: DirectionalLight;
  pointLights: Array<PointLight>;
  private deactivatedPointLights: Array<PointLight> = [];
  // ----------------

  stillTree: Tree;
  instancedTree: Tree;
  animatedTree: Tree;

  private firstUpdate: boolean = true;

  constructor(renderer: RendererBase) {
    this.renderer = renderer;

    // ---- Graphics objects ----
    this.graphicBundles = new Array<GraphicsBundle>();
    this.graphicBundlesInstanced = new Array<GraphicsBundle>();
    this.graphicBundlesAnimated = new Array<AnimatedGraphicsBundle>();
    this.shapeGraphicsObjects = new Array<ShapeGraphicsObject>();
    this.particleSpawners = new Array<ParticleSpawner>();
    // --------------------------

    // ---- Lighting ----
    this.directionalLight = new DirectionalLight();
    this.pointLights = new Array<PointLight>();
    // ------------------

    this.stillTree = new Tree(
      new TreeNode(200, vec3.fromValues(0, 0, 0), 100, 200, [true, false, true])
    );
    this.instancedTree = new Tree(
      new TreeNode(200, vec3.fromValues(0, 0, 0), 100, 200, [true, false, true])
    );
    this.animatedTree = new Tree(
      new TreeNode(200, vec3.fromValues(0, 0, 0), 100, 200, [true, false, true])
    );
  }

  async addNewMesh(
    meshPath: string,
    diffusePath: string,
    specularPath: string,
    displayShape: boolean = false
  ): Promise<GraphicsBundle> {
    return this.renderer.meshStore.getMesh(meshPath).then((mesh) => {
      const index =
        this.graphicBundles.push(
          new GraphicsBundle(
            this.renderer.gl,
            this.renderer.textureStore.getTexture(diffusePath),
            this.renderer.textureStore.getTexture(specularPath),
            mesh
          )
        ) - 1;
      const treeEntry = new TreeSceneContentElement(this.graphicBundles[index]);
      this.stillTree.addContent(treeEntry);
      if (displayShape) {
        this.addNewShape(treeEntry.shape);
      }
      return this.graphicBundles[index];
    });
  }

  async addNewHeightmap(
    heightmapPath: string,
    diffusePath: string,
    specularPath: string,
    displayShape: boolean = false
  ): Promise<GraphicsBundle> {
    return this.renderer.meshStore.getHeightmap(heightmapPath).then((mesh) => {
      const index =
        this.graphicBundles.push(
          new GraphicsBundle(
            this.renderer.gl,
            this.renderer.textureStore.getTexture(diffusePath),
            this.renderer.textureStore.getTexture(specularPath),
            mesh
          )
        ) - 1;
      const treeEntry = new TreeSceneContentElement(this.graphicBundles[index]);
      this.stillTree.addContent(treeEntry);
      if (displayShape) {
        this.addNewShape(treeEntry.shape);
      }
      return this.graphicBundles[index];
    });
  }

  addNewFlatHeightmap(
    xResolution: number,
    zResolution: number,
    xQuadSize: number,
    zQuadSize: number,
    diffusePath: string,
    specularPath: string,
    displayShape: boolean = false
  ): GraphicsBundle {
    let heightmapMesh = new Heightmap(this.renderer.gl);
    const index =
      this.graphicBundles.push(
        new GraphicsBundle(
          this.renderer.gl,
          this.renderer.textureStore.getTexture(diffusePath),
          this.renderer.textureStore.getTexture(specularPath),
          heightmapMesh
        )
      ) - 1;
    heightmapMesh.createPlane(xResolution, zResolution, xQuadSize, zQuadSize);
    this.graphicBundles[index].updateMinAndMaxPositions();
    const treeEntry = new TreeSceneContentElement(this.graphicBundles[index]);
    this.stillTree.addContent(treeEntry);
    if (displayShape) {
      this.addNewShape(treeEntry.shape);
    }
    return this.graphicBundles[index];
  }

  async addNewInstancedMesh(
    meshPath: string,
    diffusePath: string,
    specularPath: string
  ): Promise<GraphicsBundle> {
    return this.renderer.meshStore.getMesh(meshPath).then((mesh) => {
      const index =
        this.graphicBundlesInstanced.push(
          new GraphicsBundle(
            this.renderer.gl,
            this.renderer.textureStore.getTexture(diffusePath),
            this.renderer.textureStore.getTexture(specularPath),
            mesh,
            null,
            true
          )
        ) - 1;
      return this.graphicBundlesInstanced[index];
    });
  }

  addNewInstanceOfInstancedMesh(instancedMesh: GraphicsBundle): Transform {
    const index = instancedMesh.instancedTransforms.push(new Transform()) - 1;
    this.instancedTree.addContent(
      new InstancedTreeSceneContentElement(
        instancedMesh,
        instancedMesh.instancedTransforms[index]
      )
    );

    return instancedMesh.instancedTransforms[index];
  }

  async addNewAnimatedMesh(
    meshPath: string,
    diffusePath: string,
    specularPath: string,
    useColoursFromGltfFileIfExists: boolean = true
  ): Promise<AnimatedGraphicsBundle> {
    return this.renderer.meshStore.getAmimatedMesh(meshPath).then((mesh) => {
      const index =
        this.graphicBundlesAnimated.push(
          new AnimatedGraphicsBundle(
            this.renderer.gl,
            this.renderer.textureStore.getTexture(diffusePath),
            this.renderer.textureStore.getTexture(specularPath),
            mesh
          )
        ) - 1;

      if (mesh.diffuseTextures != undefined && useColoursFromGltfFileIfExists) {
        this.graphicBundlesAnimated[index].diffuseTextures =
          mesh.diffuseTextures;
      }

      const treeEntry = new TreeSceneContentElement(
        this.graphicBundlesAnimated[index]
      );
      this.animatedTree.addContent(treeEntry);
      // this.addNewShape(treeEntry.shape);
      return this.graphicBundlesAnimated[index];
    });
  }

  addNewParticleSpawner(
    texturePath: string,
    numberOfStartingParticles: number = 0
  ): ParticleSpawner {
    let length = this.particleSpawners.push(
      new ParticleSpawner(
        this.renderer.gl,
        this.renderer.textureStore.getTexture(texturePath),
        numberOfStartingParticles
      )
    );
    return this.particleSpawners[length - 1];
  }

  addNewPointLight(): PointLight {
    if (this.deactivatedPointLights.length > 0) {
      const length = this.pointLights.push(this.deactivatedPointLights.pop());
      return this.pointLights[length - 1];
    }

    const length = this.pointLights.push(new PointLight(this.renderer.gl));
    return this.pointLights[length - 1];
  }

  addNewShape(shape: Shape): ShapeGraphicsObject {
    let index =
      this.shapeGraphicsObjects.push(
        new ShapeGraphicsObject(this.renderer.gl, shape)
      ) - 1;
    this.shapeGraphicsObjects[index];

    return this.shapeGraphicsObjects[index];
  }

  getDirectionalLight(): DirectionalLight {
    return this.directionalLight;
  }

  deleteGraphicsBundle(bundle: GraphicsBundle) {
    this.stillTree.removeContent((value: TreeSceneContentElement) => {
      return value.graphicsBundle == bundle;
    });
    this.graphicBundles = this.graphicBundles.filter((value) => {
      return bundle !== value;
    });
  }

  deleteInstanceOfInstancedMesh(bundle: GraphicsBundle, transform: Transform) {
    // TODO
  }

  deleteAnimatedGraphicsBundle(bundle: AnimatedGraphicsBundle) {
    this.animatedTree.removeContent((value: TreeSceneContentElement) => {
      return value.graphicsBundle == bundle;
    });
    this.graphicBundlesAnimated = this.graphicBundlesAnimated.filter(
      (value) => {
        return bundle !== value;
      }
    );
  }

  deletePointLight(light: PointLight) {
    const index = this.pointLights.findIndex((l) => light == l);
    if (index > 0) {
      this.deactivatedPointLights.push(this.pointLights.splice(index, 1)[0]);
    }
  }

  deleteShape(shape: Shape) {
    this.shapeGraphicsObjects = this.shapeGraphicsObjects.filter((value) => {
      return value.shape != shape;
    });
  }

  deleteParticleSpawner(particleSpawner: ParticleSpawner) {
    this.particleSpawners = this.particleSpawners.filter((value) => {
      return value != particleSpawner;
    });
  }

  calculateAllTransforms() {
    for (const bundle of this.graphicBundles) {
      bundle.transform.calculateMatrices();
    }
    for (const bundle of this.graphicBundlesAnimated) {
      bundle.transform.calculateMatrices();
    }
  }

  updateParticleSpawners(dt: number) {
    for (let i = 0; i < this.particleSpawners.length; i++) {
      if (!this.particleSpawners[i].update(dt)) {
        this.deleteParticleSpawner(this.particleSpawners[i]);
        i--;
      }
    }
  }

  updateTrees() {
    this.stillTree.recalculate((content: TreeSceneContentElement) => {
      (content.shape as OBB).setMinAndMaxVectors(
        content.graphicsBundle.getMinAndMaxPositions().min,
        content.graphicsBundle.getMinAndMaxPositions().max
      );
      content.shape.setTransformMatrix(content.graphicsBundle.transform.matrix);
    });
    this.stillTree.prune();

    this.instancedTree.recalculate(
      (content: InstancedTreeSceneContentElement) => {
        content.shape.setUpdateNeeded();
      }
    );
    this.instancedTree.prune();

    this.animatedTree.recalculate((content: TreeSceneContentElement) => {
      (content.shape as OBB).setMinAndMaxVectors(
        content.graphicsBundle.getMinAndMaxPositions().min,
        content.graphicsBundle.getMinAndMaxPositions().max
      );
      content.shape.setTransformMatrix(content.graphicsBundle.transform.matrix);
    });
    this.animatedTree.prune();
  }

  updateFrustumCulling(frustums: Shape[]) {
    for (const bundle of this.graphicBundles) {
      bundle.enabled = false;
    }
    const contentFromTree = new Array<TreeSceneContentElement>();
    this.stillTree.getContentFromIntersection(frustums, contentFromTree);
    for (const content of contentFromTree) {
      content.graphicsBundle.enabled = true;
    }

    for (const bundle of this.graphicBundlesAnimated) {
      bundle.enabled = false;
    }
    const animatedContentFromTree = new Array<TreeSceneContentElement>();
    this.animatedTree.getContentFromIntersection(
      frustums,
      animatedContentFromTree
    );

    for (const content of animatedContentFromTree) {
      content.graphicsBundle.enabled = true;
    }

    for (const bundle of this.graphicBundlesInstanced) {
      for (let transform of bundle.instancedTransforms) {
        transform.enabled = false;
      }
    }

    const instancedContentFromTree =
      new Array<InstancedTreeSceneContentElement>();
    this.instancedTree.getContentFromIntersection(
      frustums,
      instancedContentFromTree
    );

    for (const content of instancedContentFromTree) {
      let enable = true;
      for (const frustum of frustums) {
        if (
          !IntersectionTester.identifyIntersection([frustum], [content.shape])
        ) {
          enable = false;
          break;
        }
      }
      content.transform.enabled = enable;
    }

    for (const instancedBundle of this.graphicBundlesInstanced) {
      instancedBundle.updateInstanceBuffer();
    }
  }

  renderScene(
    shaderProgram: ShaderProgram,
    bindSpecialTextures: boolean = true
  ) {
    for (const bundle of this.graphicBundles) {
      bundle.draw(shaderProgram, bindSpecialTextures);
    }
  }

  renderSceneInstanced(
    shaderProgram: ShaderProgram,
    bindSpecialTextures: boolean = true
  ) {
    for (const bundle of this.graphicBundlesInstanced) {
      bundle.draw(shaderProgram, bindSpecialTextures);
    }
  }

  renderSceneAnimated(
    shaderProgram: ShaderProgram,
    bindSpecialTextures: boolean = true
  ) {
    for (const bundle of this.graphicBundlesAnimated) {
      bundle.draw(shaderProgram, bindSpecialTextures);
    }
  }

  /**
   * This is mostly for Renderer2D and isn't up to date with fancy things like trees etc.
   */
  renderSceneInLayerOrder(
    shaderProgram: ShaderProgram,
    bindSpecialTextures: boolean = true
  ) {
    let layer = -1;
    let layersLeft = true;

    while (layersLeft) {
      let previousLayer = layer;
      for (const bundle of this.graphicBundles) {
        if (bundle.layer > previousLayer) {
          if (layer == previousLayer || bundle.layer < layer) {
            layer = bundle.layer;
          }
        }
      }

      if (previousLayer == layer) {
        layersLeft = false;
      } else {
        for (let bundle of this.graphicBundles) {
          if (bundle.layer == layer) {
            bundle.draw(shaderProgram, bindSpecialTextures);
          }
        }
      }
    }
  }

  renderCullingShapes(shaderProgram: ShaderProgram) {
    const contentFromTree = new Array<TreeSceneContentElement>();
    this.stillTree.getAllContent(contentFromTree);
    for (const content of contentFromTree) {
      if (content.graphicsBundle.enabled) {
        new ShapeGraphicsObject(this.renderer.gl, content.shape).draw(
          shaderProgram
        );
      }
    }

    const animatedContentFromTree = new Array<TreeSceneContentElement>();
    this.animatedTree.getAllContent(animatedContentFromTree);

    for (const content of animatedContentFromTree) {
      if (content.graphicsBundle.enabled) {
        new ShapeGraphicsObject(this.renderer.gl, content.shape).draw(
          shaderProgram
        );
      }
    }

    const instancedContentFromTree =
      new Array<InstancedTreeSceneContentElement>();
    this.instancedTree.getAllContent(instancedContentFromTree);

    for (const content of instancedContentFromTree) {
      if (content.transform.enabled) {
        new ShapeGraphicsObject(this.renderer.gl, content.shape).draw(
          shaderProgram
        );
      }
    }
  }

  renderShapes(shaderProgram: ShaderProgram) {
    for (const shapeObject of this.shapeGraphicsObjects) {
      shapeObject.draw(shaderProgram);
    }
  }

  hasShapes(): boolean {
    return this.shapeGraphicsObjects.length > 0;
  }
}
