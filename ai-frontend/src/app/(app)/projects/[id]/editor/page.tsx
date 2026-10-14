'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import {
  Project,
  GraphData,
  GraphNode,
  GraphEdge,
  NodeType,
  AgentModel,
  SystemPromptSummary,
  AvailableBotItem,
  SkillSummary
} from '@/types';
import { ProjectService } from '@/services/projectService';
import { SystemPromptService } from '@/services/systemPromptService';
import { SkillService } from '@/services/skillService';
import Icon from '@/components/ui/Icon';
import { getErrorMessage } from '@/lib/errors';
import FloatingProjectChat from '@/components/chat/FloatingProjectChat';

export default function ProjectEditorPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  // Project data
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);

  // Available models from catalog
  const [availableModels, setAvailableModels] = useState<AgentModel[]>([]);

  // Available system prompts from library (MVP)
  const [availablePrompts, setAvailablePrompts] = useState<SystemPromptSummary[]>([]);
  const [loadingPrompts, setLoadingPrompts] = useState(false);

  // Available bots from authorized Discord integration
  const [availableBots, setAvailableBots] = useState<AvailableBotItem[]>([]);
  const [loadingBots, setLoadingBots] = useState(false);
  const [discordLinked, setDiscordLinked] = useState<boolean | null>(null);

  // Available skills from skills library
  const [availableSkills, setAvailableSkills] = useState<SkillSummary[]>([]);
  const [loadingSkills, setLoadingSkills] = useState(false);

  // Node Catalog UI state: Collapsible groups, Search & Category Filter
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({
    input: false,
    system_prompt: false,
    model: false,
    output: false,
    bot: false,
    skill: false
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<'all' | 'input' | 'system_prompt' | 'model' | 'output' | 'bot' | 'skill'>('all');

  const toggleGroup = (key: string) => {
    setCollapsedGroups(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Canvas State: nodes, edges, viewport
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [viewport, setViewport] = useState<{ x: number; y: number; zoom: number }>({ x: 0, y: 0, zoom: 1 });

  // Selected elements
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);

  // Conflicting element visual highlight states (BR-001, BR-002, UI feedback)
  const [conflictingEdgeId, setConflictingEdgeId] = useState<string | null>(null);
  const [conflictingNodeId, setConflictingNodeId] = useState<string | null>(null);

  const triggerConflictHighlight = (edgeId?: string | null, nodeId?: string | null) => {
    if (edgeId) setConflictingEdgeId(edgeId);
    if (nodeId) setConflictingNodeId(nodeId);
    setTimeout(() => {
      setConflictingEdgeId(null);
      setConflictingNodeId(null);
    }, 2500);
  };

  // Dragging connection state
  const [connectingSourceNodeId, setConnectingSourceNodeId] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Dragging node state
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Canvas Panning state
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Canvas ref
  const canvasRef = useRef<HTMLDivElement>(null);

  // Toast
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  // Load project, models, prompts, bots & skills on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setLoadingPrompts(true);
        setLoadingBots(true);
        setLoadingSkills(true);

        const [projData, modelsRes, promptsRes, botRes, skillsRes] = await Promise.all([
          ProjectService.getProject(projectId),
          fetch('/api/v1/models').then(r => r.ok ? r.json() : []).catch(() => []),
          SystemPromptService.getPrompts().then(r => r.items).catch(() => []),
          fetch('/api/v1/bot/discord/available').then(async r => {
            if (r.status === 403) return { linked: false, items: [] };
            if (r.ok) return { linked: true, items: await r.json() };
            return { linked: null, items: [] };
          }).catch(() => ({ linked: null, items: [] })),
          SkillService.getSkills(undefined, 'VALID').then(r => r.items).catch(() => [])
        ]);

        setProject(projData);
        setAvailableModels(modelsRes.filter((m: AgentModel) => m.status === 'ACTIVE'));
        setAvailablePrompts(promptsRes || []);
        setDiscordLinked(botRes.linked);
        setAvailableBots(botRes.items || []);
        setAvailableSkills(skillsRes || []);

        if (projData.graph_data && projData.graph_data.nodes && projData.graph_data.nodes.length > 0) {
          const defaultPositionsByType: Record<string, { x: number; y: number }> = {
            web_input: { x: 80, y: 180 },
            system_prompt: { x: 80, y: 360 },
            model: { x: 440, y: 220 },
            output: { x: 800, y: 220 },
            bot: { x: 440, y: 400 },
            skill: { x: 800, y: 380 }
          };

          const normalizedNodes: GraphNode[] = projData.graph_data.nodes.map((n: GraphNode, index: number) => {
            const hasValidPos = n.position && typeof n.position.x === 'number' && typeof n.position.y === 'number';
            const fallbackPos = defaultPositionsByType[n.type] || { x: 80 + (index * 260), y: 200 };
            return {
              ...n,
              position: hasValidPos ? n.position : fallbackPos
            };
          });

          setNodes(normalizedNodes);
          setEdges(projData.graph_data.edges || []);
          if (projData.graph_data.viewport) {
            setViewport(projData.graph_data.viewport);
          }
        } else {
          // Initialize 3 default nodes
          const initialNodes: GraphNode[] = [
            {
              id: 'node_input_1',
              type: 'web_input',
              position: { x: 80, y: 180 },
              data: { label: 'Web Input', config: { max_words: projData.max_words_limit || 500 } }
            },
            {
              id: 'node_model_1',
              type: 'model',
              position: { x: 420, y: 180 },
              data: {
                label: 'Model LLM',
                config: {
                  model_id: projData.target_model_id || 'gemini-3.8-flash',
                  temperature: 0.7,
                  max_tokens: 2048
                }
              }
            },
            {
              id: 'node_output_1',
              type: 'output',
              position: { x: 760, y: 180 },
              data: { label: 'Web Output', config: { streaming: true } }
            }
          ];

          const initialEdges: GraphEdge[] = [
            { id: 'edge_in_model', source: 'node_input_1', target: 'node_model_1', type: 'data_flow' },
            { id: 'edge_model_out', source: 'node_model_1', target: 'node_output_1', type: 'data_flow' }
          ];

          setNodes(initialNodes);
          setEdges(initialEdges);
          setHasUnsavedChanges(true);
        }
      } catch (err: any) {
        showToast('error', getErrorMessage(err, 'Failed to load project details.'));
      } finally {
        setLoading(false);
        setLoadingPrompts(false);
        setLoadingBots(false);
        setLoadingSkills(false);
      }
    };

    fetchData();
  }, [projectId]);

  // Real-time graph validation
  const checkGraphValidity = () => {
    const inputNode = nodes.find(n => n.type === 'web_input');
    const modelNode = nodes.find(n => n.type === 'model');
    const outputNode = nodes.find(n => n.type === 'output');
    const promptNodes = nodes.filter(n => n.type === 'system_prompt');
    const botNodes = nodes.filter(n => n.type === 'bot');
    const skillNodes = nodes.filter(n => n.type === 'skill');

    if (!inputNode || !modelNode || !outputNode) return false;
    if (promptNodes.length > 1) return false;
    if (botNodes.length > 1) return false;

    const hasInToModel = edges.some(e => e.source === inputNode.id && e.target === modelNode.id);
    const hasModelToOut = edges.some(e => e.source === modelNode.id && e.target === outputNode.id);

    if (!hasInToModel || !hasModelToOut) return false;

    if (promptNodes.length === 1) {
      const pNode = promptNodes[0];
      const hasPromptToModel = edges.some(e => e.source === pNode.id && e.target === modelNode.id);
      if (!hasPromptToModel) return false;
      if (!pNode.data.config?.prompt_id) return false;
    }

    if (botNodes.length === 1) {
      const bNode = botNodes[0];
      const hasModelToBot = edges.some(e => e.source === modelNode.id && e.target === bNode.id);
      if (!hasModelToBot) return false;
      if (!bNode.data.config?.bot_id) return false;
    }

    for (const sNode of skillNodes) {
      const hasModelToSkill = edges.some(e => e.source === modelNode.id && e.target === sNode.id);
      if (!hasModelToSkill) return false;
      if (!sNode.data.config?.skill_id) return false;
    }

    const expectedEdgeCount = 2 + (promptNodes.length === 1 ? 1 : 0) + (botNodes.length === 1 ? 1 : 0) + skillNodes.length;
    return edges.length === expectedEdgeCount;
  };

  const isGraphValid = checkGraphValidity();
  const hasSystemPromptNode = nodes.some(n => n.type === 'system_prompt');

  // Handle Save Graph
  const handleSave = async () => {
    try {
      setSaving(true);
      const graphData: GraphData = {
        viewport,
        nodes,
        edges
      };
      const res = await ProjectService.saveGraph(projectId, graphData);
      showToast('success', res.message || 'Graph pipeline saved successfully.');
      setHasUnsavedChanges(false);
      
      const updatedProj = await ProjectService.getProject(projectId);
      setProject(updatedProj);
    } catch (err: any) {
      showToast('error', getErrorMessage(err, 'Failed to save graph.'));
    } finally {
      setSaving(false);
    }
  };

  // Toggle Project Status
  const handleToggleStatus = async (targetStatus: 'ACTIVE' | 'STOP' | 'DEACTIVE') => {
    try {
      if (targetStatus === 'ACTIVE') {
        if (!isGraphValid) {
          showToast('error', 'Invalid graph! Please connect Input -> Model -> Output, and System Prompt if added.');
          return;
        }
        await ProjectService.activateProject(projectId);
        showToast('success', 'Project activated! Available in Chat.');
      } else if (targetStatus === 'STOP') {
        await ProjectService.stopProject(projectId);
        showToast('success', 'Project paused.');
      } else {
        await ProjectService.deactivateProject(projectId);
        showToast('success', 'Project disabled.');
      }
      const updatedProj = await ProjectService.getProject(projectId);
      setProject(updatedProj);
    } catch (err: any) {
      showToast('error', getErrorMessage(err, 'Failed to update project status.'));
    }
  };

  // Add standard node (Input, Model, Output)
  const handleAddStandardNode = (type: NodeType) => {
    if (nodes.some(n => n.type === type)) {
      showToast('error', `Each project can contain at most one ${type === 'web_input' ? 'Web Input' : type === 'model' ? 'Model' : 'Output'} node.`);
      return;
    }

    const newId = `node_${type}_${Date.now()}`;
    const defaultLabels: Record<NodeType, string> = {
      web_input: 'Web Input',
      model: 'Model LLM',
      output: 'Web Output',
      system_prompt: 'System Prompt',
      bot: 'Bot Agent',
      skill: 'Skill Agent'
    };

    const defaultConfigs: Record<NodeType, any> = {
      web_input: { max_words: 500 },
      model: { model_id: availableModels[0]?.id || 'gemini-3.8-flash', temperature: 0.7, max_tokens: 2048 },
      output: { streaming: true },
      system_prompt: {},
      bot: { bot_id: '', name: 'Bot Agent' },
      skill: { skill_id: '', name: 'Skill' }
    };

    const posX = type === 'web_input' ? 100 : type === 'model' ? 420 : 740;
    const posY = 180;

    const newNode: GraphNode = {
      id: newId,
      type,
      position: { x: posX, y: posY },
      data: {
        label: defaultLabels[type],
        config: defaultConfigs[type]
      }
    };

    setNodes(prev => [...prev, newNode]);
    setHasUnsavedChanges(true);
    setSelectedNodeId(newId);
  };

  // Add System Prompt Node from Prompt Library
  const handleAddPromptNode = (prompt: SystemPromptSummary) => {
    if (nodes.some(n => n.type === 'system_prompt')) {
      showToast('error', 'Only one System Prompt node is allowed per pipeline. You can update or replace the existing prompt.');
      return;
    }

    const newId = `node_prompt_${Date.now()}`;
    const newNode: GraphNode = {
      id: newId,
      type: 'system_prompt',
      position: { x: 100, y: 320 },
      data: {
        label: prompt.name,
        config: {
          prompt_id: prompt.id,
          name: prompt.name,
          description: prompt.description
        }
      }
    };

    setNodes(prev => [...prev, newNode]);
    setHasUnsavedChanges(true);
    setSelectedNodeId(newId);
    showToast('success', `Added System Prompt: "${prompt.name}" to canvas.`);
  };

  // Add Bot Node from Authorized Bots
  const handleAddBotNode = (bot: AvailableBotItem) => {
    const existingBotNode = nodes.find(n => n.type === 'bot');
    if (existingBotNode) {
      showToast('error', 'This model already has a bot connected. Remove the existing bot connection before selecting another.');
      triggerConflictHighlight(null, existingBotNode.id);
      return;
    }

    const newId = `node_bot_${Date.now()}`;
    const newNode: GraphNode = {
      id: newId,
      type: 'bot',
      position: { x: 440, y: 400 },
      data: {
        label: bot.name,
        config: {
          bot_id: bot.id,
          bot_name: bot.name,
          platform: bot.platform,
          is_enabled: bot.is_enabled,
          guild_name: bot.guild_name,
          trigger_mode: bot.trigger_mode
        }
      }
    };

    setNodes(prev => [...prev, newNode]);
    setHasUnsavedChanges(true);
    setSelectedNodeId(newId);
    showToast('success', `Added Bot: "${bot.name}" to canvas.`);
  };

  // Add Skill Node from Skills Library
  const handleAddSkillNode = (skill: SkillSummary) => {
    const existingSkillNode = nodes.find(n => n.type === 'skill' && n.data.config?.skill_id === skill.id);
    if (existingSkillNode) {
      showToast('error', 'This skill is already connected to the model.');
      triggerConflictHighlight(null, existingSkillNode.id);
      return;
    }

    const skillIndex = nodes.filter(n => n.type === 'skill').length;
    const newId = `node_skill_${Date.now()}`;
    const newNode: GraphNode = {
      id: newId,
      type: 'skill',
      position: { x: 800, y: 360 + (skillIndex * 120) },
      data: {
        label: skill.name,
        config: {
          skill_id: skill.id,
          skill_name: skill.name,
          description: skill.description
        }
      }
    };

    setNodes(prev => [...prev, newNode]);
    setHasUnsavedChanges(true);
    setSelectedNodeId(newId);
    showToast('success', `Added Skill: "${skill.name}" to canvas.`);
  };

  // Delete node
  const handleDeleteNode = (id: string) => {
    setNodes(prev => prev.filter(n => n.id !== id));
    setEdges(prev => prev.filter(e => e.source !== id && e.target !== id));
    if (selectedNodeId === id) setSelectedNodeId(null);
    setHasUnsavedChanges(true);
  };

  // Delete edge
  const handleDeleteEdge = (id: string) => {
    setEdges(prev => prev.filter(e => e.id !== id));
    if (selectedEdgeId === id) setSelectedEdgeId(null);
    setHasUnsavedChanges(true);
  };

  // Canvas Mouse Down
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (
      (e.target as HTMLElement).closest('.node-card') ||
      (e.target as HTMLElement).closest('.handle-circle') ||
      (e.target as HTMLElement).closest('.config-drawer')
    ) {
      return;
    }

    setSelectedNodeId(null);
    setSelectedEdgeId(null);

    setIsPanning(true);
    setPanStart({ x: e.clientX - viewport.x, y: e.clientY - viewport.y });
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const curX = (e.clientX - rect.left - viewport.x) / viewport.zoom;
    const curY = (e.clientY - rect.top - viewport.y) / viewport.zoom;
    setMousePos({ x: curX, y: curY });

    if (isPanning) {
      setViewport(prev => ({
        ...prev,
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      }));
    } else if (draggingNodeId) {
      setNodes(prev => prev.map(n => {
        if (n.id === draggingNodeId) {
          return {
            ...n,
            position: {
              x: Math.round(curX - dragOffset.x),
              y: Math.round(curY - dragOffset.y)
            }
          };
        }
        return n;
      }));
      setHasUnsavedChanges(true);
    }
  };

  const handleCanvasMouseUp = () => {
    setIsPanning(false);
    setDraggingNodeId(null);
    setConnectingSourceNodeId(null);
  };

  const handleNodeMouseDown = (e: React.MouseEvent, node: GraphNode) => {
    e.stopPropagation();
    setSelectedNodeId(node.id);
    setSelectedEdgeId(null);

    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const curX = (e.clientX - rect.left - viewport.x) / viewport.zoom;
    const curY = (e.clientY - rect.top - viewport.y) / viewport.zoom;

    const nodePos = (node.position && typeof node.position.x === 'number' && typeof node.position.y === 'number')
      ? node.position
      : { x: 80, y: 180 };

    setDraggingNodeId(node.id);
    setDragOffset({
      x: curX - nodePos.x,
      y: curY - nodePos.y
    });
  };

  const handleSourceHandleMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    setConnectingSourceNodeId(nodeId);
  };

  const handleTargetHandleMouseUp = (e: React.MouseEvent, targetNodeId: string, targetHandle: string) => {
    e.stopPropagation();
    if (!connectingSourceNodeId || connectingSourceNodeId === targetNodeId) {
      setConnectingSourceNodeId(null);
      return;
    }

    const srcNode = nodes.find(n => n.id === connectingSourceNodeId);
    const tgtNode = nodes.find(n => n.id === targetNodeId);

    if (!srcNode || !tgtNode) {
      setConnectingSourceNodeId(null);
      return;
    }

    // Check and reject reverse connections
    if (srcNode.type === 'bot' && tgtNode.type === 'model') {
      showToast('error', 'Reverse connection rejected. Connect Model to Bot, not Bot to Model.');
      setConnectingSourceNodeId(null);
      return;
    }
    if (srcNode.type === 'skill' && tgtNode.type === 'model') {
      showToast('error', 'Reverse connection rejected. Connect Model to Skill, not Skill to Model.');
      setConnectingSourceNodeId(null);
      return;
    }

    let isValid = false;
    let edgeType = 'data_flow';

    if (srcNode.type === 'web_input' && tgtNode.type === 'model' && targetHandle === 'in') {
      isValid = true;
      edgeType = 'data_flow';
    } else if (srcNode.type === 'system_prompt' && tgtNode.type === 'model' && targetHandle === 'system_instruction') {
      isValid = true;
      edgeType = 'system_instruction';
    } else if (srcNode.type === 'model' && tgtNode.type === 'output' && targetHandle === 'in') {
      isValid = true;
      edgeType = 'data_flow';
    } else if (srcNode.type === 'model' && tgtNode.type === 'bot' && targetHandle === 'bot_in') {
      isValid = true;
      edgeType = 'bot_binding';
    } else if (srcNode.type === 'model' && tgtNode.type === 'skill' && targetHandle === 'skill_in') {
      isValid = true;
      edgeType = 'skill_binding';
    }

    if (!isValid) {
      if (srcNode.type === 'system_prompt' && targetHandle !== 'system_instruction') {
        showToast('error', 'System Prompt node must connect to the Instruction input (orange port) of the Model node.');
      } else if (srcNode.type === 'web_input' && targetHandle !== 'in') {
        showToast('error', 'Web Input node must connect to the Data input (blue port) of the Model node.');
      } else {
        showToast('error', `Cannot connect ${srcNode.type} to ${tgtNode.type}. Valid edges: Web Input -> Model, System Prompt -> Model, Model -> Output, Model -> Bot, Model -> Skill.`);
      }
      setConnectingSourceNodeId(null);
      return;
    }

    // Duplicate connection check
    if (edges.some(e => e.source === srcNode.id && e.target === tgtNode.id)) {
      const existingEdge = edges.find(e => e.source === srcNode.id && e.target === tgtNode.id);
      if (tgtNode.type === 'bot') {
        showToast('error', 'This model already has a bot connected. Remove the existing bot connection before selecting another.');
      } else if (tgtNode.type === 'skill') {
        showToast('error', 'This skill is already connected to the model.');
      } else {
        showToast('error', 'Duplicate connection rejected. This connection already exists.');
      }
      triggerConflictHighlight(existingEdge?.id, tgtNode.id);
      setConnectingSourceNodeId(null);
      return;
    }

    // One Model to at most one Bot rule (BR-001)
    if (srcNode.type === 'model' && tgtNode.type === 'bot') {
      const existingBotEdge = edges.find(
        e => e.source === srcNode.id && nodes.find(n => n.id === e.target)?.type === 'bot'
      );
      if (existingBotEdge && existingBotEdge.target !== tgtNode.id) {
        showToast('error', 'This model already has a bot connected. Remove the existing bot connection before selecting another.');
        triggerConflictHighlight(existingBotEdge.id, existingBotEdge.target);
        setConnectingSourceNodeId(null);
        return;
      }
    }

    // Duplicate skill binding on same Model (BR-002)
    if (srcNode.type === 'model' && tgtNode.type === 'skill') {
      const targetSkillId = tgtNode.data.config?.skill_id;
      if (targetSkillId) {
        const existingSkillEdge = edges.find(e => {
          if (e.source !== srcNode.id) return false;
          const sNode = nodes.find(n => n.id === e.target);
          return sNode?.type === 'skill' && sNode.data.config?.skill_id === targetSkillId;
        });
        if (existingSkillEdge) {
          showToast('error', 'This skill is already connected to the model.');
          triggerConflictHighlight(existingSkillEdge.id, existingSkillEdge.target);
          setConnectingSourceNodeId(null);
          return;
        }
      }
    }

    // System prompt singleton connection check
    if (srcNode.type === 'system_prompt') {
      const existingPromptEdge = edges.find(
        e => e.target === tgtNode.id && nodes.find(n => n.id === e.source)?.type === 'system_prompt'
      );
      if (existingPromptEdge && existingPromptEdge.source !== srcNode.id) {
        showToast('error', 'Model node already has a connected System Prompt.');
        triggerConflictHighlight(existingPromptEdge.id, existingPromptEdge.source);
        setConnectingSourceNodeId(null);
        return;
      }
    }

    const newEdges = edges.filter(e => {
      if (srcNode.type === 'web_input' && e.source === srcNode.id) return false;
      if (srcNode.type === 'system_prompt' && e.source === srcNode.id) return false;
      if (srcNode.type === 'model' && tgtNode.type === 'output' && e.source === srcNode.id && nodes.find(n => n.id === e.target)?.type === 'output') return false;
      if (tgtNode.type === 'model') {
        if (srcNode.type === 'web_input' && nodes.find(n => n.id === e.source)?.type === 'web_input') return false;
        if (srcNode.type === 'system_prompt' && nodes.find(n => n.id === e.source)?.type === 'system_prompt') return false;
      }
      if (tgtNode.type === 'output' && e.target === tgtNode.id) return false;
      return true;
    });

    const newEdge: GraphEdge = {
      id: `edge_${Date.now()}`,
      source: srcNode.id,
      target: tgtNode.id,
      sourceHandle: srcNode.type === 'system_prompt' ? 'prompt_out' : 'out',
      targetHandle: targetHandle,
      type: edgeType
    };

    setEdges([...newEdges, newEdge]);
    setConnectingSourceNodeId(null);
    setHasUnsavedChanges(true);
    showToast('success', `Connected: ${srcNode.data.label} -> ${tgtNode.data.label}`);
  };

  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  const updateNodeConfig = (key: string, value: any) => {
    if (!selectedNodeId) return;
    setNodes(prev => prev.map(n => {
      if (n.id === selectedNodeId) {
        return {
          ...n,
          data: {
            ...n.data,
            config: {
              ...n.data.config,
              [key]: value
            }
          }
        };
      }
      return n;
    }));
    setHasUnsavedChanges(true);
  };

  const NODE_WIDTH = 220;
  const NODE_HEIGHT = 100;

  const filteredPrompts = useMemo(() => {
    if (!searchQuery.trim()) return availablePrompts;
    const q = searchQuery.toLowerCase().trim();
    return availablePrompts.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.description && p.description.toLowerCase().includes(q))
    );
  }, [availablePrompts, searchQuery]);

  const filteredBots = useMemo(() => {
    if (!searchQuery.trim()) return availableBots;
    const q = searchQuery.toLowerCase().trim();
    return availableBots.filter(b =>
      b.name.toLowerCase().includes(q) ||
      b.platform.toLowerCase().includes(q) ||
      (b.guild_name && b.guild_name.toLowerCase().includes(q))
    );
  }, [availableBots, searchQuery]);

  const filteredSkills = useMemo(() => {
    if (!searchQuery.trim()) return availableSkills;
    const q = searchQuery.toLowerCase().trim();
    return availableSkills.filter(s =>
      s.name.toLowerCase().includes(q) ||
      (s.description && s.description.toLowerCase().includes(q))
    );
  }, [availableSkills, searchQuery]);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg-base)', color: 'var(--text-primary)', overflow: 'hidden' }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 9999,
          padding: '10px 18px',
          borderRadius: 'var(--radius-md)',
          background: toast.type === 'success' ? '#064e3b' : 'var(--danger-bg)',
          color: toast.type === 'success' ? 'var(--accent)' : 'var(--danger)',
          border: `1px solid ${toast.type === 'success' ? '#10b981' : 'var(--danger-border)'}`,
          fontWeight: 500,
          fontSize: '0.85rem',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <Icon name={toast.type === 'success' ? 'check' : 'alert'} size={14} />
          <span>{toast.message}</span>
        </div>
      )}

      {/* Editor Contextual Toolbar */}
      <header style={{
        height: '52px',
        borderBottom: '1px solid var(--border-subtle)',
        background: 'var(--bg-surface)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 1.25rem',
        zIndex: 40
      }}>
        {/* Left: Back & Project Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={() => {
              if (hasUnsavedChanges) setShowUnsavedModal(true);
              else router.push('/projects');
            }}
            className="btn btn-secondary"
            style={{ padding: '5px 12px', fontSize: '0.8rem' }}
          >
            <Icon name="projects" size={13} />
            Back to Projects
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
              {project?.name || 'Project Pipeline'}
            </span>
            {hasUnsavedChanges && (
              <span style={{ color: '#f59e0b', fontSize: '0.75rem', fontWeight: 500 }}>• Unsaved</span>
            )}
          </div>
        </div>

        {/* Center: Graph Validity Badge */}
        <div className={`badge ${isGraphValid ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.75rem', padding: '4px 10px' }}>
          <Icon name={isGraphValid ? 'check' : 'alert'} size={12} />
          <span>
            {isGraphValid
              ? (hasSystemPromptNode ? 'Valid Pipeline (+ System Prompt)' : 'Valid Pipeline (3 Basic Nodes)')
              : 'Missing Connections'}
          </span>
        </div>

        {/* Right: Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {project && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Status:</span>
              <select
                value={project.status}
                onChange={e => handleToggleStatus(e.target.value as any)}
                className="input"
                style={{
                  padding: '4px 8px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  width: 'auto',
                  color: project.status === 'ACTIVE' ? 'var(--accent)' : project.status === 'STOP' ? '#fbbf24' : 'var(--text-muted)'
                }}
              >
                <option value="STOP">STOP (Paused)</option>
                <option value="ACTIVE">ACTIVE (Running)</option>
                <option value="DEACTIVE">INACTIVE (Disabled)</option>
              </select>
            </div>
          )}

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn btn-primary"
            style={{ padding: '6px 14px', fontSize: '0.8rem' }}
          >
            <Icon name="check" size={13} />
            <span>{saving ? 'Saving...' : 'Save Graph'}</span>
          </button>
        </div>
      </header>

      {/* Editor Body */}
      <div style={{ flex: 1, display: 'flex', position: 'relative', overflow: 'hidden' }}>
        {/* Left Toolbar: Node Catalog */}
        <aside style={{
          width: '260px',
          borderRight: '1px solid var(--border-subtle)',
          background: 'var(--bg-surface)',
          padding: '0.85rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          zIndex: 20,
          overflowY: 'auto'
        }}>
          <div>
            <h4 style={{ margin: '0 0 0.15rem 0', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', fontWeight: 700 }}>
              Node Catalog
            </h4>
            <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              Drag or click to place nodes onto canvas
            </p>
          </div>

          {/* Search Bar */}
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Search nodes, bots, skills..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="input"
              style={{ padding: '6px 24px 6px 8px', fontSize: '0.75rem' }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '6px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: '0.75rem'
                }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Category Filter Pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {[
              { id: 'all', label: 'All' },
              { id: 'input', label: 'Input' },
              { id: 'system_prompt', label: 'Prompt' },
              { id: 'model', label: 'Model' },
              { id: 'output', label: 'Output' },
              { id: 'bot', label: 'Bots' },
              { id: 'skill', label: 'Skills' }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFilterCategory(f.id as any)}
                style={{
                  padding: '3px 8px',
                  borderRadius: '4px',
                  border: filterCategory === f.id ? '1px solid var(--accent)' : '1px solid var(--border-subtle)',
                  background: filterCategory === f.id ? 'rgba(62, 207, 142, 0.1)' : 'transparent',
                  color: filterCategory === f.id ? 'var(--accent)' : 'var(--text-secondary)',
                  fontSize: '0.7rem',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Catalog Groups */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {/* 1. Input Group */}
            {(filterCategory === 'all' || filterCategory === 'input') && (
              <div style={{ border: '1px solid var(--border-subtle)', borderRadius: '6px', overflow: 'hidden' }}>
                <button
                  onClick={() => toggleGroup('input')}
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    background: 'var(--bg-subtle)',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    color: 'var(--text-secondary)',
                    fontSize: '0.75rem',
                    fontWeight: 600
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Icon name="chat" size={13} style={{ color: '#06b6d4' }} />
                    Input Nodes
                  </span>
                  <span>{collapsedGroups.input ? '+' : '−'}</span>
                </button>
                {!collapsedGroups.input && (
                  <div style={{ padding: '6px' }}>
                    {(() => {
                      const alreadyExists = nodes.some(n => n.type === 'web_input');
                      return (
                        <div
                          onClick={() => handleAddStandardNode('web_input')}
                          style={{
                            background: 'var(--bg-surface)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: '4px',
                            padding: '6px 8px',
                            cursor: alreadyExists ? 'not-allowed' : 'pointer',
                            opacity: alreadyExists ? 0.5 : 1
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontWeight: 600, fontSize: '0.75rem', color: 'var(--text-primary)' }}>Web Input Node</span>
                            {alreadyExists && <span className="badge badge-neutral" style={{ fontSize: '0.65rem' }}>Added</span>}
                          </div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            Captures user message from chat (word limit)
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}

            {/* 2. System Prompt Group */}
            {(filterCategory === 'all' || filterCategory === 'system_prompt') && (
              <div style={{ border: '1px solid var(--border-subtle)', borderRadius: '6px', overflow: 'hidden' }}>
                <button
                  onClick={() => toggleGroup('system_prompt')}
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    background: 'var(--bg-subtle)',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    color: 'var(--text-secondary)',
                    fontSize: '0.75rem',
                    fontWeight: 600
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Icon name="prompts" size={13} style={{ color: '#f59e0b' }} />
                    System Prompts ({filteredPrompts.length})
                  </span>
                  <span>{collapsedGroups.system_prompt ? '+' : '−'}</span>
                </button>
                {!collapsedGroups.system_prompt && (
                  <div style={{ padding: '6px', display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '180px', overflowY: 'auto' }}>
                    {loadingPrompts ? (
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', padding: '6px' }}>Loading prompts...</div>
                    ) : filteredPrompts.length === 0 ? (
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', padding: '6px' }}>
                        {searchQuery ? 'No matching prompts found' : 'No prompts in library'}
                        <div style={{ marginTop: '4px' }}>
                          <Link href="/prompts" style={{ color: 'var(--accent)', textDecoration: 'none' }}>
                            + Manage Prompts
                          </Link>
                        </div>
                      </div>
                    ) : (
                      filteredPrompts.map(p => {
                        const isUsedInCanvas = nodes.some(n => n.type === 'system_prompt' && n.data.config?.prompt_id === p.id);
                        return (
                          <div
                            key={p.id}
                            onClick={() => handleAddPromptNode(p)}
                            style={{
                              background: 'var(--bg-surface)',
                              border: '1px solid var(--border-subtle)',
                              borderRadius: '4px',
                              padding: '6px 8px',
                              cursor: isUsedInCanvas ? 'not-allowed' : 'pointer',
                              opacity: isUsedInCanvas ? 0.5 : 1
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <span style={{ fontWeight: 600, fontSize: '0.75rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {p.name}
                              </span>
                              {isUsedInCanvas ? (
                                <span className="badge badge-neutral" style={{ fontSize: '0.65rem' }}>In Use</span>
                              ) : (
                                <span style={{ fontSize: '0.65rem', color: 'var(--accent)' }}>+ Add</span>
                              )}
                            </div>
                            {p.description && (
                              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {p.description}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 3. Model Group */}
            {(filterCategory === 'all' || filterCategory === 'model') && (
              <div style={{ border: '1px solid var(--border-subtle)', borderRadius: '6px', overflow: 'hidden' }}>
                <button
                  onClick={() => toggleGroup('model')}
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    background: 'var(--bg-subtle)',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    color: 'var(--text-secondary)',
                    fontSize: '0.75rem',
                    fontWeight: 600
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Icon name="settings" size={13} style={{ color: '#a855f7' }} />
                    Model LLM
                  </span>
                  <span>{collapsedGroups.model ? '+' : '−'}</span>
                </button>
                {!collapsedGroups.model && (
                  <div style={{ padding: '6px' }}>
                    {(() => {
                      const alreadyExists = nodes.some(n => n.type === 'model');
                      return (
                        <div
                          onClick={() => handleAddStandardNode('model')}
                          style={{
                            background: 'var(--bg-surface)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: '4px',
                            padding: '6px 8px',
                            cursor: alreadyExists ? 'not-allowed' : 'pointer',
                            opacity: alreadyExists ? 0.5 : 1
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontWeight: 600, fontSize: '0.75rem', color: 'var(--text-primary)' }}>Model LLM Node</span>
                            {alreadyExists && <span className="badge badge-neutral" style={{ fontSize: '0.65rem' }}>Added</span>}
                          </div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            AI inference processing via provider
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}

            {/* 4. Output Group */}
            {(filterCategory === 'all' || filterCategory === 'output') && (
              <div style={{ border: '1px solid var(--border-subtle)', borderRadius: '6px', overflow: 'hidden' }}>
                <button
                  onClick={() => toggleGroup('output')}
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    background: 'var(--bg-subtle)',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    color: 'var(--text-secondary)',
                    fontSize: '0.75rem',
                    fontWeight: 600
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Icon name="check" size={13} style={{ color: 'var(--accent)' }} />
                    Output Nodes
                  </span>
                  <span>{collapsedGroups.output ? '+' : '−'}</span>
                </button>
                {!collapsedGroups.output && (
                  <div style={{ padding: '6px' }}>
                    {(() => {
                      const alreadyExists = nodes.some(n => n.type === 'output');
                      return (
                        <div
                          onClick={() => handleAddStandardNode('output')}
                          style={{
                            background: 'var(--bg-surface)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: '4px',
                            padding: '6px 8px',
                            cursor: alreadyExists ? 'not-allowed' : 'pointer',
                            opacity: alreadyExists ? 0.5 : 1
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontWeight: 600, fontSize: '0.75rem', color: 'var(--text-primary)' }}>Web Output Node</span>
                            {alreadyExists && <span className="badge badge-neutral" style={{ fontSize: '0.65rem' }}>Added</span>}
                          </div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            Formats streaming output responses (SSE)
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}

            {/* 5. Bots Group */}
            {(filterCategory === 'all' || filterCategory === 'bot') && (
              <div style={{ border: '1px solid var(--border-subtle)', borderRadius: '6px', overflow: 'hidden' }}>
                <button
                  onClick={() => toggleGroup('bot')}
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    background: 'var(--bg-subtle)',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    color: 'var(--text-secondary)',
                    fontSize: '0.75rem',
                    fontWeight: 600
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Icon name="bot" size={13} style={{ color: '#6366f1' }} />
                    Bots ({filteredBots.length})
                  </span>
                  <span>{collapsedGroups.bot ? '+' : '−'}</span>
                </button>
                {!collapsedGroups.bot && (
                  <div style={{ padding: '6px', display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '180px', overflowY: 'auto' }}>
                    {loadingBots ? (
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', padding: '6px' }}>Loading eligible bots...</div>
                    ) : discordLinked === false ? (
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', padding: '6px' }}>
                        <div>Discord connection required to use Bots.</div>
                        <div style={{ marginTop: '4px' }}>
                          <Link href="/settings?tab=connections" style={{ color: '#818cf8', textDecoration: 'none', fontWeight: 600 }}>
                            Link Discord in Settings →
                          </Link>
                        </div>
                      </div>
                    ) : filteredBots.length === 0 ? (
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', padding: '6px' }}>
                        {searchQuery ? 'No matching bots found' : 'No eligible bots configured'}
                        <div style={{ marginTop: '4px' }}>
                          <Link href="/bot/discord" style={{ color: '#818cf8', textDecoration: 'none', fontWeight: 600 }}>
                            Configure Bot →
                          </Link>
                        </div>
                      </div>
                    ) : (
                      filteredBots.map(bot => {
                        const isUsedInCanvas = nodes.some(n => n.type === 'bot' && n.data.config?.bot_id === bot.id);
                        return (
                          <div
                            key={bot.id}
                            onClick={() => handleAddBotNode(bot)}
                            style={{
                              background: 'var(--bg-surface)',
                              border: '1px solid var(--border-subtle)',
                              borderRadius: '4px',
                              padding: '6px 8px',
                              cursor: isUsedInCanvas ? 'not-allowed' : 'pointer',
                              opacity: isUsedInCanvas ? 0.5 : 1
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <span style={{ fontWeight: 600, fontSize: '0.75rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {bot.name}
                              </span>
                              {isUsedInCanvas ? (
                                <span className="badge badge-neutral" style={{ fontSize: '0.65rem' }}>In Use</span>
                              ) : (
                                <span style={{ fontSize: '0.65rem', color: '#818cf8' }}>+ Add</span>
                              )}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                              <span>Discord</span>
                              {bot.status && (
                                <span style={{
                                  color: bot.status === 'ACTIVE' ? 'var(--accent)' : 'var(--text-muted)',
                                  fontSize: '0.62rem',
                                  fontWeight: 600
                                }}>
                                  • {bot.status}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 6. Skills Group */}
            {(filterCategory === 'all' || filterCategory === 'skill') && (
              <div style={{ border: '1px solid var(--border-subtle)', borderRadius: '6px', overflow: 'hidden' }}>
                <button
                  onClick={() => toggleGroup('skill')}
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    background: 'var(--bg-subtle)',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    color: 'var(--text-secondary)',
                    fontSize: '0.75rem',
                    fontWeight: 600
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Icon name="skills" size={13} style={{ color: '#f43f5e' }} />
                    Skills ({filteredSkills.length})
                  </span>
                  <span>{collapsedGroups.skill ? '+' : '−'}</span>
                </button>
                {!collapsedGroups.skill && (
                  <div style={{ padding: '6px', display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '180px', overflowY: 'auto' }}>
                    {loadingSkills ? (
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', padding: '6px' }}>Loading available skills...</div>
                    ) : filteredSkills.length === 0 ? (
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', padding: '6px' }}>
                        {searchQuery ? 'No matching skills found' : 'No valid skills in library'}
                        <div style={{ marginTop: '4px' }}>
                          <Link href="/skills" style={{ color: '#f43f5e', textDecoration: 'none', fontWeight: 600 }}>
                            + Manage Skills
                          </Link>
                        </div>
                      </div>
                    ) : (
                      filteredSkills.map(skill => {
                        const isUsedInCanvas = nodes.some(n => n.type === 'skill' && n.data.config?.skill_id === skill.id);
                        return (
                          <div
                            key={skill.id}
                            onClick={() => handleAddSkillNode(skill)}
                            style={{
                              background: 'var(--bg-surface)',
                              border: '1px solid var(--border-subtle)',
                              borderRadius: '4px',
                              padding: '6px 8px',
                              cursor: isUsedInCanvas ? 'not-allowed' : 'pointer',
                              opacity: isUsedInCanvas ? 0.5 : 1
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <span style={{ fontWeight: 600, fontSize: '0.75rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {skill.name}
                              </span>
                              {isUsedInCanvas ? (
                                <span className="badge badge-neutral" style={{ fontSize: '0.65rem' }}>Added</span>
                              ) : (
                                <span style={{ fontSize: '0.65rem', color: '#f43f5e' }}>+ Add</span>
                              )}
                            </div>
                            {skill.description && (
                              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {skill.description}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{ marginTop: 'auto', padding: '6px 8px', background: 'var(--bg-subtle)', borderRadius: '4px', fontSize: '0.68rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
            <strong>Wiring Instructions:</strong><br />
            • Blue port (Input) → Top port of Model (User Message)<br />
            • Orange port (Prompt) → Bottom port of Model (Instruction)<br />
            • Right port of Model → Output port (SSE Stream)<br />
            • Right port of Model → Bot (max 1 Bot connection)<br />
            • Right port of Model → Skills (multiple allowed)
          </div>
        </aside>

        {/* Canvas Area */}
        <div
          ref={canvasRef}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          style={{
            flex: 1,
            position: 'relative',
            overflow: 'hidden',
            cursor: isPanning ? 'grabbing' : 'default',
            backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px)',
            backgroundSize: `${24 * viewport.zoom}px ${24 * viewport.zoom}px`,
            backgroundPosition: `${viewport.x}px ${viewport.y}px`,
            backgroundColor: 'var(--bg-base)'
          }}
        >
          {/* Zoom & Viewport Controls */}
          <div style={{
            position: 'absolute',
            bottom: '16px',
            left: '16px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            padding: '3px 6px',
            gap: '6px',
            zIndex: 10
          }}>
            <button
              onClick={() => setViewport(prev => ({ ...prev, zoom: Math.min(2, prev.zoom + 0.1) }))}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 700 }}
            >+</button>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', minWidth: '36px', textAlign: 'center' }}>
              {Math.round(viewport.zoom * 100)}%
            </span>
            <button
              onClick={() => setViewport(prev => ({ ...prev, zoom: Math.max(0.5, prev.zoom - 0.1) }))}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 700 }}
            >-</button>
            <button
              onClick={() => setViewport({ x: 0, y: 0, zoom: 1 })}
              style={{ background: 'transparent', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '0.7rem', marginLeft: '4px' }}
            >Fit</button>
          </div>

          {/* SVG Overlay for Connections */}
          <svg style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none'
          }}>
            <g transform={`translate(${viewport.x}, ${viewport.y}) scale(${viewport.zoom})`}>
              {edges.map(edge => {
                const srcNode = nodes.find(n => n.id === edge.source);
                const tgtNode = nodes.find(n => n.id === edge.target);
                if (!srcNode || !tgtNode) return null;

                const isPromptEdge = srcNode.type === 'system_prompt';
                const isBotEdge = tgtNode.type === 'bot';
                const isSkillEdge = tgtNode.type === 'skill';
                const isSelected = selectedEdgeId === edge.id;

                const srcPos = (srcNode.position && typeof srcNode.position.x === 'number' && typeof srcNode.position.y === 'number')
                  ? srcNode.position
                  : { x: 80, y: 180 };
                const tgtPos = (tgtNode.position && typeof tgtNode.position.x === 'number' && typeof tgtNode.position.y === 'number')
                  ? tgtNode.position
                  : { x: 440, y: 220 };

                const startX = srcPos.x + NODE_WIDTH;
                const startY = srcPos.y + NODE_HEIGHT / 2;

                let endY = tgtPos.y + NODE_HEIGHT / 2;
                if (tgtNode.type === 'model') {
                  endY = isPromptEdge ? tgtPos.y + NODE_HEIGHT * 0.72 : tgtPos.y + NODE_HEIGHT * 0.32;
                }
                const endX = tgtPos.x;

                const dx = Math.max(60, Math.abs(endX - startX) * 0.5);
                const pathData = `M ${startX} ${startY} C ${startX + dx} ${startY}, ${endX - dx} ${endY}, ${endX} ${endY}`;

                const isConflicting = conflictingEdgeId === edge.id;

                const edgeStroke = isConflicting
                  ? '#ef4444'
                  : isSelected
                  ? 'var(--danger)'
                  : isPromptEdge
                  ? '#f59e0b'
                  : isBotEdge
                  ? '#6366f1'
                  : isSkillEdge
                  ? '#f43f5e'
                  : '#38bdf8';

                return (
                  <g key={edge.id} style={{ pointerEvents: 'auto' }}>
                    <path
                      d={pathData}
                      fill="none"
                      stroke="transparent"
                      strokeWidth={16}
                      onClick={() => setSelectedEdgeId(edge.id)}
                      style={{ cursor: 'pointer' }}
                    />
                    <path
                      d={pathData}
                      fill="none"
                      stroke={edgeStroke}
                      strokeWidth={isConflicting ? 4 : isSelected ? 3 : 2}
                      strokeDasharray={isConflicting ? '6 4' : isPromptEdge ? '4 3' : (isBotEdge || isSkillEdge) ? '3 3' : '6 4'}
                      filter={isConflicting ? 'drop-shadow(0 0 8px rgba(239, 68, 68, 0.9))' : undefined}
                      onClick={() => setSelectedEdgeId(edge.id)}
                      style={{ cursor: 'pointer' }}
                    />
                    {isSelected && (
                      <g transform={`translate(${(startX + endX) / 2}, ${(startY + endY) / 2})`}>
                        <circle r={10} fill="var(--danger)" style={{ cursor: 'pointer' }} onClick={() => handleDeleteEdge(edge.id)} />
                        <text textAnchor="middle" dy={4} fill="#fff" fontSize={11} fontWeight={700} style={{ pointerEvents: 'none' }}>×</text>
                      </g>
                    )}
                  </g>
                );
              })}

              {connectingSourceNodeId && (() => {
                const srcNode = nodes.find(n => n.id === connectingSourceNodeId);
                if (!srcNode) return null;
                const srcPos = (srcNode.position && typeof srcNode.position.x === 'number' && typeof srcNode.position.y === 'number')
                  ? srcNode.position
                  : { x: 80, y: 180 };
                const startX = srcPos.x + NODE_WIDTH;
                const startY = srcPos.y + NODE_HEIGHT / 2;
                const dx = Math.abs(mousePos.x - startX) * 0.5;
                const pathData = `M ${startX} ${startY} C ${startX + dx} ${startY}, ${mousePos.x - dx} ${mousePos.y}, ${mousePos.x} ${mousePos.y}`;

                const dragColor = srcNode.type === 'system_prompt'
                  ? '#f59e0b'
                  : srcNode.type === 'model'
                  ? '#a855f7'
                  : '#38bdf8';

                return (
                  <path
                    d={pathData}
                    fill="none"
                    stroke={dragColor}
                    strokeWidth={2}
                    strokeDasharray="4 4"
                  />
                );
              })()}
            </g>
          </svg>

          {/* Render Nodes */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
            transformOrigin: '0 0'
          }}>
            {nodes.map(node => {
              const isSelected = selectedNodeId === node.id;
              const isInput = node.type === 'web_input';
              const isPrompt = node.type === 'system_prompt';
              const isModel = node.type === 'model';
              const isOutput = node.type === 'output';
              const isBot = node.type === 'bot';
              const isSkill = node.type === 'skill';

              const accentColor = isInput
                ? '#06b6d4'
                : isPrompt
                ? '#f59e0b'
                : isModel
                ? '#a855f7'
                : isBot
                ? '#6366f1'
                : isSkill
                ? '#f43f5e'
                : 'var(--accent)';

              const nodePos = (node.position && typeof node.position.x === 'number' && typeof node.position.y === 'number')
                ? node.position
                : { x: 80, y: 180 };

              const hasSourceHandle = isInput || isPrompt || isModel;

              return (
                <div
                  key={node.id}
                  className="node-card"
                  onMouseDown={e => handleNodeMouseDown(e, node)}
                  style={{
                    position: 'absolute',
                    left: `${nodePos.x}px`,
                    top: `${nodePos.y}px`,
                    width: `${NODE_WIDTH}px`,
                    minHeight: `${NODE_HEIGHT}px`,
                    background: 'var(--bg-surface)',
                    border: `1.5px solid ${conflictingNodeId === node.id ? '#ef4444' : isSelected ? accentColor : 'var(--border-subtle)'}`,
                    borderRadius: '8px',
                    padding: '10px',
                    boxShadow: conflictingNodeId === node.id ? '0 0 20px rgba(239, 68, 68, 0.8)' : isSelected ? `0 0 16px ${accentColor}30` : '0 4px 12px rgba(0,0,0,0.3)',
                    cursor: 'move',
                    userSelect: 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}
                >
                  {isOutput && (
                    <div
                      className="handle-circle"
                      onMouseUp={e => handleTargetHandleMouseUp(e, node.id, 'in')}
                      style={{
                        position: 'absolute',
                        left: '-7px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: '14px',
                        height: '14px',
                        borderRadius: '50%',
                        background: 'var(--accent)',
                        border: '2px solid var(--bg-surface)',
                        cursor: 'crosshair',
                        zIndex: 20
                      }}
                      title="Data Input Port (In)"
                    />
                  )}

                  {isBot && (
                    <div
                      className="handle-circle"
                      onMouseUp={e => handleTargetHandleMouseUp(e, node.id, 'bot_in')}
                      style={{
                        position: 'absolute',
                        left: '-7px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: '14px',
                        height: '14px',
                        borderRadius: '50%',
                        background: '#6366f1',
                        border: '2px solid var(--bg-surface)',
                        cursor: 'crosshair',
                        zIndex: 20
                      }}
                      title="Bot Binding Port (In: Connect from Model)"
                    />
                  )}

                  {isSkill && (
                    <div
                      className="handle-circle"
                      onMouseUp={e => handleTargetHandleMouseUp(e, node.id, 'skill_in')}
                      style={{
                        position: 'absolute',
                        left: '-7px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: '14px',
                        height: '14px',
                        borderRadius: '50%',
                        background: '#f43f5e',
                        border: '2px solid var(--bg-surface)',
                        cursor: 'crosshair',
                        zIndex: 20
                      }}
                      title="Skill Binding Port (In: Connect from Model)"
                    />
                  )}

                  {isModel && (
                    <>
                      <div
                        className="handle-circle"
                        onMouseUp={e => handleTargetHandleMouseUp(e, node.id, 'in')}
                        style={{
                          position: 'absolute',
                          left: '-7px',
                          top: '32%',
                          transform: 'translateY(-50%)',
                          width: '14px',
                          height: '14px',
                          borderRadius: '50%',
                          background: '#38bdf8',
                          border: '2px solid var(--bg-surface)',
                          cursor: 'crosshair',
                          zIndex: 20
                        }}
                        title="User Message Port: Web Input (In)"
                      />
                      <div
                        className="handle-circle"
                        onMouseUp={e => handleTargetHandleMouseUp(e, node.id, 'system_instruction')}
                        style={{
                          position: 'absolute',
                          left: '-7px',
                          top: '72%',
                          transform: 'translateY(-50%)',
                          width: '14px',
                          height: '14px',
                          borderRadius: '50%',
                          background: '#f59e0b',
                          border: '2px solid var(--bg-surface)',
                          cursor: 'crosshair',
                          zIndex: 20
                        }}
                        title="Instruction Port: System Prompt (In)"
                      />
                    </>
                  )}

                  {hasSourceHandle && (
                    <div
                      className="handle-circle"
                      onMouseDown={e => handleSourceHandleMouseDown(e, node.id)}
                      style={{
                        position: 'absolute',
                        right: '-7px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: '14px',
                        height: '14px',
                        borderRadius: '50%',
                        background: accentColor,
                        border: '2px solid var(--bg-surface)',
                        cursor: 'crosshair',
                        zIndex: 20
                      }}
                      title={isModel ? "Output Port (Connect to Output, Bot, or Skills)" : "Output Port: Drag to connect"}
                    />
                  )}

                  {/* Node Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Icon
                        name={isInput ? 'chat' : isPrompt ? 'prompts' : isModel ? 'settings' : isBot ? 'bot' : isSkill ? 'skills' : 'check'}
                        size={14}
                        style={{ color: accentColor }}
                      />
                      <span style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }}>
                        {node.data.label}
                      </span>
                    </div>

                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteNode(node.id); }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        padding: '1px 3px'
                      }}
                      title="Delete node"
                    >×</button>
                  </div>

                  {/* Node Preview Meta */}
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', background: 'var(--bg-subtle)', padding: '4px 6px', borderRadius: '4px' }}>
                    {isInput && (
                      <div>Limit: <strong style={{ color: 'var(--text-primary)' }}>{node.data.config?.max_words || 500} words</strong></div>
                    )}
                    {isPrompt && (
                      <div>
                        Prompt: <strong style={{ color: '#fbbf24' }}>{node.data.config?.name || 'Linked'}</strong>
                      </div>
                    )}
                    {isModel && (
                      <div>
                        <div>Model: <strong style={{ color: 'var(--text-primary)' }}>{node.data.config?.model_id || 'Not selected'}</strong></div>
                        {(() => {
                          const connectedBotEdge = edges.find(e => e.source === node.id && nodes.find(n => n.id === e.target)?.type === 'bot');
                          const connectedBotNode = connectedBotEdge ? nodes.find(n => n.id === connectedBotEdge.target) : null;
                          const connectedSkillEdges = edges.filter(e => e.source === node.id && nodes.find(n => n.id === e.target)?.type === 'skill');

                          return (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                              <span style={{
                                fontSize: '0.62rem',
                                padding: '1px 5px',
                                borderRadius: '3px',
                                background: connectedBotNode ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-base)',
                                border: `1px solid ${connectedBotNode ? '#6366f1' : 'var(--border-subtle)'}`,
                                color: connectedBotNode ? '#818cf8' : 'var(--text-muted)'
                              }}>
                                {connectedBotNode ? `Bot: ${connectedBotNode.data.label}` : 'No Bot'}
                              </span>
                              <span style={{
                                fontSize: '0.62rem',
                                padding: '1px 5px',
                                borderRadius: '3px',
                                background: connectedSkillEdges.length > 0 ? 'rgba(244, 63, 94, 0.15)' : 'var(--bg-base)',
                                border: `1px solid ${connectedSkillEdges.length > 0 ? '#f43f5e' : 'var(--border-subtle)'}`,
                                color: connectedSkillEdges.length > 0 ? '#fb7185' : 'var(--text-muted)'
                              }}>
                                Skills: {connectedSkillEdges.length}
                              </span>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                    {isBot && (
                      <div>
                        Platform: <strong style={{ color: '#818cf8' }}>Discord</strong>
                        {node.data.config?.guild_name && (
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>{node.data.config.guild_name}</div>
                        )}
                      </div>
                    )}
                    {isSkill && (
                      <div>
                        Skill: <strong style={{ color: '#fb7185' }}>{node.data.config?.skill_name || node.data.label}</strong>
                      </div>
                    )}
                    {isOutput && (
                      <div>Stream: <strong style={{ color: 'var(--accent)' }}>Enabled (SSE)</strong></div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Floating Project Chat inside the Graph Canvas Viewport */}
          <FloatingProjectChat
            project={project}
            nodes={nodes}
            edges={edges}
            isGraphValid={isGraphValid}
            onActivateProject={async () => {
              if (project) {
                try {
                  await ProjectService.activateProject(project.id);
                  const updatedProj = await ProjectService.getProject(project.id);
                  setProject(updatedProj);
                  showToast('success', 'Project activated successfully!');
                } catch (err: any) {
                  showToast('error', err?.message || 'Failed to activate project.');
                }
              }
            }}
            canvasContainerRef={canvasRef}
          />
        </div>

        {/* Right Drawer: Node Configuration */}
        {selectedNode && (
          <aside className="config-drawer" style={{
            width: '300px',
            borderLeft: '1px solid var(--border-subtle)',
            background: 'var(--bg-surface)',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            zIndex: 30,
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Icon
                  name={selectedNode.type === 'web_input' ? 'chat' : selectedNode.type === 'system_prompt' ? 'prompts' : selectedNode.type === 'model' ? 'settings' : selectedNode.type === 'bot' ? 'bot' : selectedNode.type === 'skill' ? 'skills' : 'check'}
                  size={15}
                  style={{ color: 'var(--accent)' }}
                />
                <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Configure {selectedNode.data.label}
                </h3>
              </div>
              <button
                onClick={() => setSelectedNodeId(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.1rem' }}
              >×</button>
            </div>

            {selectedNode.type === 'web_input' && (
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Word Limit (max_words): <span style={{ color: '#06b6d4', fontWeight: 700 }}>{selectedNode.data.config?.max_words || 500} words</span>
                </label>
                <input
                  type="range"
                  min={10}
                  max={4000}
                  step={10}
                  value={selectedNode.data.config?.max_words || 500}
                  onChange={e => updateNodeConfig('max_words', parseInt(e.target.value))}
                  style={{ width: '100%', accentColor: '#06b6d4', cursor: 'pointer', marginBottom: '6px' }}
                />
                <input
                  type="number"
                  min={10}
                  max={4000}
                  value={selectedNode.data.config?.max_words || 500}
                  onChange={e => updateNodeConfig('max_words', parseInt(e.target.value) || 10)}
                  className="input"
                  style={{ padding: '6px 8px', fontSize: '0.8rem' }}
                />
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  If user input exceeds this word threshold during chat, the request is halted with a warning.
                </p>
              </div>
            )}

            {selectedNode.type === 'system_prompt' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Linked System Prompt:
                  </label>
                  <select
                    value={selectedNode.data.config?.prompt_id || ''}
                    onChange={e => {
                      const selected = availablePrompts.find(p => p.id === e.target.value);
                      if (selected) {
                        setNodes(prev => prev.map(n => {
                          if (n.id === selectedNode.id) {
                            return {
                              ...n,
                              data: {
                                label: selected.name,
                                config: {
                                  prompt_id: selected.id,
                                  name: selected.name,
                                  description: selected.description
                                }
                              }
                            };
                          }
                          return n;
                        }));
                        setHasUnsavedChanges(true);
                      }
                    }}
                    className="input"
                    style={{ padding: '8px', fontSize: '0.8rem' }}
                  >
                    {availablePrompts.map(p => (
                      <option key={p.id} value={p.id} style={{ background: '#111827', color: '#fff' }}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.2)', padding: '8px', borderRadius: '4px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fbbf24', marginBottom: '2px' }}>
                    Prompt ID: {selectedNode.data.config?.prompt_id}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    {selectedNode.data.config?.description || 'No additional description'}
                  </div>
                </div>

                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                  <strong>Dynamic Reference:</strong> When a user chats, the runtime resolves the latest version of this prompt from the prompt library.
                </div>

                <Link
                  href="/prompts"
                  target="_blank"
                  className="btn btn-secondary"
                  style={{ textAlign: 'center', fontSize: '0.75rem', padding: '6px' }}
                >
                  Open System Prompt Manager
                </Link>
              </div>
            )}

            {selectedNode.type === 'model' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Model Selection:
                  </label>
                  <select
                    value={selectedNode.data.config?.model_id || 'gemini-3.8-flash'}
                    onChange={e => updateNodeConfig('model_id', e.target.value)}
                    className="input"
                    style={{ padding: '8px', fontSize: '0.8rem' }}
                  >
                    {availableModels.map(m => (
                      <option key={m.id} value={m.id} style={{ background: '#111827', color: '#fff' }}>
                        {m.name} ({m.provider.toUpperCase()})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Temperature: <span style={{ color: '#a855f7', fontWeight: 700 }}>{selectedNode.data.config?.temperature ?? 0.7}</span>
                  </label>
                  <input
                    type="range"
                    min={0.0}
                    max={2.0}
                    step={0.1}
                    value={selectedNode.data.config?.temperature ?? 0.7}
                    onChange={e => updateNodeConfig('temperature', parseFloat(e.target.value))}
                    style={{ width: '100%', accentColor: '#a855f7', cursor: 'pointer' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                    <span>0.0 (Precise)</span>
                    <span>1.0 (Balanced)</span>
                    <span>2.0 (Creative)</span>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Max Output Tokens:
                  </label>
                  <input
                    type="number"
                    min={256}
                    max={8192}
                    value={selectedNode.data.config?.max_tokens || 2048}
                    onChange={e => updateNodeConfig('max_tokens', parseInt(e.target.value) || 256)}
                    className="input"
                    style={{ padding: '6px 8px', fontSize: '0.8rem' }}
                  />
                </div>
              </div>
            )}
            {selectedNode.type === 'output' && (
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                  <input
                    type="checkbox"
                    checked={selectedNode.data.config?.streaming ?? true}
                    onChange={e => updateNodeConfig('streaming', e.target.checked)}
                    style={{ width: '15px', height: '15px', accentColor: 'var(--accent)' }}
                  />
                  <span>Enable Streaming (Server-Sent Events)</span>
                </label>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                  Streams words incrementally to the chat UI in real time.
                </p>
              </div>
            )}

            {selectedNode.type === 'bot' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.25)', padding: '10px', borderRadius: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#818cf8' }}>
                      {selectedNode.data.config?.platform?.toUpperCase() || 'DISCORD'} BOT
                    </span>
                    <span style={{ fontSize: '0.65rem', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                      ACTIVE
                    </span>
                  </div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>
                    {selectedNode.data.config?.name || selectedNode.data.label}
                  </div>
                  {selectedNode.data.config?.guild_name && (
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      Server: {selectedNode.data.config.guild_name}
                    </div>
                  )}
                  {selectedNode.data.config?.trigger_mode && (
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Trigger: {selectedNode.data.config.trigger_mode}
                    </div>
                  )}
                </div>

                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', background: 'var(--bg-card)', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>
                    AUTHORITATIVE RESOURCE ID
                  </div>
                  <code style={{ fontSize: '0.75rem', color: '#a5b4fc', wordBreak: 'break-all' }}>
                    {selectedNode.data.config?.bot_id}
                  </code>
                </div>

                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                  <strong>Constraint:</strong> A Model node can connect to at most one Bot. Backend graph execution will invoke this bot instance for project events.
                </div>

                <Link
                  href="/bot/discord"
                  target="_blank"
                  className="btn btn-secondary"
                  style={{ textAlign: 'center', fontSize: '0.75rem', padding: '6px' }}
                >
                  Open Bot Management
                </Link>
              </div>
            )}

            {selectedNode.type === 'skill' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ background: 'rgba(244, 63, 94, 0.08)', border: '1px solid rgba(244, 63, 94, 0.25)', padding: '10px', borderRadius: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fb7185' }}>
                      SKILL MODULE
                    </span>
                    <span style={{ fontSize: '0.65rem', background: 'rgba(244, 63, 94, 0.15)', color: '#fb7185', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                      v{selectedNode.data.config?.version || '1.0.0'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>
                    {selectedNode.data.config?.name || selectedNode.data.label}
                  </div>
                  {selectedNode.data.config?.description && (
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px', lineHeight: '1.4' }}>
                      {selectedNode.data.config.description}
                    </div>
                  )}
                </div>

                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', background: 'var(--bg-card)', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>
                    SKILL RESOURCE ID
                  </div>
                  <code style={{ fontSize: '0.75rem', color: '#fda4af', wordBreak: 'break-all' }}>
                    {selectedNode.data.config?.skill_id}
                  </code>
                </div>

                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                  <strong>Runtime Behavior:</strong> The executor loads this skill's prompt guidelines and markdown rules to augment model context. Multiple distinct skills can connect to one Model node.
                </div>

                <Link
                  href="/skills"
                  target="_blank"
                  className="btn btn-secondary"
                  style={{ textAlign: 'center', fontSize: '0.75rem', padding: '6px' }}
                >
                  Open Skill Management
                </Link>
              </div>
            )}
          </aside>
        )}
      </div>

      {/* Modal: Unsaved Changes Warning */}
      {showUnsavedModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div className="card" style={{ maxWidth: '400px', width: '100%', padding: '1.5rem' }}>
            <h3 style={{ color: '#fbbf24', margin: '0 0 0.5rem 0', fontWeight: 600, fontSize: '1rem' }}>
              Unsaved Changes
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.5', margin: '0 0 1.25rem 0' }}>
              You have unsaved changes on the canvas. Are you sure you want to discard them?
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                onClick={() => setShowUnsavedModal(false)}
                className="btn btn-secondary"
              >
                Keep Editing
              </button>
              <button
                onClick={() => {
                  setShowUnsavedModal(false);
                  router.push('/projects');
                }}
                className="btn btn-danger"
              >
                Discard & Leave
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
