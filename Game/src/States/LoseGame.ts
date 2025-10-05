export default class LoseGame {
  loseGameScreen: HTMLElement;

  constructor() {
    // Set explicit dimensions on the container
    this.loseGameScreen = document.getElementById("lose-game");
    this.loseGameScreen.style.width = "100%";
    this.loseGameScreen.style.height = "100%";
    this.loseGameScreen.setAttribute("src", "Assets/html/lose-game.html");

    // If it's an iframe:
    this.loseGameScreen.style.border = "none";
    this.loseGameScreen.style.overflow = "hidden";
    this.loseGameScreen.style.display = "none";
  }

  show(stats: {
    time: string;
    curses?: any[];
    totalValue?: number;
    goldPenalty?: number;
  }) {
    // Update the iframe src with query parameters for stats
    const params = new URLSearchParams({
      time: stats.time,
    });

    // Add curses data if provided
    if (stats.curses && stats.curses.length > 0) {
      params.set("curses", encodeURIComponent(JSON.stringify(stats.curses)));
    }

    // Add value data if provided
    if (stats.totalValue !== undefined) {
      params.set("totalValue", stats.totalValue.toString());
    }

    // Add gold penalty if provided
    if (stats.goldPenalty !== undefined) {
      params.set("goldPenalty", stats.goldPenalty.toString());
    }

    this.loseGameScreen.setAttribute(
      "src",
      `Assets/html/lose-game.html?${params.toString()}`
    );
    this.loseGameScreen.style.display = "block";
  }

  hide() {
    this.loseGameScreen.style.display = "none";
  }
}
