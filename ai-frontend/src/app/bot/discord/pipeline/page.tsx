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
    gradient: 'from-indigo-600/30 to-blue-600/30',
    border: 'border-indigo-500/50',
    accent: '#6366f1',
    defaultConfig: { description: 'Lắng nghe tin nhắn từ Discord' }
  },
  model_binding: {
    type: 'model_binding',
    label: 'AI Model Binding',
    description: 'Chỉ định mô hình AI & Persona System Prompt',
    icon: '🧠',
    gradient: 'from-purple-600/30 to-pink-600/30',
    border: 'border-purple-500/50',
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
    gradient: 'from-cyan-600/30 to-teal-600/30',
    border: 'border-cyan-500/50',
    accent: '#06b6d4',
    defaultConfig: { lowercase: false, strip: true, max_length: 2000 }
  },
  discord_egress: {
    type: 'discord_egress',
    label: 'Discord Egress',
    description: 'Định dạng Markdown & gửi phản hồi về Discord',
    icon: '🚀',
    gradient: 'from-emerald-600/30 to-green-600/30',
    border: 'border-emerald-500/50',
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
      position_x: Math.round(-pan.x / zoom + 280 + Math.random() * 80),
      position_y: Math.round(-pan.y / zoom + 180 + Math.random() * 80),
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
      setMousePos({ x: sourceNode.position_x + 220, y: sourceNode.position_y + 40 });
    }
  };

  const handleEndConnect = (e: React.MouseEvent, targetId: string) => {
    e.stopPropagation();
    if (!connectingSourceId || connectingSourceId === targetId) {
      setConnectingSourceId(null);
      return;
    }

    // Kiểm tra trùng lặp cạnh nối
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
        // Hiệu ứng particle chạy qua từng node
        if (data.step_traces && data.step_traces.length > 0) {
          data.step_traces.forEach((st, idx) => {
            setTimeout(() => {
              setActiveSimNodeId(st.node_id);
            }, idx * 400);
          });
          setTimeout(() => setActiveSimNodeId(null), data.step_traces.length * 400 + 300);
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
    const x1 = sourceNode.position_x + 220;
    const y1 = sourceNode.position_y + 45;
    const x2 = targetNode.position_x;
    const y2 = targetNode.position_y + 45;
    const dx = Math.abs(x2 - x1) * 0.5;
    return `M ${x1} ${y1} C ${x1 + Math.max(dx, 40)} ${y1}, ${x2 - Math.max(dx, 40)} ${y2}, ${x2} ${y2}`;
  };

  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070b12] flex items-center justify-center text-slate-300">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium">Đang tải không gian Canvas Pipeline...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col h-screen w-screen overflow-hidden bg-[#070b12] text-slate-100 select-none font-sans"
      onMouseMove={handleNodeDragMove}
      onMouseUp={handleNodeMouseUp}
    >
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-xl shadow-2xl backdrop-blur-md flex items-center gap-3 transition-all duration-300 border ${
            toast.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200'
              : toast.type === 'error'
              ? 'bg-rose-950/80 border-rose-500/50 text-rose-200'
              : 'bg-indigo-950/80 border-indigo-500/50 text-indigo-200'
          }`}
        >
          <span>{toast.type === 'success' ? '✓' : toast.type === 'error' ? '⚠️' : 'ℹ️'}</span>
          <p className="text-sm font-medium">{toast.message}</p>
        </div>
      )}

      {/* TOPBAR NAVIGATION & LIFECYCLE CONTROLS */}
      <header className="h-16 border-b border-slate-800 bg-[#0c121e]/90 backdrop-blur-md px-6 flex items-center justify-between z-30">
        {/* Left: Brand & Back to Discord Settings */}
        <div className="flex items-center gap-4">
          <Link
            href="/bot/discord"
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-all border border-slate-700/50"
          >
            ← Trở về Quản lý Bot
          </Link>
          <div className="h-5 w-px bg-slate-800" />
          <div className="flex items-center gap-2">
            <span className="text-xl">⚡</span>
            <input
              type="text"
              value={pipelineName}
              onChange={e => setPipelineName(e.target.value)}
              className="bg-transparent hover:bg-slate-800/40 focus:bg-slate-800/80 px-2 py-1 rounded text-sm font-bold text-white border border-transparent focus:border-indigo-500/50 outline-none w-56"
            />
          </div>
          {/* Real-time DAG Status Pill */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
              isValidDAG
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-400 animate-pulse'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isValidDAG ? 'bg-emerald-400' : 'bg-rose-400'}`} />
            {isValidDAG ? 'DAG Hợp Lệ' : 'Phát hiện Chu Trình / Lỗi'}
          </div>
        </div>

        {/* Center: 3-State Lifecycle Controller & Presence Badge (STATE-001, BR-036, BR-038) */}
        <div className="flex items-center gap-3 bg-slate-900/90 border border-slate-800 p-1.5 rounded-2xl shadow-inner">
          <div className="flex items-center gap-1">
            {/* RUNNING BUTTON */}
            <button
              onClick={() => handleChangeState('RUNNING')}
              disabled={stateUpdating}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                pipelineState === 'RUNNING'
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 scale-105'
                  : 'text-slate-400 hover:text-emerald-300 hover:bg-slate-800'
              }`}
              title="Khởi chạy: Bot lắng nghe và phản hồi trên Discord (Trạng thái Xanh lá)"
            >
              <span>▶</span> RUNNING
            </button>

            {/* PAUSED BUTTON */}
            <button
              onClick={() => handleChangeState('PAUSED')}
              disabled={stateUpdating}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                pipelineState === 'PAUSED'
                  ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30 scale-105'
                  : 'text-slate-400 hover:text-amber-300 hover:bg-slate-800'
              }`}
              title="Tạm dừng: Bot tự động thông báo tạm dừng nhận tin (Trạng thái Vàng cam)"
            >
              <span>⏸</span> PAUSED
            </button>

            {/* STOPPED BUTTON */}
            <button
              onClick={() => handleChangeState('STOPPED')}
              disabled={stateUpdating}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                pipelineState === 'STOPPED'
                  ? 'bg-slate-700 text-white shadow-lg shadow-slate-700/30 scale-105'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
              title="Dừng hoạt động: Ngắt kết nối Discord Bot (Trạng thái Xám)"
            >
              <span>⏹</span> STOPPED
            </button>
          </div>

          <div className="h-4 w-px bg-slate-800 mx-1" />

          {/* Discord Presence Indicator */}
          <div className="flex items-center gap-2 pr-2 text-xs">
            <span
              className={`w-3 h-3 rounded-full border-2 border-slate-900 ${
                pipelineState === 'RUNNING'
                  ? 'bg-emerald-400 animate-pulse'
                  : pipelineState === 'PAUSED'
                  ? 'bg-amber-400'
                  : 'bg-slate-500'
              }`}
            />
            <span className="text-slate-300 font-medium hidden md:inline">
              Bot Discord:{' '}
              <strong
                className={
                  pipelineState === 'RUNNING'
                    ? 'text-emerald-400'
                    : pipelineState === 'PAUSED'
                    ? 'text-amber-400'
                    : 'text-slate-400'
                }
              >
                {pipelineState === 'RUNNING' ? 'Online' : pipelineState === 'PAUSED' ? 'Idle' : 'Offline'}
              </strong>
            </span>
          </div>
        </div>

        {/* Right: Actions (Simulate, History, Save) */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSimulateModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-xs font-bold transition-all"
          >
            <span>🎯</span> Chạy Thử Nghiệm
          </button>

          <button
            onClick={handleOpenHistory}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-bold transition-all"
          >
            <span>📋</span> Lịch Sử
          </button>

          <button
            onClick={handleSavePipeline}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-md shadow-indigo-500/20 text-xs font-bold transition-all disabled:opacity-50"
          >
            <span>{saving ? '⏳' : '💾'}</span> {saving ? 'Đang Lưu...' : 'Lưu Pipeline'}
          </button>
        </div>
      </header>

      {/* MAIN WORKSPACE: CANVAS + LEFT TOOLBOX + RIGHT INSPECTOR */}
      <div className="flex-1 relative overflow-hidden flex">
        {/* LEFT TOOLBOX (N8N STYLE PALETTE) */}
        <aside className="w-64 border-r border-slate-800/80 bg-[#0a0f19]/90 backdrop-blur-md p-4 flex flex-col gap-4 z-20">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              Thư Viện Khối (Palette)
            </h2>
            <p className="text-[11px] text-slate-500">
              Nhấn để thêm khối chức năng vào không gian luồng
            </p>
          </div>

          <div className="flex flex-col gap-2.5 overflow-y-auto pr-1">
            {Object.values(NODE_TEMPLATES).map(tmpl => (
              <div
                key={tmpl.type}
                onClick={() => handleAddNode(tmpl.type)}
                className={`p-3 rounded-xl border bg-slate-900/60 hover:bg-slate-800/80 cursor-pointer transition-all duration-200 border-slate-800 hover:border-indigo-500/50 hover:shadow-lg group`}
              >
                <div className="flex items-center gap-2.5 mb-1.5">
                  <span className="text-lg p-1.5 rounded-lg bg-slate-800 group-hover:scale-110 transition-transform">
                    {tmpl.icon}
                  </span>
                  <div>
                    <h3 className="text-xs font-bold text-slate-200 group-hover:text-white">
                      {tmpl.label}
                    </h3>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">{tmpl.description}</p>
              </div>
            ))}
          </div>

          {/* Quick Guide & DAG Invariants */}
          <div className="mt-auto p-3 rounded-xl bg-slate-900/40 border border-slate-800/60 text-[11px] text-slate-400 space-y-1.5">
            <div className="font-semibold text-slate-300 flex items-center gap-1">
              <span>💡</span> Ràng Buộc Kiến Trúc
            </div>
            <ul className="list-disc list-inside space-y-1 text-[10px] text-slate-500">
              <li>Ít nhất 1 Ingress & 1 Egress</li>
              <li>Chặn chu trình lặp vô hạn (BR-035)</li>
              <li>Khối Model chỉ nhận mô hình ACTIVE</li>
              <li>Giới hạn an toàn &le; 20 khối</li>
            </ul>
          </div>
        </aside>

        {/* CANVAS WORKSPACE (SVG & HTML5 POINTER EVENTS) */}
        <main
          ref={containerRef}
          onMouseDown={handleMouseDownCanvas}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onWheel={handleWheel}
          className="flex-1 relative cursor-crosshair overflow-hidden bg-[#070b12]"
          style={{
            backgroundImage: `radial-gradient(#1e293b 1px, transparent 1px)`,
            backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
            backgroundPosition: `${pan.x}px ${pan.y}px`
          }}
        >
          {/* CYCLE WARNING BANNER (NẾU PHÁT HIỆN VÒNG LẶP) */}
          {cycleDetected && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 px-6 py-2.5 rounded-2xl bg-rose-950/90 border border-rose-500 text-rose-200 text-xs font-bold flex items-center gap-3 shadow-2xl animate-bounce">
              <span>🚨</span>
              <span>
                CẢNH BÁO BR-035 / SEC-014: Phát hiện chu trình lặp tuần hoàn (Cycle Loop)! Dây nối vi phạm được đánh dấu đỏ.
              </span>
            </div>
          )}

          {/* VIEWPORT CANVAS WORLD */}
          <div
            className="absolute origin-top-left transition-transform duration-75"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              width: '4000px',
              height: '4000px'
            }}
          >
            {/* SVG CONNECTION WIRES */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
              <defs>
                <linearGradient id="wire-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#a855f7" />
                </linearGradient>
                <linearGradient id="wire-cycle-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#f43f5e" />
                  <stop offset="100%" stopColor="#ef4444" />
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
                  <g key={edge.id} className="pointer-events-auto group cursor-pointer">
                    {/* Invisible thick click area */}
                    <path
                      d={pathData}
                      fill="none"
                      stroke="transparent"
                      strokeWidth={16}
                      onClick={() => handleDeleteEdge(edge.id)}
                    />
                    {/* Visible line */}
                    <path
                      d={pathData}
                      fill="none"
                      stroke={isCycleEdge ? 'url(#wire-cycle-gradient)' : 'url(#wire-gradient)'}
                      strokeWidth={isCycleEdge ? 3.5 : 2.5}
                      strokeDasharray={isCycleEdge ? '6,6' : 'none'}
                      className={`transition-all duration-200 group-hover:stroke-rose-400 group-hover:stroke-[4px] ${
                        isCycleEdge ? 'animate-pulse' : ''
                      }`}
                    />
                    {/* Animated Particle if Simulation is active */}
                    {activeSimNodeId === srcNode.id && (
                      <circle r={5} fill="#38bdf8" className="animate-ping">
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
                const x1 = srcNode.position_x + 220;
                const y1 = srcNode.position_y + 45;
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
                    className="animate-pulse"
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
                    left: `${node.position_x}px`,
                    top: `${node.position_y}px`,
                    width: '220px'
                  }}
                  className={`absolute rounded-2xl bg-[#0e1626]/90 backdrop-blur-md border p-3.5 shadow-xl transition-all duration-150 cursor-move ${
                    isSelected
                      ? 'border-indigo-400 ring-2 ring-indigo-500/40 shadow-indigo-500/20'
                      : isCycleNode
                      ? 'border-rose-500 ring-2 ring-rose-500/40 shadow-rose-500/30'
                      : 'border-slate-700/60 hover:border-slate-500'
                  } ${isActiveSim ? 'ring-4 ring-cyan-400 scale-105 shadow-cyan-500/50' : ''}`}
                >
                  {/* Left Input Port (Trừ Ingress) */}
                  {node.node_type !== 'discord_ingress' && (
                    <div
                      onMouseUp={e => handleEndConnect(e, node.id)}
                      className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-900 border-2 border-indigo-400 flex items-center justify-center hover:scale-125 hover:bg-indigo-500 transition-all cursor-pointer z-10"
                      title="Cổng Đầu Vào (Input Port)"
                    >
                      <div className="w-2 h-2 rounded-full bg-white" />
                    </div>
                  )}

                  {/* Right Output Port (Trừ Egress) */}
                  {node.node_type !== 'discord_egress' && (
                    <div
                      onMouseDown={e => handleStartConnect(e, node.id)}
                      className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-900 border-2 border-purple-400 flex items-center justify-center hover:scale-125 hover:bg-purple-500 transition-all cursor-pointer z-10"
                      title="Kéo từ đây để nối dây (Output Port)"
                    >
                      <div className="w-2 h-2 rounded-full bg-white" />
                    </div>
                  )}

                  {/* Header Khối */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-base p-1 rounded-lg bg-slate-800">{tmpl.icon}</span>
                      <span className="text-xs font-bold text-white truncate max-w-[110px]">
                        {node.label}
                      </span>
                    </div>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        handleDeleteNode(node.id);
                      }}
                      className="text-slate-500 hover:text-rose-400 p-1 text-xs transition-colors"
                      title="Xóa khối"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Nội dung tóm tắt Khối */}
                  <div className="bg-slate-900/70 rounded-xl p-2 text-[11px] text-slate-300 border border-slate-800/80">
                    {node.node_type === 'model_binding' ? (
                      <div className="space-y-0.5">
                        <div className="text-purple-300 font-semibold truncate">
                          Mô hình: {node.config?.model_id || 'Chưa chọn'}
                        </div>
                        <div className="text-slate-400 text-[10px]">
                          Temp: {node.config?.temperature ?? 0.7} | Max: {node.config?.max_tokens ?? 1000}
                        </div>
                      </div>
                    ) : node.node_type === 'discord_ingress' ? (
                      <div className="text-indigo-300 font-medium text-[10px]">
                        Lắng nghe: All Channels
                      </div>
                    ) : node.node_type === 'discord_egress' ? (
                      <div className="text-emerald-300 font-medium text-[10px]">
                        Markdown Embed: Bật
                      </div>
                    ) : (
                      <div className="text-cyan-300 font-medium text-[10px]">
                        Lọc Text & Chuẩn Hóa
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* CANVAS FLOATING CONTROLS (ZOOM, FIT, RESET) */}
          <div className="absolute bottom-6 left-6 z-20 flex items-center gap-2 bg-[#0c121e]/90 backdrop-blur-md p-1.5 rounded-2xl border border-slate-800 shadow-xl">
            <button
              onClick={() => setZoom(prev => Math.min(1.5, prev + 0.1))}
              className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-bold flex items-center justify-center transition-all"
              title="Phóng to"
            >
              +
            </button>
            <span className="text-xs font-semibold text-slate-400 px-1 w-12 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom(prev => Math.max(0.5, prev - 0.1))}
              className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-bold flex items-center justify-center transition-all"
              title="Thu nhỏ"
            >
              -
            </button>
            <div className="h-4 w-px bg-slate-700 mx-1" />
            <button
              onClick={() => {
                setPan({ x: 0, y: 0 });
                setZoom(1);
              }}
              className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all"
            >
              Căn Giữa
            </button>
          </div>
        </main>

        {/* RIGHT SIDE INSPECTOR DRAWER (CẤU HÌNH THAM SỐ KHỐI ĐƯỢC CHỌN) */}
        {selectedNode && (
          <aside className="w-80 border-l border-slate-800/80 bg-[#0a0f19]/95 backdrop-blur-md p-5 flex flex-col gap-4 z-20 overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">{NODE_TEMPLATES[selectedNode.node_type].icon}</span>
                <div>
                  <h3 className="text-sm font-bold text-white">Cấu Hình Khối</h3>
                  <p className="text-[11px] text-slate-400">{selectedNode.label}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedNodeId(null)}
                className="text-slate-400 hover:text-white p-1 text-xs"
              >
                ✕
              </button>
            </div>

            {/* Label chung */}
            <div>
              <label className="text-xs font-bold text-slate-300 mb-1.5 block">Tên hiển thị khối</label>
              <input
                type="text"
                value={selectedNode.label}
                onChange={e => {
                  const val = e.target.value;
                  setNodes(prev => prev.map(n => (n.id === selectedNode.id ? { ...n, label: val } : n)));
                }}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:border-indigo-500 outline-none"
              />
            </div>

            {/* Cấu hình đặc thù: MODEL BINDING (BR-037) */}
            {selectedNode.node_type === 'model_binding' && (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-purple-300 mb-1.5 block">
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
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-purple-500 outline-none"
                  >
                    {activeModels.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.provider})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 mb-1.5 block">
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
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-purple-500 outline-none resize-none leading-relaxed"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300 font-bold">Temperature (Độ sáng tạo)</span>
                    <span className="text-purple-400 font-bold">
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
                    className="w-full accent-purple-500 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300 font-bold">Max Tokens (Trần độ dài)</span>
                    <span className="text-purple-400 font-bold">
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
                    className="w-full accent-purple-500 cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* Cấu hình đặc thù: TRANSFORM FILTER */}
            {selectedNode.node_type === 'transform_filter' && (
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
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
                    className="rounded accent-cyan-500"
                  />
                  Xóa khoảng trắng thừa (Strip Whitespace)
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
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
                    className="rounded accent-cyan-500"
                  />
                  Chuyển toàn bộ sang chữ thường (Lowercase)
                </label>
              </div>
            )}

            {/* Nút Xóa Khối */}
            <div className="mt-auto pt-4 border-t border-slate-800">
              <button
                onClick={() => handleDeleteNode(selectedNode.id)}
                className="w-full py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold transition-all"
              >
                🗑 Xóa Khối Khỏi Canvas
              </button>
            </div>
          </aside>
        )}
      </div>

      {/* SIMULATE RUN MODAL (CHẠY THỬ NGHIỆM ĐO LƯỜNG NFR-027 <= 30ms) */}
      {showSimulateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0e1626] border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">🎯</span>
                <h3 className="text-base font-bold text-white">Mô Phỏng Chạy Thử Luồng Pipeline</h3>
              </div>
              <button
                onClick={() => setShowSimulateModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="text-xs font-bold text-slate-300 mb-1.5 block">
                  Nội dung tin nhắn thử nghiệm (Giả lập nhận từ Discord)
                </label>
                <textarea
                  rows={3}
                  value={simQuery}
                  onChange={e => setSimQuery(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-purple-500 outline-none resize-none leading-relaxed"
                />
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleSimulateRun}
                  disabled={simulating || !simQuery.trim()}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold shadow-lg shadow-purple-500/30 disabled:opacity-50"
                >
                  {simulating ? 'Đang Thực Thi...' : '🚀 Bắt Đầu Mô Phỏng'}
                </button>
              </div>

              {/* Kết quả mô phỏng */}
              {simResult && (
                <div className="space-y-4 pt-4 border-t border-slate-800">
                  {/* Trạng thái Telemetry Header */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                      <div className="text-[10px] text-slate-400">Trạng Thái Pipeline</div>
                      <div className="text-xs font-bold text-emerald-400">{simResult.status}</div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                      <div className="text-[10px] text-slate-400">Overhead Phụ Trội (NFR-027)</div>
                      <div className="text-xs font-bold text-indigo-400">
                        {simResult.pipeline_overhead_ms} ms (&le; 30ms)
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                      <div className="text-[10px] text-slate-400">Tokens Tiêu Thụ</div>
                      <div className="text-xs font-bold text-purple-400">{simResult.tokens_consumed}</div>
                    </div>
                  </div>

                  {/* Vết thực thi từng node (Step Traces) */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-300 mb-2">Vết Thực Thi (Step Traces):</h4>
                    <div className="space-y-2">
                      {simResult.step_traces.map((trace, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400 font-mono text-[11px]">{idx + 1}.</span>
                            <span className="font-semibold text-slate-200">{trace.label}</span>
                            <span className="text-slate-500 text-[11px]">({trace.node_type})</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-indigo-400 font-mono text-[11px]">
                              {trace.duration_ms} ms
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                              ✓ PASS
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Phản hồi cuối cùng gửi ra Discord */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-300 mb-1.5">
                      Nội Dung Phản Hồi In Ra Discord (Egress Output):
                    </h4>
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 whitespace-pre-wrap leading-relaxed font-sans">
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
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0e1626] border border-slate-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">📋</span>
                <h3 className="text-base font-bold text-white">Lịch Sử Thực Thi Pipeline Gần Đây</h3>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-6 max-h-[70vh] overflow-y-auto space-y-3">
              {executions.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs">
                  Chưa có lượt thực thi nào được ghi nhận.
                </div>
              ) : (
                executions.map(item => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-200">
                        {item.trigger_source} • {item.model_used || 'Mặc định'}
                      </span>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            item.status === 'SUCCESS'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                          }`}
                        >
                          {item.status}
                        </span>
                        <span className="text-slate-500 text-[10px]">
                          {new Date(item.created_at).toLocaleString('vi-VN')}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 italic">&ldquo;{item.input_message}&rdquo;</p>
                    <div className="text-[11px] text-slate-500 flex gap-4">
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
