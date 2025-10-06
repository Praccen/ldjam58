/**
 * ShopManager - Handles all shop upgrade logic and persistence
 */
export default class ShopManager {
  /**
   * Get the current level of an upgrade
   */
  static getUpgradeLevel(upgradeId: string): number {
    return parseInt(localStorage.getItem(`upgrade_${upgradeId}`) || "0");
  }

  /**
   * Get upgrade value for a specific upgrade
   * Returns the actual bonus value that should be applied
   */
  static getUpgradeValue(upgradeId: string): number {
    const level = this.getUpgradeLevel(upgradeId);

    switch (upgradeId) {
      // Core upgrades
      case "protectionCharms":
        return level; // +1 charm per level (combined max and starting)
      case "moveSpeed":
        return level * 0.05; // +5% per level (was 10%)
      case "torchPower":
        return level * 0.08; // +8% per level (was 15%)

      // Curse resistances (0.0 to 1.0 where 1.0 = 100% resistance)
      // Max resistance at level 3: 30% (was 75%)
      case "speedResistance":
        return level * 0.1; // 10% per level (was 25%)
      case "torchResistance":
        return level * 0.1; // 10% per level (was 25%)
      case "sightResistance":
        return level * 0.1; // 10% per level (was 25%)
      case "hauntResistance":
        return level * 0.1; // 10% per level (was 20%)

      // Special abilities
      case "luckyFind":
        return level * 0.1; // +10% rarity boost per level (was 15%)
      case "goldBonus":
        return level * 0.15; // +15% value per level (was 20%)
      case "fearAura":
        return level * 2; // +2m distance per level (was 5m)
      case "secondChance":
        return level > 0 ? 1 : 0; // Boolean upgrade

      default:
        return 0;
    }
  }

  /**
   * Apply curse resistance to a severity modifier
   * @param baseModifier The original curse severity (e.g., 5 for -5% speed)
   * @param resistanceId The resistance upgrade ID
   * @returns The modified severity after resistance
   */
  static applyCurseResistance(baseModifier: number, resistanceId: string): number {
    const resistance = this.getUpgradeValue(resistanceId);
    return baseModifier * (1 - resistance);
  }

  /**
   * Get starting charms (base 3 + upgrade bonus)
   * Same as max charms since you can't find charms in the dungeon
   */
  static getStartingCharms(): number {
    const base = 3;
    const bonus = this.getUpgradeValue("protectionCharms");
    return base + bonus;
  }

  /**
   * Get max charms (base 3 + upgrade bonus)
   * Same as starting charms since you can't find charms in the dungeon
   */
  static getMaxCharms(): number {
    const base = 3;
    const bonus = this.getUpgradeValue("protectionCharms");
    return base + bonus;
  }

  /**
   * Get total movement speed multiplier (1.0 = normal, 1.5 = 50% faster)
   */
  static getMoveSpeedMultiplier(): number {
    return 1.0 + this.getUpgradeValue("moveSpeed");
  }

  /**
   * Get torch power multiplier (1.0 = normal, 1.75 = 75% brighter at max)
   */
  static getTorchMultiplier(): number {
    return 1.0 + this.getUpgradeValue("torchPower");
  }

  /**
   * Get rarity boost for item drops (0.0 to 0.45 at max level)
   */
  static getRarityBoost(): number {
    return this.getUpgradeValue("luckyFind");
  }

  /**
   * Get artifact value multiplier (1.0 = normal, 2.0 = double at max)
   */
  static getArtifactValueMultiplier(): number {
    return 1.0 + this.getUpgradeValue("goldBonus");
  }

  /**
   * Get ghost fear distance (0m at base, +5m per level)
   */
  static getGhostFearDistance(): number {
    return this.getUpgradeValue("fearAura");
  }

  /**
   * Check if player has death ward active
   */
  static hasDeathWard(): boolean {
    return this.getUpgradeValue("secondChance") > 0;
  }

  /**
   * Check if death ward has been used this run (stored in session, not localStorage)
   */
  static hasUsedDeathWard(): boolean {
    return sessionStorage.getItem("deathWardUsed") === "true";
  }

  /**
   * Mark death ward as used for this run
   */
  static useDeathWard(): void {
    sessionStorage.setItem("deathWardUsed", "true");
  }

  /**
   * Reset death ward for new run
   */
  static resetDeathWard(): void {
    sessionStorage.removeItem("deathWardUsed");
  }
}
