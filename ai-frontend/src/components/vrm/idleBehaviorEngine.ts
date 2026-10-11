import * as THREE from 'three';
import { VRMRuntimeAdapter } from './vrmRuntimeAdapter';
import { BehaviorSystemConfig, DEFAULT_BEHAVIOR_CONFIG, ConversationState } from './behaviorTypes';

/**
 * IdleVariation:
 * Represents a spontaneous subtle variation while the character is idling.
 */
export interface IdleVariation {
  id: string;
  name: string;
  durationMs: number;
  cooldownMs: number;
  lastExecutedAt: number;
  weight: number;
}

/**
 * IdleBehaviorEngine:
 * Keeps the VRM character subtly alive during idle and waiting states.
 * Produces:
 * 1. Multi-bone procedural breathing (chest, spine, shoulders).
 * 2. Randomized bounded blinking (2.8 - 5.5s intervals, 160ms duration).
 * 3. Continuous gentle head micro-rotations (yaw/pitch/roll wandering).
 * 4. Micro-gaze wandering within a bounded cone and returning to camera.
 * 5. Slow weight-shifting (8-12s cycles).
 * 6. Periodic idle variations (curious tilt, gentle nod, look around, deep breath).
 */
export class IdleBehaviorEngine {
  private adapter: VRMRuntimeAdapter;
  private config: BehaviorSystemConfig;

  // Time accumulators
  private elapsedTime = 0;
  private breathTime = 0;
  private weightShiftTime = 0;

  // Blinking state
  private blinkTimer = 0;
  private nextBlinkInterval = 3.5;
  private isBlinking = false;
  private blinkProgress = 0;

  // Gaze wandering
  private gazeDriftTimer = 0;
  private nextGazeDriftInterval = 4.0;
  private gazeOffset = new THREE.Vector3(0, 0, 0);
  private targetGazeOffset = new THREE.Vector3(0, 0, 0);

  // Head micro-rotations
  private headYawTarget = 0;
  private headPitchTarget = 0;
  private headRollTarget = 0;
  private headYawCurrent = 0;
  private headPitchCurrent = 0;
  private headRollCurrent = 0;
  private headWanderTimer = 0;
  private nextHeadWanderInterval = 3.0;

  // Idle variations catalog
  private variations: IdleVariation[] = [
    { id: 'curious_tilt', name: 'Curious Tilt', durationMs: 2400, cooldownMs: 14000, lastExecutedAt: 0, weight: 1.0 },
    { id: 'gentle_nod', name: 'Gentle Nod', durationMs: 1800, cooldownMs: 16000, lastExecutedAt: 0, weight: 0.9 },
    { id: 'look_around', name: 'Look Around', durationMs: 3200, cooldownMs: 22000, lastExecutedAt: 0, weight: 0.7 },
    { id: 'deep_breath', name: 'Deep Breath', durationMs: 2800, cooldownMs: 18000, lastExecutedAt: 0, weight: 0.8 },
    { id: 'weight_shift', name: 'Weight Shift', durationMs: 3500, cooldownMs: 20000, lastExecutedAt: 0, weight: 0.7 },
  ];

  // Active variation execution state
  private activeVariation: IdleVariation | null = null;
  private variationProgress = 0; // 0 to 1
  private variationTimer = 0;
  private nextVariationCooldown = 10.0; // Seconds between variation evaluations

  // Base resting arm angles (natural anime companion stance)
  public static readonly RESTING_POSE = {
    leftUpperArm: { z: -1.22, x: 0.18, y: 0.0 },
    rightUpperArm: { z: 1.22, x: 0.18, y: 0.0 },
    leftLowerArm: { y: 0.25, x: 0.10, z: 0.0 },
    rightLowerArm: { y: -0.25, x: 0.10, z: 0.0 },
  };

  constructor(adapter: VRMRuntimeAdapter, config: BehaviorSystemConfig = DEFAULT_BEHAVIOR_CONFIG) {
    this.adapter = adapter;
    this.config = { ...config };
    this.scheduleNextBlink();
    this.scheduleNextHeadWander();
    this.scheduleNextGazeDrift();
  }

  public setConfig(newConfig: Partial<BehaviorSystemConfig>) {
    this.config = { ...this.config, ...newConfig };
  }

  public getConfig(): BehaviorSystemConfig {
    return { ...this.config };
  }

  /**
   * Main per-frame update loop called from VRM render tick.
   * @param delta Seconds elapsed since previous frame
   * @param currentState Current conversation lifecycle state
   * @param baseCameraPos Camera position for lookAt orientation
   * @param armBonesControlledByGesture Whether higher-priority gestures currently control arms
   */
  public update(
    delta: number,
    currentState: ConversationState,
    baseCameraPos?: THREE.Vector3,
    armBonesControlledByGesture = false
  ) {
    if (!this.adapter.isLoaded() || !this.config.idleEnabled) return;

    this.elapsedTime += delta;
    const intensity = this.config.reducedMotion ? this.config.idleIntensity * 0.3 : this.config.idleIntensity;

    // 1. Natural Resting Pose for Arms (if not overridden by contextual gestures)
    if (!armBonesControlledByGesture) {
      this.applyNaturalRestingArmPose();
    }

    // 2. Multi-bone procedural breathing
    this.updateBreathing(delta, intensity);

    // 3. Natural blinking loop
    this.updateBlinking(delta);

    // 4. Weight Shifting (subtle hip/spine sway)
    this.updateWeightShift(delta, intensity);

    // 5. Head wandering & Gaze offset
    this.updateHeadAndGaze(delta, baseCameraPos, currentState, intensity);

    // 6. Idle Variations (only eligible during 'idle' or 'listening' state and when arms are free)
    if ((currentState === 'idle' || currentState === 'listening') && !armBonesControlledByGesture) {
      this.updateIdleVariations(delta, intensity);
    } else if (this.activeVariation) {
      // Yield immediately to higher priority state
      this.activeVariation = null;
      this.variationProgress = 0;
    }
  }

  /**
   * Continuous multi-bone breathing:
   * Subtle expansion and contraction across chest, spine, shoulders, and hips.
   */
  private updateBreathing(delta: number, intensity: number) {
    this.breathTime += delta;
    const breathCycle = Math.sin(this.breathTime * 1.7); // ~3.7s breath cycle

    const chest = this.adapter.getBone('chest') || this.adapter.getBone('upperChest');
    const spine = this.adapter.getBone('spine');
    const leftShoulder = this.adapter.getBone('leftShoulder');
    const rightShoulder = this.adapter.getBone('rightShoulder');
    const hips = this.adapter.getBone('hips');

    // Breathing chest expansion (pitch)
    if (chest) {
      chest.rotation.x = breathCycle * 0.025 * intensity;
    }
    // Spine counter-balance
    if (spine) {
      spine.rotation.x = breathCycle * 0.012 * intensity;
    }
    // Shoulders rise slightly with inhalation
    if (leftShoulder) {
      leftShoulder.rotation.z = -breathCycle * 0.015 * intensity;
    }
    if (rightShoulder) {
      rightShoulder.rotation.z = breathCycle * 0.015 * intensity;
    }
    // Very subtle hip bob
    if (hips) {
      hips.position.y = (Math.sin(this.breathTime * 1.7) * 0.003) * intensity;
    }
  }

  /**
   * Natural randomized blinking:
   * Occurs every 2.8 - 5.5s with a quick 140 - 180ms smooth curve.
   */
  private updateBlinking(delta: number) {
    this.blinkTimer += delta;

    if (!this.isBlinking && this.blinkTimer > this.nextBlinkInterval) {
      this.isBlinking = true;
      this.blinkTimer = 0;
      this.blinkProgress = 0;
      this.scheduleNextBlink();
    }

    if (this.isBlinking) {
      this.blinkProgress += delta * 7.5; // ~150ms blink
      if (this.blinkProgress < 1.0) {
        // Smooth sine curve: opens, closes, opens
        const blinkWeight = Math.sin(this.blinkProgress * Math.PI);
        this.adapter.setExpression('blink', blinkWeight);
      } else {
        this.adapter.setExpression('blink', 0);
        this.isBlinking = false;
        this.blinkProgress = 0;
      }
    }
  }

  private scheduleNextBlink() {
    this.nextBlinkInterval = 2.8 + Math.random() * 2.7;
  }

  /**
   * Subtle weight shifting over slow 8-12s cycles.
   */
  private updateWeightShift(delta: number, intensity: number) {
    this.weightShiftTime += delta * 0.55;
    const shift = Math.sin(this.weightShiftTime * 0.6); // slow sway

    const hips = this.adapter.getBone('hips');
    const spine = this.adapter.getBone('spine');

    if (hips) {
      hips.rotation.z = shift * 0.015 * intensity;
      hips.rotation.y = Math.cos(this.weightShiftTime * 0.6) * 0.01 * intensity;
    }
    if (spine) {
      spine.rotation.z = -shift * 0.01 * intensity;
    }
  }

  /**
   * Head wandering & LookAt target updating:
   * Smoothly interpolates head rotations and gaze target to keep character alive.
   */
  private updateHeadAndGaze(
    delta: number,
    baseCameraPos: THREE.Vector3 | undefined,
    state: ConversationState,
    intensity: number
  ) {
    // 1. Head orientation wandering
    this.headWanderTimer += delta;
    if (this.headWanderTimer > this.nextHeadWanderInterval) {
      this.headWanderTimer = 0;
      this.scheduleNextHeadWander();
      // Bounded head target angles (radians)
      this.headYawTarget = (Math.random() - 0.5) * 0.08 * intensity;
      this.headPitchTarget = (Math.random() - 0.45) * 0.06 * intensity;
      this.headRollTarget = (Math.random() - 0.5) * 0.04 * intensity;
    }

    // Special state biases
    let targetPitch = this.headPitchTarget;
    let targetRoll = this.headRollTarget;
    if (state === 'thinking') {
      targetPitch += 0.08; // tilt up
      targetRoll += 0.06;  // tilt side
    } else if (state === 'listening') {
      targetPitch += 0.03; // slight attentive nod
    }

    // Smooth head interpolation
    const lerpRate = Math.min(1, delta * 2.5);
    this.headYawCurrent += (this.headYawTarget - this.headYawCurrent) * lerpRate;
    this.headPitchCurrent += (targetPitch - this.headPitchCurrent) * lerpRate;
    this.headRollCurrent += (targetRoll - this.headRollCurrent) * lerpRate;

    const head = this.adapter.getBone('head');
    const neck = this.adapter.getBone('neck');

    if (head) {
      head.rotation.y = this.headYawCurrent * 0.6;
      head.rotation.x = this.headPitchCurrent * 0.6;
      head.rotation.z = this.headRollCurrent * 0.6;
    }
    if (neck) {
      neck.rotation.y = this.headYawCurrent * 0.4;
      neck.rotation.x = this.headPitchCurrent * 0.4;
      neck.rotation.z = this.headRollCurrent * 0.4;
    }

    // 2. Gaze drift
    this.gazeDriftTimer += delta;
    if (this.gazeDriftTimer > this.nextGazeDriftInterval) {
      this.gazeDriftTimer = 0;
      this.scheduleNextGazeDrift();
      // 70% probability to return to camera, 30% to glance slightly away
      if (Math.random() < 0.7 || state === 'speaking' || state === 'listening') {
        this.targetGazeOffset.set(0, 0, 0);
      } else {
        this.targetGazeOffset.set(
          (Math.random() - 0.5) * 0.25,
          (Math.random() - 0.3) * 0.15,
          0
        );
      }
    }

    this.gazeOffset.lerp(this.targetGazeOffset, Math.min(1, delta * 3.0));

    if (baseCameraPos) {
      const finalLookAtPos = new THREE.Vector3().copy(baseCameraPos).add(this.gazeOffset);
      this.adapter.lookAt(finalLookAtPos);
    }
  }

  private scheduleNextHeadWander() {
    this.nextHeadWanderInterval = 2.5 + Math.random() * 2.5;
  }

  private scheduleNextGazeDrift() {
    this.nextGazeDriftInterval = 3.0 + Math.random() * 3.0;
  }

  /**
   * Restores anime companion natural resting arm pose:
   * Keeps arms gently resting at the sides rather than default T-Pose or A-Pose.
   */
  public applyNaturalRestingArmPose() {
    const leftUpperArm = this.adapter.getBone('leftUpperArm');
    const rightUpperArm = this.adapter.getBone('rightUpperArm');
    const leftLowerArm = this.adapter.getBone('leftLowerArm');
    const rightLowerArm = this.adapter.getBone('rightLowerArm');

    if (leftUpperArm) {
      leftUpperArm.rotation.z = THREE.MathUtils.lerp(leftUpperArm.rotation.z, IdleBehaviorEngine.RESTING_POSE.leftUpperArm.z, 0.15);
      leftUpperArm.rotation.x = THREE.MathUtils.lerp(leftUpperArm.rotation.x, IdleBehaviorEngine.RESTING_POSE.leftUpperArm.x, 0.15);
      leftUpperArm.rotation.y = THREE.MathUtils.lerp(leftUpperArm.rotation.y, IdleBehaviorEngine.RESTING_POSE.leftUpperArm.y, 0.15);
    }
    if (rightUpperArm) {
      rightUpperArm.rotation.z = THREE.MathUtils.lerp(rightUpperArm.rotation.z, IdleBehaviorEngine.RESTING_POSE.rightUpperArm.z, 0.15);
      rightUpperArm.rotation.x = THREE.MathUtils.lerp(rightUpperArm.rotation.x, IdleBehaviorEngine.RESTING_POSE.rightUpperArm.x, 0.15);
      rightUpperArm.rotation.y = THREE.MathUtils.lerp(rightUpperArm.rotation.y, IdleBehaviorEngine.RESTING_POSE.rightUpperArm.y, 0.15);
    }
    if (leftLowerArm) {
      leftLowerArm.rotation.y = THREE.MathUtils.lerp(leftLowerArm.rotation.y, IdleBehaviorEngine.RESTING_POSE.leftLowerArm.y, 0.15);
      leftLowerArm.rotation.x = THREE.MathUtils.lerp(leftLowerArm.rotation.x, IdleBehaviorEngine.RESTING_POSE.leftLowerArm.x, 0.15);
    }
    if (rightLowerArm) {
      rightLowerArm.rotation.y = THREE.MathUtils.lerp(rightLowerArm.rotation.y, IdleBehaviorEngine.RESTING_POSE.rightLowerArm.y, 0.15);
      rightLowerArm.rotation.x = THREE.MathUtils.lerp(rightLowerArm.rotation.x, IdleBehaviorEngine.RESTING_POSE.rightLowerArm.x, 0.15);
    }
  }

  /**
   * Periodic procedural idle variations:
   * Executes subtle personality behaviors when idle for a prolonged period.
   */
  private updateIdleVariations(delta: number, intensity: number) {
    if (this.config.reducedMotion) return;

    const now = Date.now();

    // If an idle variation is currently running
    if (this.activeVariation) {
      this.variationTimer += delta * 1000;
      const progress = Math.min(1, this.variationTimer / this.activeVariation.durationMs);
      this.variationProgress = progress;

      // Bell curve factor for smooth in & out (0 -> 1 -> 0)
      const envelope = Math.sin(progress * Math.PI);

      this.executeVariationEnvelope(this.activeVariation.id, envelope * intensity);

      if (progress >= 1.0) {
        // Complete variation
        this.activeVariation.lastExecutedAt = now;
        this.activeVariation = null;
        this.variationProgress = 0;
        this.nextVariationCooldown = 8.0 + Math.random() * 12.0; // Wait 8-20s before next variation
      }
      return;
    }

    // Cooldown counter before evaluating next variation
    this.nextVariationCooldown -= delta;
    if (this.nextVariationCooldown <= 0) {
      this.tryTriggerIdleVariation(now);
    }
  }

  private tryTriggerIdleVariation(now: number) {
    const eligible = this.variations.filter(v => now - v.lastExecutedAt > v.cooldownMs);
    if (eligible.length === 0) {
      this.nextVariationCooldown = 6.0;
      return;
    }

    // Weighted random selection
    const totalWeight = eligible.reduce((acc, cur) => acc + cur.weight, 0);
    let rand = Math.random() * totalWeight;
    let chosen = eligible[0];

    for (const v of eligible) {
      if (rand < v.weight) {
        chosen = v;
        break;
      }
      rand -= v.weight;
    }

    this.activeVariation = chosen;
    this.variationTimer = 0;
    this.variationProgress = 0;
  }

  private executeVariationEnvelope(variationId: string, amount: number) {
    const head = this.adapter.getBone('head');
    const neck = this.adapter.getBone('neck');
    const spine = this.adapter.getBone('spine');

    switch (variationId) {
      case 'curious_tilt':
        if (head) head.rotation.z += amount * 0.08;
        if (neck) neck.rotation.z += amount * 0.04;
        this.adapter.setExpression('relaxed', amount * 0.3);
        break;

      case 'gentle_nod':
        if (head) head.rotation.x += amount * 0.07;
        if (neck) neck.rotation.x += amount * 0.04;
        break;

      case 'look_around':
        if (head) head.rotation.y += Math.sin(this.variationProgress * Math.PI * 2) * 0.12 * amount;
        break;

      case 'deep_breath':
        const chest = this.adapter.getBone('chest');
        if (chest) chest.rotation.x += amount * 0.06;
        this.adapter.setExpression('relaxed', amount * 0.4);
        break;

      case 'weight_shift':
        if (spine) spine.rotation.z += amount * 0.03;
        break;
    }
  }

  public getActiveVariation(): string | null {
    return this.activeVariation ? this.activeVariation.name : null;
  }

  public reset() {
    this.activeVariation = null;
    this.variationProgress = 0;
    this.variationTimer = 0;
    this.isBlinking = false;
    this.blinkProgress = 0;
    this.adapter.setExpression('blink', 0);
  }
}
