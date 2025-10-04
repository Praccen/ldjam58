import {
  GUIRenderer,
  TextObject2D,
  TextObject3D,
  Div,
} from "praccen-web-engine";

export default class GameGUI {
  gameGuiDiv: Div;
  mapDisplay: TextObject3D;
  characterDisplay: TextObject3D;
  floorDisplay: TextObject2D;
  constructor(guiRenderer: GUIRenderer) {
    this.gameGuiDiv = guiRenderer.getNewDiv();
    this.gameGuiDiv.getElement().style.width = "100%";
    this.gameGuiDiv.getElement().style.height = "100%";

    // Add floor display
    this.floorDisplay = guiRenderer.getNew2DText(this.gameGuiDiv);
    this.floorDisplay.position[0] = 0.91;
    this.floorDisplay.position[1] = 0.92;
    this.floorDisplay.getElement().style.color = "white";
    this.floorDisplay.textString = "Floor 1";
    this.floorDisplay.getElement().style.zIndex = "1";

    this.mapDisplay = guiRenderer.getNew3DText(this.gameGuiDiv);
    this.mapDisplay.getElement().style.color = "#ffffff30";
    // this.mapDisplay.getElement().style.background = "#00000050";
    this.mapDisplay.getElement().style.whiteSpace = "pre";
    this.mapDisplay.scaleWithWindow = true;
    this.mapDisplay.scaleFontWithDistance = true;
    this.mapDisplay.size = 800;
    this.mapDisplay.getElement().style.zIndex = "1";

    this.characterDisplay = guiRenderer.getNew3DText(this.gameGuiDiv);
    this.characterDisplay.getElement().style.color = "#00FF0040";
    this.characterDisplay.textString = "o";
    this.characterDisplay.scaleWithWindow = true;
    this.characterDisplay.scaleFontWithDistance = true;
    this.characterDisplay.center = true;
    this.characterDisplay.size = 400;
    this.characterDisplay.getElement().style.zIndex = "0";
  }
}
