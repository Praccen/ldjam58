import { Div, GUIRenderer, TextObject2D, vec2 } from "praccen-web-engine";

export default class LoadingScreen {
  guiRenderer: GUIRenderer;
  loadingScreenDiv: Div;

  text: TextObject2D;

  constructor() {
    // Create a GUI renderer and attach it to the document body
    this.guiRenderer = new GUIRenderer();
    document.body.appendChild(this.guiRenderer.domElement);

    // Set the class to apply style defined in index.css
    this.guiRenderer.domElement.className = "guiContainer";

    this.loadingScreenDiv = this.guiRenderer.getNewDiv();
    this.loadingScreenDiv.getElement().style.position = "absolute";
    this.loadingScreenDiv.getElement().style.width = "100%";
    this.loadingScreenDiv.getElement().style.height = "100%";

    this.loadingScreenDiv.getElement().style.backgroundImage =
      "url(Assets/Textures/Lava2.png)";

    this.text = this.guiRenderer.getNew2DText(this.loadingScreenDiv);
    this.text.textString = "Praccen's web engine is loading";
    vec2.set(this.text.position, 0.5, 0.5);
    this.text.scaleWithWindow = true;
    this.text.center = true;
  }

  destroy() {
    document.body.removeChild(this.guiRenderer.domElement);
  }

  draw(progress: { requested: number; loaded: number }) {
    if (progress.requested > 0) {
      this.text.textString =
        "Praccen's web engine is loading " +
        ((100 * progress.loaded) / progress.requested)
          .toString()
          .substring(0, 2) +
        "%";
    }
    this.guiRenderer.draw(null);
  }
}
