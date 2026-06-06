// Pure recovery costs & rules. See docs/05 + docs/12.

export const REPAIR_COST = 30;
export const AI_RESCUE_COST = 60;
export const SHIELD_PRICE = 80;

export type RecoveryKind = "repair" | "ai_rescue" | "shield";

export function recoveryCost(kind: RecoveryKind): number {
  switch (kind) {
    case "repair":
      return REPAIR_COST;
    case "ai_rescue":
      return AI_RESCUE_COST;
    case "shield":
      return SHIELD_PRICE; // cost only if buying one; using inventory is free
  }
}

export function canAfford(balance: number, cost: number): boolean {
  return balance >= cost;
}
