import ShaderProgram from "../ShaderProgram";

const shapesVertexShaderSrc: string = `#version 300 es
layout (location = 0) in vec3 inPosition;

uniform mat4 viewProjMatrix;

void main() {
    gl_Position = viewProjMatrix * vec4(inPosition, 1.0);
}`;

const shapesFragmentSrc: string = `#version 300 es
precision highp float;

out vec4 FragColor;

void main() {
    FragColor = vec4(1.0, 0.0, 0.0, 1.0);
}
`;

export default class ShapesShaderProgram extends ShaderProgram {
  constructor(gl: WebGL2RenderingContext) {
    super(gl, "ShapesShaderProgram", shapesVertexShaderSrc, shapesFragmentSrc);

    this.setUniformLocation("viewProjMatrix");
  }
}
