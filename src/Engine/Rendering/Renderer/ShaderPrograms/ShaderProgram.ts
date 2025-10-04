export default class ShaderProgram {
  // Protected
  protected gl: WebGL2RenderingContext;
  protected shaderProgram: WebGLProgram;
  protected uniformBindings: Map<string, WebGLUniformLocation>;

  constructor(
    gl: WebGL2RenderingContext,
    shaderProgramName: string,
    vertexShaderSrc: string,
    fragmentShaderSrc: string,
    debugShaderCompilation: boolean = false
  ) {
    this.gl = gl;
    this.shaderProgram = null;
    this.loadShaders(
      shaderProgramName,
      vertexShaderSrc,
      fragmentShaderSrc,
      debugShaderCompilation
    );
    this.uniformBindings = new Map<string, WebGLUniformLocation>();
  }

  loadShaders(
    shaderProgramName: string,
    vertexShaderString: string,
    fragmentShaderString: string,
    debugShaderCompilation: boolean
  ) {
    // link shaders
    if (this.shaderProgram != null) {
      this.gl.deleteProgram(this.shaderProgram); // Delete in case this is not the first time this shader is created.
    }

    console.log("Compiling shader program: " + shaderProgramName);

    // vertex shader
    const vertexShader = this.gl.createShader(this.gl.VERTEX_SHADER);
    this.gl.shaderSource(vertexShader, vertexShaderString);
    this.gl.compileShader(vertexShader);

    // Check for shader compile errors
    if (
      !this.gl.getShaderParameter(vertexShader, this.gl.COMPILE_STATUS) ||
      debugShaderCompilation
    ) {
      console.log(
        "Vertex shader compiled successfully: " +
          this.gl.getShaderParameter(vertexShader, this.gl.COMPILE_STATUS)
      );
      console.log(
        "Vertex shader compiler log: \n" +
          this.gl.getShaderInfoLog(vertexShader)
      );
    }

    // fragment shader
    const fragmentShader = this.gl.createShader(this.gl.FRAGMENT_SHADER);
    this.gl.shaderSource(fragmentShader, fragmentShaderString);
    this.gl.compileShader(fragmentShader);

    // Check for shader compile errors
    if (
      !this.gl.getShaderParameter(fragmentShader, this.gl.COMPILE_STATUS) ||
      debugShaderCompilation
    ) {
      console.log(
        "Fragment shader compiled successfully: " +
          this.gl.getShaderParameter(fragmentShader, this.gl.COMPILE_STATUS)
      );
      console.log(
        "Fragment shader compiler log: \n" +
          this.gl.getShaderInfoLog(fragmentShader)
      );
    }

    this.shaderProgram = this.gl.createProgram();

    this.gl.attachShader(this.shaderProgram, vertexShader);
    this.gl.attachShader(this.shaderProgram, fragmentShader);
    this.gl.linkProgram(this.shaderProgram);

    // Check for linking errors?
    let linkedShaders = this.gl.getProgramParameter(
      this.shaderProgram,
      this.gl.LINK_STATUS
    );
    if (!linkedShaders || debugShaderCompilation) {
      console.log("Linked shaders successfully: " + linkedShaders);
      console.log(
        "Linking shaders log: \n" +
          this.gl.getProgramInfoLog(this.shaderProgram)
      );
    }

    // Delete shaders now that they have been made into a program
    this.gl.deleteShader(vertexShader);
    this.gl.deleteShader(fragmentShader);
  }

  use() {
    this.gl.useProgram(this.shaderProgram);
  }

  setUniformLocation(uniformName: string) {
    this.uniformBindings.set(
      uniformName,
      this.gl.getUniformLocation(this.shaderProgram, uniformName)
    );
  }

  getUniformLocation(uniformName: string): [WebGLUniformLocation, boolean] {
    if (this.uniformBindings.has(uniformName)) {
      return [this.uniformBindings.get(uniformName), true];
    }

    // console.log("No uniform with name " + uniformName + "\n");
    return [0, false];
  }
}
