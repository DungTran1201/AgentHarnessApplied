/**
 * AI-Chan VRM Companion — Behavior System Data Models & Types
 * Defines type contracts for intents, actions, plans, capabilities, and diagnostics.
 */

export type CharacterIntent =
  | 'greeting'
  | 'explanation'
  | 'confirmation'
  | 'question'
  | 'celebration'
  | 'apology'
  | 'comfort'
  | 'warning'
  | 'error'
  | 'neutral';

export type ConversationState =
  | 'loading'
  | 'idle'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'success'
  | 'error'
  | 'cancelled';

export type ActionCategory = 'gesture' | 'expression' | 'gaze' | 'idle_variation';

export interface CharacterAction {
  id: string;
  category: ActionCategory;
  name: string;
  intensity: number;      // 0.1 - 1.0, clamped
  durationMs: number;     // 200 - 8000ms
  delayMs?: number;       // 0 - 2000ms
  boneGroup?: 'arms' | 'head' | 'body' | 'full';
  priority?: number;      // 0 (idle) to 3 (response/urgent)
  blendInMs?: number;     // default 300ms
  blendOutMs?: number;    // default 400ms
}

export interface CharacterBehaviorPlan {
  turnId: string;
  intent: CharacterIntent;
  emotion?: string;
  gaze?: 'camera' | 'away' | 'upward' | 'downward';
  actions: CharacterAction[];
  createdAt: number;
}

export interface VRMCapabilities {
  hasHumanoid: boolean;
  hasExpressions: boolean;
  hasLookAt: boolean;
  hasSpringBones: boolean;
  availableBones: string[];
  availableExpressions: string[];
}

export interface BehaviorSystemConfig {
  idleEnabled: boolean;
  idleIntensity: number;       // 0.0 - 1.0
  gestureFrequency: number;    // 0.0 - 1.0
  historySize: number;         // default 5
  repeatCooldownMs: number;    // default 6000ms
  repeatPenaltyFactor: number; // default 0.25 (discount factor)
  reducedMotion: boolean;      // accessibility flag
  debugLogging: boolean;
}

export const DEFAULT_BEHAVIOR_CONFIG: BehaviorSystemConfig = {
  idleEnabled: true,
  idleIntensity: 0.85,
  gestureFrequency: 0.9,
  historySize: 5,
  repeatCooldownMs: 8000,
  repeatPenaltyFactor: 0.3,
  reducedMotion: false,
  debugLogging: false,
};

export interface BehaviorDiagnostics {
  currentState: ConversationState;
  activeIntent?: CharacterIntent;
  activeActions: string[];
  activeExpressions: Record<string, number>;
  history: string[];
  cooldowns: Record<string, number>;
  lastPlan?: CharacterBehaviorPlan;
  reducedMotionActive: boolean;
}
