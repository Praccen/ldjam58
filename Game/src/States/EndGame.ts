export default class EndGame {
  endGameScreen: HTMLElement;

  constructor() {
    // Set explicit dimensions on the container
    this.endGameScreen = document.getElementById("end-game");
    this.endGameScreen.style.width = "100%";
    this.endGameScreen.style.height = "100%";
    this.endGameScreen.setAttribute("src", "Assets/html/end-game.html");

    // If it's an iframe:
    this.endGameScreen.style.border = "none";
    this.endGameScreen.style.overflow = "hidden";
    this.endGameScreen.style.display = "none";
  }

  show(stats: {
    time: string;
    artifacts: number;
    floors: number;
    items?: any[];
    curses?: any[];
    currentRunValue?: number;
    totalValue?: number;
  }) {
    // Update the iframe src with query parameters for stats
    const params = new URLSearchParams({
      time: stats.time,
      artifacts: stats.artifacts.toString(),
      floors: stats.floors.toString(),
    });

    // Add items data if provided
    if (stats.items && stats.items.length > 0) {
      params.set("items", encodeURIComponent(JSON.stringify(stats.items)));
    }

    // Add curses data if provided
    if (stats.curses && stats.curses.length > 0) {
      params.set("curses", encodeURIComponent(JSON.stringify(stats.curses)));
    }

    // Add value data if provided
    if (stats.currentRunValue !== undefined) {
      params.set("currentRunValue", stats.currentRunValue.toString());
    }

    if (stats.totalValue !== undefined) {
      params.set("totalValue", stats.totalValue.toString());
    }

    this.endGameScreen.setAttribute(
      "src",
      `Assets/html/end-game.html?${params.toString()}`
    );
    this.endGameScreen.style.display = "block";
  }

  hide() {
    this.endGameScreen.style.display = "none";
  }
}
