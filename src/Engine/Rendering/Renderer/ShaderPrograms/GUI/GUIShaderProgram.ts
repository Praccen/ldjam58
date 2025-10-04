import ShaderProgram from "../ShaderProgram";

const guiVertexShaderSrc: string = `#version 300 es
layout (location = 0) in vec3 inPosition;
layout (location = 1) in vec3 inNormal;
layout (location = 2) in vec2 inTexCoords;

uniform mat4 modelMatrix;
uniform mat4 textureMatrix;
uniform mat3 normalMatrix;
uniform mat4 viewProjMatrix;

out vec3 fragPos;
out vec3 fragNormal;
out vec2 texCoords;

void main() {
    vec4 worldPos = modelMatrix * vec4(inPosition, 1.0);
	texCoords = vec2(textureMatrix * vec4(inTexCoords, 0.0, 1.0));

	fragNormal = normalize(normalMatrix * inNormal);
	fragPos = worldPos.xyz;
    gl_Position = viewProjMatrix * worldPos;
}`;

const guiFragmentSrc: string = `#version 300 es
precision highp float;

out vec4 FragColor;

in vec3 fragPos;
in vec3 fragNormal;
in vec2 texCoords;

uniform float overlayYAxisCutoff;
uniform vec3 overlayColour;
uniform sampler2D uTexture;

void main() {
  FragColor = texture(uTexture, texCoords).rgba;
  if (texCoords.y < overlayYAxisCutoff) {
    FragColor.rgb = FragColor.rgb + overlayColour;
  }
}
`;

export default class GUIShaderProgram extends ShaderProgram {
  constructor(gl: WebGL2RenderingContext) {
    super(gl, "GUIShaderProgram", guiVertexShaderSrc, guiFragmentSrc);

    this.setUniformLocation("modelMatrix");
    this.setUniformLocation("textureMatrix");
    this.setUniformLocation("normalMatrix");
    this.setUniformLocation("textureMatrix");
    this.setUniformLocation("viewProjMatrix");

    this.setUniformLocation("overlayYAxisCutoff");
    this.setUniformLocation("overlayColour");

    this.setUniformLocation("uTexture");
    this.gl.uniform1i(this.uniformBindings["uTexture"], 0);
  }
}
