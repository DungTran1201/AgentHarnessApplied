import test from 'node:test';
import assert from 'node:assert/strict';
import { NodeType, GraphNode, GraphEdge, AvailableBotItem, Skill } from '../types';

// Pure logic validator mirroring the Project Editor connection rules and graph validation
interface ValidationResult {
  valid: boolean;
  error?: string;
}

const SECOND_BOT_ERROR_MESSAGE = 'This model can be connected to only one bot. Remove the existing bot connection before selecting another.';

export function validateConnectionAttempt(
  sourceNode: GraphNode,
  targetNode: GraphNode,
  sourceHandle: string,
  targetHandle: string,
  existingEdges: GraphEdge[]
): ValidationResult {
  const isInput = sourceNode.type === 'web_input';
  const isPrompt = sourceNode.type === 'system_prompt';
  const isRuleSource = sourceNode.type === 'rule';
  const isRuleTarget = targetNode.type === 'rule';
  const isModelSource = sourceNode.type === 'model';
  const isModelTarget = targetNode.type === 'model';
  const isOutput = targetNode.type === 'output';
  const isBot = targetNode.type === 'bot';
  const isSkill = targetNode.type === 'skill';
  const isTool = targetNode.type === 'tool';

  // 1. Disallow self connections
  if (sourceNode.id === targetNode.id) {
    return { valid: false, error: 'Cannot connect a node to itself.' };
  }

  // 2. Reject reverse connections (e.g., Bot -> Model, Skill -> Model, Tool -> Model, Output -> Model, Model -> Rule)
  if (sourceNode.type === 'bot' || sourceNode.type === 'skill' || sourceNode.type === 'tool' || sourceNode.type === 'output') {
    return { valid: false, error: 'Reverse connections are not supported. Edges must flow from Model to Bot/Skill/Tool/Output.' };
  }
  if (isModelSource && isRuleTarget) {
    return { valid: false, error: 'Reverse connection rejected. Connect Rule to Model, not Model to Rule.' };
  }
  if (isRuleSource && isRuleTarget) {
    return { valid: false, error: 'Cannot connect Rule to Rule.' };
  }

  // 3. Disallow duplicate connections
  const isDuplicate = existingEdges.some(
    e => e.source === sourceNode.id && e.target === targetNode.id
  );
  if (isDuplicate) {
    return { valid: false, error: 'This connection already exists.' };
  }

  // 4. Model -> Bot connection constraint (at most ONE bot per model)
  if (isModelSource && isBot && targetHandle === 'bot_in') {
    const existingBotEdge = existingEdges.find(e => {
      if (e.source !== sourceNode.id) return false;
      return e.type === 'bot_binding' || e.targetHandle === 'bot_in';
    });

    if (existingBotEdge) {
      return {
        valid: false,
        error: SECOND_BOT_ERROR_MESSAGE
      };
    }

    return { valid: true };
  }

  // 5. Model -> Skill connection constraint (multiple allowed, duplicates rejected)
  if (isModelSource && isSkill && targetHandle === 'skill_in') {
    return { valid: true };
  }

  // 5b. Model -> Tool connection constraint (multiple allowed, one tool instance belongs to at most one model)
  if (isModelSource && isTool && targetHandle === 'tool_in') {
    const existingToolEdge = existingEdges.find(e => e.target === targetNode.id);
    if (existingToolEdge && existingToolEdge.source !== sourceNode.id) {
      return {
        valid: false,
        error: 'A Tool Node can only be connected to one Model Node.'
      };
    }
    return { valid: true };
  }

  // 5c. Rule -> Model connection constraint (multiple rules allowed per model, 1:N)
  if (isRuleSource && isModelTarget && (targetHandle === 'rule_in' || targetHandle === 'rules')) {
    const existingRuleEdgeFromThisNode = existingEdges.find(e => e.source === sourceNode.id);
    if (existingRuleEdgeFromThisNode && existingRuleEdgeFromThisNode.target !== targetNode.id) {
      return {
        valid: false,
        error: 'A Rule Node can only be connected to one Model Node.'
      };
    }
    return { valid: true };
  }

  // 6. Data flow: Web Input -> Model
  if (isInput && isModelTarget && targetHandle === 'in') {
    return { valid: true };
  }

  // 7. System Instruction: Prompt -> Model
  if (isPrompt && isModelTarget && targetHandle === 'prompt') {
    return { valid: true };
  }

  // 8. Data flow: Model -> Output
  if (isModelSource && isOutput && targetHandle === 'in') {
    return { valid: true };
  }

  return {
    valid: false,
    error: `Invalid connection: Cannot connect ${sourceNode.type} to ${targetNode.type}.`
  };
}

export function checkGraphValidity(nodes: GraphNode[], edges: GraphEdge[]): { valid: boolean; reasons: string[] } {
  const reasons: string[] = [];

  const inputNode = nodes.find(n => n.type === 'web_input');
  const modelNode = nodes.find(n => n.type === 'model');
  const outputNode = nodes.find(n => n.type === 'output');

  if (!inputNode) reasons.push('Missing required Web Input node');
  if (!modelNode) reasons.push('Missing required Model node');
  if (!outputNode) reasons.push('Missing required Output node');

  if (inputNode && modelNode) {
    const hasInputToModel = edges.some(e => e.source === inputNode.id && e.target === modelNode.id);
    if (!hasInputToModel) reasons.push('Web Input must be connected to Model');
  }

  if (modelNode && outputNode) {
    const hasModelToOutput = edges.some(e => e.source === modelNode.id && e.target === outputNode.id);
    if (!hasModelToOutput) reasons.push('Model must be connected to Output');
  }

  // Check bot cardinality: at most one bot per model
  if (modelNode) {
    const botEdges = edges.filter(e => {
      if (e.source !== modelNode.id) return false;
      const target = nodes.find(n => n.id === e.target);
      return target?.type === 'bot' || e.targetHandle === 'bot_in';
    });
    if (botEdges.length > 1) {
      reasons.push(SECOND_BOT_ERROR_MESSAGE);
    }

    // Check rules: all rule nodes must be connected to Model
    const ruleNodes = nodes.filter(n => n.type === 'rule');
    for (const rNode of ruleNodes) {
      const hasRuleToModel = edges.some(e => e.source === rNode.id && e.target === modelNode.id);
      if (!hasRuleToModel) {
        reasons.push(`Rule Node '${rNode.data.label}' must be connected to Model`);
      }
    }
  }

  return {
    valid: reasons.length === 0,
    reasons
  };
}

test('Project Canvas Node Catalog and Graph Connection Constraints', async (t) => {
  const inputNode: GraphNode = {
    id: 'node_input_1',
    type: 'web_input',
    position: { x: 100, y: 150 },
    data: { label: 'Web Input', config: { max_words: 500 } }
  };

  const modelNode: GraphNode = {
    id: 'node_model_1',
    type: 'model',
    position: { x: 420, y: 150 },
    data: { label: 'Gemini 3.8 Flash', config: { model_id: 'gemini-3.8-flash' } }
  };

  const outputNode: GraphNode = {
    id: 'node_output_1',
    type: 'output',
    position: { x: 740, y: 150 },
    data: { label: 'Output', config: { streaming: true } }
  };

  const botNodeA: GraphNode = {
    id: 'node_bot_alpha',
    type: 'bot',
    position: { x: 420, y: 350 },
    data: {
      label: 'Discord Assistant Alpha',
      config: {
        bot_id: 'bot-res-123',
        name: 'Discord Assistant Alpha',
        platform: 'discord',
        guild_name: 'AI-Chan HQ'
      }
    }
  };

  const botNodeB: GraphNode = {
    id: 'node_bot_beta',
    type: 'bot',
    position: { x: 420, y: 450 },
    data: {
      label: 'Discord Assistant Beta',
      config: {
        bot_id: 'bot-res-456',
        name: 'Discord Assistant Beta',
        platform: 'discord',
        guild_name: 'Secondary Server'
      }
    }
  };

  const skillNodeA: GraphNode = {
    id: 'node_skill_websearch',
    type: 'skill',
    position: { x: 150, y: 350 },
    data: {
      label: 'Web Search Expert',
      config: {
        skill_id: 'skill-res-search',
        name: 'Web Search Expert',
        version: '1.2.0'
      }
    }
  };

  const skillNodeB: GraphNode = {
    id: 'node_skill_codeanalysis',
    type: 'skill',
    position: { x: 250, y: 350 },
    data: {
      label: 'Code Analysis',
      config: {
        skill_id: 'skill-res-code',
        name: 'Code Analysis',
        version: '2.0.0'
      }
    }
  };

  const baseEdges: GraphEdge[] = [
    { id: 'e1', source: 'node_input_1', target: 'node_model_1', sourceHandle: 'out', targetHandle: 'in', type: 'data_flow' },
    { id: 'e2', source: 'node_model_1', target: 'node_output_1', sourceHandle: 'out', targetHandle: 'in', type: 'data_flow' }
  ];

  await t.test('1. Baseline valid graph with 0 Bots and 0 Skills', () => {
    const validity = checkGraphValidity([inputNode, modelNode, outputNode], baseEdges);
    assert.equal(validity.valid, true);
    assert.equal(validity.reasons.length, 0);
  });

  await t.test('2. Model connecting to a single Bot is valid', () => {
    const result = validateConnectionAttempt(modelNode, botNodeA, 'out', 'bot_in', baseEdges);
    assert.equal(result.valid, true);
    assert.equal(result.error, undefined);

    const edgesWithBot: GraphEdge[] = [
      ...baseEdges,
      { id: 'e_bot_1', source: modelNode.id, target: botNodeA.id, sourceHandle: 'out', targetHandle: 'bot_in', type: 'bot_binding' }
    ];
    const validity = checkGraphValidity([inputNode, modelNode, outputNode, botNodeA], edgesWithBot);
    assert.equal(validity.valid, true);
  });

  await t.test('3. Model connecting to a second Bot is REJECTED with exact error message', () => {
    const edgesWithBot: GraphEdge[] = [
      ...baseEdges,
      { id: 'e_bot_1', source: modelNode.id, target: botNodeA.id, sourceHandle: 'out', targetHandle: 'bot_in', type: 'bot_binding' }
    ];

    const result = validateConnectionAttempt(modelNode, botNodeB, 'out', 'bot_in', edgesWithBot);
    assert.equal(result.valid, false);
    assert.equal(result.error, SECOND_BOT_ERROR_MESSAGE);

    // Existing bot edge must NOT be modified or replaced
    assert.equal(edgesWithBot.length, 3);
    assert.equal(edgesWithBot[2].target, botNodeA.id);
  });

  await t.test('4. Duplicate Model-to-Bot edge is rejected', () => {
    const edgesWithBot: GraphEdge[] = [
      ...baseEdges,
      { id: 'e_bot_1', source: modelNode.id, target: botNodeA.id, sourceHandle: 'out', targetHandle: 'bot_in', type: 'bot_binding' }
    ];

    const result = validateConnectionAttempt(modelNode, botNodeA, 'out', 'bot_in', edgesWithBot);
    assert.equal(result.valid, false);
    assert.equal(result.error, 'This connection already exists.');
  });

  await t.test('5. Model connecting to multiple distinct Skills is ALLOWED', () => {
    const edgesWithBot: GraphEdge[] = [
      ...baseEdges,
      { id: 'e_bot_1', source: modelNode.id, target: botNodeA.id, sourceHandle: 'out', targetHandle: 'bot_in', type: 'bot_binding' }
    ];

    // Connect Skill A
    const resSkillA = validateConnectionAttempt(modelNode, skillNodeA, 'out', 'skill_in', edgesWithBot);
    assert.equal(resSkillA.valid, true);

    const edgesWithSkillA: GraphEdge[] = [
      ...edgesWithBot,
      { id: 'e_skill_a', source: modelNode.id, target: skillNodeA.id, sourceHandle: 'out', targetHandle: 'skill_in', type: 'skill_binding' }
    ];

    // Connect Skill B (must not remove Skill A or Bot)
    const resSkillB = validateConnectionAttempt(modelNode, skillNodeB, 'out', 'skill_in', edgesWithSkillA);
    assert.equal(resSkillB.valid, true);

    const edgesWithBothSkills: GraphEdge[] = [
      ...edgesWithSkillA,
      { id: 'e_skill_b', source: modelNode.id, target: skillNodeB.id, sourceHandle: 'out', targetHandle: 'skill_in', type: 'skill_binding' }
    ];

    // Check validity of full graph: 1 Model, 1 Bot, 2 Skills
    const validity = checkGraphValidity(
      [inputNode, modelNode, outputNode, botNodeA, skillNodeA, skillNodeB],
      edgesWithBothSkills
    );
    assert.equal(validity.valid, true);
    assert.equal(edgesWithBothSkills.length, 5);
  });

  await t.test('6. Duplicate connection from Model to same Skill is REJECTED', () => {
    const edgesWithSkillA: GraphEdge[] = [
      ...baseEdges,
      { id: 'e_skill_a', source: modelNode.id, target: skillNodeA.id, sourceHandle: 'out', targetHandle: 'skill_in', type: 'skill_binding' }
    ];

    const result = validateConnectionAttempt(modelNode, skillNodeA, 'out', 'skill_in', edgesWithSkillA);
    assert.equal(result.valid, false);
    assert.equal(result.error, 'This connection already exists.');
  });

  await t.test('7. Reverse connections are strictly REJECTED', () => {
    // Bot -> Model attempt
    const revBot = validateConnectionAttempt(botNodeA, modelNode, 'bot_in', 'out', baseEdges);
    assert.equal(revBot.valid, false);
    assert.match(revBot.error || '', /Reverse connections are not supported/);

    // Skill -> Model attempt
    const revSkill = validateConnectionAttempt(skillNodeA, modelNode, 'skill_in', 'out', baseEdges);
    assert.equal(revSkill.valid, false);
    assert.match(revSkill.error || '', /Reverse connections are not supported/);
  });

  await t.test('8. Unsupported node type combinations are REJECTED', () => {
    // Web Input -> Bot
    const inputToBot = validateConnectionAttempt(inputNode, botNodeA, 'out', 'bot_in', baseEdges);
    assert.equal(inputToBot.valid, false);

    // Skill -> Output
    const skillToOutput = validateConnectionAttempt(skillNodeA, outputNode, 'skill_in', 'in', baseEdges);
    assert.equal(skillToOutput.valid, false);
  });

  await t.test('9. Stable resource references are maintained on nodes', () => {
    // Bot node has stable bot_id
    assert.equal(botNodeA.data.config?.bot_id, 'bot-res-123');
    assert.equal(botNodeB.data.config?.bot_id, 'bot-res-456');

    // Skill node has stable skill_id
    assert.equal(skillNodeA.data.config?.skill_id, 'skill-res-search');
    assert.equal(skillNodeB.data.config?.skill_id, 'skill-res-code');

    // Node instance IDs differ from authoritative resource IDs
    assert.notEqual(botNodeA.id, botNodeA.data.config?.bot_id);
    assert.notEqual(skillNodeA.id, skillNodeA.data.config?.skill_id);
  });

  const toolNodeCalculator: GraphNode = {
    id: 'node_tool_calc',
    type: 'tool',
    position: { x: 420, y: 550 },
    data: {
      label: 'Safe Calculator',
      config: {
        tool_id: 'calculator',
        name: 'Safe Calculator',
        category: 'DATA',
        risk_level: 'LOW',
        status: 'AVAILABLE'
      }
    }
  };

  const toolNodeCsv: GraphNode = {
    id: 'node_tool_csv',
    type: 'tool',
    position: { x: 580, y: 550 },
    data: {
      label: 'Parse CSV',
      config: {
        tool_id: 'parse_csv',
        name: 'Parse CSV Table',
        category: 'FILE_DOCUMENT',
        risk_level: 'LOW',
        status: 'AVAILABLE'
      }
    }
  };

  const toolNodeWebSearch: GraphNode = {
    id: 'node_tool_search',
    type: 'tool',
    position: { x: 740, y: 550 },
    data: {
      label: 'Web Search',
      config: {
        tool_id: 'web_search',
        name: 'Web Search via API',
        category: 'WEB',
        risk_level: 'MEDIUM',
        status: 'NEEDS_CONFIGURATION'
      }
    }
  };

  await t.test('10. Model connecting to a single Tool is valid', () => {
    const result = validateConnectionAttempt(modelNode, toolNodeCalculator, 'out', 'tool_in', baseEdges);
    assert.equal(result.valid, true);
    assert.equal(result.error, undefined);
  });

  await t.test('11. Model connecting to multiple (3+) distinct Tools is ALLOWED (1:N Model-to-Tools)', () => {
    const edgesWithTool1: GraphEdge[] = [
      ...baseEdges,
      { id: 'e_tool_calc', source: modelNode.id, target: toolNodeCalculator.id, sourceHandle: 'out', targetHandle: 'tool_in', type: 'model_tool' }
    ];

    // Connect 2nd tool
    const resTool2 = validateConnectionAttempt(modelNode, toolNodeCsv, 'out', 'tool_in', edgesWithTool1);
    assert.equal(resTool2.valid, true);

    const edgesWithTool2: GraphEdge[] = [
      ...edgesWithTool1,
      { id: 'e_tool_csv', source: modelNode.id, target: toolNodeCsv.id, sourceHandle: 'out', targetHandle: 'tool_in', type: 'model_tool' }
    ];

    // Connect 3rd tool
    const resTool3 = validateConnectionAttempt(modelNode, toolNodeWebSearch, 'out', 'tool_in', edgesWithTool2);
    assert.equal(resTool3.valid, true);

    const edgesWithAllTools: GraphEdge[] = [
      ...edgesWithTool2,
      { id: 'e_tool_search', source: modelNode.id, target: toolNodeWebSearch.id, sourceHandle: 'out', targetHandle: 'tool_in', type: 'model_tool' }
    ];

    assert.equal(edgesWithAllTools.length, 5);
  });

  await t.test('12. Duplicate connection from Model to same Tool is REJECTED', () => {
    const edgesWithTool1: GraphEdge[] = [
      ...baseEdges,
      { id: 'e_tool_calc', source: modelNode.id, target: toolNodeCalculator.id, sourceHandle: 'out', targetHandle: 'tool_in', type: 'model_tool' }
    ];

    const result = validateConnectionAttempt(modelNode, toolNodeCalculator, 'out', 'tool_in', edgesWithTool1);
    assert.equal(result.valid, false);
    assert.equal(result.error, 'This connection already exists.');
  });

  await t.test('13. Reverse Tool -> Model connection is REJECTED', () => {
    const revTool = validateConnectionAttempt(toolNodeCalculator, modelNode, 'tool_in', 'out', baseEdges);
    assert.equal(revTool.valid, false);
    assert.match(revTool.error || '', /Reverse connections are not supported/);
  });

  await t.test('14. Connecting same Tool Node instance to a second Model Node is REJECTED', () => {
    const secondModelNode: GraphNode = {
      id: 'node_model_2',
      type: 'model',
      position: { x: 420, y: 700 },
      data: { label: 'Second Model', config: { model_id: 'gpt-4o' } }
    };

    const edgesWithTool1: GraphEdge[] = [
      ...baseEdges,
      { id: 'e_tool_calc', source: modelNode.id, target: toolNodeCalculator.id, sourceHandle: 'out', targetHandle: 'tool_in', type: 'model_tool' }
    ];

    const result = validateConnectionAttempt(secondModelNode, toolNodeCalculator, 'out', 'tool_in', edgesWithTool1);
    assert.equal(result.valid, false);
    assert.equal(result.error, 'A Tool Node can only be connected to one Model Node.');
  });

  await t.test('15. Unsupported connection combinations involving Tools are REJECTED', () => {
    // Web Input -> Tool
    const inputToTool = validateConnectionAttempt(inputNode, toolNodeCalculator, 'out', 'tool_in', baseEdges);
    assert.equal(inputToTool.valid, false);

    // Tool -> Output
    const toolToOutput = validateConnectionAttempt(toolNodeCalculator, outputNode, 'out', 'in', baseEdges);
    assert.equal(toolToOutput.valid, false);
  });

  // Setup Rule Nodes for 1:N Rule Testing
  const ruleNode1: GraphNode = {
    id: 'node_rule_1',
    type: 'rule',
    position: { x: 80, y: 460 },
    data: {
      label: 'Security Guidelines',
      config: {
        rule_id: 'rul_security_01',
        name: 'Security Guidelines',
        scope: 'system',
        priority: 90,
        status: 'active'
      }
    }
  };

  const ruleNode2: GraphNode = {
    id: 'node_rule_2',
    type: 'rule',
    position: { x: 80, y: 550 },
    data: {
      label: 'Vietnamese Tone',
      config: {
        rule_id: 'rul_vn_tone_02',
        name: 'Vietnamese Tone',
        scope: 'user',
        priority: 70,
        status: 'active'
      }
    }
  };

  const ruleNode3: GraphNode = {
    id: 'node_rule_3',
    type: 'rule',
    position: { x: 80, y: 640 },
    data: {
      label: 'Code Formatting Rule',
      config: {
        rule_id: 'rul_code_format_03',
        name: 'Code Formatting Rule',
        scope: 'project',
        priority: 50,
        status: 'active'
      }
    }
  };

  await t.test('16. Valid Rule -> Model connection to rule_in port', () => {
    const res = validateConnectionAttempt(ruleNode1, modelNode, 'rule_out', 'rule_in', baseEdges);
    assert.equal(res.valid, true);
    assert.equal(res.error, undefined);
  });

  await t.test('17. One Model connects to multiple (at least 3) distinct Rule Nodes (1:N)', () => {
    const edge1: GraphEdge = {
      id: 'e_rule_1',
      source: ruleNode1.id,
      target: modelNode.id,
      sourceHandle: 'rule_out',
      targetHandle: 'rule_in',
      type: 'rule_binding'
    };
    const edgesWith1Rule = [...baseEdges, edge1];

    // Second rule connects to same model
    const res2 = validateConnectionAttempt(ruleNode2, modelNode, 'rule_out', 'rule_in', edgesWith1Rule);
    assert.equal(res2.valid, true);

    const edge2: GraphEdge = {
      id: 'e_rule_2',
      source: ruleNode2.id,
      target: modelNode.id,
      sourceHandle: 'rule_out',
      targetHandle: 'rule_in',
      type: 'rule_binding'
    };
    const edgesWith2Rules = [...edgesWith1Rule, edge2];

    // Third rule connects to same model
    const res3 = validateConnectionAttempt(ruleNode3, modelNode, 'rule_out', 'rule_in', edgesWith2Rules);
    assert.equal(res3.valid, true);
  });

  await t.test('18. Duplicate connection from same Rule Node to Model is REJECTED', () => {
    const edgesWithRule1: GraphEdge[] = [
      ...baseEdges,
      {
        id: 'e_rule_1',
        source: ruleNode1.id,
        target: modelNode.id,
        sourceHandle: 'rule_out',
        targetHandle: 'rule_in',
        type: 'rule_binding'
      }
    ];

    const dupRes = validateConnectionAttempt(ruleNode1, modelNode, 'rule_out', 'rule_in', edgesWithRule1);
    assert.equal(dupRes.valid, false);
    assert.equal(dupRes.error, 'This connection already exists.');
  });

  await t.test('19. Reverse Model -> Rule connection is REJECTED', () => {
    const revRes = validateConnectionAttempt(modelNode, ruleNode1, 'out', 'rule_in', baseEdges);
    assert.equal(revRes.valid, false);
    assert.match(revRes.error || '', /Reverse connection rejected/);
  });

  await t.test('20. Rule -> Rule connection is REJECTED', () => {
    const ruleToRule = validateConnectionAttempt(ruleNode1, ruleNode2, 'rule_out', 'rule_in', baseEdges);
    assert.equal(ruleToRule.valid, false);
    assert.match(ruleToRule.error || '', /Cannot connect Rule to Rule/);
  });

  await t.test('21. Unsupported connection combinations involving Rules are REJECTED', () => {
    // Rule -> Web Input
    const ruleToInput = validateConnectionAttempt(ruleNode1, inputNode, 'rule_out', 'in', baseEdges);
    assert.equal(ruleToInput.valid, false);

    // Rule -> Output
    const ruleToOutput = validateConnectionAttempt(ruleNode1, outputNode, 'rule_out', 'in', baseEdges);
    assert.equal(ruleToOutput.valid, false);

    // Rule -> Tool
    const ruleToTool = validateConnectionAttempt(ruleNode1, toolNodeCalculator, 'rule_out', 'tool_in', baseEdges);
    assert.equal(ruleToTool.valid, false);

    // Rule -> Bot
    const ruleToBot = validateConnectionAttempt(ruleNode1, botNodeA, 'rule_out', 'bot_in', baseEdges);
    assert.equal(ruleToBot.valid, false);
  });

  await t.test('22. checkGraphValidity with 1 Model and 3 Rules: valid when all connected, invalid when rule unconnected', () => {
    const nodesWith3Rules: GraphNode[] = [
      inputNode,
      modelNode,
      outputNode,
      ruleNode1,
      ruleNode2,
      ruleNode3
    ];

    const fullyConnectedEdges: GraphEdge[] = [
      ...baseEdges,
      { id: 'e_r1', source: ruleNode1.id, target: modelNode.id, type: 'rule_binding' },
      { id: 'e_r2', source: ruleNode2.id, target: modelNode.id, type: 'rule_binding' },
      { id: 'e_r3', source: ruleNode3.id, target: modelNode.id, type: 'rule_binding' }
    ];

    // All 3 rules connected
    const validCheck = checkGraphValidity(nodesWith3Rules, fullyConnectedEdges);
    assert.equal(validCheck.valid, true);
    assert.equal(validCheck.reasons.length, 0);

    // 1 rule unconnected
    const missingEdgeCheck = checkGraphValidity(nodesWith3Rules, [
      ...baseEdges,
      { id: 'e_r1', source: ruleNode1.id, target: modelNode.id, type: 'rule_binding' }
    ]);
    assert.equal(missingEdgeCheck.valid, false);
    assert.ok(missingEdgeCheck.reasons.some(r => r.includes(ruleNode2.data.label)));
    assert.ok(missingEdgeCheck.reasons.some(r => r.includes(ruleNode3.data.label)));
  });
});
