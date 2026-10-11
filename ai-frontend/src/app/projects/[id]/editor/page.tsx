'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { Project, GraphData, GraphNode, GraphEdge, NodeType, AgentModel } from '@/types';
import { ProjectService } from '@/services/projectService';

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

  // Load project & models on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [projData, modelsRes] = await Promise.all([
          ProjectService.getProject(projectId),
          fetch('/api/v1/models').then(r => r.ok ? r.json() : []).catch(() => [])
        ]);

        setProject(projData);
        setAvailableModels(modelsRes.filter((m: AgentModel) => m.status === 'ACTIVE'));

        if (projData.graph_data && projData.graph_data.nodes && projData.graph_data.nodes.length > 0) {
          setNodes(projData.graph_data.nodes);
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
            { id: 'edge_in_model', source: 'node_input_1', target: 'node_model_1' },
            { id: 'edge_model_out', source: 'node_model_1', target: 'node_output_1' }
          ];

          setNodes(initialNodes);
          setEdges(initialEdges);
          setHasUnsavedChanges(true);
        }
      } catch (err: any) {
        showToast('error', err.message || 'Lỗi khi tải project');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [projectId]);

  // Real-time graph validation
  const checkGraphValidity = () => {
    if (nodes.length !== 3 || edges.length !== 2) return false;
    const inputNode = nodes.find(n => n.type === 'web_input');
    const modelNode = nodes.find(n => n.type === 'model');
    const outputNode = nodes.find(n => n.type === 'output');

    if (!inputNode || !modelNode || !outputNode) return false;

    const hasInToModel = edges.some(e => e.source === inputNode.id && e.target === modelNode.id);
    const hasModelToOut = edges.some(e => e.source === modelNode.id && e.target === outputNode.id);

    return hasInToModel && hasModelToOut;
  };

  const isGraphValid = checkGraphValidity();

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
          showToast('error', 'Graph chưa hợp lệ! Cần đủ 3 node và 2 dây nối Input -> Model -> Output.');
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

  // Add node from palette
  const handleAddNode = (type: NodeType) => {
    if (nodes.some(n => n.type === type)) {
      showToast('error', `Mỗi project chỉ được chứa tối đa 1 ${type === 'web_input' ? 'Web Input' : type === 'model' ? 'Model' : 'Output'} Node.`);
      return;
    }

    const newId = `node_${type}_${Date.now()}`;
    const defaultLabels: Record<NodeType, string> = {
      web_input: 'Web Input',
      model: 'Model LLM',
      output: 'Web Output'
    };

    const defaultConfigs: Record<NodeType, any> = {
      web_input: { max_words: 500 },
      model: { model_id: availableModels[0]?.id || 'gemini-3.8-flash', temperature: 0.7, max_tokens: 2048 },
      output: { streaming: true }
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
    if ((e.target as HTMLElement).closest('.node-card') || (e.target as HTMLElement).closest('.handle-circle') || (e.target as HTMLElement).closest('.config-drawer')) {
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
      setDragOffset({
        x: clickX - node.position.x,
        y: clickY - node.position.y
      });
    }
  };

  // Start creating a connection from a source handle
  const handleSourceHandleMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    setConnectingSourceNodeId(nodeId);
  };

  // Finish connection on a target handle
  const handleTargetHandleMouseUp = (e: React.MouseEvent, targetNodeId: string) => {
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

    // Quy tắc hướng: Web Input -> Model và Model -> Output
    let isValidPair = false;
    if (srcNode.type === 'web_input' && tgtNode.type === 'model') isValidPair = true;
    if (srcNode.type === 'model' && tgtNode.type === 'output') isValidPair = true;

    if (!isValidPair) {
      showToast('error', `Không thể kết nối từ ${srcNode.type} sang ${tgtNode.type}. Chiều hợp lệ: Web Input → Model → Output.`);
      setConnectingSourceNodeId(null);
      return;
    }

    // Check duplicate
    if (edges.some(e => e.source === srcNode.id && e.target === tgtNode.id)) {
      setConnectingSourceNodeId(null);
      return;
    }

    // Gỡ kết nối cũ nếu node đó đã có cạnh nối tương ứng
    const newEdges = edges.filter(e => {
      if (srcNode.type === 'web_input' && e.source === srcNode.id) return false;
      if (srcNode.type === 'model' && e.source === srcNode.id) return false;
      if (tgtNode.type === 'model' && e.target === tgtNode.id) return false;
      if (tgtNode.type === 'output' && e.target === tgtNode.id) return false;
      return true;
    });

    const newEdge: GraphEdge = {
      id: `edge_${Date.now()}`,
      source: srcNode.id,
      target: tgtNode.id
    };

    setEdges([...newEdges, newEdge]);
    setConnectingSourceNodeId(null);
    setHasUnsavedChanges(true);
    showToast('success', `Đã kết nối ${srcNode.data.label} → ${tgtNode.data.label}`);
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
          padding: '4px 12px',
          borderRadius: '20px',
          background: isGraphValid ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
          border: `1px solid ${isGraphValid ? '#22c55e' : '#ef4444'}`,
          fontSize: '0.8rem',
          fontWeight: 600,
          color: isGraphValid ? '#4ade80' : '#f87171'
        }}>
          <span>{isGraphValid ? '✓' : '⚠'}</span>
          <span>{isGraphValid ? 'Graph Hợp Lệ' : 'Thiếu Kết Nối (3 Node)'}</span>
        </div>

        {/* Right: Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Status Dropdown/Toggle */}
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
        {/* Left Toolbar: Node Palette */}
        <aside style={{
          width: '240px',
          borderRight: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(8px)',
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          zIndex: 20
        }}>
          <div>
            <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '0.85rem', textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.05em' }}>
              Thư Viện Node (MVP)
            </h4>
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>
              Kéo hoặc nhấn để thêm vào Canvas
            </p>
          </div>

          {[
            {
              type: 'web_input' as NodeType,
              title: 'Web Input Node',
              icon: '📥',
              color: '#06b6d4',
              desc: 'Nhận câu hỏi từ Web Chat (giới hạn số từ)'
            },
            {
              type: 'model' as NodeType,
              title: 'Model LLM Node',
              icon: '🧠',
              color: '#a855f7',
              desc: 'Xử lý suy luận AI thông qua Provider'
            },
            {
              type: 'output' as NodeType,
              title: 'Web Output Node',
              icon: '💬',
              color: '#10b981',
              desc: 'Định dạng phản hồi streaming cho user'
            }
          ].map(p => {
            const alreadyExists = nodes.some(n => n.type === p.type);
            return (
              <div
                key={p.type}
                onClick={() => handleAddNode(p.type)}
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: `1px solid ${alreadyExists ? 'rgba(255, 255, 255, 0.08)' : p.color}`,
                  borderRadius: '10px',
                  padding: '12px',
                  cursor: alreadyExists ? 'not-allowed' : 'pointer',
                  opacity: alreadyExists ? 0.5 : 1,
                  transition: 'all 0.2s',
                  position: 'relative'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '1.2rem' }}>{p.icon}</span>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#fff' }}>{p.title}</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', lineHeight: '1.3' }}>
                  {p.desc}
                </div>
                {alreadyExists && (
                  <span style={{ position: 'absolute', top: '8px', right: '8px', fontSize: '0.65rem', background: '#334155', padding: '2px 6px', borderRadius: '4px' }}>
                    Đã có
                  </span>
                )}
              </div>
            );
          })}

          <div style={{ marginTop: 'auto', padding: '10px', background: 'rgba(0, 0, 0, 0.3)', borderRadius: '8px', fontSize: '0.75rem', color: '#94a3b8' }}>
            💡 <strong>Mẹo:</strong> Nối cổng tròn bên phải của Web Input vào cổng trái Model, và cổng phải Model vào cổng trái Output.
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

                const startX = srcNode.position.x + NODE_WIDTH;
                const startY = srcNode.position.y + NODE_HEIGHT / 2;
                const endX = tgtNode.position.x;
                const endY = tgtNode.position.y + NODE_HEIGHT / 2;

                const dx = Math.max(60, Math.abs(endX - startX) * 0.5);
                const pathData = `M ${startX} ${startY} C ${startX + dx} ${startY}, ${endX - dx} ${endY}, ${endX} ${endY}`;
                const isSelected = selectedEdgeId === edge.id;

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
                      stroke={isSelected ? '#f43f5e' : '#a855f7'}
                      strokeWidth={isSelected ? 3 : 2}
                      strokeDasharray="6 4"
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
                const startX = srcNode.position.x + NODE_WIDTH;
                const startY = srcNode.position.y + NODE_HEIGHT / 2;
                const dx = Math.abs(mousePos.x - startX) * 0.5;
                const pathData = `M ${startX} ${startY} C ${startX + dx} ${startY}, ${mousePos.x - dx} ${mousePos.y}, ${mousePos.x} ${mousePos.y}`;

                return (
                  <path
                    d={pathData}
                    fill="none"
                    stroke="#38bdf8"
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
              const isModel = node.type === 'model';
              const isOutput = node.type === 'output';

              const accentColor = isInput ? '#06b6d4' : isModel ? '#a855f7' : '#10b981';

              return (
                <div
                  key={node.id}
                  className="node-card"
                  onMouseDown={e => handleNodeMouseDown(e, node)}
                  style={{
                    position: 'absolute',
                    left: `${node.position.x}px`,
                    top: `${node.position.y}px`,
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
                  {/* Left Target Handle (In) for Model & Output */}
                  {!isInput && (
                    <div
                      className="handle-circle"
                      onMouseUp={e => handleTargetHandleMouseUp(e, node.id)}
                      style={{
                        position: 'absolute',
                        left: '-8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: '16px',
                        height: '16px',
                        borderRadius: '50%',
                        background: '#38bdf8',
                        border: '2px solid #0f172a',
                        cursor: 'crosshair',
                        zIndex: 20
                      }}
                      title="Cổng Nhận Dữ Liệu (In)"
                    />
                  )}

                  {/* Right Source Handle (Out) for Web Input & Model */}
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
                      title="Cổng Xuất Dữ Liệu (Out) - Kéo để nối"
                    />
                  )}

                  {/* Node Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '1.1rem' }}>
                        {isInput ? '📥' : isModel ? '🧠' : '💬'}
                      </span>
                      <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff' }}>
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
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', background: 'rgba(0,0,0,0.3)', padding: '6px 8px', borderRadius: '6px' }}>
                    {isInput && (
                      <div>Giới hạn: <strong style={{ color: '#fff' }}>{node.data.config?.max_words || 500} từ</strong></div>
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
                  {selectedNode.type === 'web_input' ? '📥' : selectedNode.type === 'model' ? '🧠' : '💬'}
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
                  Nếu tin nhắn của người dùng vượt quá số từ này khi chat trên Trang Chủ, hệ thống sẽ chặn và cảnh báo.
                </p>
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
