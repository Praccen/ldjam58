import GraphicsObject from "./GraphicsObject";
import Texture from "../../AssetHandling/Textures/Texture";
import Shape from "../../../Physics/Physics/Shapes/Shape";
import ShaderProgram from "../../Renderer/ShaderPrograms/ShaderProgram";

export default class ShapeGraphicsObject extends GraphicsObject {
  // Private
  shape: Shape;

  constructor(gl: WebGL2RenderingContext, shape: Shape) {
    super(gl);

    this.shape = shape;
  }

  setupVertexAttributePointers() {
    // Change if input layout changes in shaders
    const stride = 3 * 4;
    this.gl.vertexAttribPointer(0, 3, this.gl.FLOAT, false, stride, 0);
    this.gl.enableVertexAttribArray(0);
  }

  draw(shaderProgram: ShaderProgram) {
    const vertexPositions = this.shape.getTransformedVertices();
    let vertices = new Float32Array(vertexPositions.length * 3);
    for (let i = 0; i < vertexPositions.length; i++) {
      vertices[i * 3 + 0] = vertexPositions[i][0];
      vertices[i * 3 + 1] = vertexPositions[i][1];
      vertices[i * 3 + 2] = vertexPositions[i][2];
    }

    this.setVertexData(vertices);

    let drawingInfo = this.shape.getDrawingInfo();
    if (drawingInfo.indices != null) {
      this.setIndexData(drawingInfo.indices);
    }
    this.mode = drawingInfo.mode;

    this.bindVAO();

    if (drawingInfo.indices != undefined && drawingInfo.indices.length > 0) {
      this.gl.drawElements(
        this.mode,
        drawingInfo.indices.length,
        this.gl.UNSIGNED_INT,
        0
      );
    } else {
      this.gl.drawArrays(this.mode, 0, vertices.length / 3);
    }
  }
}
