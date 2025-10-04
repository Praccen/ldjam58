import Framebuffer from "./Framebuffers/Framebuffer";
import Texture from "../AssetHandling/Textures/Texture";
import Camera from "../Objects/Camera";
import Scene from "./Scene";
import ScreenQuadPass from "./RenderPasses/ScreenQuadRenderPass";
import SkyboxRenderPass from "./RenderPasses/SkyboxRenderPass";
import GeometryRenderPass from "./RenderPasses/DefferedRendering/GeometryRenderPass";
import LightingRenderPass from "./RenderPasses/DefferedRendering/LightingRenderPass";
import DirectionalShadowRenderPass from "./RenderPasses/ShadowPasses/DirectionalShadowRenderPass";
import PointShadowRenderPass from "./RenderPasses/ShadowPasses/PointShadowRenderPass";
import VolumetricLightingPass from "./RenderPasses/Volumetric/VolumetricLightingPass";
import ParticleRenderPass from "./RenderPasses/Particles/ParticleRenderPass";
import ScreenQuadShaderProgram from "./ShaderPrograms/ScreenQuadShaderProgram";
import SkyboxShaderProgram from "./ShaderPrograms/Skybox/SkyboxShaderProgram";
import GeometryPassShaderProgram from "./ShaderPrograms/DeferredRendering/GeometryPassShaderProgram";
import GeometryPassInstancedShaderProgram from "./ShaderPrograms/DeferredRendering/GeometryPassInstancedShaderProgram";
import PointShadowShaderProgram from "./ShaderPrograms/ShadowMapping/PointShadowShaderProgram";
import PointShadowInstancedShaderProgram from "./ShaderPrograms/ShadowMapping/PointShadowInstancedShaderProgram";
import ParticleShaderProgram from "./ShaderPrograms/Particles/ParticleShaderProgram";
import VolumetricLightingShaderProgram from "./ShaderPrograms/Volumetric/VolumetricLightingShaderProgram";
import VolumetricCombineShaderProgram from "./ShaderPrograms/Volumetric/VolumetricCombineShaderProgram";
import DirectionalShadowShaderProgram from "./ShaderPrograms/ShadowMapping/DirectionalShadowShaderProgram";
import DirectionalShadowInstancedShaderProgram from "./ShaderPrograms/ShadowMapping/DirectionalShadowInstancedShaderProgram";
import LightingPassShaderProgram from "./ShaderPrograms/DeferredRendering/LightingPassShaderProgram";
import RendererBase from "./RendererBase";
import GeometryPassSkeletalAnimationShaderProgram from "./ShaderPrograms/DeferredRendering/GeometryPassSkeletalAnimationShaderProgram";
import DirectionalShadowSkeletalAnimationShaderProgram from "./ShaderPrograms/ShadowMapping/DirectionalShadowSkeletalAnimationShaderProgram";
import PointShadowSkeletalAnimationShaderProgram from "./ShaderPrograms/ShadowMapping/PointShadowSkeletalAnimationShaderProgram";
import Shape from "../../Physics/Physics/Shapes/Shape";
import ShapesShaderProgram from "./ShaderPrograms/Shapes/ShapesShaderProgram";
import ShapesRenderPass from "./RenderPasses/Shapes/ShapesRenderPass";
import BlurMaskShaderProgram from "./ShaderPrograms/PostProcessing/BlurMaskShaderProgram";
import ShaderProgram from "./ShaderPrograms/ShaderProgram";

export default class Renderer3D extends RendererBase {
  // ---- Multi use ----
  screenQuadShaderProgram: ScreenQuadShaderProgram;
  // -------------------

  // ---- Shadows ----
  directionalShadowShaderProgram: DirectionalShadowShaderProgram;
  directionalShaderInstancedShaderProgram: DirectionalShadowInstancedShaderProgram;
  directionalShadowSkeletalAnimationShaderProgram: DirectionalShadowSkeletalAnimationShaderProgram;
  private directionalShadowRenderPass: DirectionalShadowRenderPass;
  pointShadowShaderProgram: PointShadowShaderProgram;
  pointShadowInstancedShaderProgram: PointShadowInstancedShaderProgram;
  pointShadowSkeletalAnimationShaderProgram: PointShadowSkeletalAnimationShaderProgram;
  private pointShadowRenderPass: PointShadowRenderPass;
  // -----------------

  // ---- Deferred rendering ----
  geometryPassShaderProgram: GeometryPassShaderProgram;
  geometryPassInstancedShaderProgram: GeometryPassInstancedShaderProgram;

  geometryPassSkeletalAnimationShaderProgram: GeometryPassSkeletalAnimationShaderProgram;
  private geometryRenderPass: GeometryRenderPass;
  lightingPassShaderProgram: LightingPassShaderProgram;
  private lightingRenderPass: LightingRenderPass;
  // ----------------------------

  // ---- Skybox ----
  skyboxShaderProgram: SkyboxShaderProgram;
  private useSkybox: boolean;
  private skyboxRenderPass: SkyboxRenderPass;
  // ----------------

  // ---- Particles ----
  particleShaderProgram: ParticleShaderProgram;
  private particleRenderPass: ParticleRenderPass;
  // -------------------

  // ---- Blur mask ----
  private blurMaskFramebuffer: Framebuffer;
  private blurMaskRenderPass: ScreenQuadPass;
  // -------------------

  // ---- Volumetric God Rays ----
  volumetricLightingShaderProgram: VolumetricLightingShaderProgram;
  volumetricCombineShaderProgram: VolumetricCombineShaderProgram;
  useVolumetric: boolean;
  private volumetricLightingPass: VolumetricLightingPass;
  // -----------------------------

  // ---- Shapes ----
  showCullingShapes: boolean = false;
  shapesShaderProgram: ShapesShaderProgram;
  private shapesRenderPass: ShapesRenderPass;
  // ----------------

  // ---- Finished output ----
  private finishedFramebuffer: Framebuffer;
  private finishedOutputRenderPass: ScreenQuadPass;
  // -------------------------

  constructor() {
    super();

    // ---- Multi use ----
    this.screenQuadShaderProgram = new ScreenQuadShaderProgram(this.gl);
    // -------------------

    // ---- Shadows ----
    this.directionalShadowShaderProgram = new DirectionalShadowShaderProgram(
      this.gl
    );
    this.directionalShaderInstancedShaderProgram =
      new DirectionalShadowInstancedShaderProgram(this.gl);
    this.directionalShadowSkeletalAnimationShaderProgram =
      new DirectionalShadowSkeletalAnimationShaderProgram(this.gl);
    this.directionalShadowRenderPass = new DirectionalShadowRenderPass(
      this.gl,
      this.directionalShadowShaderProgram,
      this.directionalShaderInstancedShaderProgram,
      this.directionalShadowSkeletalAnimationShaderProgram
    );

    this.pointShadowShaderProgram = new PointShadowShaderProgram(this.gl);
    this.pointShadowInstancedShaderProgram =
      new PointShadowInstancedShaderProgram(this.gl);
    this.pointShadowSkeletalAnimationShaderProgram =
      new PointShadowSkeletalAnimationShaderProgram(this.gl);
    this.pointShadowRenderPass = new PointShadowRenderPass(
      this.gl,
      this.pointShadowShaderProgram,
      this.pointShadowInstancedShaderProgram,
      this.pointShadowSkeletalAnimationShaderProgram
    );
    // -----------------

    // ---- Deferred rendering ----
    this.geometryPassShaderProgram = new GeometryPassShaderProgram(this.gl);
    this.geometryPassInstancedShaderProgram =
      new GeometryPassInstancedShaderProgram(this.gl);
    this.geometryPassSkeletalAnimationShaderProgram =
      new GeometryPassSkeletalAnimationShaderProgram(this.gl);
    this.geometryRenderPass = new GeometryRenderPass(
      this.gl,
      this.geometryPassShaderProgram,
      this.geometryPassInstancedShaderProgram,
      this.geometryPassSkeletalAnimationShaderProgram
    );

    this.lightingPassShaderProgram = new LightingPassShaderProgram(this.gl);
    let textureArray = new Array<Texture>();
    for (
      let i = 0;
      i < this.geometryRenderPass.outputFramebuffer.textures.length;
      i++
    ) {
      textureArray.push(this.geometryRenderPass.outputFramebuffer.textures[i]);
    }
    textureArray.push(
      this.directionalShadowRenderPass.shadowBuffer.depthTexture
    );
    this.lightingRenderPass = new LightingRenderPass(
      this.gl,
      this.lightingPassShaderProgram,
      textureArray
    );
    // ----------------------------

    // ---- Skybox ----
    this.skyboxShaderProgram = new SkyboxShaderProgram(this.gl);
    this.useSkybox = false;
    this.skyboxRenderPass = new SkyboxRenderPass(
      this.gl,
      this.skyboxShaderProgram
    );
    // ----------------

    // ---- Particles ----
    this.particleShaderProgram = new ParticleShaderProgram(this.gl);
    this.particleRenderPass = new ParticleRenderPass(
      this.gl,
      this.particleShaderProgram
    );
    // ------------------

    // ---- Blur mask ----
    this.blurMaskFramebuffer = new Framebuffer(
      this.gl,
      this.width,
      this.height,
      [
        new Texture(this.gl, false),
        new Texture(
          this.gl,
          false,
          this.gl.R8,
          this.gl.RED,
          this.gl.UNSIGNED_BYTE
        ),
      ],
      null
    );

    this.blurMaskRenderPass = new ScreenQuadPass(
      this.gl,
      new BlurMaskShaderProgram(this.gl),
      this.blurMaskFramebuffer.textures
    );

    // -------------------

    // ---- Volumetric God Rays ----
    this.volumetricLightingPass = new VolumetricLightingPass(
      this.gl,
      new VolumetricLightingShaderProgram(this.gl),
      new VolumetricCombineShaderProgram(this.gl),
      this.screenQuadShaderProgram,
      this.geometryRenderPass.outputFramebuffer.textures[0],
      this.textureStore.getTexture("CSS:rgb(255, 255, 255"),
      this.directionalShadowRenderPass.shadowBuffer.depthTexture
    );
    this.useVolumetric = false;
    // -----------------------------

    // ---- Shape renderer ----
    this.shapesShaderProgram = new ShapesShaderProgram(this.gl);
    this.shapesRenderPass = new ShapesRenderPass(
      this.gl,
      this.shapesShaderProgram
    );
    // ------------------------

    this.finishedFramebuffer = new Framebuffer(
      this.gl,
      this.width,
      this.height,
      [new Texture(this.gl, false)],
      null
    );

    // Assign finished framebuffer to those render passes that should target it
    this.particleRenderPass.outputBuffer = this.blurMaskFramebuffer;
    this.blurMaskRenderPass.outputFramebuffer = this.finishedFramebuffer;
    this.volumetricLightingPass.outputBuffer = this.finishedFramebuffer;

    this.finishedOutputRenderPass = new ScreenQuadPass(
      this.gl,
      this.screenQuadShaderProgram,
      this.finishedFramebuffer.textures
    );
  }

  setSize(x: number, y: number, updateStyle: boolean = false) {
    super.setSize(x, y, updateStyle);

    this.geometryRenderPass.setResolution(x, y);
    this.finishedFramebuffer.setProportions(x, y);
    this.blurMaskFramebuffer.setProportions(x, y);
    this.volumetricLightingPass.setResolution(x, y);
  }

  setSkybox(path?: string) {
    if (path != undefined) {
      this.skyboxRenderPass.setSkybox(this.textureStore.getCubeMap(path));
      this.useSkybox = true;
    } else {
      this.useSkybox = false;
    }
  }

  setFogDensity(density: number) {
    this.volumetricLightingPass.fogDensity = density;
  }

  setFogRenderScale(scale: number) {
    this.volumetricLightingPass.setRenderScale(scale);
  }

  setFogBlur(blur: boolean) {
    this.volumetricLightingPass.blur = blur;
  }

  setFogTexture(path: string) {
    this.volumetricLightingPass.setFogTexture(
      this.textureStore.getTexture(path)
    );
  }

  render(
    scene: Scene,
    camera: Camera,
    cameraFrustum: Shape,
    saveScreenshot: boolean = false,
    screenshotName: string = "screencapture"
  ) {
    this.gl.enable(this.gl.DEPTH_TEST);

    scene.calculateAllTransforms();
    scene.updateTrees();
    scene.updateFrustumCulling([cameraFrustum]);

    // ---- Shadow pass ----
    this.directionalShadowRenderPass.draw(scene);
    this.pointShadowRenderPass.draw(scene, cameraFrustum);
    // ---------------------

    // ---- Geometry pass ----
    this.geometryRenderPass.draw(scene, camera, cameraFrustum);
    // -----------------------

    // Geometry pass over, start rendering to particle render pass output
    this.particleRenderPass.bindFramebuffers();

    // Clear the output with the actual clear colour we have set
    this.gl.clearColor(
      this.clearColour.r,
      this.clearColour.g,
      this.clearColour.b,
      this.clearColour.a
    );
    this.gl.clear(
      this.gl.COLOR_BUFFER_BIT |
        this.gl.DEPTH_BUFFER_BIT |
        this.gl.STENCIL_BUFFER_BIT
    );

    // ---- Lighting pass ----
    this.lightingRenderPass.draw(scene, camera);
    // -----------------------

    // Copy the depth buffer information from the gBuffer to the current depth buffer
    this.geometryRenderPass.outputFramebuffer.bind(this.gl.READ_FRAMEBUFFER);
    this.gl.blitFramebuffer(
      0,
      0,
      this.width,
      this.height,
      0,
      0,
      this.width,
      this.height,
      this.gl.DEPTH_BUFFER_BIT,
      this.gl.NEAREST
    );

    // ---- Skybox ----
    if (this.useSkybox) {
      this.skyboxRenderPass.draw(camera);
    }
    // ----------------

    // ---- Particles ----
    this.particleRenderPass.draw(scene, camera, this.rendererStartTime);
    // -------------------

    // ---- Blur mask ----
    this.blurMaskRenderPass.draw();
    // -------------------

    // ---- Volumetric God Rays ----
    if (this.useVolumetric) {
      this.volumetricLightingPass.draw(scene, camera, this.rendererStartTime);
    }
    // -----------------------------

    // ---- Shapes ----
    this.shapesRenderPass.draw(scene, camera, this.showCullingShapes);
    // ----------------

    this.finishedOutputRenderPass.draw();

    if (saveScreenshot) {
      this.takeScreenshot(screenshotName);
    }
  }
}
