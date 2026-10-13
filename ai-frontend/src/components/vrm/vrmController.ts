import * as THREE from 'three';
import { VRM } from '@pixiv/three-vrm';
import { VRMRuntimeAdapter } from './vrmRuntimeAdapter';
import { IdleBehaviorEngine } from './idleBehaviorEngine';
import { AnimationController } from './animationController';
import { VariationEngine } from './variationEngine';
import { ResponseBehaviorPlanner } from './responseBehaviorPlanner';
import {
  ConversationState,
  BehaviorDiagnostics,
  BehaviorSystemConfig,
  DEFAULT_BEHAVIOR_CONFIG,
  CharacterBehaviorPlan,
} from './behaviorTypes';

export type AvatarState = ConversationState;
export type CameraPreset = 'portrait' | 'upper-body' | 'full-body' | 'reset';

export interface VRMControllerOptions {
  onStateChange?: (state: AvatarState) => void;
  config?: Partial<BehaviorSystemConfig>;
}

/**
 * VRMController:
 * Master facade controlling VRM character behavior in AI-Chan.
 * Coordinates runtime adapter, idle engine, contextual response planner,
 * variation engine, and animation controller.
 */
export class VRMController {
  private adapter: VRMRuntimeAdapter;
  private idleEngine: IdleBehaviorEngine;
  private animController: AnimationController;
  private variationEngine: VariationEngine;
  private planner: ResponseBehaviorPlanner;
  private config: BehaviorSystemConfig;

  private onStateChange?: (state: AvatarState) => void;

  constructor(options?: VRMControllerOptions) {
    this.config = { ...DEFAULT_BEHAVIOR_CONFIG, ...options?.config };
    this.onStateChange = options?.onStateChange;

    this.adapter = new VRMRuntimeAdapter(null);
    this.idleEngine = new IdleBehaviorEngine(this.adapter, this.config);
    this.animController = new AnimationController(this.adapter, this.idleEngine, this.config);
    this.variationEngine = new VariationEngine(this.config);
    this.planner = new ResponseBehaviorPlanner(this.variationEngine);
  }

  /**
   * Attaches a loaded Three.js VRM instance to the controller.
   */
  public setVRM(vrm: VRM | null) {
    this.adapter.attach(vrm);
    if (vrm) {
      const caps = this.adapter.getCapabilities();
      this.variationEngine.setCapabilities(caps);
      this.idleEngine.applyNaturalRestingArmPose();
      this.setState('idle');
    }
  }

  public getVRM(): VRM | null {
    return this.adapter.getRawVRM();
  }

  /**
   * Changes the avatar conversation state (e.g. idle, listening, thinking, speaking, success, error, cancelled).
   */
  public setState(state: AvatarState) {
    this.animController.setConversationState(state);
    if (this.onStateChange) {
      this.onStateChange(state);
    }
  }

  public getState(): AvatarState {
    return this.animController.getConversationState();
  }

  /**
   * Called when an AI response finishes (e.g., SSE 'event: done' or stream completion).
   * Generates a context-aware behavior plan and executes non-repetitive gesture choreography.
   */
  public handleAIResponseComplete(turnId: string, responseText: string): CharacterBehaviorPlan {
    const caps = this.adapter.getCapabilities();
    const plan = this.planner.planResponseBehavior(turnId, responseText, caps);
    this.animController.executePlan(plan);
    this.setState('success');
    return plan;
  }

  /**
   * Called when user stops response generation or request is cancelled.
   */
  public handleStopGeneration() {
    this.animController.cancelCurrentPlan();
    this.setState('cancelled');
    setTimeout(() => {
      if (this.getState() === 'cancelled') {
        this.setState('idle');
      }
    }, 1500);
  }

  /**
   * Triggers a temporary expression override (e.g. from UI buttons).
   */
  public triggerExpression(name: string, weight = 1.0, durationSec = 2.5) {
    this.animController.triggerExpression(name, weight, durationSec * 1000);
  }

  /**
   * Configures reduced motion accessibility mode.
   */
  public setReducedMotion(enabled: boolean) {
    this.config.reducedMotion = enabled;
    this.animController.setConfig({ reducedMotion: enabled });
  }

  /**
   * Updates configuration properties at runtime.
   */
  public updateConfig(newConfig: Partial<BehaviorSystemConfig>) {
    this.config = { ...this.config, ...newConfig };
    this.animController.setConfig(this.config);
    this.variationEngine.setConfig(this.config);
  }

  /**
   * Main per-frame render loop step.
   */
  public update(delta: number, cameraPos?: THREE.Vector3) {
    this.animController.update(delta, cameraPos);
  }

  /**
   * Returns live behavioral diagnostics for developer inspection.
   */
  public getDiagnostics(): BehaviorDiagnostics {
    const diag = this.animController.getDiagnostics();
    diag.history = this.variationEngine.getHistory();
    diag.cooldowns = this.variationEngine.getCooldowns();
    return diag;
  }

  /**
   * Cleans up all resources and timers upon unmount.
   */
  public dispose() {
    this.animController.dispose();
    this.adapter.dispose();
  }
}
