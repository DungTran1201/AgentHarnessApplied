import { ActionCategory, BehaviorSystemConfig, DEFAULT_BEHAVIOR_CONFIG, VRMCapabilities } from './behaviorTypes';

export interface ActionCandidate {
  id: string;
  category: ActionCategory;
  name: string;
  baseWeight: number;
  cooldownMs?: number;
  requiredBones?: string[];
  requiredExpressions?: string[];
  durationMs: number;
  intensity?: number;
  boneGroup?: 'arms' | 'head' | 'body' | 'full';
}

/**
 * VariationEngine:
 * Enforces non-repetitive action selection through recent history, cooldowns,
 * repeat penalties, and weighted random sampling with optional seed for testability.
 */
export class VariationEngine {
  private history: string[] = [];
  private cooldowns: Map<string, number> = new Map(); // actionId -> availableAt timestamp
  private config: BehaviorSystemConfig;
  private seed: number | null = null;

  private capabilities: VRMCapabilities | null = null;

  constructor(config: Partial<BehaviorSystemConfig> = {}) {
    this.config = { ...DEFAULT_BEHAVIOR_CONFIG, ...config };
  }

  public updateConfig(config: Partial<BehaviorSystemConfig>) {
    this.config = { ...this.config, ...config };
  }

  public setConfig(config: Partial<BehaviorSystemConfig>) {
    this.updateConfig(config);
  }

  public setCapabilities(caps: VRMCapabilities) {
    this.capabilities = caps;
  }

  public getCapabilities(): VRMCapabilities | null {
    return this.capabilities;
  }

  /**
   * Sets deterministic PRNG seed for reproducible unit testing.
   */
  public setSeed(seed: number | null) {
    this.seed = seed;
  }

  private getRandom(): number {
    if (this.seed === null) {
      return Math.random();
    }
    // Simple Mulberry32 deterministic PRNG
    this.seed |= 0;
    this.seed = (this.seed + 0x6d2b79f5) | 0;
    let t = Math.imul(this.seed ^ (this.seed >>> 15), 1 | this.seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Determines if an action is currently off cooldown.
   */
  public isOffCooldown(actionId: string, nowMs = Date.now()): boolean {
    const availableAt = this.cooldowns.get(actionId);
    if (!availableAt) return true;
    return nowMs >= availableAt;
  }

  /**
   * Checks if model capabilities satisfy candidate requirements.
   */
  public isSupported(candidate: ActionCandidate, capabilities?: VRMCapabilities): boolean {
    if (!capabilities) return true;
    if (candidate.requiredBones && candidate.requiredBones.length > 0) {
      const hasBones = candidate.requiredBones.every(b => capabilities.availableBones.includes(b));
      if (!hasBones) return false;
    }
    if (candidate.requiredExpressions && candidate.requiredExpressions.length > 0) {
      const hasExprs = candidate.requiredExpressions.every(e => capabilities.availableExpressions.includes(e));
      if (!hasExprs) return false;
    }
    return true;
  }

  /**
   * Calculates effective selection weight applying repeat penalty and history decay.
   */
  public calculateEffectiveWeight(candidate: ActionCandidate, nowMs = Date.now()): number {
    let weight = candidate.baseWeight;
    if (weight <= 0) return 0;

    // Check cooldown
    if (!this.isOffCooldown(candidate.id, nowMs)) {
      weight *= 0.05; // heavily penalized if on cooldown
    }

    // Check recent history penalty
    const historyIndex = this.history.indexOf(candidate.id);
    if (historyIndex !== -1) {
      // 0 = most recent, 1 = second most recent, etc.
      // Most recent gets highest penalty
      const recency = this.history.length - 1 - historyIndex;
      if (recency === 0) {
        // Immediately previous action
        weight *= this.config.repeatPenaltyFactor * 0.5;
      } else {
        weight *= this.config.repeatPenaltyFactor;
      }
    }

    return Math.max(0.001, weight);
  }

  /**
   * Selects an action among candidates using weighted random distribution.
   */
  public selectAction(
    candidates: ActionCandidate[],
    capabilities?: VRMCapabilities,
    nowMs = Date.now()
  ): ActionCandidate | null {
    if (!candidates || candidates.length === 0) return null;

    // Filter by model capability
    const validCandidates = candidates.filter(c => this.isSupported(c, capabilities));
    if (validCandidates.length === 0) {
      // If none supported by strict check, return first candidate as fallback
      return candidates[0] || null;
    }

    if (validCandidates.length === 1) {
      return validCandidates[0];
    }

    // Compute effective weights
    const weightedPool = validCandidates.map(c => ({
      candidate: c,
      weight: this.calculateEffectiveWeight(c, nowMs),
    }));

    const totalWeight = weightedPool.reduce((sum, item) => sum + item.weight, 0);
    if (totalWeight <= 0) {
      return validCandidates[0];
    }

    const randVal = this.getRandom() * totalWeight;
    let accumulated = 0;

    for (const item of weightedPool) {
      accumulated += item.weight;
      if (randVal <= accumulated) {
        return item.candidate;
      }
    }

    return validCandidates[validCandidates.length - 1];
  }

  /**
   * Records that an action was executed. Updates history and cooldown.
   */
  public recordAction(actionId: string, cooldownMs?: number, nowMs = Date.now()) {
    // Add to history
    this.history.push(actionId);
    if (this.history.length > this.config.historySize) {
      this.history.shift();
    }

    // Set cooldown
    const cd = cooldownMs ?? this.config.repeatCooldownMs;
    this.cooldowns.set(actionId, nowMs + cd);
  }

  public getHistory(): string[] {
    return [...this.history];
  }

  public getCooldowns(): Record<string, number> {
    const res: Record<string, number> = {};
    for (const [k, v] of this.cooldowns.entries()) {
      res[k] = v;
    }
    return res;
  }

  public clearHistory() {
    this.history = [];
    this.cooldowns.clear();
  }
}
