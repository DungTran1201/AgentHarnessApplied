'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  PipelineNode,
  PipelineEdge,
  PipelineNodeType,
  PipelineState,
  BotPipeline,
  AgentModel,
  PipelineSimulationResponse,
  StepTrace
} from '@/types';

// Palette definitions for node types
const NODE_TEMPLATES: Record<
  PipelineNodeType,
  {
    type: PipelineNodeType;
    label: string;
    description: string;
    icon: string;
    gradient: string;
    border: string;
    accent: string;
    defaultConfig: Record<string, any>;
  }
> = {
  discord_ingress: {
    type: 'discord_ingress',
    label: 'Discord Ingress',
    description: 'Bắt tin nhắn & sự kiện từ Discord Server',
    icon: '💬',
    gradient: 'linear-gradient(135deg, rgba(88, 101, 242, 0.25) 0%, rgba(59, 130, 246, 0.25) 100%)',
    border: '#5865F2',
    accent: '#5865F2',
    defaultConfig: { description: 'Lắng nghe tin nhắn từ Discord' }
  },
  model_binding: {
    type: 'model_binding',
    label: 'AI Model Binding',
    description: 'Chỉ định mô hình AI & Persona System Prompt',
    icon: '🧠',
    gradient: 'linear-gradient(135deg, rgba(168, 85, 247, 0.25) 0%, rgba(236, 72, 153, 0.25) 100%)',
    border: '#a855f7',
    accent: '#a855f7',
    defaultConfig: {
      model_id: 'gemini-3.8-flash',
      system_prompt: 'You are AI-Chan, a helpful and witty Discord AI assistant.',
      temperature: 0.7,
      max_tokens: 1000
    }
  },
  transform_filter: {
    type: 'transform_filter',
    label: 'Transform Filter',
    description: 'Tiền xử lý text, làm sạch & lọc từ khóa',
    icon: '⚡',
    gradient: 'linear-gradient(135deg, rgba(6, 182, 212, 0.25) 0%, rgba(20, 184, 166, 0.25) 100%)',
    border: '#06b6d4',
    accent: '#06b6d4',
    defaultConfig: { lowercase: false, strip: true, max_length: 2000 }
  },
  discord_egress: {
    type: 'discord_egress',
    label: 'Discord Egress',
    description: 'Định dạng Markdown & gửi phản hồi về Discord',
    icon: '🚀',
    gradient: 'linear-gradient(135deg, rgba(16, 185, 129, 0.25) 0%, rgba(34, 197, 94, 0.25) 100%)',
    border: '#10b981',
    accent: '#10b981',
    defaultConfig: { wrap_markdown: true, send_typing: true }
  }
};

export default function DiscordPipelineCanvasPage() {
  const router = useRouter();

  // Loading & Pipeline State
  const [loading, setLoading] = useState(true);
  const [pipeline, setPipeline] = useState<BotPipeline | null>(null);
  const [activeModels, setActiveModels] = useState<AgentModel[]>([]);
  const [pipelineName, setPipelineName] = useState('Discord AI Pipeline');
  const [nodes, setNodes] = useState<PipelineNode[]>([]);
  const [edges, setEdges] = useState<PipelineEdge[]>([]);
  const [pipelineState, setPipelineState] = useState<PipelineState>('STOPPED');
  const [stateUpdating, setStateUpdating] = useState(false);
  const [saving, setSaving] = useState(false);

  // Canvas Viewport Pan & Zoom
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });

  // Selected Node & Inspector Drawer
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Active Connection Wire Dragging
  const [connectingSourceId, setConnectingSourceId] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Validation Status & Cycle Detection
  const [isValidDAG, setIsValidDAG] = useState(true);
  const [cycleDetected, setCycleDetected] = useState(false);
  const [cyclePath, setCyclePath] = useState<string[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Simulation Console Modal
  const [showSimulateModal, setShowSimulateModal] = useState(false);
  const [simQuery, setSimQuery] = useState('Chào bot! Hãy giới thiệu bạn là ai và đang chạy mô hình gì?');
  const [simulating, setSimulating] = useState(false);
  const [simResult, setSimResult] = useState<PipelineSimulationResponse | null>(null);
  const [activeSimNodeId, setActiveSimNodeId] = useState<string | null>(null);

  // Executions History Modal
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [executions, setExecutions] = useState<any[]>([]);

  // Toast Notifications
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // 1. Tải Pipeline và Models
  const fetchPipelineData = async () => {
    setLoading(true);
    try {
      const [pipeRes, modelsRes] = await Promise.all([
        fetch('/api/v1/bot/discord/pipeline', { credentials: 'include' }),
        fetch('/api/v1/models', { credentials: 'include' })
      ]);

      if (pipeRes.status === 403) {
        showToast('error', 'Vui lòng liên kết tài khoản Discord trước khi sử dụng Pipeline!');
        router.push('/bot/discord');
        return;
      }

      if (pipeRes.ok) {
        const pipeData: BotPipeline = await pipeRes.json();
        setPipeline(pipeData);
        setPipelineName(pipeData.name || 'Discord AI Pipeline');
        setPipelineState(pipeData.state || 'STOPPED');
        setNodes(pipeData.nodes || []);
        setEdges(pipeData.edges || []);
        setPan({ x: pipeData.viewport_x || 0, y: pipeData.viewport_y || 0 });
        setZoom(pipeData.viewport_zoom || 1);
      }

      if (modelsRes.ok) {
        const mData = await modelsRes.json();
        const activeOnly = (mData.models || []).filter((m: AgentModel) => m.status === 'ACTIVE');
        setActiveModels(activeOnly);
      }
    } catch (err) {
      console.error('Lỗi tải dữ liệu Pipeline:', err);
      showToast('error', 'Không thể kết nối máy chủ để tải Pipeline.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPipelineData();
  }, []);

  // 2. Tự động kiểm tra DAG sau mỗi lần thay đổi nodes hoặc edges
  const validateCurrentDAG = useCallback(async (currentNodes: PipelineNode[], currentEdges: PipelineEdge[]) => {
    try {
      const res = await fetch('/api/v1/bot/discord/pipeline/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          nodes: currentNodes.map(n => ({
            id: n.id,
            node_type: n.node_type,
            label: n.label,
            config: n.config
          })),
          edges: currentEdges.map(e => ({
            source_node_id: e.source_node_id,
            target_node_id: e.target_node_id
          }))
        })
      });

      if (res.ok) {
        const data = await res.json();
        setIsValidDAG(data.is_valid);
        setCycleDetected(data.cycle_detected);
        setCyclePath(data.cycle_path || []);
        setValidationErrors(data.errors || []);
      }
    } catch (err) {
      console.error('Lỗi thẩm định DAG:', err);
    }
  }, []);

  useEffect(() => {
    if (nodes.length > 0) {
      validateCurrentDAG(nodes, edges);
    }
  }, [nodes, edges, validateCurrentDAG]);

  // 3. Điều khiển Viewport Pan & Zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.05 : 0.95;
    setZoom(prev => Math.min(1.5, Math.max(0.5, prev * zoomFactor)));
  };

  const handleMouseDownCanvas = (e: React.MouseEvent) => {
    if (e.target === containerRef.current || (e.target as HTMLElement).tagName === 'svg') {
      setIsPanning(true);
      setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      setSelectedNodeId(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({ x: e.clientX - startPan.x, y: e.clientY - startPan.y });
    }
    if (connectingSourceId && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setMousePos({
        x: (e.clientX - rect.left - pan.x) / zoom,
        y: (e.clientY - rect.top - pan.y) / zoom
      });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setConnectingSourceId(null);
  };

  // 4. Kéo thả di chuyển Node
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const handleNodeMouseDown = (e: React.MouseEvent, node: PipelineNode) => {
    e.stopPropagation();
    setSelectedNodeId(node.id);
    setDraggingNodeId(node.id);
    setDragOffset({
      x: (e.clientX - pan.x) / zoom - node.position_x,
      y: (e.clientY - pan.y) / zoom - node.position_y
    });
  };

  const handleNodeDragMove = (e: React.MouseEvent) => {
    if (draggingNodeId) {
      const newX = Math.round((e.clientX - pan.x) / zoom - dragOffset.x);
      const newY = Math.round((e.clientY - pan.y) / zoom - dragOffset.y);
      setNodes(prev =>
        prev.map(n => (n.id === draggingNodeId ? { ...n, position_x: newX, position_y: newY } : n))
      );
    }
  };

  const handleNodeMouseUp = () => {
    setDraggingNodeId(null);
  };

  // 5. Thêm Node mới từ Left Toolbox
  const handleAddNode = (type: PipelineNodeType) => {
    const template = NODE_TEMPLATES[type];
    const newId = `node_${type.split('_')[1] || type}_${Math.random().toString(36).substring(2, 7)}`;
    const newNode: PipelineNode = {
      id: newId,
      node_type: type,
      label: template.label,
      position_x: Math.round(-pan.x / zoom + 260 + Math.random() * 80),
      position_y: Math.round(-pan.y / zoom + 160 + Math.random() * 80),
      config: { ...template.defaultConfig }
    };
    setNodes(prev => [...prev, newNode]);
    setSelectedNodeId(newId);
    showToast('info', `Đã thêm khối ${template.label}`);
  };

  // 6. Xóa Node
  const handleDeleteNode = (nodeId: string) => {
    setNodes(prev => prev.filter(n => n.id !== nodeId));
    setEdges(prev => prev.filter(e => e.source_node_id !== nodeId && e.target_node_id !== nodeId));
    if (selectedNodeId === nodeId) setSelectedNodeId(null);
    showToast('info', 'Đã xóa khối và các liên kết liên quan.');
  };

  // 7. Kết nối Dây (Handles Connection)
  const handleStartConnect = (e: React.MouseEvent, sourceId: string) => {
    e.stopPropagation();
    setConnectingSourceId(sourceId);
    const sourceNode = nodes.find(n => n.id === sourceId);
    if (sourceNode) {
      setMousePos({ x: sourceNode.position_x + 240, y: sourceNode.position_y + 44 });
    }
  };

  const handleEndConnect = (e: React.MouseEvent, targetId: string) => {
    e.stopPropagation();
    if (!connectingSourceId || connectingSourceId === targetId) {
      setConnectingSourceId(null);
      return;
    }

    const exists = edges.some(
      e => e.source_node_id === connectingSourceId && e.target_node_id === targetId
    );
    if (exists) {
      showToast('info', 'Liên kết này đã tồn tại.');
      setConnectingSourceId(null);
      return;
    }

    const newEdge: PipelineEdge = {
      id: `edge_${Math.random().toString(36).substring(2, 8)}`,
      source_node_id: connectingSourceId,
      target_node_id: targetId,
      source_handle: 'output',
      target_handle: 'input'
    };

    setEdges(prev => [...prev, newEdge]);
    setConnectingSourceId(null);
  };

  const handleDeleteEdge = (edgeId: string) => {
    setEdges(prev => prev.filter(e => e.id !== edgeId));
    showToast('info', 'Đã xóa dây nối.');
  };

  // 8. Lưu Pipeline (PUT /api/v1/bot/discord/pipeline)
  const handleSavePipeline = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/v1/bot/discord/pipeline', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: pipelineName,
          viewport_x: pan.x,
          viewport_y: pan.y,
          viewport_zoom: zoom,
          nodes,
          edges
        })
      });

      const data = await res.json();
      if (res.ok) {
        showToast('success', 'Lưu trữ đồ thị Pipeline thành công!');
        validateCurrentDAG(nodes, edges);
      } else {
        const errMsg = typeof data.detail === 'object' ? data.detail.message : data.detail;
        showToast('error', `Lỗi lưu pipeline: ${errMsg}`);
      }
    } catch (err) {
      showToast('error', 'Lỗi kết nối khi lưu pipeline.');
    } finally {
      setSaving(false);
    }
  };

  // 9. Điều khiển 3 Trạng thái Vòng Đời (PATCH /api/v1/bot/discord/pipeline/state)
  const handleChangeState = async (targetState: PipelineState) => {
    if (pipelineState === targetState) return;
    setStateUpdating(true);
    try {
      const res = await fetch('/api/v1/bot/discord/pipeline/state', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ state: targetState })
      });

      const data = await res.json();
      if (res.ok) {
        setPipelineState(targetState);
        showToast(
          'success',
          `Đã chuyển trạng thái sang ${targetState}! Bot Discord: ${data.presence.label}`
        );
      } else {
        showToast('error', `Không thể chuyển trạng thái: ${data.detail}`);
      }
    } catch (err) {
      showToast('error', 'Lỗi máy chủ khi thay đổi trạng thái.');
    } finally {
      setStateUpdating(false);
    }
  };

  // 10. Chạy Thử Nghiệm Mô Phỏng (POST /api/v1/bot/discord/pipeline/simulate-run)
  const handleSimulateRun = async () => {
    if (!simQuery.trim()) return;
    setSimulating(true);
    setSimResult(null);
    setActiveSimNodeId(null);

    try {
      const res = await fetch('/api/v1/bot/discord/pipeline/simulate-run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ input_text: simQuery })
      });

      const data: PipelineSimulationResponse = await res.json();
      if (res.ok) {
        setSimResult(data);
        if (data.step_traces && data.step_traces.length > 0) {
          data.step_traces.forEach((st, idx) => {
            setTimeout(() => {
              setActiveSimNodeId(st.node_id);
            }, idx * 400);
          });
          setTimeout(() => setActiveSimNodeId(null), data.step_traces.length * 400 + 400);
        }
        showToast('success', 'Mô phỏng hoàn tất thành công!');
      } else {
        showToast('error', `Mô phỏng thất bại: ${data.status || 'Lỗi xử lý'}`);
      }
    } catch (err) {
      showToast('error', 'Lỗi kết nối khi chạy mô phỏng.');
    } finally {
      setSimulating(false);
    }
  };

  // 11. Xem Lịch Sử Chạy
  const handleOpenHistory = async () => {
    setShowHistoryModal(true);
    try {
      const res = await fetch('/api/v1/bot/discord/pipeline/executions', {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setExecutions(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Tính toán tọa độ đường cong Bezier
  const calculateBezierPath = (sourceNode: PipelineNode, targetNode: PipelineNode) => {
    const x1 = sourceNode.position_x + 240;
    const y1 = sourceNode.position_y + 44;
    const x2 = targetNode.position_x;
    const y2 = targetNode.position_y + 44;
    const dx = Math.abs(x2 - x1) * 0.5;
    return `M ${x1} ${y1} C ${x1 + Math.max(dx, 40)} ${y1}, ${x2 - Math.max(dx, 40)} ${y2}, ${x2} ${y2}`;
  };

  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        width: '100vw',
        background: '#070b14',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#94a3b8',
        fontFamily: 'var(--font-sans)'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            border: '4px solid rgba(99, 102, 241, 0.2)',
            borderTopColor: '#6366f1',
            borderRadius: '50%',
            animation: 'pipelinePing 1s infinite linear'
          }} />
          <p style={{ fontSize: '0.9rem', fontWeight: 500, letterSpacing: '0.02em' }}>
            Đang tải không gian Canvas Pipeline...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        background: '#070b14',
        color: '#f8fafc',
        fontFamily: 'var(--font-sans)',
        userSelect: 'none'
      }}
      onMouseMove={handleNodeDragMove}
      onMouseUp={handleNodeMouseUp}
    >
      {/* Toast Notification */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '24px',
            zIndex: 9999,
            padding: '12px 20px',
            borderRadius: '12px',
            backdropFilter: 'blur(16px)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            border: toast.type === 'success'
              ? '1px solid rgba(16, 185, 129, 0.4)'
              : toast.type === 'error'
              ? '1px solid rgba(239, 68, 68, 0.4)'
              : '1px solid rgba(99, 102, 241, 0.4)',
            background: toast.type === 'success'
              ? 'rgba(6, 78, 59, 0.9)'
              : toast.type === 'error'
              ? 'rgba(127, 29, 29, 0.9)'
              : 'rgba(30, 27, 75, 0.9)',
            color: 'white',
            boxShadow: '0 10px 25px rgba(0,0,0,0.4)',
            fontSize: '0.88rem',
            fontWeight: 500
          }}
        >
          <span style={{ fontSize: '1.1rem' }}>
            {toast.type === 'success' ? '✓' : toast.type === 'error' ? '⚠️' : 'ℹ️'}
          </span>
          <p style={{ margin: 0 }}>{toast.message}</p>
        </div>
      )}

      {/* TOPBAR NAVIGATION & 3-STATE LIFECYCLE CONTROLS */}
      <header style={{
        height: '64px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        background: 'rgba(11, 16, 29, 0.95)',
        backdropFilter: 'blur(20px)',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 50,
        flexShrink: 0
      }}>
        {/* Left Section: Back link, Title input, DAG status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link
            href="/bot/discord"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '10px',
              background: 'rgba(255, 255, 255, 0.06)',
              color: '#cbd5e1',
              fontSize: '0.82rem',
              fontWeight: 600,
              textDecoration: 'none',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              transition: 'all 0.2s'
            }}
          >
            ← Quay lại Quản lý Bot
          </Link>

          <div style={{ width: '1px', height: '22px', background: 'rgba(255, 255, 255, 0.1)' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.25rem' }}>⚡</span>
            <input
              type="text"
              value={pipelineName}
              onChange={e => setPipelineName(e.target.value)}
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid transparent',
                borderRadius: '8px',
                padding: '6px 12px',
                color: '#ffffff',
                fontSize: '0.92rem',
                fontWeight: 700,
                outline: 'none',
                width: '230px',
                transition: 'border-color 0.2s'
              }}
              onFocus={e => e.target.style.borderColor = '#6366f1'}
              onBlur={e => e.target.style.borderColor = 'transparent'}
            />
          </div>

          {/* DAG Validity Indicator */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              borderRadius: '9999px',
              fontSize: '0.78rem',
              fontWeight: 600,
              background: isValidDAG ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.15)',
              color: isValidDAG ? '#10b981' : '#f87171',
              border: isValidDAG ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.4)'
            }}
            className={!isValidDAG ? 'anim-pulse-red' : ''}
          >
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: isValidDAG ? '#10b981' : '#ef4444'
            }} />
            {isValidDAG ? 'DAG Hợp Lệ' : 'Chu Trình / Lỗi DAG'}
          </div>
        </div>

        {/* Center Section: 3-State Lifecycle Switch & Discord Presence */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          background: 'rgba(7, 11, 20, 0.9)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          padding: '4px 6px',
          borderRadius: '16px',
          boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.4)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {/* RUNNING BUTTON */}
            <button
              onClick={() => handleChangeState('RUNNING')}
              disabled={stateUpdating}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '10px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: 700,
                transition: 'all 0.25s',
                background: pipelineState === 'RUNNING'
                  ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                  : 'transparent',
                color: pipelineState === 'RUNNING' ? '#ffffff' : '#94a3b8',
                boxShadow: pipelineState === 'RUNNING' ? '0 0 16px rgba(16, 185, 129, 0.45)' : 'none'
              }}
              title="Khởi chạy: Bot lắng nghe và phản hồi trên Discord (Trạng thái Xanh lá)"
            >
              <span>▶</span> RUNNING
            </button>

            {/* PAUSED BUTTON */}
            <button
              onClick={() => handleChangeState('PAUSED')}
              disabled={stateUpdating}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '10px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: 700,
                transition: 'all 0.25s',
                background: pipelineState === 'PAUSED'
                  ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                  : 'transparent',
                color: pipelineState === 'PAUSED' ? '#ffffff' : '#94a3b8',
                boxShadow: pipelineState === 'PAUSED' ? '0 0 16px rgba(245, 158, 11, 0.45)' : 'none'
              }}
              title="Tạm dừng: Bot tự động thông báo tạm dừng nhận tin (Trạng thái Vàng cam)"
            >
              <span>⏸</span> PAUSED
            </button>

            {/* STOPPED BUTTON */}
            <button
              onClick={() => handleChangeState('STOPPED')}
              disabled={stateUpdating}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '10px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: 700,
                transition: 'all 0.25s',
                background: pipelineState === 'STOPPED'
                  ? 'linear-gradient(135deg, #475569 0%, #334155 100%)'
                  : 'transparent',
                color: pipelineState === 'STOPPED' ? '#ffffff' : '#94a3b8',
                boxShadow: pipelineState === 'STOPPED' ? '0 0 12px rgba(100, 116, 139, 0.3)' : 'none'
              }}
              title="Dừng hoạt động: Ngắt kết nối Discord Bot (Trạng thái Xám)"
            >
              <span>⏹</span> STOPPED
            </button>
          </div>

          <div style={{ width: '1px', height: '18px', background: 'rgba(255, 255, 255, 0.12)' }} />

          {/* Discord Presence Indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingRight: '10px', fontSize: '0.8rem' }}>
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: pipelineState === 'RUNNING'
                  ? '#10b981'
                  : pipelineState === 'PAUSED'
                  ? '#f59e0b'
                  : '#64748b',
                boxShadow: pipelineState === 'RUNNING'
                  ? '0 0 8px #10b981'
                  : pipelineState === 'PAUSED'
                  ? '0 0 8px #f59e0b'
                  : 'none'
              }}
              className={pipelineState === 'RUNNING' ? 'anim-pulse-green' : ''}
            />
            <span style={{ color: '#cbd5e1', fontWeight: 500 }}>
              Bot Discord:{' '}
              <strong style={{
                color: pipelineState === 'RUNNING'
                  ? '#10b981'
                  : pipelineState === 'PAUSED'
                  ? '#f59e0b'
                  : '#94a3b8'
              }}>
                {pipelineState === 'RUNNING' ? 'Online' : pipelineState === 'PAUSED' ? 'Idle' : 'Offline'}
              </strong>
            </span>
          </div>
        </div>

        {/* Right Section: Simulate, History, Save */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => setShowSimulateModal(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '10px',
              background: 'rgba(168, 85, 247, 0.15)',
              color: '#d8b4fe',
              border: '1px solid rgba(168, 85, 247, 0.35)',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <span>🎯</span> Chạy Thử Nghiệm
          </button>

          <button
            onClick={handleOpenHistory}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '10px',
              background: 'rgba(255, 255, 255, 0.06)',
              color: '#cbd5e1',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <span>📋</span> Lịch Sử
          </button>

          <button
            onClick={handleSavePipeline}
            disabled={saving}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 20px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
              color: '#ffffff',
              border: 'none',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(99, 102, 241, 0.35)',
              opacity: saving ? 0.6 : 1,
              transition: 'all 0.2s'
            }}
          >
            <span>{saving ? '⏳' : '💾'}</span> {saving ? 'Đang Lưu...' : 'Lưu Pipeline'}
          </button>
        </div>
      </header>

      {/* MAIN WORKSPACE: PALETTE + CANVAS + INSPECTOR */}
      <div style={{ display: 'flex', flex: 1, position: 'relative', overflow: 'hidden' }}>
        {/* LEFT TOOLBOX PALETTE */}
        <aside style={{
          width: '270px',
          background: 'rgba(11, 16, 29, 0.95)',
          backdropFilter: 'blur(20px)',
          borderRight: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '20px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          zIndex: 30,
          flexShrink: 0
        }}>
          <div>
            <h2 style={{
              fontSize: '0.75rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: '#94a3b8',
              margin: '0 0 4px 0'
            }}>
              Thư Viện Khối (Palette)
            </h2>
            <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0, lineHeight: 1.4 }}>
              Nhấn để thêm khối chức năng vào không gian luồng
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto' }}>
            {Object.values(NODE_TEMPLATES).map(tmpl => (
              <div
                key={tmpl.type}
                onClick={() => handleAddNode(tmpl.type)}
                style={{
                  padding: '12px 14px',
                  borderRadius: '12px',
                  background: 'rgba(17, 24, 39, 0.7)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = tmpl.border;
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.background = 'rgba(17, 24, 39, 0.7)';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: tmpl.gradient,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.1rem'
                  }}>
                    {tmpl.icon}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                      {tmpl.label}
                    </h3>
                  </div>
                </div>
                <p style={{ fontSize: '0.74rem', color: '#94a3b8', margin: 0, lineHeight: 1.4 }}>
                  {tmpl.description}
                </p>
              </div>
            ))}
          </div>

          {/* Architecture Constraints Checklist */}
          <div style={{
            marginTop: 'auto',
            padding: '12px',
            borderRadius: '12px',
            background: 'rgba(17, 24, 39, 0.4)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            fontSize: '0.75rem',
            color: '#94a3b8'
          }}>
            <div style={{ fontWeight: 700, color: '#e2e8f0', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>💡</span> Ràng Buộc Kiến Trúc
            </div>
            <ul style={{ paddingLeft: '16px', margin: 0, lineHeight: 1.6, fontSize: '0.72rem', color: '#64748b' }}>
              <li>Ít nhất 1 Ingress & 1 Egress</li>
              <li>Chặn chu trình lặp vô hạn (BR-035)</li>
              <li>Khối Model chỉ nhận mô hình ACTIVE</li>
              <li>Giới hạn an toàn &le; 20 khối</li>
            </ul>
          </div>
        </aside>

        {/* CENTER INTERACTIVE CANVAS WORKSPACE */}
        <main
          ref={containerRef}
          onMouseDown={handleMouseDownCanvas}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onWheel={handleWheel}
          style={{
            flex: 1,
            position: 'relative',
            cursor: 'crosshair',
            overflow: 'hidden',
            background: '#070b14',
            backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.12) 1.2px, transparent 1.2px)`,
            backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
            backgroundPosition: `${pan.x}px ${pan.y}px`
          }}
        >
          {/* CYCLE WARNING BANNER (NẾU PHÁT HIỆN VÒNG LẶP) */}
          {cycleDetected && (
            <div
              style={{
                position: 'absolute',
                top: '16px',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 40,
                padding: '10px 24px',
                borderRadius: '16px',
                background: 'rgba(127, 29, 29, 0.95)',
                border: '1px solid #ef4444',
                color: '#fee2e2',
                fontSize: '0.82rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                boxShadow: '0 10px 30px rgba(239, 68, 68, 0.35)'
              }}
              className="anim-pulse-red"
            >
              <span>🚨</span>
              <span>
                CẢNH BÁO BR-035 / SEC-014: Phát hiện chu trình lặp tuần hoàn (Cycle Loop)! Dây nối vi phạm được đánh dấu đỏ.
              </span>
            </div>
          )}

          {/* VIEWPORT CANVAS WORLD */}
          <div
            style={{
              position: 'absolute',
              transformOrigin: '0 0',
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              width: '4000px',
              height: '4000px',
              pointerEvents: 'none'
            }}
          >
            {/* SVG CONNECTION WIRES */}
            <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }}>
              <defs>
                <linearGradient id="wire-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#a855f7" />
                </linearGradient>
                <linearGradient id="wire-cycle-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#ef4444" />
                  <stop offset="100%" stopColor="#f43f5e" />
                </linearGradient>
              </defs>

              {/* Existing Edges */}
              {edges.map(edge => {
                const srcNode = nodes.find(n => n.id === edge.source_node_id);
                const tgtNode = nodes.find(n => n.id === edge.target_node_id);
                if (!srcNode || !tgtNode) return null;

                const pathData = calculateBezierPath(srcNode, tgtNode);
                const isCycleEdge =
                  cycleDetected &&
                  cyclePath.includes(edge.source_node_id) &&
                  cyclePath.includes(edge.target_node_id);

                return (
                  <g key={edge.id} style={{ pointerEvents: 'auto', cursor: 'pointer' }}>
                    {/* Invisible thick click area for deleting */}
                    <path
                      d={pathData}
                      fill="none"
                      stroke="transparent"
                      strokeWidth={18}
                      onClick={() => handleDeleteEdge(edge.id)}
                    />
                    {/* Visible line */}
                    <path
                      d={pathData}
                      fill="none"
                      stroke={isCycleEdge ? 'url(#wire-cycle-gradient)' : 'url(#wire-gradient)'}
                      strokeWidth={isCycleEdge ? 3.5 : 2.5}
                      strokeDasharray={isCycleEdge ? '6,6' : 'none'}
                      style={{ transition: 'stroke 0.2s, stroke-width 0.2s' }}
                    />
                    {/* Animated Particle if Simulation is active */}
                    {activeSimNodeId === srcNode.id && (
                      <circle r={5} fill="#38bdf8">
                        <animateMotion path={pathData} dur="0.8s" repeatCount="indefinite" />
                      </circle>
                    )}
                  </g>
                );
              })}

              {/* Active Connection Wire while Dragging */}
              {connectingSourceId && (() => {
                const srcNode = nodes.find(n => n.id === connectingSourceId);
                if (!srcNode) return null;
                const x1 = srcNode.position_x + 240;
                const y1 = srcNode.position_y + 44;
                const x2 = mousePos.x;
                const y2 = mousePos.y;
                const dx = Math.abs(x2 - x1) * 0.5;
                const pathData = `M ${x1} ${y1} C ${x1 + Math.max(dx, 40)} ${y1}, ${x2 - Math.max(dx, 40)} ${y2}, ${x2} ${y2}`;

                return (
                  <path
                    d={pathData}
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth={2.5}
                    strokeDasharray="4,4"
                    className="anim-dash"
                  />
                );
              })()}
            </svg>

            {/* NODES CARDS */}
            {nodes.map(node => {
              const tmpl = NODE_TEMPLATES[node.node_type] || NODE_TEMPLATES.transform_filter;
              const isSelected = selectedNodeId === node.id;
              const isCycleNode = cycleDetected && cyclePath.includes(node.id);
              const isActiveSim = activeSimNodeId === node.id;

              return (
                <div
                  key={node.id}
                  onMouseDown={e => handleNodeMouseDown(e, node)}
                  style={{
                    position: 'absolute',
                    left: `${node.position_x}px`,
                    top: `${node.position_y}px`,
                    width: '240px',
                    borderRadius: '16px',
                    background: 'rgba(15, 23, 42, 0.9)',
                    backdropFilter: 'blur(16px)',
                    border: isSelected
                      ? '1px solid #6366f1'
                      : isCycleNode
                      ? '1px solid #ef4444'
                      : '1px solid rgba(255, 255, 255, 0.12)',
                    boxShadow: isSelected
                      ? '0 0 25px rgba(99, 102, 241, 0.4)'
                      : isCycleNode
                      ? '0 0 25px rgba(239, 68, 68, 0.45)'
                      : isActiveSim
                      ? '0 0 25px rgba(56, 189, 248, 0.5)'
                      : '0 12px 28px rgba(0, 0, 0, 0.45)',
                    padding: '14px',
                    pointerEvents: 'auto',
                    cursor: 'move',
                    transition: 'border 0.2s, box-shadow 0.2s, transform 0.1s',
                    transform: isActiveSim ? 'scale(1.04)' : 'scale(1)',
                    zIndex: isSelected ? 20 : 10
                  }}
                >
                  {/* Left Input Port (Trừ Ingress) */}
                  {node.node_type !== 'discord_ingress' && (
                    <div
                      onMouseUp={e => handleEndConnect(e, node.id)}
                      style={{
                        position: 'absolute',
                        left: '-12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: '#0a0f1d',
                        border: '2px solid #6366f1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        zIndex: 25,
                        transition: 'transform 0.2s, background-color 0.2s'
                      }}
                      title="Cổng Đầu Vào (Input Port)"
                      onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-50%) scale(1.2)'}
                      onMouseLeave={e => e.currentTarget.style.transform = 'translateY(-50%) scale(1)'}
                    >
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#6366f1' }} />
                    </div>
                  )}

                  {/* Right Output Port (Trừ Egress) */}
                  {node.node_type !== 'discord_egress' && (
                    <div
                      onMouseDown={e => handleStartConnect(e, node.id)}
                      style={{
                        position: 'absolute',
                        right: '-12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: '#0a0f1d',
                        border: '2px solid #a855f7',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        zIndex: 25,
                        transition: 'transform 0.2s, background-color 0.2s'
                      }}
                      title="Kéo từ đây để nối dây (Output Port)"
                      onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-50%) scale(1.2)'}
                      onMouseLeave={e => e.currentTarget.style.transform = 'translateY(-50%) scale(1)'}
                    >
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#a855f7' }} />
                    </div>
                  )}

                  {/* Card Header: Icon, Label, Close button */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '8px',
                        background: tmpl.gradient,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1rem'
                      }}>
                        {tmpl.icon}
                      </div>
                      <span style={{
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        color: '#f8fafc',
                        maxWidth: '125px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {node.label}
                      </span>
                    </div>

                    <button
                      onClick={e => {
                        e.stopPropagation();
                        handleDeleteNode(node.id);
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#64748b',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        padding: '2px 4px',
                        transition: 'color 0.2s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                      onMouseLeave={e => e.currentTarget.style.color = '#64748b'}
                      title="Xóa khối"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Card Body: Summary Chip */}
                  <div style={{
                    background: 'rgba(0, 0, 0, 0.45)',
                    borderRadius: '10px',
                    padding: '8px 10px',
                    fontSize: '0.74rem',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    lineHeight: 1.4
                  }}>
                    {node.node_type === 'model_binding' ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <div style={{ color: '#d8b4fe', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          Mô hình: {node.config?.model_id || 'Chưa chọn'}
                        </div>
                        <div style={{ color: '#94a3b8', fontSize: '0.7rem' }}>
                          Temp: {node.config?.temperature ?? 0.7} | Max: {node.config?.max_tokens ?? 1000}
                        </div>
                      </div>
                    ) : node.node_type === 'discord_ingress' ? (
                      <div style={{ color: '#818cf8', fontWeight: 600 }}>
                        Lắng nghe: All Channels
                      </div>
                    ) : node.node_type === 'discord_egress' ? (
                      <div style={{ color: '#34d399', fontWeight: 600 }}>
                        Markdown Embed: Bật
                      </div>
                    ) : (
                      <div style={{ color: '#22d3ee', fontWeight: 600 }}>
                        Lọc Text & Chuẩn Hóa
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* CANVAS FLOATING CONTROLS (BOTTOM LEFT) */}
          <div style={{
            position: 'absolute',
            bottom: '24px',
            left: '24px',
            zIndex: 35,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(11, 16, 29, 0.95)',
            backdropFilter: 'blur(16px)',
            padding: '6px 10px',
            borderRadius: '14px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)'
          }}>
            <button
              onClick={() => setZoom(prev => Math.min(1.5, prev + 0.1))}
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.08)',
                border: 'none',
                color: '#ffffff',
                fontSize: '1rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s'
              }}
              title="Phóng to"
            >
              +
            </button>
            <span style={{
              fontSize: '0.78rem',
              fontWeight: 600,
              color: '#94a3b8',
              width: '46px',
              textAlign: 'center'
            }}>
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom(prev => Math.max(0.5, prev - 0.1))}
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.08)',
                border: 'none',
                color: '#ffffff',
                fontSize: '1rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s'
              }}
              title="Thu nhỏ"
            >
              -
            </button>
            <div style={{ width: '1px', height: '16px', background: 'rgba(255, 255, 255, 0.12)', margin: '0 4px' }} />
            <button
              onClick={() => {
                setPan({ x: 0, y: 0 });
                setZoom(1);
              }}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.08)',
                border: 'none',
                color: '#cbd5e1',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
            >
              Căn Giữa
            </button>
          </div>
        </main>

        {/* RIGHT SIDE INSPECTOR DRAWER */}
        {selectedNode && (
          <aside style={{
            width: '320px',
            background: 'rgba(11, 16, 29, 0.95)',
            backdropFilter: 'blur(20px)',
            borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '24px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            zIndex: 35,
            flexShrink: 0,
            overflowY: 'auto'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              paddingBottom: '14px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '1.4rem' }}>{NODE_TEMPLATES[selectedNode.node_type].icon}</span>
                <div>
                  <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                    Cấu Hình Khối
                  </h3>
                  <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>{selectedNode.label}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedNodeId(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: '0.9rem',
                  cursor: 'pointer'
                }}
              >
                ✕
              </button>
            </div>

            {/* Display Name Input */}
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>
                Tên hiển thị khối
              </label>
              <input
                type="text"
                value={selectedNode.label}
                onChange={e => {
                  const val = e.target.value;
                  setNodes(prev => prev.map(n => (n.id === selectedNode.id ? { ...n, label: val } : n)));
                }}
                style={{
                  width: '100%',
                  background: 'rgba(17, 24, 39, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '10px',
                  padding: '8px 12px',
                  color: '#ffffff',
                  fontSize: '0.82rem',
                  outline: 'none'
                }}
              />
            </div>

            {/* Config: MODEL BINDING (BR-037) */}
            {selectedNode.node_type === 'model_binding' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#d8b4fe', display: 'block', marginBottom: '6px' }}>
                    Mô hình AI chỉ định (Chỉ chấp nhận ACTIVE - BR-037)
                  </label>
                  <select
                    value={selectedNode.config?.model_id || 'gemini-3.8-flash'}
                    onChange={e => {
                      const val = e.target.value;
                      setNodes(prev =>
                        prev.map(n =>
                          n.id === selectedNode.id
                            ? { ...n, config: { ...n.config, model_id: val } }
                            : n
                        )
                      );
                    }}
                    style={{
                      width: '100%',
                      background: 'rgba(17, 24, 39, 0.8)',
                      border: '1px solid rgba(168, 85, 247, 0.4)',
                      borderRadius: '10px',
                      padding: '8px 12px',
                      color: '#ffffff',
                      fontSize: '0.82rem',
                      outline: 'none'
                    }}
                  >
                    {activeModels.map(m => (
                      <option key={m.id} value={m.id} style={{ background: '#0f172a', color: '#fff' }}>
                        {m.name} ({m.provider})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>
                    Persona System Prompt (Định hình phong cách Bot)
                  </label>
                  <textarea
                    rows={4}
                    value={
                      selectedNode.config?.system_prompt ??
                      'You are AI-Chan, a helpful and witty Discord AI assistant.'
                    }
                    onChange={e => {
                      const val = e.target.value;
                      setNodes(prev =>
                        prev.map(n =>
                          n.id === selectedNode.id
                            ? { ...n, config: { ...n.config, system_prompt: val } }
                            : n
                        )
                      );
                    }}
                    style={{
                      width: '100%',
                      background: 'rgba(17, 24, 39, 0.8)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '10px',
                      padding: '10px 12px',
                      color: '#ffffff',
                      fontSize: '0.8rem',
                      outline: 'none',
                      resize: 'none',
                      lineHeight: 1.5
                    }}
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '6px' }}>
                    <span style={{ color: '#cbd5e1', fontWeight: 700 }}>Temperature</span>
                    <span style={{ color: '#a855f7', fontWeight: 700 }}>
                      {selectedNode.config?.temperature ?? 0.7}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={selectedNode.config?.temperature ?? 0.7}
                    onChange={e => {
                      const val = parseFloat(e.target.value);
                      setNodes(prev =>
                        prev.map(n =>
                          n.id === selectedNode.id
                            ? { ...n, config: { ...n.config, temperature: val } }
                            : n
                        )
                      );
                    }}
                    style={{ width: '100%', accentColor: '#a855f7', cursor: 'pointer' }}
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '6px' }}>
                    <span style={{ color: '#cbd5e1', fontWeight: 700 }}>Max Tokens</span>
                    <span style={{ color: '#a855f7', fontWeight: 700 }}>
                      {selectedNode.config?.max_tokens ?? 1000}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="100"
                    max="4000"
                    step="50"
                    value={selectedNode.config?.max_tokens ?? 1000}
                    onChange={e => {
                      const val = parseInt(e.target.value);
                      setNodes(prev =>
                        prev.map(n =>
                          n.id === selectedNode.id
                            ? { ...n, config: { ...n.config, max_tokens: val } }
                            : n
                        )
                      );
                    }}
                    style={{ width: '100%', accentColor: '#a855f7', cursor: 'pointer' }}
                  />
                </div>
              </div>
            )}

            {/* Config: TRANSFORM FILTER */}
            {selectedNode.node_type === 'transform_filter' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: '#cbd5e1', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={selectedNode.config?.strip ?? true}
                    onChange={e => {
                      const val = e.target.checked;
                      setNodes(prev =>
                        prev.map(n =>
                          n.id === selectedNode.id
                            ? { ...n, config: { ...n.config, strip: val } }
                            : n
                        )
                      );
                    }}
                    style={{ accentColor: '#06b6d4' }}
                  />
                  Xóa khoảng trắng thừa (Strip Whitespace)
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: '#cbd5e1', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={selectedNode.config?.lowercase ?? false}
                    onChange={e => {
                      const val = e.target.checked;
                      setNodes(prev =>
                        prev.map(n =>
                          n.id === selectedNode.id
                            ? { ...n, config: { ...n.config, lowercase: val } }
                            : n
                        )
                      );
                    }}
                    style={{ accentColor: '#06b6d4' }}
                  />
                  Chuyển sang chữ thường (Lowercase)
                </label>
              </div>
            )}

            {/* Delete button */}
            <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <button
                onClick={() => handleDeleteNode(selectedNode.id)}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '10px',
                  background: 'rgba(239, 68, 68, 0.12)',
                  color: '#f87171',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                🗑 Xóa Khối Khỏi Canvas
              </button>
            </div>
          </aside>
        )}
      </div>

      {/* SIMULATE RUN MODAL */}
      {showSimulateModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 999,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(16px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <div style={{
            background: '#0d1322',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '680px',
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.6)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '16px 24px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '1.3rem' }}>🎯</span>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>
                  Mô Phỏng Chạy Thử Luồng Pipeline
                </h3>
              </div>
              <button
                onClick={() => setShowSimulateModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.1rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '72vh', overflowY: 'auto' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>
                  Nội dung tin nhắn thử nghiệm (Giả lập gửi từ Discord)
                </label>
                <textarea
                  rows={3}
                  value={simQuery}
                  onChange={e => setSimQuery(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(17, 24, 39, 0.9)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '12px',
                    padding: '12px',
                    color: '#ffffff',
                    fontSize: '0.85rem',
                    outline: 'none',
                    resize: 'none',
                    lineHeight: 1.5
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={handleSimulateRun}
                  disabled={simulating || !simQuery.trim()}
                  style={{
                    padding: '10px 24px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 4px 18px rgba(168, 85, 247, 0.4)',
                    opacity: simulating ? 0.6 : 1
                  }}
                >
                  {simulating ? 'Đang Thực Thi...' : '🚀 Bắt Đầu Mô Phỏng'}
                </button>
              </div>

              {/* Simulation Result */}
              {simResult && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  {/* Telemetry Metrics */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                    <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(17, 24, 39, 0.6)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Trạng Thái</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#34d399', marginTop: '2px' }}>{simResult.status}</div>
                    </div>
                    <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(17, 24, 39, 0.6)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Overhead (NFR-027)</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#818cf8', marginTop: '2px' }}>{simResult.pipeline_overhead_ms} ms (&le; 30ms)</div>
                    </div>
                    <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(17, 24, 39, 0.6)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Tokens Tiêu Thụ</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#c084fc', marginTop: '2px' }}>{simResult.tokens_consumed}</div>
                    </div>
                  </div>

                  {/* Step traces */}
                  <div>
                    <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#e2e8f0', margin: '0 0 8px 0' }}>Vết Thực Thi Từng Khối (Step Traces):</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {simResult.step_traces.map((trace, idx) => (
                        <div
                          key={idx}
                          style={{
                            padding: '10px 14px',
                            borderRadius: '10px',
                            background: 'rgba(17, 24, 39, 0.5)',
                            border: '1px solid rgba(255, 255, 255, 0.06)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            fontSize: '0.8rem'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ color: '#64748b', fontFamily: 'monospace' }}>{idx + 1}.</span>
                            <span style={{ fontWeight: 600, color: '#f8fafc' }}>{trace.label}</span>
                            <span style={{ color: '#64748b', fontSize: '0.75rem' }}>({trace.node_type})</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ color: '#818cf8', fontFamily: 'monospace', fontSize: '0.75rem' }}>{trace.duration_ms} ms</span>
                            <span style={{ padding: '2px 8px', borderRadius: '9999px', fontSize: '0.7rem', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>✓ PASS</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Output Preview */}
                  <div>
                    <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#e2e8f0', margin: '0 0 6px 0' }}>Phản Hồi In Ra Discord (Egress Output):</h4>
                    <div style={{
                      padding: '14px',
                      borderRadius: '12px',
                      background: 'rgba(0, 0, 0, 0.6)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      fontSize: '0.82rem',
                      color: '#f8fafc',
                      whiteSpace: 'pre-wrap',
                      lineHeight: 1.6
                    }}>
                      {simResult.output_text}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* EXECUTIONS HISTORY MODAL */}
      {showHistoryModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 999,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(16px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <div style={{
            background: '#0d1322',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '720px',
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.6)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '16px 24px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '1.3rem' }}>📋</span>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>
                  Lịch Sử Thực Thi Pipeline Gần Đây
                </h3>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.1rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '24px', maxHeight: '70vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {executions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b', fontSize: '0.85rem' }}>
                  Chưa có lượt thực thi nào được ghi nhận.
                </div>
              ) : (
                executions.map(item => (
                  <div
                    key={item.id}
                    style={{
                      padding: '14px 16px',
                      borderRadius: '12px',
                      background: 'rgba(17, 24, 39, 0.6)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                      <span style={{ fontWeight: 700, color: '#f8fafc' }}>
                        {item.trigger_source} • {item.model_used || 'Mặc định'}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '9999px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          background: item.status === 'SUCCESS' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                          color: item.status === 'SUCCESS' ? '#10b981' : '#f59e0b'
                        }}>
                          {item.status}
                        </span>
                        <span style={{ color: '#64748b', fontSize: '0.75rem' }}>
                          {new Date(item.created_at).toLocaleString('vi-VN')}
                        </span>
                      </div>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic' }}>
                      &ldquo;{item.input_message}&rdquo;
                    </p>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', gap: '16px' }}>
                      <span>Overhead: {item.pipeline_overhead_ms}ms</span>
                      <span>LLM: {item.llm_latency_ms}ms</span>
                      <span>Tokens: {item.tokens_consumed}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
