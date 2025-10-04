import { applicationStartTime } from "../../../../Engine";
import GraphicsObject from "../GraphicsObjects/GraphicsObject";
import Texture from "../../AssetHandling/Textures/Texture";
import { vec3 } from "gl-matrix";
import ShaderProgram from "../../Renderer/ShaderPrograms/ShaderProgram";

export default class ParticleSpawner extends GraphicsObject {
  startTexture: Texture;
  endTexture: Texture;
  fadePerSecond: number = 0.0;
  textureChangePerSecond: number = 0.0;
  sizeChangePerSecond: number = 1.0;
  lifeTime: number = 1.0;
  position: vec3 = vec3.create();
  offset: vec3 = vec3.create();
  randomPositionModifier = { min: vec3.create(), max: vec3.create() };

  fadeOut: boolean = false;

  // Private
  private numParticles: number = 0;
  private vertices: Float32Array;
  private indices: Int32Array;
  private instanceVBO: WebGLBuffer;
  private resetTimer: number = 0.0;
  private fadeOutTimer = 0.0;

  constructor(
    gl: WebGL2RenderingContext,
    texture: Texture,
    numberOfStartingParticles: number = 0
  ) {
    super(gl);

    this.startTexture = texture;
    this.endTexture = texture;

    this.bindVAO();
    this.instanceVBO = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.instanceVBO);
    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      numberOfStartingParticles * 11 * 4,
      this.gl.DYNAMIC_DRAW
    );
    this.setupInstancedVertexAttributePointers();
    this.unbindVAO();

    // prettier-ignore
    this.vertices = new Float32Array([ 
            // positions  // uv
            -0.5,  0.5,   0.0, 1.0,
            -0.5, -0.5,   0.0, 0.0,
             0.5, -0.5,   1.0, 0.0,
             0.5,  0.5,   1.0, 1.0,
        ]);

    // prettier-ignore
    this.indices = new Int32Array([
            0, 1, 2,
            0, 2, 3,
        ]);
    this.setVertexData(this.vertices);
    this.setIndexData(this.indices);

    // All starting particles are initialized as size and position 0, so they wont be visable unless manually changed
    this.numParticles = numberOfStartingParticles;
  }

  setupVertexAttributePointers(): void {
    // Change if input layout changes in shaders
    const stride = 4 * 4;
    this.gl.vertexAttribPointer(0, 2, this.gl.FLOAT, false, stride, 0);
    this.gl.enableVertexAttribArray(0);

    this.gl.vertexAttribPointer(1, 2, this.gl.FLOAT, false, stride, 2 * 4);
    this.gl.enableVertexAttribArray(1);
  }

  setupInstancedVertexAttributePointers(): void {
    const stride = 11 * 4;
    this.gl.vertexAttribPointer(2, 3, this.gl.FLOAT, false, stride, 0);
    this.gl.enableVertexAttribArray(2);
    this.gl.vertexAttribDivisor(2, 1);

    this.gl.vertexAttribPointer(3, 1, this.gl.FLOAT, false, stride, 3 * 4);
    this.gl.enableVertexAttribArray(3);
    this.gl.vertexAttribDivisor(3, 1);

    this.gl.vertexAttribPointer(4, 3, this.gl.FLOAT, false, stride, 4 * 4);
    this.gl.enableVertexAttribArray(4);
    this.gl.vertexAttribDivisor(4, 1);

    this.gl.vertexAttribPointer(5, 1, this.gl.FLOAT, false, stride, 7 * 4);
    this.gl.enableVertexAttribArray(5);
    this.gl.vertexAttribDivisor(5, 1);

    this.gl.vertexAttribPointer(6, 3, this.gl.FLOAT, false, stride, 8 * 4);
    this.gl.enableVertexAttribArray(6);
    this.gl.vertexAttribDivisor(6, 1);

    // this.gl.vertexAttribPointer(7, 1, this.gl.FLOAT, false, stride, 11 * 4);
    // this.gl.enableVertexAttribArray(7);
    // this.gl.vertexAttribDivisor(7, 1);
  }

  setNumParticles(amount: number) {
    this.numParticles = amount;

    this.bindVAO();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.instanceVBO);
    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      this.numParticles * 11 * 4,
      this.gl.DYNAMIC_DRAW
    );
    this.unbindVAO();
  }

  initAllParticles(
    startPos: { startPosMin: vec3; startPosMax: vec3 },
    size: { sizeMin: number; sizeMax: number },
    startVel: { startVelMin: vec3; startVelMax: vec3 },
    acceleration: { accelerationMin: vec3; accelerationMax: vec3 }
  ) {
    for (let i = 0; i < this.numParticles; i++) {
      this.setParticleData(
        i,
        vec3.fromValues(
          (startPos.startPosMax[0] - startPos.startPosMin[0]) * Math.random() +
            startPos.startPosMin[0],
          (startPos.startPosMax[1] - startPos.startPosMin[1]) * Math.random() +
            startPos.startPosMin[1],
          (startPos.startPosMax[2] - startPos.startPosMin[2]) * Math.random() +
            startPos.startPosMin[2]
        ),
        (size.sizeMax - size.sizeMin) * Math.random() + size.sizeMin,
        vec3.fromValues(
          (startVel.startVelMax[0] - startVel.startVelMin[0]) * Math.random() +
            startVel.startVelMin[0],
          (startVel.startVelMax[1] - startVel.startVelMin[1]) * Math.random() +
            startVel.startVelMin[1],
          (startVel.startVelMax[2] - startVel.startVelMin[2]) * Math.random() +
            startVel.startVelMin[2]
        ),
        vec3.fromValues(
          (acceleration.accelerationMax[0] - acceleration.accelerationMin[0]) *
            Math.random() +
            acceleration.accelerationMin[0],
          (acceleration.accelerationMax[1] - acceleration.accelerationMin[1]) *
            Math.random() +
            acceleration.accelerationMin[1],
          (acceleration.accelerationMax[2] - acceleration.accelerationMin[2]) *
            Math.random() +
            acceleration.accelerationMin[2]
        )
      );
    }
  }

  getNumberOfParticles(): number {
    return this.numParticles;
  }

  setParticleData(
    particleIndex: number,
    startPosition: vec3,
    size: number,
    startVel: vec3,
    acceleration: vec3,
    startTime?: number
  ): boolean {
    if (particleIndex > this.numParticles) {
      return false;
    }
    let time = (Date.now() - applicationStartTime) * 0.001;

    if (startTime != undefined) {
      time = startTime;
    }

    let data = new Float32Array([
      startPosition[0],
      startPosition[1],
      startPosition[2],
      size,
      startVel[0],
      startVel[1],
      startVel[2],
      time,
      acceleration[0],
      acceleration[1],
      acceleration[2],
    ]);

    this.bufferSubDataUpdate(particleIndex * 11, data);

    return true;
  }

  setParticleStartPosition(particleIndex: number, position: vec3): boolean {
    if (particleIndex > this.numParticles) {
      return false;
    }
    this.bufferSubDataUpdate(particleIndex * 11, new Float32Array(position));
    return true;
  }

  setParticleSize(particleIndex: number, size: number): boolean {
    if (particleIndex > this.numParticles) {
      return false;
    }
    this.bufferSubDataUpdate(particleIndex * 11 + 3, new Float32Array([size]));
    return true;
  }

  setParticleStartVelocity(particleIndex: number, vel: vec3): boolean {
    if (particleIndex > this.numParticles) {
      return false;
    }
    this.bufferSubDataUpdate(particleIndex * 11 + 4, new Float32Array(vel));
    return true;
  }

  setParticleStartTime(particleIndex: number, time: number): boolean {
    if (particleIndex > this.numParticles) {
      return false;
    }
    this.bufferSubDataUpdate(particleIndex * 11 + 7, new Float32Array([time]));
    return true;
  }

  resetParticleStartTime(particleIndex: number): boolean {
    if (particleIndex > this.numParticles) {
      return false;
    }
    this.bufferSubDataUpdate(
      particleIndex * 11 + 7,
      new Float32Array([(Date.now() - applicationStartTime) * 0.001 + 0.05]) // I add 0.05 to minimize the risk of the particle respawning before the position is updated
    );
    return true;
  }

  setParticleAcceleration(particleIndex: number, acc: vec3): boolean {
    if (particleIndex > this.numParticles) {
      return false;
    }
    this.bufferSubDataUpdate(particleIndex * 11 + 8, new Float32Array(acc));
    return true;
  }

  private bufferSubDataUpdate(start: number, data: Float32Array): boolean {
    if (start > this.numParticles * 11) {
      return false;
    }
    this.bindVAO();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.instanceVBO);
    this.gl.bufferSubData(this.gl.ARRAY_BUFFER, start * 4, data);
    this.unbindVAO();
    return true;
  }

  getNumVertices(): number {
    return this.indices.length;
  }

  /**
   *
   * @param dt delta time
   * @returns if this particle should keep existing
   */
  update(dt: number): boolean {
    if (this.fadeOut) {
      this.fadeOutTimer += dt;
      if (this.fadeOutTimer >= this.lifeTime) {
        return false;
      }
      return true;
    }
    this.fadeOutTimer = 0.0;
    let currentParticle = Math.floor(
      (this.resetTimer / Math.max(this.lifeTime, 0.00001)) *
        this.getNumberOfParticles()
    );
    this.resetTimer += dt;
    let endParticle = Math.floor(
      (this.resetTimer / Math.max(this.lifeTime, 0.00001)) *
        this.getNumberOfParticles()
    );
    for (currentParticle; currentParticle < endParticle; currentParticle++) {
      this.setParticleStartPosition(
        currentParticle % this.getNumberOfParticles(),
        vec3.add(
          vec3.create(),
          vec3.add(vec3.create(), this.position, this.offset),
          vec3.fromValues(
            (this.randomPositionModifier.max[0] -
              this.randomPositionModifier.min[0]) *
              Math.random() +
              this.randomPositionModifier.min[0],
            (this.randomPositionModifier.max[1] -
              this.randomPositionModifier.min[1]) *
              Math.random() +
              this.randomPositionModifier.min[1],
            (this.randomPositionModifier.max[2] -
              this.randomPositionModifier.min[2]) *
              Math.random() +
              this.randomPositionModifier.min[2]
          )
        )
      );
      this.resetParticleStartTime(
        currentParticle % this.getNumberOfParticles()
      );
    }
    if (this.resetTimer > this.lifeTime) {
      this.resetTimer -= this.lifeTime;
    }
    return true;
  }

  draw(shaderProgram: ShaderProgram) {
    this.bindVAO();

    this.startTexture.bind(0);
    this.endTexture.bind(1);
    this.gl.uniform1f(
      shaderProgram.getUniformLocation("fadePerSecond")[0],
      this.fadePerSecond
    );
    this.gl.uniform1f(
      shaderProgram.getUniformLocation("textureChangePerSecond")[0],
      this.textureChangePerSecond
    );
    this.gl.uniform1f(
      shaderProgram.getUniformLocation("sizeChangePerSecond")[0],
      this.sizeChangePerSecond
    );
    this.gl.uniform1f(
      shaderProgram.getUniformLocation("lifeTime")[0],
      this.lifeTime
    );

    this.gl.drawElementsInstanced(
      this.gl.TRIANGLES,
      6,
      this.gl.UNSIGNED_INT,
      0,
      this.getNumberOfParticles()
    );
    this.unbindVAO();
  }
}
