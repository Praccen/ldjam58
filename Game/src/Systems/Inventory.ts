import { ItemType } from "../Objects/Item";

export interface InventoryItem {
    id: string;
    name: string;
    type: ItemType;
    description?: string;
    quantity: number;
    rarity?: "common" | "rare" | "epic" | "legendary";
}

export default class Inventory {
    private inventoryElement: HTMLElement;
    private items: InventoryItem[] = [];
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

    /**
     * Add an item to the inventory
     */
    addItem(item: InventoryItem): boolean {
        // Check if inventory is full
        if (this.items.length >= this.maxSlots) {
            console.warn("Inventory is full!");
            return false;
        }

        // Check if item already exists (for stackable items)
        const existingItem = this.items.find(
            (i) => i.type === item.type && i.name === item.name
        );

        if (existingItem) {
            existingItem.quantity += item.quantity;
        } else {
            // Generate unique ID
            item.id = this.generateItemId();
            this.items.push(item);
        }

        this.updateInventoryDisplay();
        return true;
    }

    /**
     * Remove an item from the inventory
     */
    removeItem(itemId: string): boolean {
        const index = this.items.findIndex((item) => item.id === itemId);
        if (index === -1) return false;

        this.items.splice(index, 1);
        this.updateInventoryDisplay();
        return true;
    }

    /**
     * Get all items in inventory
     */
    getItems(): InventoryItem[] {
        return [...this.items];
    }

    /**
     * Check if inventory has space
     */
    hasSpace(): boolean {
        return this.items.length < this.maxSlots;
    }

    /**
     * Toggle inventory visibility
     */
    toggle(): void {
        this.isVisible = !this.isVisible;
        this.inventoryElement.style.display = this.isVisible ? "block" : "none";

        if (this.isVisible) {
            this.updateInventoryDisplay();
        }
    }

    /**
     * Show inventory
     */
    show(): void {
        this.isVisible = true;
        this.inventoryElement.style.display = "block";
        this.updateInventoryDisplay();
    }

    /**
     * Hide inventory
     */
    hide(): void {
        this.isVisible = false;
        this.inventoryElement.style.display = "none";
    }

    /**
     * Check if inventory is visible
     */
    isOpen(): boolean {
        return this.isVisible;
    }

    /**
     * Update the inventory display in the iframe
     */
    private updateInventoryDisplay(): void {
        const iframe = this.inventoryElement as HTMLIFrameElement;
        const contentWindow = iframe.contentWindow;

        if (contentWindow && (contentWindow as any).updateInventory) {
            (contentWindow as any).updateInventory(this.items);
        }
    }

    /**
     * Generate a unique ID for items
     */
    private generateItemId(): string {
        return (
            "item_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9)
        );
    }

    /**
     * Clear all items from inventory
     */
    clear(): void {
        this.items = [];
        this.updateInventoryDisplay();
    }

    /**
     * Get item count
     */
    getItemCount(): number {
        return this.items.reduce((total, item) => total + item.quantity, 0);
    }

    /**
     * Find items by type
     */
    findItemsByType(type: ItemType): InventoryItem[] {
        return this.items.filter((item) => item.type === type);
    }

    /**
     * Create an inventory item from game item
     */
    static createInventoryItem(
        name: string,
        type: ItemType,
        quantity: number = 1,
        description?: string
    ): InventoryItem {
        const rarityMap: {
            [key in ItemType]: "common" | "rare" | "epic" | "legendary";
        } = {
            [ItemType.COIN]: "common",
            [ItemType.RING]: "rare",
            [ItemType.WEAPON]: "epic",
            [ItemType.SKULL]: "rare",
            [ItemType.SCEPTER]: "legendary",
            [ItemType.GRAIL]: "legendary",
        };

        return {
            id: "", // Will be set when added to inventory
            name,
            type,
            description: description || `En mystisk ${name.toLowerCase()}`,
            quantity,
            rarity: rarityMap[type],
        };
    }
}
