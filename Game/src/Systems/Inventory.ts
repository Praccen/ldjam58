import Item, { ItemType, Curse } from "../Objects/Item";

export default class Inventory {
  private inventoryElement: HTMLElement;
  private items: Item[] = [];
  private curses: Curse[] = [];
  private isVisible: boolean = false;
  private maxSlots: number = 24;

  constructor() {
    // Get the existing inventory iframe from HTML
    this.inventoryElement = document.getElementById("inventory");

    this.inventoryElement.style.width = "100%";
    this.inventoryElement.style.height = "100%";
    this.inventoryElement.style.position = "fixed";
    this.inventoryElement.style.top = "0";
    this.inventoryElement.style.left = "0";
    this.inventoryElement.style.zIndex = "1000";
    this.inventoryElement.style.border = "none";
    this.inventoryElement.style.display = "none";
    this.inventoryElement.setAttribute("src", "Assets/html/inventory.html");
  }

  addItem(item: Item): boolean {
    // Check if inventory is full
    if (this.items.length >= this.maxSlots) {
      console.warn("Inventory is full!");
      return false;
    }

    // Check if item already exists (only for coins)
    const existingItem = this.items.find(
      (i) =>
        i.type == ItemType.COIN && i.type === item.type && i.name === item.name
    );

    if (existingItem) {
      existingItem.quantity += item.quantity;
    } else {
      this.items.push(item);
    }

    this.updateInventoryDisplay();
    return true;
  }

  removeItem(name: string): boolean {
    const index = this.items.findIndex((item) => item.name === name);
    if (index === -1) return false;

    this.items.splice(index, 1);
    this.updateInventoryDisplay();
    return true;
  }

  hide(): void {
    this.isVisible = false;
    this.inventoryElement.style.display = "none";

    // Refocus the game canvas to restore keyboard controls
    const canvas = document.querySelector("canvas");
    if (canvas instanceof HTMLElement) {
      canvas.focus();
    }
  }

  toggle(): void {
    this.isVisible = !this.isVisible;
    this.inventoryElement.style.display = this.isVisible ? "block" : "none";

    if (this.isVisible) {
      this.updateInventoryDisplay();
    } else {
      // Refocus the game canvas when closing
      const canvas = document.querySelector("canvas");
      if (canvas instanceof HTMLElement) {
        canvas.focus();
      }
    }
  }

  private updateInventoryDisplay(): void {
    const iframe = this.inventoryElement as HTMLIFrameElement;
    const contentWindow = iframe.contentWindow;

    if (contentWindow && (contentWindow as any).updateInventory) {
      (contentWindow as any).updateInventory(this.items);
    }

    if (contentWindow && (contentWindow as any).updateCurses) {
      (contentWindow as any).updateCurses(this.curses);
    }
  }

  addCurse(curse: Curse): void {
    this.curses.push(curse);
    this.updateInventoryDisplay();
  }

  removeCurse(curseName: string): boolean {
    const index = this.curses.findIndex((c) => c.name === curseName);
    if (index === -1) return false;

    this.curses.splice(index, 1);
    this.updateInventoryDisplay();
    return true;
  }

  getCurses(): Curse[] {
    return [...this.curses];
  }

  clearCurses(): void {
    this.curses = [];
    this.updateInventoryDisplay();
  }

  clear(): void {
    this.items = [];
    this.updateInventoryDisplay();
  }

  getItemCount(): number {
    return this.items.reduce((total, item) => total + item.quantity, 0);
  }

  findItemsByType(type: ItemType): Item[] {
    return this.items.filter((item) => item.type === type);
  }
}
