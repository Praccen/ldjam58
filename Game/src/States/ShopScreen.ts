import { Div, GUIRenderer } from "praccen-web-engine";

export default class ShopScreen {
  shopScreen: HTMLIFrameElement;

  constructor() {
    this.shopScreen = document.getElementById("shop-screen") as HTMLIFrameElement;
    if (!this.shopScreen) {
      this.shopScreen = document.createElement("iframe");
      this.shopScreen.id = "shop-screen";
      document.body.appendChild(this.shopScreen);
    }

    this.shopScreen.style.width = "100%";
    this.shopScreen.style.height = "100%";
    this.shopScreen.style.position = "fixed";
    this.shopScreen.style.top = "0";
    this.shopScreen.style.left = "0";
    this.shopScreen.style.border = "none";
    this.shopScreen.style.zIndex = "1000";
    this.shopScreen.style.display = "none";
    this.shopScreen.setAttribute("src", "Assets/html/shop.html");
  }

  show(): void {
    this.shopScreen.style.display = "block";
  }

  hide(): void {
    this.shopScreen.style.display = "none";
  }
}
