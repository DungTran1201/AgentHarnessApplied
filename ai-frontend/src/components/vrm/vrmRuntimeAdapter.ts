import * as THREE from 'three';
import { VRM, VRMHumanBoneName, VRMUtils } from '@pixiv/three-vrm';
import { VRMCapabilities } from './behaviorTypes';

/**
 * VRMRuntimeAdapter:
 * Provides a safe, isolated abstraction over the Three.js VRM instance.
 * Protects higher-level behavior engines from low-level WebGL/Three.js errors.
 */
export class VRMRuntimeAdapter {
  private vrm: VRM | null = null;
  private capabilities: VRMCapabilities = {
    hasHumanoid: false,
    hasExpressions: false,
    hasLookAt: false,
    hasSpringBones: false,
    availableBones: [],
    availableExpressions: [],
  };

  constructor(vrm?: VRM | null) {
    if (vrm) {
      this.attach(vrm);
    }
  }

  public attach(vrm: VRM | null) {
    this.vrm = vrm;
    this.capabilities = this.detectCapabilities(vrm);
  }

  public detach() {
    this.vrm = null;
    this.capabilities = {
      hasHumanoid: false,
      hasExpressions: false,
      hasLookAt: false,
      hasSpringBones: false,
      availableBones: [],
      availableExpressions: [],
    };
  }

  public isLoaded(): boolean {
    return this.vrm !== null;
  }

  public getCapabilities(): VRMCapabilities {
    return this.capabilities;
  }

  public getRawVRM(): VRM | null {
    return this.vrm;
  }

  /**
   * Safely retrieves a humanoid bone node. Returns null if unavailable.
   */
  public getBone(boneName: string): THREE.Object3D | null {
    if (!this.vrm?.humanoid) return null;
    try {
      return this.vrm.humanoid.getNormalizedBoneNode(boneName as VRMHumanBoneName) || null;
    } catch {
      return null;
    }
  }

  /**
   * Safely sets expression weight (clamped 0.0 - 1.0).
   */
  public setExpression(name: string, weight: number): boolean {
    if (!this.vrm?.expressionManager) return false;
    try {
      const clamped = Math.max(0, Math.min(1, weight));
      this.vrm.expressionManager.setValue(name, clamped);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Batch clear expressions back to zero.
   */
  public resetExpressions(expressionNames: string[]) {
    if (!this.vrm?.expressionManager) return;
    for (const name of expressionNames) {
      try {
        this.vrm.expressionManager.setValue(name, 0);
      } catch {}
    }
  }

  /**
   * Updates lookAt target position smoothly.
   */
  public lookAt(targetPosition: THREE.Vector3) {
    if (!this.vrm?.lookAt) return;
    try {
      this.vrm.lookAt.lookAt(targetPosition);
    } catch {}
  }

  /**
   * Calls vrm.update(delta) and expression updates.
   */
  public update(delta: number) {
    if (!this.vrm) return;
    try {
      this.vrm.expressionManager?.update();
      this.vrm.update(delta);
    } catch (err) {
      console.warn('VRMRuntimeAdapter update error:', err);
    }
  }

  /**
   * Deep dispose of VRM resources to prevent GPU leaks.
   */
  public dispose() {
    if (this.vrm) {
      try {
        VRMUtils.deepDispose(this.vrm.scene);
      } catch {}
      this.detach();
    }
  }

  private detectCapabilities(vrm: VRM | null): VRMCapabilities {
    if (!vrm) {
      return {
        hasHumanoid: false,
        hasExpressions: false,
        hasLookAt: false,
        hasSpringBones: false,
        availableBones: [],
        availableExpressions: [],
      };
    }

    const availableBones: string[] = [];
    if (vrm.humanoid) {
      const checkBones: VRMHumanBoneName[] = [
        'hips', 'spine', 'chest', 'upperChest', 'neck', 'head',
        'leftShoulder', 'leftUpperArm', 'leftLowerArm', 'leftHand',
        'rightShoulder', 'rightUpperArm', 'rightLowerArm', 'rightHand',
        'leftUpperLeg', 'leftLowerLeg', 'leftFoot',
        'rightUpperLeg', 'rightLowerLeg', 'rightFoot',
      ];
      for (const b of checkBones) {
        if (vrm.humanoid.getNormalizedBoneNode(b)) {
          availableBones.push(b);
        }
      }
    }

    const availableExpressions: string[] = [];
    if (vrm.expressionManager) {
      const checkExprs = [
        'happy', 'sad', 'angry', 'surprised', 'relaxed', 'neutral',
        'blink', 'blinkLeft', 'blinkRight',
        'aa', 'ih', 'ou', 'ee', 'oh',
      ];
      for (const e of checkExprs) {
        try {
          // If expressionManager doesn't throw or recognizes it
          vrm.expressionManager.setValue(e, 0);
          availableExpressions.push(e);
        } catch {}
      }
    }

    return {
      hasHumanoid: Boolean(vrm.humanoid && availableBones.length > 0),
      hasExpressions: Boolean(vrm.expressionManager && availableExpressions.length > 0),
      hasLookAt: Boolean(vrm.lookAt),
      hasSpringBones: Boolean(vrm.springBoneManager),
      availableBones,
      availableExpressions,
    };
  }
}
