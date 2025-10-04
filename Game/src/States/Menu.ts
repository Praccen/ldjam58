import { Div, GUIRenderer, TextObject2D, vec2 } from "praccen-web-engine";

export default class MainMenu {
    mainMenu: HTMLElement;
    text: TextObject2D;

    constructor() {
        // Set explicit dimensions on the container
        this.mainMenu = document.getElementById("main-menu");
        this.mainMenu.style.width = "100%";
        this.mainMenu.style.height = "100%";
        this.mainMenu.setAttribute("src", "Assets/html/main-menu.html");

        // If it's an iframe:
        this.mainMenu.style.border = "none";
        this.mainMenu.style.overflow = "hidden";
        this.mainMenu.style.display = "block";
    }
}
