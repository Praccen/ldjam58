import Camera from "../../../Objects/Camera";
import Scene from "../../Scene";
import ShapesShaderProgram from "../../ShaderPrograms/Shapes/ShapesShaderProgram";

export default class ShapesRenderPass {
  private gl: WebGL2RenderingContext;
  private shapesShaderProgram: ShapesShaderProgram;

  constructor(
    gl: WebGL2RenderingContext,
    shapesShaderProgram: ShapesShaderProgram
  ) {
    this.gl = gl;
    this.shapesShaderProgram = shapesShaderProgram;
  }

  draw(scene: Scene, camera: Camera, showCullingShapes: boolean) {
    if (!scene.hasShapes() && !showCullingShapes) {
      return;
    }

    this.gl.disable(this.gl.DEPTH_TEST);
    this.shapesShaderProgram.use();
    const viewProjMatrixUL =
      this.shapesShaderProgram.getUniformLocation("viewProjMatrix");
    if (viewProjMatrixUL[1]) {
      camera.bindViewProjMatrix(this.gl, viewProjMatrixUL[0]);
    }
    scene.renderShapes(this.shapesShaderProgram);

    if (showCullingShapes) {
      scene.renderCullingShapes(this.shapesShaderProgram);
    }
  }
}
