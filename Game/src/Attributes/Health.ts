import { vec3 } from "gl-matrix";
import {
  Camera,
  PhysicsObject,
  Progress,
  Renderer3D,
} from "praccen-web-engine";

export default class Health {
  private hp: number;
  private maxHp: number;
  private healthBar: Progress = null;
  private barWidth: number;
  private barHeight: number;

  constructor(hp: number, barWidth: number = 60, barHeight: number = 8) {
    this.hp = hp;
    this.maxHp = hp;
    this.barWidth = barWidth;
    this.barHeight = barHeight;
  }
  getHp(): number {
    return this.hp;
  }
  setHp(hp: number) {
    this.hp = hp;
    this.updateHealthBarValue();
  }
  modifyHp(change: number) {
    this.hp += change;
    if (this.hp < 0) this.hp = 0;
    if (this.hp > this.maxHp) this.hp = this.maxHp;
    this.updateHealthBarValue();
  }

  getMaxHp(): number {
    return this.maxHp;
  }

  setMaxHp(maxHp: number) {
    this.maxHp = maxHp;
    if (this.hp > this.maxHp) this.hp = this.maxHp;
  }

  getHpPercentage(): number {
    return this.maxHp > 0 ? this.hp / this.maxHp : 0;
  }

  createHealthBar(guiRenderer: any, parentDiv: any): void {
    this.healthBar = guiRenderer.getNewProgress(parentDiv);
    const progressElement = this.healthBar.getProgressElement();
    progressElement.max = this.maxHp;
    progressElement.value = this.hp;
    progressElement.style.width = this.barWidth + "px";
    progressElement.style.height = this.barHeight + "px";
    progressElement.style.borderRadius = "4px";
    progressElement.style.border = "1px solid #333";
    progressElement.style.background = "#444";
    progressElement.className = "health-bar";
  }

  updateHealthBarValue(): void {
    if (this.healthBar) {
      this.healthBar.getProgressElement().value = this.hp;
      this.healthBar.getProgressElement().max = this.maxHp;
    }
  }

  getHealthBar(): Progress {
    return this.healthBar;
  }

  updateHealthBarPosition(camera: Camera, physicsObj: PhysicsObject) {
    if (physicsObj) {
      const worldPos = vec3.add(
        vec3.create(),
        physicsObj.transform.position,
        vec3.fromValues(-0.9, 4, 0) // Offset above unit
      );

      const screenPos = camera.worldToScreenPosition(worldPos);

      if (screenPos) {
        this.healthBar.position[0] = screenPos[0];
        this.healthBar.position[1] = screenPos[1];
      }
    }
  }
}
