import * as THREE from 'three';
import { VRMRuntimeAdapter } from './vrmRuntimeAdapter';
import { IdleBehaviorEngine } from './idleBehaviorEngine';
import {
  CharacterAction,
  CharacterBehaviorPlan,
  ConversationState,
  BehaviorDiagnostics,
  BehaviorSystemConfig,
  DEFAULT_BEHAVIOR_CONFIG,
} from './behaviorTypes';

interface RunningAction {
  action: CharacterAction;
  elapsedMs: number;
  totalDurationMs: number;
  weight: number; // 0.0 - 1.0
  isFinished: boolean;
}

/**
 * AnimationController:
 * High-level coordinator managing channel separation, gesture blend-in/out,
 * bone conflict prevention, facial expression layers, and conversational state transitions.
 */
export class AnimationController {
  private adapter: VRMRuntimeAdapter;
  private idleEngine: IdleBehaviorEngine;
  private config: BehaviorSystemConfig;

  private currentState: ConversationState = 'idle';
  private currentTurnId: string | null = null;
  private activePlan: CharacterBehaviorPlan | null = null;
  private runningActions: RunningAction[] = [];

  // Active expression weights applied by this controller
  private currentExpressions: Record<string, number> = {};
  // Speech viseme timer for 'speaking' state
  private speechVisemeTime = 0;

  constructor(
    adapter: VRMRuntimeAdapter,
    idleEngine: IdleBehaviorEngine,
    config: BehaviorSystemConfig = DEFAULT_BEHAVIOR_CONFIG
  ) {
    this.adapter = adapter;
    this.idleEngine = idleEngine;
    this.config = { ...config };
  }

  public setConfig(newConfig: Partial<BehaviorSystemConfig>) {
    this.config = { ...this.config, ...newConfig };
    this.idleEngine.setConfig(this.config);
  }

  public setConversationState(state: ConversationState) {
    if (this.currentState === state) return;
    this.currentState = state;

    // Reset speech visemes when leaving speaking state
    if (state !== 'speaking') {
      this.adapter.setExpression('aa', 0);
      this.adapter.setExpression('ih', 0);
    }

    // Apply base baseline expressions for the state
    this.applyStateBaselineExpression(state);
  }

  public getConversationState(): ConversationState {
    return this.currentState;
  }

  /**
   * Schedules and begins execution of a CharacterBehaviorPlan.
   * Cancels any obsolete actions from previous turns.
   */
  public executePlan(plan: CharacterBehaviorPlan) {
    this.currentTurnId = plan.turnId;
    this.activePlan = plan;

    // If reduced motion is enabled, filter or attenuate gestures
    const actionsToRun = this.config.reducedMotion
      ? plan.actions.filter(a => a.category !== 'gesture' || a.name === 'small_nod')
      : plan.actions;

    // Enqueue valid actions
    this.runningActions = actionsToRun.map(action => {
      const delay = action.delayMs || 0;
      const duration = action.durationMs;
      return {
        action,
        elapsedMs: -delay, // Starts counting up from negative delay
        totalDurationMs: duration,
        weight: 0,
        isFinished: false,
      };
    });

    // Apply plan emotion if specified
    if (plan.emotion) {
      this.triggerExpression(plan.emotion, 0.7, 3000);
    }
  }

  /**
   * Safely cancels any active response choreography.
   */
  public cancelCurrentPlan() {
    this.activePlan = null;
    this.currentTurnId = null;
    this.runningActions = [];
    this.adapter.resetExpressions(['happy', 'sad', 'angry', 'surprised', 'relaxed', 'joy']);
    this.applyStateBaselineExpression(this.currentState);
  }

  /**
   * Checks whether arm bones are currently engaged by a gesture.
   */
  public isArmGestureActive(): boolean {
    return this.runningActions.some(
      ra => !ra.isFinished && ra.elapsedMs >= 0 && ra.action.category === 'gesture'
    );
  }

  /**
   * Main per-frame update loop called from the VRM render loop.
   */
  public update(delta: number, cameraPos?: THREE.Vector3) {
    if (!this.adapter.isLoaded()) return;

    const armBusy = this.isArmGestureActive();

    // 1. Update Base Idle Engine (handles breathing, blinking, gaze, weight shifts)
    this.idleEngine.update(delta, this.currentState, cameraPos, armBusy);

    // 2. Update Running Actions (Gestures & Expressions)
    this.updateRunningActions(delta);

    // 3. Update Speaking Visemes if avatar is in 'speaking' state
    if (this.currentState === 'speaking') {
      this.updateSpeechVisemes(delta);
    }

    // 4. Update VRM expressions and spring bones
    this.adapter.update(delta);
  }

  /**
   * Processes active gestures, computing envelope weights and applying procedural bone transforms.
   */
  private updateRunningActions(delta: number) {
    const deltaMs = delta * 1000;

    for (const ra of this.runningActions) {
      if (ra.isFinished) continue;

      ra.elapsedMs += deltaMs;
      if (ra.elapsedMs < 0) continue; // In delay

      const blendInMs = ra.action.blendInMs || 300;
      const blendOutMs = ra.action.blendOutMs || 400;
      const durationMs = ra.totalDurationMs;
      const elapsed = ra.elapsedMs;

      // Compute blend envelope
      let weight = 1.0;
      if (elapsed < blendInMs) {
        // Blend in (smooth sine ease)
        weight = Math.sin((elapsed / blendInMs) * (Math.PI / 2));
      } else if (elapsed > durationMs - blendOutMs) {
        // Blend out
        const remaining = Math.max(0, durationMs - elapsed);
        weight = Math.sin((remaining / blendOutMs) * (Math.PI / 2));
      }

      ra.weight = Math.max(0, Math.min(1, weight)) * (ra.action.intensity || 0.8);

      if (elapsed >= durationMs) {
        ra.isFinished = true;
        ra.weight = 0;
      }

      // Apply procedural transforms for the action
      if (ra.action.category === 'gesture') {
        this.applyGestureBoneTransforms(ra.action.name, ra.weight, elapsed / durationMs);
      } else if (ra.action.category === 'expression') {
        this.adapter.setExpression(ra.action.name, ra.weight);
      }
    }

    // Clean up finished actions
    this.runningActions = this.runningActions.filter(ra => !ra.isFinished);
  }

  /**
   * Applies procedural bone transformations for recognized gesture presets.
   * Smoothly interpolates from the natural resting pose to the gesture pose.
   */
  private applyGestureBoneTransforms(gestureName: string, weight: number, progress: number) {
    if (weight <= 0) return;

    const leftUpperArm = this.adapter.getBone('leftUpperArm');
    const rightUpperArm = this.adapter.getBone('rightUpperArm');
    const leftLowerArm = this.adapter.getBone('leftLowerArm');
    const rightLowerArm = this.adapter.getBone('rightLowerArm');
    const leftHand = this.adapter.getBone('leftHand');
    const rightHand = this.adapter.getBone('rightHand');
    const chest = this.adapter.getBone('chest');
    const head = this.adapter.getBone('head');
    const neck = this.adapter.getBone('neck');

    // Base resting pose constants
    const restLUA = IdleBehaviorEngine.RESTING_POSE.leftUpperArm;
    const restRUA = IdleBehaviorEngine.RESTING_POSE.rightUpperArm;
    const restLLA = IdleBehaviorEngine.RESTING_POSE.leftLowerArm;
    const restRLA = IdleBehaviorEngine.RESTING_POSE.rightLowerArm;

    switch (gestureName) {
      case 'wave_hand':
      case 'wave_greeting': {
        // Right arm raises and waves side to side
        if (rightUpperArm) {
          const targetZ = 0.45;
          const targetX = 0.4;
          rightUpperArm.rotation.z = THREE.MathUtils.lerp(restRUA.z, targetZ, weight);
          rightUpperArm.rotation.x = THREE.MathUtils.lerp(restRUA.x, targetX, weight);
        }
        if (rightLowerArm) {
          const waveAngle = Math.sin(progress * Math.PI * 6) * 0.28; // Rapid friendly wave
          rightLowerArm.rotation.y = THREE.MathUtils.lerp(restRLA.y, -1.25 + waveAngle, weight);
          rightLowerArm.rotation.x = THREE.MathUtils.lerp(restRLA.x, 0.45, weight);
        }
        if (head) {
          head.rotation.z = THREE.MathUtils.lerp(head.rotation.z, -0.06, weight); // Cute slight head tilt
        }
        break;
      }

      case 'explain_open_hand':
      case 'open_hands_explain':
      case 'thoughtful_hand_lift':
      case 'inquiry_hand': {
        // Hands gently raised forward and slightly outward (explaining concept)
        const forwardLift = 0.55;
        if (leftUpperArm) {
          leftUpperArm.rotation.z = THREE.MathUtils.lerp(restLUA.z, -0.75, weight);
          leftUpperArm.rotation.x = THREE.MathUtils.lerp(restLUA.x, forwardLift, weight);
        }
        if (rightUpperArm) {
          rightUpperArm.rotation.z = THREE.MathUtils.lerp(restRUA.z, 0.75, weight);
          rightUpperArm.rotation.x = THREE.MathUtils.lerp(restRUA.x, forwardLift, weight);
        }
        if (leftLowerArm) {
          leftLowerArm.rotation.y = THREE.MathUtils.lerp(restLLA.y, 0.65, weight);
        }
        if (rightLowerArm) {
          rightLowerArm.rotation.y = THREE.MathUtils.lerp(restRLA.y, -0.65, weight);
        }
        break;
      }

      case 'affirmative_nod':
      case 'small_nod':
      case 'measured_nod':
      case 'supportive_nod':
      case 'subtle_acknowledgement':
      case 'happy_smile_nod': {
        // Affirmative head nod (down and return)
        const nodSine = Math.sin(progress * Math.PI * 2);
        const nodAngle = nodSine > 0 ? nodSine * 0.12 : 0;
        if (head) head.rotation.x += nodAngle * weight;
        if (neck) neck.rotation.x += nodAngle * 0.5 * weight;
        break;
      }

      case 'polite_bow':
      case 'polite_welcome':
      case 'apology_bow':
      case 'apologetic_regret': {
        // Japanese polite bow: chest, neck, head tilt forward smoothly
        const bowCurve = Math.sin(progress * Math.PI);
        if (chest) chest.rotation.x += bowCurve * 0.18 * weight;
        if (neck) neck.rotation.x += bowCurve * 0.10 * weight;
        if (head) head.rotation.x += bowCurve * 0.08 * weight;
        if (leftUpperArm) leftUpperArm.rotation.x = THREE.MathUtils.lerp(restLUA.x, 0.28, weight);
        if (rightUpperArm) rightUpperArm.rotation.x = THREE.MathUtils.lerp(restRUA.x, 0.28, weight);
        break;
      }

      case 'curious_head_tilt':
      case 'thinking_tilt':
      case 'concerned_reaction': {
        // Head tilted curiously to the side with slight upward gaze
        if (head) {
          head.rotation.z += 0.12 * weight;
          head.rotation.x -= 0.08 * weight;
        }
        if (neck) {
          neck.rotation.z += 0.06 * weight;
        }
        break;
      }

      case 'joyful_cheer':
      case 'celebrate_hands':
      case 'happy_bounce': {
        // Both hands raised happily with joyful pose
        if (leftUpperArm) {
          leftUpperArm.rotation.z = THREE.MathUtils.lerp(restLUA.z, -0.4, weight);
          leftUpperArm.rotation.x = THREE.MathUtils.lerp(restLUA.x, 0.8, weight);
        }
        if (rightUpperArm) {
          rightUpperArm.rotation.z = THREE.MathUtils.lerp(restRUA.z, 0.4, weight);
          rightUpperArm.rotation.x = THREE.MathUtils.lerp(restRUA.x, 0.8, weight);
        }
        if (leftLowerArm) {
          leftLowerArm.rotation.y = THREE.MathUtils.lerp(restLLA.y, 0.9, weight);
        }
        if (rightLowerArm) {
          rightLowerArm.rotation.y = THREE.MathUtils.lerp(restRLA.y, -0.9, weight);
        }
        break;
      }

      case 'gentle_reassurance':
      case 'comfort_hand': {
        // Right hand placed softly towards chest
        if (rightUpperArm) {
          rightUpperArm.rotation.z = THREE.MathUtils.lerp(restRUA.z, 0.6, weight);
          rightUpperArm.rotation.x = THREE.MathUtils.lerp(restRUA.x, 0.5, weight);
        }
        if (rightLowerArm) {
          rightLowerArm.rotation.y = THREE.MathUtils.lerp(restRLA.y, -1.1, weight);
        }
        break;
      }

      case 'serious_caution':
      case 'warning_gesture': {
        // Warning: right hand raised with warning palm
        if (rightUpperArm) {
          rightUpperArm.rotation.z = THREE.MathUtils.lerp(restRUA.z, 0.65, weight);
          rightUpperArm.rotation.x = THREE.MathUtils.lerp(restRUA.x, 0.7, weight);
        }
        if (rightLowerArm) {
          rightLowerArm.rotation.y = THREE.MathUtils.lerp(restRLA.y, -0.7, weight);
        }
        break;
      }

      case 'calm_settle':
      case 'confident_agree': {
        if (chest) chest.rotation.x += Math.sin(progress * Math.PI) * 0.05 * weight;
        if (head) head.rotation.x += Math.sin(progress * Math.PI) * 0.04 * weight;
        break;
      }

      default:
        // Unknown gesture gracefully skipped
        break;
    }
  }

  /**
   * Natural vowel mouth oscillation during speech.
   */
  private updateSpeechVisemes(delta: number) {
    this.speechVisemeTime += delta * 11;
    // Multi-frequency harmonic mimicking natural vocal syllabic cadence
    const vowelCadence = Math.max(
      0,
      Math.sin(this.speechVisemeTime) * 0.45 +
      Math.sin(this.speechVisemeTime * 2.3) * 0.35 +
      0.15
    );

    this.adapter.setExpression('aa', Math.min(0.7, vowelCadence * 0.8));
    this.adapter.setExpression('ih', Math.min(0.4, (1 - vowelCadence) * 0.3));
  }

  /**
   * Applies baseline expression suited to conversation state.
   */
  private applyStateBaselineExpression(state: ConversationState) {
    this.adapter.resetExpressions(['happy', 'sad', 'surprised', 'relaxed', 'neutral']);

    switch (state) {
      case 'idle':
        this.adapter.setExpression('neutral', 0.8);
        break;
      case 'listening':
        this.adapter.setExpression('neutral', 0.6);
        this.adapter.setExpression('relaxed', 0.35);
        break;
      case 'thinking':
        this.adapter.setExpression('relaxed', 0.5);
        break;
      case 'speaking':
        this.adapter.setExpression('happy', 0.3);
        break;
      case 'success':
        this.adapter.setExpression('happy', 0.85);
        break;
      case 'error':
        this.adapter.setExpression('sad', 0.6);
        this.adapter.setExpression('surprised', 0.3);
        break;
      case 'cancelled':
        this.adapter.setExpression('neutral', 0.9);
        break;
    }
  }

  /**
   * Triggers a temporary expression override.
   */
  public triggerExpression(name: string, weight = 1.0, durationMs = 2500) {
    this.adapter.setExpression(name, weight);
    setTimeout(() => {
      this.adapter.setExpression(name, 0);
      this.applyStateBaselineExpression(this.currentState);
    }, durationMs);
  }

  /**
   * Returns runtime diagnostics for developer debugging.
   */
  public getDiagnostics(): BehaviorDiagnostics {
    return {
      currentState: this.currentState,
      activeIntent: this.activePlan?.intent,
      activeActions: this.runningActions.map(ra => `${ra.action.name} (${Math.round(ra.weight * 100)}%)`),
      activeExpressions: { ...this.currentExpressions },
      history: [],
      cooldowns: {},
      lastPlan: this.activePlan || undefined,
      reducedMotionActive: this.config.reducedMotion,
    };
  }

  public dispose() {
    this.cancelCurrentPlan();
    this.idleEngine.reset();
  }
}
