import * as THREE from 'three';
import { VRM } from '@pixiv/three-vrm';

export type AvatarState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'success' | 'error';
export type CameraPreset = 'portrait' | 'upper-body' | 'full-body' | 'reset';

export interface VRMControllerOptions {
  onStateChange?: (state: AvatarState) => void;
}

export class VRMController {
  private vrm: VRM | null = null;
  private currentState: AvatarState = 'idle';
  private stateTimer = 0;
  
  // Natural Blinking
  private blinkTimer = 0;
  private blinkInterval = 3.5;
  private isBlinking = false;
  private blinkProgress = 0;
  
  // Natural Breathing
  private breathTime = 0;
  
  // Lip Sync / Speaking oscillation
  private speechTime = 0;
  
  // Head subtle motion
  private lookTarget = new THREE.Vector3(0, 1.4, 1.5);
  private currentLook = new THREE.Vector3(0, 1.4, 1.5);

  constructor(options?: VRMControllerOptions) {
    // Controller initialized
  }

  public setVRM(vrm: VRM | null) {
    this.vrm = vrm;
    this.resetPose();
    this.applyNaturalRestingPose();
  }

  public getVRM(): VRM | null {
    return this.vrm;
  }

  public setState(state: AvatarState) {
    if (this.currentState === state) return;
    this.currentState = state;
    this.stateTimer = 0;
    this.applyExpressionForState(state);
  }

  public getState(): AvatarState {
    return this.currentState;
  }

  private applyNaturalRestingPose() {
    if (!this.vrm?.humanoid) return;
    try {
      const leftUpperArm = this.vrm.humanoid.getNormalizedBoneNode('leftUpperArm');
      const rightUpperArm = this.vrm.humanoid.getNormalizedBoneNode('rightUpperArm');
      const leftLowerArm = this.vrm.humanoid.getNormalizedBoneNode('leftLowerArm');
      const rightLowerArm = this.vrm.humanoid.getNormalizedBoneNode('rightLowerArm');

      if (leftUpperArm) {
        leftUpperArm.rotation.z = -1.22;
        leftUpperArm.rotation.x = 0.18;
      }
      if (rightUpperArm) {
        rightUpperArm.rotation.z = 1.22;
        rightUpperArm.rotation.x = 0.18;
      }
      if (leftLowerArm) {
        leftLowerArm.rotation.y = 0.25;
        leftLowerArm.rotation.x = 0.1;
      }
      if (rightLowerArm) {
        rightLowerArm.rotation.y = -0.25;
        rightLowerArm.rotation.x = 0.1;
      }
    } catch {}
  }

  private resetPose() {
    if (!this.vrm) return;
    try {
      this.clearAllExpressions();
      this.applyNaturalRestingPose();
      if (this.vrm.expressionManager) {
        this.vrm.expressionManager.setValue('neutral', 1.0);
        this.vrm.expressionManager.update();
      }
    } catch {
      // Graceful fallback if expressions not supported
    }
  }

  private clearAllExpressions() {
    if (!this.vrm?.expressionManager) return;
    const exp = this.vrm.expressionManager;
    const names = ['happy', 'sad', 'surprised', 'relaxed', 'neutral', 'aa', 'ih', 'ou', 'ee', 'oh', 'blink', 'joy'];
    names.forEach(name => {
      try {
        exp.setValue(name, 0);
      } catch {}
    });
  }

  public triggerExpression(name: string, weight = 1.0, durationSec = 2.5) {
    if (!this.vrm?.expressionManager) return;
    try {
      this.clearAllExpressions();
      this.vrm.expressionManager.setValue(name, weight);
      setTimeout(() => {
        if (this.vrm?.expressionManager) {
          this.vrm.expressionManager.setValue(name, 0);
          this.applyExpressionForState(this.currentState);
        }
      }, durationSec * 1000);
    } catch {}
  }

  private applyExpressionForState(state: AvatarState) {
    if (!this.vrm?.expressionManager) return;
    const exp = this.vrm.expressionManager;
    try {
      this.clearAllExpressions();
      switch (state) {
        case 'idle':
          exp.setValue('neutral', 0.8);
          break;
        case 'listening':
          exp.setValue('neutral', 0.6);
          exp.setValue('relaxed', 0.4);
          break;
        case 'thinking':
          exp.setValue('relaxed', 0.5);
          break;
        case 'speaking':
          exp.setValue('happy', 0.3);
          break;
        case 'success':
          exp.setValue('happy', 0.85);
          break;
        case 'error':
          exp.setValue('sad', 0.6);
          exp.setValue('surprised', 0.3);
          break;
      }
      exp.update();
    } catch {}
  }

  public update(delta: number, cameraPos?: THREE.Vector3) {
    if (!this.vrm) return;

    this.stateTimer += delta;
    this.breathTime += delta;
    
    // 1. Natural Breathing & Resting Arm Pose
    try {
      this.applyNaturalRestingPose();
      const chestNode = this.vrm.humanoid?.getNormalizedBoneNode('chest') ||
                        this.vrm.humanoid?.getNormalizedBoneNode('spine');
      if (chestNode) {
        const breathAmount = Math.sin(this.breathTime * 1.8) * 0.02;
        chestNode.rotation.x = breathAmount;
      }
    } catch {}

    // 2. Natural Blinking Loop (every 3-5 seconds, quick 140ms blink)
    this.blinkTimer += delta;
    if (!this.isBlinking && this.blinkTimer > this.blinkInterval) {
      this.isBlinking = true;
      this.blinkTimer = 0;
      this.blinkInterval = 2.8 + Math.random() * 2.5; // Next random interval
      this.blinkProgress = 0;
    }

    if (this.isBlinking && this.vrm.expressionManager) {
      this.blinkProgress += delta * 9; // speed
      if (this.blinkProgress < 1.0) {
        // Closing eye
        this.vrm.expressionManager.setValue('blink', Math.sin(this.blinkProgress * Math.PI));
      } else {
        // Finished blink
        this.vrm.expressionManager.setValue('blink', 0);
        this.isBlinking = false;
      }
    }

    // 3. Lip Sync / Mouth Movement when Speaking
    if (this.currentState === 'speaking' && this.vrm.expressionManager) {
      this.speechTime += delta * 12;
      // Multi-frequency speech oscillation mimicking Japanese vowels
      const mouthOpen = Math.max(0, (Math.sin(this.speechTime) * 0.5 + Math.sin(this.speechTime * 2.3) * 0.3 + 0.2));
      try {
        this.vrm.expressionManager.setValue('aa', mouthOpen * 0.7);
        this.vrm.expressionManager.setValue('ih', (1 - mouthOpen) * 0.3);
      } catch {}
    } else if (this.vrm.expressionManager) {
      try {
        this.vrm.expressionManager.setValue('aa', 0);
        this.vrm.expressionManager.setValue('ih', 0);
      } catch {}
    }

    // 4. LookAt towards camera or target
    if (cameraPos && this.vrm.lookAt) {
      try {
        // Smooth interpolation towards camera
        this.targetLookPosition(cameraPos, delta);
        this.vrm.lookAt.lookAt(this.currentLook);
      } catch {}
    }

    // Update expressions and humanoid constraints
    try {
      this.vrm.expressionManager?.update();
      this.vrm.update(delta);
    } catch {}
  }

  private targetLookPosition(target: THREE.Vector3, delta: number) {
    const lerpSpeed = this.currentState === 'thinking' ? 1.5 : 4.0;
    if (this.currentState === 'thinking') {
      // Look slightly upward when thinking
      this.lookTarget.set(target.x * 0.5, target.y + 0.3, target.z);
    } else {
      this.lookTarget.copy(target);
    }
    this.currentLook.lerp(this.lookTarget, Math.min(1, delta * lerpSpeed));
  }
}
