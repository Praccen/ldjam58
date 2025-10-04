export default class SplashScreen {
  splashScreen: HTMLElement;

  constructor() {
    // Set explicit dimensions on the container
    this.splashScreen = document.getElementById("splash-screen");
    this.splashScreen.style.width = "100%";
    this.splashScreen.style.height = "100%";
    this.splashScreen.setAttribute("src", "Assets/html/splash-screen.html");

    // If it's an iframe:
    this.splashScreen.style.border = "none";
    this.splashScreen.style.overflow = "hidden";
    this.splashScreen.style.display = "none"; // Start hidden
  }

  destroy() {
    if (this.splashScreen) {
      this.splashScreen.style.display = "none";
    }
  }

  draw(progress: { requested: number; loaded: number }) {
    // Update progress in the iframe
    if (
      this.splashScreen &&
      (this.splashScreen as HTMLIFrameElement).contentWindow
    ) {
      const iframe = this.splashScreen as HTMLIFrameElement;
      const contentWindow = iframe.contentWindow;

      // Call updateProgress function in the iframe if it exists
      if (contentWindow && (contentWindow as any).updateProgress) {
        (contentWindow as any).updateProgress(progress);
      }
    }
  }
}
