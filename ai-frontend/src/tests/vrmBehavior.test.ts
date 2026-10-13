import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ResponseBehaviorPlanner, INTENT_ACTION_CATALOG } from '../components/vrm/responseBehaviorPlanner.ts';
import { VariationEngine, ActionCandidate } from '../components/vrm/variationEngine.ts';
import { VRMCapabilities, CharacterBehaviorPlan } from '../components/vrm/behaviorTypes.ts';
import { IdleBehaviorEngine } from '../components/vrm/idleBehaviorEngine.ts';

describe('AI-Chan VRM Behavioral System Tests', () => {
  describe('ResponseBehaviorPlanner - Intent Classification', () => {
    const variationEngine = new VariationEngine();
    const planner = new ResponseBehaviorPlanner(variationEngine);

    it('classifies Vietnamese and English greetings correctly', () => {
      assert.equal(planner.classifyIntent('Xin chào bạn, mình là AI-Chan!'), 'greeting');
      assert.equal(planner.classifyIntent('Hello there! How can I help today?'), 'greeting');
      assert.equal(planner.classifyIntent('Konnichiwa! Rất vui được gặp bạn.'), 'greeting');
    });

    it('classifies explanatory responses correctly', () => {
      assert.equal(
        planner.classifyIntent('Để giải thích nguyên lý này, trước hết chúng ta cần hiểu cấu trúc mô hình...'),
        'explanation'
      );
      assert.equal(
        planner.classifyIntent('For example, the algorithm works by calculating the Euclidean distance...'),
        'explanation'
      );
    });

    it('classifies confirmation and agreement correctly', () => {
      assert.equal(planner.classifyIntent('Chính xác rồi, bạn đã thiết lập đúng!'), 'confirmation');
      assert.equal(planner.classifyIntent('Được rồi, tôi đã cập nhật cấu hình cho bạn.'), 'confirmation');
      assert.equal(planner.classifyIntent('Yes, absolutely correct.'), 'confirmation');
    });

    it('classifies questions and inquiries correctly', () => {
      assert.equal(planner.classifyIntent('Bạn có muốn tiếp tục tạo thêm dự án không?'), 'question');
      assert.equal(planner.classifyIntent('What kind of features would you like to build?'), 'question');
    });

    it('classifies celebration and congratulations correctly', () => {
      assert.equal(planner.classifyIntent('Chúc mừng bạn! Quá trình build đã thành công tuyệt vời!'), 'celebration');
      assert.equal(planner.classifyIntent('Congratulations on passing all tests! Hooray!'), 'celebration');
    });

    it('classifies apology and regret correctly', () => {
      assert.equal(planner.classifyIntent('Thành thật xin lỗi bạn, tôi đã nhầm lẫn ở bước vừa rồi.'), 'apology');
      assert.equal(planner.classifyIntent('I am sorry for the inconvenience caused.'), 'apology');
    });

    it('classifies warning and caution correctly', () => {
      assert.equal(planner.classifyIntent('Lưu ý nguy hiểm: thao tác này có thể xóa dữ liệu vĩnh viễn.'), 'warning');
      assert.equal(planner.classifyIntent('Warning: your API quota is almost exhausted.'), 'warning');
    });

    it('classifies error and failure responses correctly', () => {
      assert.equal(planner.classifyIntent('Thất bại: không thể kết nối tới database server.'), 'error');
      assert.equal(planner.classifyIntent('Lỗi cú pháp: SyntaxError unexpected token.'), 'error');
    });

    it('falls back safely to neutral for standard conversational text', () => {
      assert.equal(planner.classifyIntent('Dưới đây là một số thông tin cập nhật.'), 'neutral');
    });
  });

  describe('VariationEngine - Non-Repetitive Action Selection', () => {
    it('applies repeat penalty and avoids immediate repetition', () => {
      const engine = new VariationEngine({ historySize: 5, repeatPenaltyFactor: 0.2 });
      const candidates: ActionCandidate[] = [
        { id: 'action_a', category: 'gesture', name: 'wave', baseWeight: 1.0, durationMs: 2000 },
        { id: 'action_b', category: 'gesture', name: 'nod', baseWeight: 1.0, durationMs: 2000 },
      ];

      // Initially both have weight 1.0
      assert.equal(engine.calculateEffectiveWeight(candidates[0]), 1.0);
      assert.equal(engine.calculateEffectiveWeight(candidates[1]), 1.0);

      // Record action_a
      engine.recordAction('action_a');

      // Now action_a should be heavily penalized (1.0 * 0.2 * 0.5 = 0.1)
      const penalizedWeightA = engine.calculateEffectiveWeight(candidates[0]);
      const normalWeightB = engine.calculateEffectiveWeight(candidates[1]);

      assert.ok(penalizedWeightA < normalWeightB);
      assert.ok(penalizedWeightA <= 0.1);
      assert.equal(normalWeightB, 1.0);
    });

    it('enforces cooldowns properly', () => {
      const engine = new VariationEngine({ repeatCooldownMs: 5000 });
      const now = 100000;

      assert.ok(engine.isOffCooldown('action_test', now));

      // Record with 5000ms cooldown
      engine.recordAction('action_test', 5000, now);

      // At now + 2000ms: still on cooldown
      assert.ok(!engine.isOffCooldown('action_test', now + 2000));

      // At now + 5001ms: cooldown expired
      assert.ok(engine.isOffCooldown('action_test', now + 5001));
    });

    it('produces deterministic output with seeded PRNG', () => {
      const engineA = new VariationEngine();
      engineA.setSeed(42);

      const engineB = new VariationEngine();
      engineB.setSeed(42);

      const candidates: ActionCandidate[] = [
        { id: 'act_1', category: 'gesture', name: 'g1', baseWeight: 1.0, durationMs: 1000 },
        { id: 'act_2', category: 'gesture', name: 'g2', baseWeight: 1.0, durationMs: 1000 },
        { id: 'act_3', category: 'gesture', name: 'g3', baseWeight: 1.0, durationMs: 1000 },
      ];

      const selectionsA: string[] = [];
      const selectionsB: string[] = [];

      for (let i = 0; i < 10; i++) {
        selectionsA.push(engineA.selectAction(candidates)?.id || '');
        selectionsB.push(engineB.selectAction(candidates)?.id || '');
      }

      assert.deepEqual(selectionsA, selectionsB);
    });

    it('filters unsupported actions when capabilities are missing', () => {
      const engine = new VariationEngine();
      const capabilities: VRMCapabilities = {
        hasHumanoid: true,
        hasExpressions: true,
        hasLookAt: true,
        hasSpringBones: true,
        availableBones: ['neck', 'head'], // Arm bones missing!
        availableExpressions: ['happy'],
      };

      const candidates: ActionCandidate[] = [
        {
          id: 'arm_wave',
          category: 'gesture',
          name: 'wave',
          baseWeight: 2.0,
          durationMs: 2000,
          requiredBones: ['rightUpperArm'],
        },
        {
          id: 'head_nod',
          category: 'gesture',
          name: 'nod',
          baseWeight: 1.0,
          durationMs: 1500,
          requiredBones: ['head', 'neck'],
        },
      ];

      // Since arm_wave requires rightUpperArm which is missing, it should select head_nod
      const selected = engine.selectAction(candidates, capabilities);
      assert.equal(selected?.id, 'head_nod');
    });
  });

  describe('ResponseBehaviorPlanner - Complete Behavior Plan Generation', () => {
    it('generates a valid, bounded behavior plan', () => {
      const engine = new VariationEngine();
      const planner = new ResponseBehaviorPlanner(engine);

      const plan: CharacterBehaviorPlan = planner.planResponseBehavior(
        'turn-101',
        'Xin chào các bạn, mình là AI-Chan companion!'
      );

      assert.equal(plan.turnId, 'turn-101');
      assert.equal(plan.intent, 'greeting');
      assert.equal(plan.emotion, 'happy');
      assert.equal(plan.gaze, 'camera');
      assert.ok(plan.actions.length > 0);

      const action = plan.actions[0];
      assert.ok(action.durationMs >= 500 && action.durationMs <= 6000);
      assert.ok(action.intensity >= 0.1 && action.intensity <= 1.0);
    });

    it('falls back cleanly when candidates list is empty', () => {
      const engine = new VariationEngine();
      const planner = new ResponseBehaviorPlanner(engine);

      const plan = planner.planResponseBehavior('turn-102', 'random unstructured response...');
      assert.ok(plan.actions.length >= 1);
      assert.equal(plan.intent, 'neutral');
    });
  });

  describe('IdleBehaviorEngine - Natural Stance Constants', () => {
    it('defines non-zero, natural resting arm rotations', () => {
      const resting = IdleBehaviorEngine.RESTING_POSE;
      assert.ok(resting.leftUpperArm.z < -1.0, 'Left arm should rest downwards');
      assert.ok(resting.rightUpperArm.z > 1.0, 'Right arm should rest downwards');
      assert.ok(resting.leftLowerArm.y > 0, 'Left forearm should be slightly inward');
      assert.ok(resting.rightLowerArm.y < 0, 'Right forearm should be slightly inward');
    });
  });

  describe('VRMController & Animation Lifecycle', () => {
    it('initializes in idle state and transitions cleanly through lifecycle states', () => {
      const { VRMController } = require('../components/vrm/vrmController.ts');
      let observedState = '';
      const controller = new VRMController({
        onStateChange: (state: string) => {
          observedState = state;
        },
      });

      assert.equal(controller.getState(), 'idle');

      controller.setState('thinking');
      assert.equal(controller.getState(), 'thinking');
      assert.equal(observedState, 'thinking');

      controller.setState('speaking');
      assert.equal(controller.getState(), 'speaking');
      assert.equal(observedState, 'speaking');

      controller.setState('idle');
      assert.equal(controller.getState(), 'idle');
    });

    it('generates behavior plan and transitions on AI response completion', () => {
      const { VRMController } = require('../components/vrm/vrmController.ts');
      const controller = new VRMController();

      const plan = controller.handleAIResponseComplete('turn-999', 'Xin chào bạn nhé!');
      assert.equal(plan.turnId, 'turn-999');
      assert.equal(plan.intent, 'greeting');
      assert.equal(controller.getState(), 'success');

      const diagnostics = controller.getDiagnostics();
      assert.equal(diagnostics.currentState, 'success');
      assert.equal(diagnostics.activeIntent, 'greeting');
      assert.ok(diagnostics.history.length > 0);
    });

    it('cancels response choreography and resets on stop generation', () => {
      const { VRMController } = require('../components/vrm/vrmController.ts');
      const controller = new VRMController();

      controller.handleAIResponseComplete('turn-888', 'Giải thích dài...');
      controller.handleStopGeneration();

      assert.equal(controller.getState(), 'cancelled');
      const diag = controller.getDiagnostics();
      assert.equal(diag.activeActions.length, 0);
    });

    it('respects reduced-motion configuration', () => {
      const { VRMController } = require('../components/vrm/vrmController.ts');
      const controller = new VRMController({
        config: { reducedMotion: true },
      });

      assert.equal(controller.getDiagnostics().reducedMotionActive, true);
      controller.setReducedMotion(false);
      assert.equal(controller.getDiagnostics().reducedMotionActive, false);
    });
  });
});
