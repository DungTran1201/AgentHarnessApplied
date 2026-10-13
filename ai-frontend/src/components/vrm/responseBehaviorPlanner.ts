import {
  CharacterBehaviorPlan,
  CharacterIntent,
  CharacterAction,
  VRMCapabilities,
} from './behaviorTypes';
import { ActionCandidate, VariationEngine } from './variationEngine';

/**
 * Contextual Action Catalog:
 * Defines multiple eligible procedural actions for each semantic intent.
 */
export const INTENT_ACTION_CATALOG: Record<CharacterIntent, ActionCandidate[]> = {
  greeting: [
    {
      id: 'gesture_wave_hand',
      category: 'gesture',
      name: 'wave_hand',
      baseWeight: 1.0,
      durationMs: 2200,
      intensity: 0.8,
      boneGroup: 'arms',
      requiredBones: ['rightUpperArm', 'rightLowerArm'],
    },
    {
      id: 'gesture_polite_welcome',
      category: 'gesture',
      name: 'polite_welcome',
      baseWeight: 0.85,
      durationMs: 1900,
      intensity: 0.75,
      boneGroup: 'body',
      requiredBones: ['neck', 'head', 'chest'],
    },
    {
      id: 'gesture_happy_smile_nod',
      category: 'gesture',
      name: 'happy_smile_nod',
      baseWeight: 0.7,
      durationMs: 1800,
      intensity: 0.7,
      boneGroup: 'head',
      requiredBones: ['neck', 'head'],
    },
  ],

  explanation: [
    {
      id: 'gesture_explain_open_hand',
      category: 'gesture',
      name: 'explain_open_hand',
      baseWeight: 1.0,
      durationMs: 2600,
      intensity: 0.8,
      boneGroup: 'arms',
      requiredBones: ['rightUpperArm', 'rightLowerArm'],
    },
    {
      id: 'gesture_thoughtful_hand_lift',
      category: 'gesture',
      name: 'thoughtful_hand_lift',
      baseWeight: 0.8,
      durationMs: 2400,
      intensity: 0.75,
      boneGroup: 'arms',
      requiredBones: ['leftUpperArm', 'leftLowerArm'],
    },
    {
      id: 'gesture_measured_nod',
      category: 'gesture',
      name: 'measured_nod',
      baseWeight: 0.7,
      durationMs: 2000,
      intensity: 0.7,
      boneGroup: 'head',
      requiredBones: ['neck', 'head'],
    },
  ],

  confirmation: [
    {
      id: 'gesture_affirmative_nod',
      category: 'gesture',
      name: 'affirmative_nod',
      baseWeight: 1.0,
      durationMs: 1600,
      intensity: 0.85,
      boneGroup: 'head',
      requiredBones: ['neck', 'head'],
    },
    {
      id: 'gesture_confident_agree',
      category: 'gesture',
      name: 'confident_agree',
      baseWeight: 0.8,
      durationMs: 2100,
      intensity: 0.75,
      boneGroup: 'body',
      requiredBones: ['chest', 'neck', 'head'],
    },
  ],

  question: [
    {
      id: 'gesture_curious_head_tilt',
      category: 'gesture',
      name: 'curious_head_tilt',
      baseWeight: 1.0,
      durationMs: 2400,
      intensity: 0.8,
      boneGroup: 'head',
      requiredBones: ['neck', 'head'],
    },
    {
      id: 'gesture_inquiry_hand',
      category: 'gesture',
      name: 'inquiry_hand',
      baseWeight: 0.8,
      durationMs: 2200,
      intensity: 0.7,
      boneGroup: 'arms',
      requiredBones: ['rightUpperArm', 'rightLowerArm'],
    },
  ],

  celebration: [
    {
      id: 'gesture_joyful_cheer',
      category: 'gesture',
      name: 'joyful_cheer',
      baseWeight: 1.0,
      durationMs: 2600,
      intensity: 0.9,
      boneGroup: 'arms',
      requiredBones: ['rightUpperArm', 'leftUpperArm'],
    },
    {
      id: 'gesture_happy_bounce',
      category: 'gesture',
      name: 'happy_bounce',
      baseWeight: 0.85,
      durationMs: 2200,
      intensity: 0.85,
      boneGroup: 'body',
      requiredBones: ['hips', 'spine', 'chest'],
    },
  ],

  apology: [
    {
      id: 'gesture_polite_bow',
      category: 'gesture',
      name: 'polite_bow',
      baseWeight: 1.0,
      durationMs: 2500,
      intensity: 0.8,
      boneGroup: 'body',
      requiredBones: ['spine', 'neck', 'head'],
    },
    {
      id: 'gesture_apologetic_regret',
      category: 'gesture',
      name: 'apologetic_regret',
      baseWeight: 0.8,
      durationMs: 2200,
      intensity: 0.7,
      boneGroup: 'head',
      requiredBones: ['neck', 'head'],
    },
  ],

  comfort: [
    {
      id: 'gesture_gentle_reassurance',
      category: 'gesture',
      name: 'gentle_reassurance',
      baseWeight: 1.0,
      durationMs: 2400,
      intensity: 0.75,
      boneGroup: 'body',
      requiredBones: ['chest', 'neck', 'head'],
    },
    {
      id: 'gesture_supportive_nod',
      category: 'gesture',
      name: 'supportive_nod',
      baseWeight: 0.8,
      durationMs: 2000,
      intensity: 0.7,
      boneGroup: 'head',
      requiredBones: ['neck', 'head'],
    },
  ],

  warning: [
    {
      id: 'gesture_serious_caution',
      category: 'gesture',
      name: 'serious_caution',
      baseWeight: 1.0,
      durationMs: 2400,
      intensity: 0.8,
      boneGroup: 'body',
      requiredBones: ['chest', 'neck'],
    },
  ],

  error: [
    {
      id: 'gesture_concerned_reaction',
      category: 'gesture',
      name: 'concerned_reaction',
      baseWeight: 1.0,
      durationMs: 2500,
      intensity: 0.8,
      boneGroup: 'head',
      requiredBones: ['neck', 'head'],
    },
  ],

  neutral: [
    {
      id: 'gesture_subtle_acknowledgement',
      category: 'gesture',
      name: 'subtle_acknowledgement',
      baseWeight: 1.0,
      durationMs: 1600,
      intensity: 0.6,
      boneGroup: 'head',
      requiredBones: ['neck', 'head'],
    },
    {
      id: 'gesture_calm_settle',
      category: 'gesture',
      name: 'calm_settle',
      baseWeight: 0.8,
      durationMs: 1800,
      intensity: 0.5,
      boneGroup: 'body',
      requiredBones: ['chest'],
    },
  ],
};

/**
 * ResponseBehaviorPlanner:
 * Converts AI response text into a constrained, validated behavior plan.
 */
export class ResponseBehaviorPlanner {
  private variationEngine: VariationEngine;

  constructor(variationEngine?: VariationEngine) {
    this.variationEngine = variationEngine || new VariationEngine();
  }

  /**
   * Deterministic local classifier mapping response text to CharacterIntent.
   */
  public classifyIntent(text: string): CharacterIntent {
    if (!text || !text.trim()) return 'neutral';
    const lower = text.toLowerCase();

    // 1. Apology / Sorrow
    if (
      lower.includes('xin lỗi') ||
      lower.includes('rất tiếc') ||
      lower.includes('thứ lỗi') ||
      lower.includes('mong bạn thông cảm') ||
      lower.includes('i am sorry') ||
      lower.includes('apologize')
    ) {
      return 'apology';
    }

    // 2. Error / Failure
    if (
      lower.includes('đã xảy ra lỗi') ||
      lower.includes('lỗi kết nối') ||
      lower.includes('lỗi cú pháp') ||
      lower.includes('lỗi') ||
      lower.includes('thất bại') ||
      lower.includes('không thể thực hiện') ||
      lower.includes('exception') ||
      lower.includes('syntaxerror') ||
      lower.startsWith('⚠️') ||
      lower.includes('error') ||
      lower.includes('failed')
    ) {
      return 'error';
    }

    // 3. Celebration / Success / Praise
    if (
      lower.includes('chúc mừng') ||
      lower.includes('tuyệt vời') ||
      lower.includes('xuất sắc') ||
      lower.includes('thành công') ||
      lower.includes('quá tốt') ||
      lower.includes('congratulations') ||
      lower.includes('hooray') ||
      lower.includes('awesome') ||
      lower.includes('great job') ||
      lower.includes('🎉')
    ) {
      return 'celebration';
    }

    // 4. Comfort / Encouragement
    if (
      lower.includes('cố lên nhé') ||
      lower.includes('đừng lo') ||
      lower.includes('không sao đâu') ||
      lower.includes('yên tâm') ||
      lower.includes('bạn làm được mà') ||
      lower.includes('mình luôn ở đây') ||
      lower.includes('don\'t worry') ||
      lower.includes('take your time')
    ) {
      return 'comfort';
    }

    // 5. Greeting / Welcoming
    if (
      lower.includes('xin chào') ||
      lower.includes('chào bạn') ||
      lower.includes('chào buổi') ||
      lower.includes('rất vui được gặp') ||
      lower.startsWith('hello') ||
      lower.startsWith('hi ') ||
      lower.includes('konnichiwa') ||
      lower.includes('good morning') ||
      lower.includes('good evening')
    ) {
      return 'greeting';
    }

    // 6. Confirmation / Agreement
    if (
      lower.includes('đã hiểu') ||
      lower.includes('chắc chắn') ||
      lower.includes('hoàn tất') ||
      lower.includes('chính xác') ||
      lower.includes('đồng ý') ||
      lower.includes('được rồi') ||
      lower.includes('đã tạo') ||
      lower.includes('đã cập nhật') ||
      lower.includes('correct') ||
      lower.includes('absolutely') ||
      lower.includes('confirmed') ||
      lower.startsWith('yes')
    ) {
      return 'confirmation';
    }

    // 7. Warning / Caution
    if (
      lower.includes('lưu ý') ||
      lower.includes('chú ý') ||
      lower.includes('cẩn thận') ||
      lower.includes('nguy cơ') ||
      lower.includes('cảnh báo') ||
      lower.includes('warning') ||
      lower.includes('caution')
    ) {
      return 'warning';
    }

    // 8. Question / Inquiry
    if (
      text.trim().endsWith('?') ||
      lower.includes('bạn có muốn') ||
      lower.includes('bạn nghĩ sao') ||
      lower.includes('có cần tôi') ||
      lower.includes('bạn có câu hỏi nào') ||
      lower.includes('would you like') ||
      lower.startsWith('what ') ||
      lower.startsWith('how ') ||
      lower.startsWith('why ')
    ) {
      return 'question';
    }

    // 9. Explanation
    if (
      lower.includes('giải thích') ||
      lower.includes('nguyên lý') ||
      lower.includes('cơ chế') ||
      lower.includes('hướng dẫn') ||
      lower.includes('các bước') ||
      lower.includes('cụ thể như sau') ||
      lower.includes('bước 1') ||
      lower.includes('phân tích') ||
      lower.includes('for example') ||
      lower.includes('for instance') ||
      lower.includes('to explain') ||
      lower.includes('explanation') ||
      lower.includes('works by') ||
      lower.includes('here is how') ||
      text.includes('```') // contains code block
    ) {
      return 'explanation';
    }

    return 'neutral';
  }

  /**
   * Plans a safe, non-repetitive behavior plan for the response.
   */
  public planResponseBehavior(
    turnId: string,
    responseText: string,
    capabilities?: VRMCapabilities,
    nowMs = Date.now()
  ): CharacterBehaviorPlan {
    const intent = this.classifyIntent(responseText);
    const candidates = INTENT_ACTION_CATALOG[intent] || INTENT_ACTION_CATALOG.neutral;

    // Pick non-repetitive action using VariationEngine
    const chosenCandidate = this.variationEngine.selectAction(candidates, capabilities, nowMs);

    const actions: CharacterAction[] = [];
    if (chosenCandidate) {
      // Record in variation engine history
      this.variationEngine.recordAction(chosenCandidate.id, chosenCandidate.cooldownMs, nowMs);

      actions.push({
        id: chosenCandidate.id,
        category: chosenCandidate.category,
        name: chosenCandidate.name,
        intensity: Math.max(0.1, Math.min(1.0, chosenCandidate.intensity ?? 0.8)),
        durationMs: Math.max(500, Math.min(6000, chosenCandidate.durationMs)),
        boneGroup: chosenCandidate.boneGroup,
        priority: 2, // contextual response priority
        blendInMs: 300,
        blendOutMs: 400,
      });
    }

    // Map facial emotion & gaze based on intent
    const { emotion, gaze } = this.mapEmotionAndGaze(intent);

    return {
      turnId,
      intent,
      emotion,
      gaze,
      actions,
      createdAt: nowMs,
    };
  }

  private mapEmotionAndGaze(intent: CharacterIntent): { emotion?: string; gaze?: 'camera' | 'away' | 'upward' | 'downward' } {
    switch (intent) {
      case 'greeting':
      case 'celebration':
        return { emotion: 'happy', gaze: 'camera' };
      case 'explanation':
        return { emotion: 'relaxed', gaze: 'camera' };
      case 'confirmation':
        return { emotion: 'happy', gaze: 'camera' };
      case 'question':
        return { emotion: 'relaxed', gaze: 'camera' };
      case 'apology':
        return { emotion: 'sad', gaze: 'downward' };
      case 'comfort':
        return { emotion: 'relaxed', gaze: 'camera' };
      case 'warning':
        return { emotion: 'neutral', gaze: 'camera' };
      case 'error':
        return { emotion: 'sad', gaze: 'away' };
      case 'neutral':
      default:
        return { emotion: 'neutral', gaze: 'camera' };
    }
  }
}
