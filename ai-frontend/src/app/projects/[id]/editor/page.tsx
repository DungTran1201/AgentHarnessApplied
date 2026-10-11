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
  SystemPromptSummary
} from '@/types';
import { ProjectService } from '@/services/projectService';
import { SystemPromptService } from '@/services/systemPromptService';

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

  // Node Catalog UI state: Collapsible groups, Search & Category Filter
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({
    input: false,
    system_prompt: false,
    model: false,
    output: false
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<'all' | 'input' | 'system_prompt' | 'model' | 'output'>('all');

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

  // Load project, models & prompts on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setLoadingPrompts(true);
        const [projData, modelsRes, promptsRes] = await Promise.all([
          ProjectService.getProject(projectId),
          fetch('/api/v1/models').then(r => r.ok ? r.json() : []).catch(() => []),
          SystemPromptService.getPrompts().then(r => r.items).catch(() => [])
        ]);

        setProject(projData);
        setAvailableModels(modelsRes.filter((m: AgentModel) => m.status === 'ACTIVE'));
        setAvailablePrompts(promptsRes || []);

        if (projData.graph_data && projData.graph_data.nodes && projData.graph_data.nodes.length > 0) {
          // Normalize nodes: ensure each node has valid coordinate positions (x, y)
          const defaultPositionsByType: Record<string, { x: number; y: number }> = {
            web_input: { x: 80, y: 180 },
            system_prompt: { x: 80, y: 360 },
            model: { x: 440, y: 220 },
            output: { x: 800, y: 220 }
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
          // Khởi tạo 3 node mặc định cho trải nghiệm mượt mà
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
        showToast('error', err.message || 'Lỗi khi tải project');
      } finally {
        setLoading(false);
        setLoadingPrompts(false);
      }
    };

    fetchData();
  }, [projectId]);

  // Real-time graph validation (BR-SPN-001..005)
  const checkGraphValidity = () => {
    const inputNode = nodes.find(n => n.type === 'web_input');
    const modelNode = nodes.find(n => n.type === 'model');
    const outputNode = nodes.find(n => n.type === 'output');
    const promptNodes = nodes.filter(n => n.type === 'system_prompt');

    if (!inputNode || !modelNode || !outputNode) return false;
    if (promptNodes.length > 1) return false;

    const hasInToModel = edges.some(e => e.source === inputNode.id && e.target === modelNode.id);
    const hasModelToOut = edges.some(e => e.source === modelNode.id && e.target === outputNode.id);

    if (!hasInToModel || !hasModelToOut) return false;

    if (promptNodes.length === 1) {
      const pNode = promptNodes[0];
      const hasPromptToModel = edges.some(e => e.source === pNode.id && e.target === modelNode.id);
      if (!hasPromptToModel) return false;
      if (!pNode.data.config?.prompt_id) return false;
    }

    const expectedEdgeCount = promptNodes.length === 1 ? 3 : 2;
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
      showToast('success', res.message || 'Đã lưu cấu trúc graph thành công!');
      setHasUnsavedChanges(false);
      
      // Cập nhật lại project
      const updatedProj = await ProjectService.getProject(projectId);
      setProject(updatedProj);
    } catch (err: any) {
      showToast('error', err.message || 'Lỗi khi lưu graph');
    } finally {
      setSaving(false);
    }
  };

  // Toggle Project Status
  const handleToggleStatus = async (targetStatus: 'ACTIVE' | 'STOP' | 'DEACTIVE') => {
    try {
      if (targetStatus === 'ACTIVE') {
        if (!isGraphValid) {
          showToast('error', 'Graph chưa hợp lệ! Vui lòng nối Input → Model → Output và System Prompt (nếu có).');
          return;
        }
        await ProjectService.activateProject(projectId);
        showToast('success', 'Đã kích hoạt project! Có thể chọn chat từ Trang Chủ.');
      } else if (targetStatus === 'STOP') {
        await ProjectService.stopProject(projectId);
        showToast('success', 'Đã tạm dừng project.');
      } else {
        await ProjectService.deactivateProject(projectId);
        showToast('success', 'Đã vô hiệu hóa project.');
      }
      const updatedProj = await ProjectService.getProject(projectId);
      setProject(updatedProj);
    } catch (err: any) {
      showToast('error', err.message || 'Thao tác trạng thái thất bại');
    }
  };

  // Add standard node (Input, Model, Output)
  const handleAddStandardNode = (type: NodeType) => {
    if (nodes.some(n => n.type === type)) {
      showToast('error', `Mỗi project chỉ được chứa tối đa 1 ${type === 'web_input' ? 'Web Input' : type === 'model' ? 'Model' : 'Output'} Node.`);
      return;
    }

    const newId = `node_${type}_${Date.now()}`;
    const defaultLabels: Record<NodeType, string> = {
      web_input: 'Web Input',
      model: 'Model LLM',
      output: 'Web Output',
      system_prompt: 'System Prompt'
    };

    const defaultConfigs: Record<NodeType, any> = {
      web_input: { max_words: 500 },
      model: { model_id: availableModels[0]?.id || 'gemini-3.8-flash', temperature: 0.7, max_tokens: 2048 },
      output: { streaming: true },
      system_prompt: {}
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

  // Add System Prompt Node from Prompt Library (MVP - DEC-SPN-01, DEC-SPN-02)
  const handleAddPromptNode = (prompt: SystemPromptSummary) => {
    if (nodes.some(n => n.type === 'system_prompt')) {
      showToast('error', 'Mỗi project chỉ được chứa tối đa 1 System Prompt Node trong MVP. Bạn có thể xóa node cũ hoặc chọn prompt khác trong bảng cấu hình.');
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
    showToast('success', `Đã thêm System Prompt: "${prompt.name}" vào Canvas!`);
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

  // Canvas Mouse Down: Detect node drag or canvas pan
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (
      (e.target as HTMLElement).closest('.node-card') ||
      (e.target as HTMLElement).closest('.handle-circle') ||
      (e.target as HTMLElement).closest('.config-drawer')
    ) {
      return;
    }

    // Click on canvas background: deselect
    setSelectedNodeId(null);
    setSelectedEdgeId(null);

    // Pan canvas
    setIsPanning(true);
    setPanStart({ x: e.clientX - viewport.x, y: e.clientY - viewport.y });
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const currentMouseX = (e.clientX - rect.left - viewport.x) / viewport.zoom;
    const currentMouseY = (e.clientY - rect.top - viewport.y) / viewport.zoom;
    setMousePos({ x: currentMouseX, y: currentMouseY });

    if (isPanning) {
      setViewport(prev => ({
        ...prev,
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      }));
      return;
    }

    if (draggingNodeId) {
      setNodes(prev => prev.map(n => {
        if (n.id === draggingNodeId) {
          return {
            ...n,
            position: {
              x: Math.round(currentMouseX - dragOffset.x),
              y: Math.round(currentMouseY - dragOffset.y)
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

  // Start dragging a node
  const handleNodeMouseDown = (e: React.MouseEvent, node: GraphNode) => {
    e.stopPropagation();
    setSelectedNodeId(node.id);
    setSelectedEdgeId(null);
    setDraggingNodeId(node.id);

    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const clickX = (e.clientX - rect.left - viewport.x) / viewport.zoom;
      const clickY = (e.clientY - rect.top - viewport.y) / viewport.zoom;
      const nodeX = (node.position && typeof node.position.x === 'number') ? node.position.x : 80;
      const nodeY = (node.position && typeof node.position.y === 'number') ? node.position.y : 180;
      setDragOffset({
        x: clickX - nodeX,
        y: clickY - nodeY
      });
    }
  };

  // Start creating a connection from a source handle
  const handleSourceHandleMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    setConnectingSourceNodeId(nodeId);
  };

  // Finish connection on a target handle (with Typed Connection rules)
  const handleTargetHandleMouseUp = (e: React.MouseEvent, targetNodeId: string, targetHandle: 'in' | 'system_instruction') => {
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

    // Quy tắc kết nối typed ports (BR-SPN-001..003)
    let isValidPair = false;
    let edgeType = 'data_flow';

    if (srcNode.type === 'web_input' && tgtNode.type === 'model' && targetHandle === 'in') {
      isValidPair = true;
      edgeType = 'data_flow';
    } else if (srcNode.type === 'system_prompt' && tgtNode.type === 'model' && targetHandle === 'system_instruction') {
      isValidPair = true;
      edgeType = 'system_instruction';
    } else if (srcNode.type === 'model' && tgtNode.type === 'output' && targetHandle === 'in') {
      isValidPair = true;
      edgeType = 'data_flow';
    }

    if (!isValidPair) {
      if (srcNode.type === 'system_prompt' && targetHandle === 'in') {
        showToast('error', 'System Prompt Node phải nối vào cổng "Cổng Chỉ Dẫn Hệ Thống" (màu cam) của Model Node.');
      } else if (srcNode.type === 'web_input' && targetHandle === 'system_instruction') {
        showToast('error', 'Web Input Node phải nối vào cổng "Cổng Nhận Dữ Liệu" (màu xanh) của Model Node.');
      } else {
        showToast('error', `Không thể kết nối ${srcNode.type} sang ${tgtNode.type}. Kết nối hợp lệ: Web Input → Model, System Prompt → Model, Model → Output.`);
      }
      setConnectingSourceNodeId(null);
      return;
    }

    // Kiểm tra trùng lặp
    if (edges.some(e => e.source === srcNode.id && e.target === tgtNode.id)) {
      setConnectingSourceNodeId(null);
      return;
    }

    // Kiểm tra giới hạn: Model chỉ nhận tối đa 1 System Prompt Node (DEC-SPN-02)
    if (srcNode.type === 'system_prompt') {
      const existingPromptEdge = edges.find(
        e => e.target === tgtNode.id && nodes.find(n => n.id === e.source)?.type === 'system_prompt'
      );
      if (existingPromptEdge && existingPromptEdge.source !== srcNode.id) {
        showToast('error', 'Model Node đã có 1 System Prompt kết nối (giới hạn tối đa 0..1 trong MVP).');
        setConnectingSourceNodeId(null);
        return;
      }
    }

    // Gỡ kết nối cũ cho cùng loại handle để thay thế liền mạch
    const newEdges = edges.filter(e => {
      if (srcNode.type === 'web_input' && e.source === srcNode.id) return false;
      if (srcNode.type === 'system_prompt' && e.source === srcNode.id) return false;
      if (srcNode.type === 'model' && e.source === srcNode.id) return false;
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
    showToast('success', `Đã kết nối: ${srcNode.data.label} → ${tgtNode.data.label} (${edgeType})`);
  };

  // Selected node config object
  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  // Update selected node config
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

  // Node dimensions for Bézier curves calculation
  const NODE_WIDTH = 220;
  const NODE_HEIGHT = 100;

  // Filtered System Prompts based on search query
  const filteredPrompts = useMemo(() => {
    if (!searchQuery.trim()) return availablePrompts;
    const q = searchQuery.toLowerCase().trim();
    return availablePrompts.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.description && p.description.toLowerCase().includes(q))
    );
  }, [availablePrompts, searchQuery]);

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#0a0f1d', color: '#fff', overflow: 'hidden' }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 9999,
          padding: '12px 20px',
          borderRadius: '8px',
          background: toast.type === 'success' ? 'rgba(16, 185, 129, 0.95)' : 'rgba(239, 68, 68, 0.95)',
          color: '#fff',
          fontWeight: 600,
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          backdropFilter: 'blur(8px)'
        }}>
          {toast.message}
        </div>
      )}

      {/* Top Header Bar */}
      <header style={{
        height: '60px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        background: 'rgba(15, 23, 42, 0.9)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 1.5rem',
        zIndex: 40
      }}>
        {/* Left: Back & Project Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={() => {
              if (hasUnsavedChanges) setShowUnsavedModal(true);
              else router.push('/projects');
            }}
            style={{
              background: 'transparent',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: 'var(--text-secondary, #94a3b8)',
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            ← Danh Sách
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontWeight: 700, fontSize: '1.1rem', color: '#fff' }}>
              {project?.name || 'Project Editor'}
            </span>
            {hasUnsavedChanges && (
              <span style={{ color: '#f59e0b', fontSize: '0.75rem', fontWeight: 600 }}>• Chưa lưu</span>
            )}
          </div>
        </div>

        {/* Center: Graph Validity Badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 14px',
          borderRadius: '20px',
          background: isGraphValid ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
          border: `1px solid ${isGraphValid ? '#22c55e' : '#ef4444'}`,
          fontSize: '0.8rem',
          fontWeight: 600,
          color: isGraphValid ? '#4ade80' : '#f87171'
        }}>
          <span>{isGraphValid ? '✓' : '⚠'}</span>
          <span>
            {isGraphValid
              ? (hasSystemPromptNode ? 'Graph Hợp Lệ (+ System Prompt)' : 'Graph Hợp Lệ (3 Node Cơ Bản)')
              : 'Thiếu Kết Nối Graph'}
          </span>
        </div>

        {/* Right: Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Status Dropdown */}
          {project && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Trạng thái:</span>
              <select
                value={project.status}
                onChange={e => handleToggleStatus(e.target.value as any)}
                style={{
                  background: 'rgba(0, 0, 0, 0.4)',
                  color: project.status === 'ACTIVE' ? '#4ade80' : project.status === 'STOP' ? '#fbbf24' : '#94a3b8',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                <option value="STOP">🟡 STOP (Tạm dừng)</option>
                <option value="ACTIVE">🟢 ACTIVE (Hoạt động)</option>
                <option value="DEACTIVE">⚪ DEACTIVE (Vô hiệu)</option>
              </select>
            </div>
          )}

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              background: 'var(--accent-gradient, linear-gradient(135deg, #a855f7, #6366f1))',
              color: '#fff',
              border: 'none',
              padding: '8px 20px',
              borderRadius: '6px',
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: saving ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 12px rgba(168, 85, 247, 0.3)'
            }}
          >
            <span>💾</span>
            <span>{saving ? 'Đang lưu...' : 'Lưu Graph'}</span>
          </button>
        </div>
      </header>

      {/* Editor Body */}
      <div style={{ flex: 1, display: 'flex', position: 'relative', overflow: 'hidden' }}>
        {/* Left Toolbar: Node Catalog with 4 Categories, Search & Filter (BR-SPN-001) */}
        <aside style={{
          width: '280px',
          borderRight: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(12px)',
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          zIndex: 20,
          overflowY: 'auto'
        }}>
          {/* Header Title */}
          <div>
            <h4 style={{ margin: '0 0 0.2rem 0', fontSize: '0.85rem', textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.05em', fontWeight: 700 }}>
              Node Catalog
            </h4>
            <p style={{ margin: 0, fontSize: '0.72rem', color: '#64748b' }}>
              4 nhóm node • Kéo hoặc nhấn để thêm vào Canvas
            </p>
          </div>

          {/* Search Bar at Top of Catalog */}
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="🔍 Tìm node hoặc prompt..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '7px 28px 7px 10px',
                borderRadius: '6px',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                background: 'rgba(0, 0, 0, 0.35)',
                color: '#fff',
                fontSize: '0.8rem',
                outline: 'none'
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  fontSize: '0.8rem'
                }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Category Filter Pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {[
              { id: 'all', label: 'Tất cả' },
              { id: 'input', label: 'Input' },
              { id: 'system_prompt', label: 'Prompt' },
              { id: 'model', label: 'Model' },
              { id: 'output', label: 'Output' }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFilterCategory(f.id as any)}
                style={{
                  padding: '3px 8px',
                  borderRadius: '12px',
                  border: filterCategory === f.id ? '1px solid #a855f7' : '1px solid rgba(255, 255, 255, 0.1)',
                  background: filterCategory === f.id ? 'rgba(168, 85, 247, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                  color: filterCategory === f.id ? '#e9d5ff' : '#94a3b8',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* 4 Collapsible Accordion Groups */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.25rem' }}>

            {/* Group 1: INPUT */}
            {(filterCategory === 'all' || filterCategory === 'input') && (
              <div style={{ border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '8px', overflow: 'hidden' }}>
                <div
                  onClick={() => toggleGroup('input')}
                  style={{
                    padding: '8px 12px',
                    background: 'rgba(6, 182, 212, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>📥</span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#38bdf8' }}>Input (1)</span>
                  </div>
                  <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                    {collapsedGroups['input'] && !searchQuery ? '▶' : '▼'}
                  </span>
                </div>

                {(!collapsedGroups['input'] || searchQuery) && (
                  <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '6px', background: 'rgba(0, 0, 0, 0.2)' }}>
                    {(() => {
                      const alreadyExists = nodes.some(n => n.type === 'web_input');
                      const matchesSearch = !searchQuery || 'web input nhận câu hỏi'.toLowerCase().includes(searchQuery.toLowerCase());
                      if (!matchesSearch) return null;

                      return (
                        <div
                          onClick={() => handleAddStandardNode('web_input')}
                          style={{
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: `1px solid ${alreadyExists ? 'rgba(255, 255, 255, 0.08)' : '#06b6d4'}`,
                            borderRadius: '8px',
                            padding: '8px',
                            cursor: alreadyExists ? 'not-allowed' : 'pointer',
                            opacity: alreadyExists ? 0.5 : 1
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontWeight: 600, fontSize: '0.8rem', color: '#fff' }}>Web Input Node</span>
                            {alreadyExists && <span style={{ fontSize: '0.65rem', background: '#334155', padding: '1px 4px', borderRadius: '4px' }}>Đã có</span>}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '2px' }}>
                            Nhận câu hỏi từ Web Chat (giới hạn số từ)
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}

            {/* Group 2: SYSTEM PROMPT (MVP) */}
            {(filterCategory === 'all' || filterCategory === 'system_prompt') && (
              <div style={{ border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '8px', overflow: 'hidden' }}>
                <div
                  onClick={() => toggleGroup('system_prompt')}
                  style={{
                    padding: '8px 12px',
                    background: 'rgba(245, 158, 11, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>📜</span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#fbbf24' }}>
                      System Prompt ({availablePrompts.length})
                    </span>
                  </div>
                  <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                    {collapsedGroups['system_prompt'] && !searchQuery ? '▶' : '▼'}
                  </span>
                </div>

                {(!collapsedGroups['system_prompt'] || searchQuery) && (
                  <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '6px', background: 'rgba(0, 0, 0, 0.2)' }}>
                    {loadingPrompts ? (
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8', textAlign: 'center', padding: '6px' }}>
                        Đang tải danh sách prompt...
                      </div>
                    ) : filteredPrompts.length === 0 ? (
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8', textAlign: 'center', padding: '6px' }}>
                        {searchQuery ? 'Không tìm thấy prompt phù hợp' : 'Chưa có prompt trong thư viện'}
                        <div style={{ marginTop: '4px' }}>
                          <Link href="/system-prompts" target="_blank" style={{ color: '#fbbf24', textDecoration: 'underline' }}>
                            + Quản lý Prompt
                          </Link>
                        </div>
                      </div>
                    ) : (
                      filteredPrompts.map(p => {
                        const isCurrentPromptOnCanvas = nodes.some(
                          n => n.type === 'system_prompt' && n.data.config?.prompt_id === p.id
                        );
                        return (
                          <div
                            key={p.id}
                            onClick={() => handleAddPromptNode(p)}
                            style={{
                              background: 'rgba(255, 255, 255, 0.03)',
                              border: `1px solid ${isCurrentPromptOnCanvas ? 'rgba(255, 255, 255, 0.08)' : '#f59e0b'}`,
                              borderRadius: '8px',
                              padding: '8px',
                              cursor: isCurrentPromptOnCanvas ? 'not-allowed' : 'pointer',
                              opacity: isCurrentPromptOnCanvas ? 0.5 : 1,
                              transition: 'all 0.15s'
                            }}
                            title={`Nhấn để thêm "${p.name}" vào Canvas`}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <span style={{ fontWeight: 600, fontSize: '0.8rem', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '170px' }}>
                                {p.name}
                              </span>
                              {isCurrentPromptOnCanvas ? (
                                <span style={{ fontSize: '0.65rem', background: '#334155', padding: '1px 4px', borderRadius: '4px' }}>
                                  Đang dùng
                                </span>
                              ) : (
                                <span style={{ fontSize: '0.65rem', color: '#fbbf24' }}>+ Thêm</span>
                              )}
                            </div>
                            {p.description && (
                              <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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

            {/* Group 3: MODEL */}
            {(filterCategory === 'all' || filterCategory === 'model') && (
              <div style={{ border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '8px', overflow: 'hidden' }}>
                <div
                  onClick={() => toggleGroup('model')}
                  style={{
                    padding: '8px 12px',
                    background: 'rgba(168, 85, 247, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>🧠</span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#c084fc' }}>Model (1)</span>
                  </div>
                  <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                    {collapsedGroups['model'] && !searchQuery ? '▶' : '▼'}
                  </span>
                </div>

                {(!collapsedGroups['model'] || searchQuery) && (
                  <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '6px', background: 'rgba(0, 0, 0, 0.2)' }}>
                    {(() => {
                      const alreadyExists = nodes.some(n => n.type === 'model');
                      const matchesSearch = !searchQuery || 'model llm suy luận ai'.toLowerCase().includes(searchQuery.toLowerCase());
                      if (!matchesSearch) return null;

                      return (
                        <div
                          onClick={() => handleAddStandardNode('model')}
                          style={{
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: `1px solid ${alreadyExists ? 'rgba(255, 255, 255, 0.08)' : '#a855f7'}`,
                            borderRadius: '8px',
                            padding: '8px',
                            cursor: alreadyExists ? 'not-allowed' : 'pointer',
                            opacity: alreadyExists ? 0.5 : 1
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontWeight: 600, fontSize: '0.8rem', color: '#fff' }}>Model LLM Node</span>
                            {alreadyExists && <span style={{ fontSize: '0.65rem', background: '#334155', padding: '1px 4px', borderRadius: '4px' }}>Đã có</span>}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '2px' }}>
                            Xử lý suy luận AI qua Provider
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}

            {/* Group 4: OUTPUT */}
            {(filterCategory === 'all' || filterCategory === 'output') && (
              <div style={{ border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '8px', overflow: 'hidden' }}>
                <div
                  onClick={() => toggleGroup('output')}
                  style={{
                    padding: '8px 12px',
                    background: 'rgba(16, 185, 129, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>💬</span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#34d399' }}>Output (1)</span>
                  </div>
                  <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                    {collapsedGroups['output'] && !searchQuery ? '▶' : '▼'}
                  </span>
                </div>

                {(!collapsedGroups['output'] || searchQuery) && (
                  <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '6px', background: 'rgba(0, 0, 0, 0.2)' }}>
                    {(() => {
                      const alreadyExists = nodes.some(n => n.type === 'output');
                      const matchesSearch = !searchQuery || 'web output phản hồi streaming'.toLowerCase().includes(searchQuery.toLowerCase());
                      if (!matchesSearch) return null;

                      return (
                        <div
                          onClick={() => handleAddStandardNode('output')}
                          style={{
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: `1px solid ${alreadyExists ? 'rgba(255, 255, 255, 0.08)' : '#10b981'}`,
                            borderRadius: '8px',
                            padding: '8px',
                            cursor: alreadyExists ? 'not-allowed' : 'pointer',
                            opacity: alreadyExists ? 0.5 : 1
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontWeight: 600, fontSize: '0.8rem', color: '#fff' }}>Web Output Node</span>
                            {alreadyExists && <span style={{ fontSize: '0.65rem', background: '#334155', padding: '1px 4px', borderRadius: '4px' }}>Đã có</span>}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '2px' }}>
                            Định dạng phản hồi streaming (SSE)
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}

          </div>

          <div style={{ marginTop: 'auto', padding: '8px', background: 'rgba(0, 0, 0, 0.3)', borderRadius: '6px', fontSize: '0.7rem', color: '#94a3b8', lineHeight: '1.4' }}>
            💡 <strong>Hướng dẫn nối:</strong><br />
            • Cổng xanh (Input) → Cổng trên Model (User Input)<br />
            • Cổng cam (Prompt) → Cổng dưới Model (Instruction)<br />
            • Cổng phải Model → Cổng Output
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
            backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px)',
            backgroundSize: `${24 * viewport.zoom}px ${24 * viewport.zoom}px`,
            backgroundPosition: `${viewport.x}px ${viewport.y}px`,
            backgroundColor: '#0a0f1d'
          }}
        >
          {/* Zoom & Viewport Controls (Bottom Left) */}
          <div style={{
            position: 'absolute',
            bottom: '20px',
            left: '20px',
            background: 'rgba(15, 23, 42, 0.85)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            padding: '4px 8px',
            gap: '8px',
            zIndex: 10,
            backdropFilter: 'blur(8px)'
          }}>
            <button
              onClick={() => setViewport(prev => ({ ...prev, zoom: Math.min(2, prev.zoom + 0.1) }))}
              style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 700 }}
            >+</button>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8', minWidth: '40px', textAlign: 'center' }}>
              {Math.round(viewport.zoom * 100)}%
            </span>
            <button
              onClick={() => setViewport(prev => ({ ...prev, zoom: Math.max(0.5, prev.zoom - 0.1) }))}
              style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 700 }}
            >-</button>
            <button
              onClick={() => setViewport({ x: 0, y: 0, zoom: 1 })}
              style={{ background: 'transparent', border: 'none', color: '#a855f7', cursor: 'pointer', fontSize: '0.75rem', marginLeft: '6px' }}
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
              {/* Existing Edges */}
              {edges.map(edge => {
                const srcNode = nodes.find(n => n.id === edge.source);
                const tgtNode = nodes.find(n => n.id === edge.target);
                if (!srcNode || !tgtNode) return null;

                const isPromptEdge = srcNode.type === 'system_prompt';
                const isSelected = selectedEdgeId === edge.id;

                const srcPos = (srcNode.position && typeof srcNode.position.x === 'number' && typeof srcNode.position.y === 'number')
                  ? srcNode.position
                  : { x: 80, y: 180 };
                const tgtPos = (tgtNode.position && typeof tgtNode.position.x === 'number' && typeof tgtNode.position.y === 'number')
                  ? tgtNode.position
                  : { x: 440, y: 220 };

                const startX = srcPos.x + NODE_WIDTH;
                const startY = srcPos.y + NODE_HEIGHT / 2;

                // Model Node has two distinct target ports: in (top 32%) and system_instruction (top 72%)
                let endY = tgtPos.y + NODE_HEIGHT / 2;
                if (tgtNode.type === 'model') {
                  endY = isPromptEdge ? tgtPos.y + NODE_HEIGHT * 0.72 : tgtPos.y + NODE_HEIGHT * 0.32;
                }
                const endX = tgtPos.x;

                const dx = Math.max(60, Math.abs(endX - startX) * 0.5);
                const pathData = `M ${startX} ${startY} C ${startX + dx} ${startY}, ${endX - dx} ${endY}, ${endX} ${endY}`;

                const edgeStroke = isSelected ? '#f43f5e' : (isPromptEdge ? '#f59e0b' : '#38bdf8');

                return (
                  <g key={edge.id} style={{ pointerEvents: 'auto' }}>
                    {/* Invisible wider path for easy clicking */}
                    <path
                      d={pathData}
                      fill="none"
                      stroke="transparent"
                      strokeWidth={16}
                      onClick={() => setSelectedEdgeId(edge.id)}
                      style={{ cursor: 'pointer' }}
                    />
                    {/* Glowing Visible Path */}
                    <path
                      d={pathData}
                      fill="none"
                      stroke={edgeStroke}
                      strokeWidth={isSelected ? 3 : 2}
                      strokeDasharray={isPromptEdge ? '4 3' : '6 4'}
                      onClick={() => setSelectedEdgeId(edge.id)}
                      style={{ cursor: 'pointer' }}
                    />
                    {/* Delete button when edge selected */}
                    {isSelected && (
                      <g transform={`translate(${(startX + endX) / 2}, ${(startY + endY) / 2})`}>
                        <circle r={10} fill="#ef4444" style={{ cursor: 'pointer' }} onClick={() => handleDeleteEdge(edge.id)} />
                        <text textAnchor="middle" dy={4} fill="#fff" fontSize={11} fontWeight={700} style={{ pointerEvents: 'none' }}>×</text>
                      </g>
                    )}
                  </g>
                );
              })}

              {/* In-progress Dragging Connection Line */}
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

                const dragColor = srcNode.type === 'system_prompt' ? '#f59e0b' : '#38bdf8';

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

              const accentColor = isInput ? '#06b6d4' : isPrompt ? '#f59e0b' : isModel ? '#a855f7' : '#10b981';
              const nodePos = (node.position && typeof node.position.x === 'number' && typeof node.position.y === 'number')
                ? node.position
                : { x: 80, y: 180 };

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
                    background: 'rgba(15, 23, 42, 0.95)',
                    border: `2px solid ${isSelected ? accentColor : 'rgba(255, 255, 255, 0.12)'}`,
                    borderRadius: '12px',
                    padding: '12px',
                    boxShadow: isSelected ? `0 0 24px ${accentColor}40` : '0 10px 20px rgba(0,0,0,0.3)',
                    cursor: 'move',
                    userSelect: 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    transition: 'border-color 0.2s, box-shadow 0.2s'
                  }}
                >
                  {/* Left Target Handles */}
                  {/* 1. For Output Node: single in handle */}
                  {isOutput && (
                    <div
                      className="handle-circle"
                      onMouseUp={e => handleTargetHandleMouseUp(e, node.id, 'in')}
                      style={{
                        position: 'absolute',
                        left: '-8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: '16px',
                        height: '16px',
                        borderRadius: '50%',
                        background: '#10b981',
                        border: '2px solid #0f172a',
                        cursor: 'crosshair',
                        zIndex: 20
                      }}
                      title="Cổng Nhận Dữ Liệu (In)"
                    />
                  )}

                  {/* 2. For Model Node: DUAL INPUT HANDLES (Data Flow + System Instruction) */}
                  {isModel && (
                    <>
                      {/* Port 1: User Message / Data Flow (Top Left 32%) */}
                      <div
                        className="handle-circle"
                        onMouseUp={e => handleTargetHandleMouseUp(e, node.id, 'in')}
                        style={{
                          position: 'absolute',
                          left: '-8px',
                          top: '32%',
                          transform: 'translateY(-50%)',
                          width: '16px',
                          height: '16px',
                          borderRadius: '50%',
                          background: '#38bdf8',
                          border: '2px solid #0f172a',
                          cursor: 'crosshair',
                          zIndex: 20
                        }}
                        title="Cổng Nhận Dữ Liệu: Web Input (In)"
                      />
                      {/* Port 2: System Instruction / Prompt (Bottom Left 72%) */}
                      <div
                        className="handle-circle"
                        onMouseUp={e => handleTargetHandleMouseUp(e, node.id, 'system_instruction')}
                        style={{
                          position: 'absolute',
                          left: '-8px',
                          top: '72%',
                          transform: 'translateY(-50%)',
                          width: '16px',
                          height: '16px',
                          borderRadius: '50%',
                          background: '#f59e0b',
                          border: '2px solid #0f172a',
                          cursor: 'crosshair',
                          zIndex: 20
                        }}
                        title="Cổng Chỉ Dẫn Hệ Thống: System Prompt (In)"
                      />
                    </>
                  )}

                  {/* Right Source Handle (Out) for Web Input, System Prompt & Model */}
                  {!isOutput && (
                    <div
                      className="handle-circle"
                      onMouseDown={e => handleSourceHandleMouseDown(e, node.id)}
                      style={{
                        position: 'absolute',
                        right: '-8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: '16px',
                        height: '16px',
                        borderRadius: '50%',
                        background: accentColor,
                        border: '2px solid #0f172a',
                        cursor: 'crosshair',
                        zIndex: 20
                      }}
                      title={`Cổng Xuất ${isPrompt ? 'Chỉ Dẫn' : 'Dữ Liệu'} (Out) - Kéo để nối`}
                    />
                  )}

                  {/* Node Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '1.1rem' }}>
                        {isInput ? '📥' : isPrompt ? '📜' : isModel ? '🧠' : '💬'}
                      </span>
                      <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }}>
                        {node.data.label}
                      </span>
                    </div>

                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteNode(node.id); }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#64748b',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        padding: '2px 4px'
                      }}
                      title="Xóa node"
                    >×</button>
                  </div>

                  {/* Node Preview Meta */}
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', background: 'rgba(0,0,0,0.3)', padding: '6px 8px', borderRadius: '6px' }}>
                    {isInput && (
                      <div>Giới hạn: <strong style={{ color: '#fff' }}>{node.data.config?.max_words || 500} từ</strong></div>
                    )}
                    {isPrompt && (
                      <div>
                        Prompt: <strong style={{ color: '#fbbf24' }}>{node.data.config?.name || 'Đã liên kết'}</strong>
                      </div>
                    )}
                    {isModel && (
                      <div>
                        Model: <strong style={{ color: '#fff' }}>{node.data.config?.model_id || 'Chưa chọn'}</strong>
                      </div>
                    )}
                    {isOutput && (
                      <div>Stream: <strong style={{ color: '#4ade80' }}>Bật (SSE)</strong></div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Drawer: Node Configuration */}
        {selectedNode && (
          <aside className="config-drawer" style={{
            width: '320px',
            borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'rgba(15, 23, 42, 0.95)',
            backdropFilter: 'blur(16px)',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
            zIndex: 30,
            boxShadow: '-10px 0 30px rgba(0,0,0,0.4)',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.2rem' }}>
                  {selectedNode.type === 'web_input' ? '📥' : selectedNode.type === 'system_prompt' ? '📜' : selectedNode.type === 'model' ? '🧠' : '💬'}
                </span>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#fff' }}>
                  Cấu Hình {selectedNode.data.label}
                </h3>
              </div>
              <button
                onClick={() => setSelectedNodeId(null)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.2rem' }}
              >×</button>
            </div>

            {/* Config Fields by Type */}
            {selectedNode.type === 'web_input' && (
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '8px' }}>
                  Giới Hạn Số Từ (max_words): <span style={{ color: '#38bdf8', fontWeight: 700 }}>{selectedNode.data.config?.max_words || 500} từ</span>
                </label>
                <input
                  type="range"
                  min={10}
                  max={4000}
                  step={10}
                  value={selectedNode.data.config?.max_words || 500}
                  onChange={e => updateNodeConfig('max_words', parseInt(e.target.value))}
                  style={{ width: '100%', accentColor: '#06b6d4', cursor: 'pointer', marginBottom: '8px' }}
                />
                <input
                  type="number"
                  min={10}
                  max={4000}
                  value={selectedNode.data.config?.max_words || 500}
                  onChange={e => updateNodeConfig('max_words', parseInt(e.target.value) || 10)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    background: 'rgba(0,0,0,0.3)',
                    color: '#fff',
                    fontSize: '0.9rem'
                  }}
                />
                <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '6px' }}>
                  Nếu câu hỏi của người dùng vượt quá số từ này khi chat trên Trang Chủ, hệ thống sẽ chặn và cảnh báo.
                </p>
              </div>
            )}

            {/* Configuration for System Prompt Node (MVP - DEC-SPN-01, DEC-SPN-03) */}
            {selectedNode.type === 'system_prompt' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                    Chọn Prompt Liên Kết (Thư Viện):
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
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      background: '#1e293b',
                      color: '#fff',
                      fontSize: '0.85rem',
                      cursor: 'pointer'
                    }}
                  >
                    {availablePrompts.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.2)', padding: '10px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#fbbf24', marginBottom: '4px' }}>
                    Định Danh: {selectedNode.data.config?.prompt_id}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                    {selectedNode.data.config?.description || 'Không có mô tả bổ sung'}
                  </div>
                </div>

                <div style={{ fontSize: '0.75rem', color: '#64748b', lineHeight: '1.4' }}>
                  ℹ️ <strong>Cơ chế tham chiếu động (DEC-SPN-01):</strong> Khi người dùng chat, Backend sẽ tự động lấy nội dung mới nhất của System Prompt này từ thư viện để gửi tới Model AI.
                </div>

                <Link
                  href="/system-prompts"
                  target="_blank"
                  style={{
                    display: 'inline-block',
                    textAlign: 'center',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#fbbf24',
                    fontSize: '0.8rem',
                    textDecoration: 'none'
                  }}
                >
                  ↗ Mở Quản Lý System Prompt
                </Link>
              </div>
            )}

            {selectedNode.type === 'model' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                    Chọn Mô Hình AI (Model Catalog):
                  </label>
                  <select
                    value={selectedNode.data.config?.model_id || 'gemini-3.8-flash'}
                    onChange={e => updateNodeConfig('model_id', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      background: '#1e293b',
                      color: '#fff',
                      fontSize: '0.9rem',
                      cursor: 'pointer'
                    }}
                  >
                    {availableModels.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.provider.toUpperCase()})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                    Nhiệt Độ Sáng Tạo (temperature): <span style={{ color: '#a855f7', fontWeight: 700 }}>{selectedNode.data.config?.temperature ?? 0.7}</span>
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#64748b' }}>
                    <span>0.0 (Chính xác)</span>
                    <span>1.0 (Cân bằng)</span>
                    <span>2.0 (Sáng tạo)</span>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                    Phản Hồi Tối Đa (max_tokens):
                  </label>
                  <input
                    type="number"
                    min={256}
                    max={8192}
                    value={selectedNode.data.config?.max_tokens || 2048}
                    onChange={e => updateNodeConfig('max_tokens', parseInt(e.target.value) || 256)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      background: 'rgba(0,0,0,0.3)',
                      color: '#fff',
                      fontSize: '0.9rem'
                    }}
                  />
                </div>
              </div>
            )}

            {selectedNode.type === 'output' && (
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem', color: '#fff' }}>
                  <input
                    type="checkbox"
                    checked={selectedNode.data.config?.streaming ?? true}
                    onChange={e => updateNodeConfig('streaming', e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: '#10b981' }}
                  />
                  <span>Bật Phản Hồi Dòng Chảy (Server-Sent Events)</span>
                </label>
                <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '8px' }}>
                  Cho phép người dùng nhìn thấy từng từ xuất hiện theo thời gian thực tương tự ChatGPT.
                </p>
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
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div style={{
            background: 'var(--bg-card, #0f172a)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: '12px',
            padding: '2rem',
            maxWidth: '420px',
            width: '100%'
          }}>
            <h3 style={{ color: '#fbbf24', margin: '0 0 0.5rem 0', fontWeight: 700 }}>
              Thay Đổi Chưa Lưu!
            </h3>
            <p style={{ color: '#cbd5e1', fontSize: '0.9rem', lineHeight: '1.5', margin: '0 0 1.5rem 0' }}>
              Bạn có một số thay đổi trên Canvas chưa được lưu lại. Bạn có chắc chắn muốn rời đi không?
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setShowUnsavedModal(false)}
                style={{
                  padding: '8px 16px',
                  background: 'transparent',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#94a3b8',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Ở Lại
              </button>
              <button
                onClick={() => {
                  setShowUnsavedModal(false);
                  router.push('/projects');
                }}
                style={{
                  padding: '8px 18px',
                  background: '#ef4444',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Rời Đi Không Lưu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
