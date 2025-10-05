export default class Settings {
  settingsElement: HTMLElement;

  constructor() {
    this.settingsElement = document.getElementById("settings");
    this.settingsElement.style.width = "100%";
    this.settingsElement.style.height = "100%";
    this.settingsElement.setAttribute("src", "Assets/html/settings.html");

    this.settingsElement.style.border = "none";
    this.settingsElement.style.overflow = "hidden";
    this.settingsElement.style.display = "none"; // Hidden by default
  }

  show() {
    this.settingsElement.style.display = "block";
  }

  hide() {
    this.settingsElement.style.display = "none";
  }
}
