import { TextObject3D } from "praccen-web-engine";

export default class GameGUI {
  mapDisplay: TextObject3D;
  characterDisplay: TextObject3D;
  private hudElement: HTMLElement;

  constructor() {
    // Create HUD iframe
    this.hudElement = document.getElementById("game-hud");
    if (!this.hudElement) {
      this.hudElement = document.createElement("iframe");
      this.hudElement.id = "game-hud";
      document.body.appendChild(this.hudElement);
    }

    this.hudElement.style.width = "100%";
    this.hudElement.style.height = "100%";
    this.hudElement.style.position = "fixed";
    this.hudElement.style.top = "0";
    this.hudElement.style.left = "0";
    this.hudElement.style.border = "none";
    this.hudElement.style.pointerEvents = "none";
    this.hudElement.style.zIndex = "500";
    this.hudElement.style.display = "block";
    this.hudElement.setAttribute("src", "Assets/html/game-hud.html");
  }

  updateFloor(floorNumber: number): void {
    const iframe = this.hudElement as HTMLIFrameElement;
    const contentWindow = iframe.contentWindow;

    if (contentWindow && (contentWindow as any).updateFloor) {
      (contentWindow as any).updateFloor(floorNumber);
    }
  }

  updateCharms(current: number, max: number): void {
    const iframe = this.hudElement as HTMLIFrameElement;
    const contentWindow = iframe.contentWindow;

    if (contentWindow && (contentWindow as any).updateCharms) {
      (contentWindow as any).updateCharms(current, max);
    }
  }

  showHauntedMessage(text): void {
    const iframe = this.hudElement as HTMLIFrameElement;
    const contentWindow = iframe.contentWindow;

    if (contentWindow && (contentWindow as any).showHauntedMessage) {
      (contentWindow as any).showHauntedMessage(text);
    }
  }
}
