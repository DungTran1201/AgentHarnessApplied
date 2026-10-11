'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { VRMLoaderPlugin, VRM, VRMUtils } from '@pixiv/three-vrm';
import { VRMController, AvatarState } from './vrmController';

interface VRMViewerProps {
  modelUrl?: string;
  avatarState?: AvatarState;
  companionMode?: boolean;
  onControllerReady?: (controller: VRMController) => void;
  style?: React.CSSProperties;
  className?: string;
}

export default function VRMViewer({
  modelUrl = '/models/ai-chan.vrm',
  avatarState = 'idle',
  companionMode = false,
  onControllerReady,
  style,
  className = '',
}: VRMViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [webglSupported, setWebglSupported] = useState(true);

  // References to keep Three.js resources
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const controllerRef = useRef<VRMController>(new VRMController());
  const animationFrameIdRef = useRef<number | null>(null);

  // Check WebGL support & reduced motion
  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) {
        setWebglSupported(false);
      }
    } catch {
      setWebglSupported(false);
    }

    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      controllerRef.current.setReducedMotion(mediaQuery.matches);
      const listener = (e: MediaQueryListEvent) => {
        controllerRef.current.setReducedMotion(e.matches);
      };
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, []);

  // Sync avatar state
  useEffect(() => {
    controllerRef.current.setState(avatarState);
  }, [avatarState]);

  // Handle companion vs workspace camera adjust
  useEffect(() => {
    if (!cameraRef.current || !controlsRef.current) return;
    const camera = cameraRef.current;
    const controls = controlsRef.current;

    if (companionMode) {
      // Companion Mode: Centered, wider perspective
      camera.position.set(0, 1.25, 2.1);
      controls.target.set(0, 1.1, 0);
      controls.minDistance = 0.8;
      controls.maxDistance = 4.5;
    } else {
      // Workspace Mode: Upper body portrait framing, slightly angled
      camera.position.set(0.1, 1.3, 1.6);
      controls.target.set(0, 1.25, 0);
      controls.minDistance = 1.0;
      controls.maxDistance = 3.0;
    }
    controls.update();
  }, [companionMode]);

  // Main Three.js Initialization & Load
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas || !webglSupported) return;

    let isDisposed = false;
    setLoading(true);
    setLoadError(null);

    // 1. Scene Setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // 2. Camera Setup
    const width = container.clientWidth || 400;
    const height = container.clientHeight || 500;
    const camera = new THREE.PerspectiveCamera(30.0, width / height, 0.1, 20.0);
    camera.position.set(companionMode ? 0 : 0.1, companionMode ? 1.25 : 1.3, companionMode ? 2.1 : 1.6);
    cameraRef.current = camera;

    // 3. Renderer Setup with transparent background
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance',
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;
      rendererRef.current = renderer;
    } catch (err: any) {
      setLoadError('Không thể khởi tạo WebGL Context.');
      setLoading(false);
      return;
    }

    // 4. OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.screenSpacePanning = true;
    controls.target.set(0, companionMode ? 1.1 : 1.25, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 + 0.1; // Prevent going underground
    controls.minDistance = 0.8;
    controls.maxDistance = 4.0;
    controlsRef.current = controls;

    // 5. Lighting: Soft Anime Bedroom & Studio Glow
    // Ambient Light (deep lavender fill)
    const ambientLight = new THREE.AmbientLight(0x383454, 1.8);
    scene.add(ambientLight);

    // Key Light (warm soft white from upper front-left)
    const keyLight = new THREE.DirectionalLight(0xfff7fd, 2.0);
    keyLight.position.set(1.5, 2.5, 2.0);
    scene.add(keyLight);

    // Fill Light (soft purple from right)
    const fillLight = new THREE.DirectionalLight(0xa78bfa, 1.4);
    fillLight.position.set(-2.0, 1.5, 1.5);
    scene.add(fillLight);

    // Rim Light (cyan-violet backlight for anime silhouette edge)
    const rimLight = new THREE.DirectionalLight(0x818cf8, 2.2);
    rimLight.position.set(0.0, 2.2, -2.5);
    scene.add(rimLight);

    // 6. Loader with VRM Plugin
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));

    let loadedVrm: VRM | null = null;

    loader.load(
      modelUrl,
      (gltf) => {
        if (isDisposed) return;
        const vrm = gltf.userData.vrm as VRM;
        if (!vrm) {
          setLoadError('File không chứa định dạng VRM hợp lệ.');
          setLoading(false);
          return;
        }

        loadedVrm = vrm;
        VRMUtils.removeUnnecessaryVertices(gltf.scene);
        VRMUtils.removeUnnecessaryJoints(gltf.scene);

        // Turn character slightly towards workspace center
        vrm.scene.rotation.y = Math.PI; // Face forward
        scene.add(vrm.scene);

        controllerRef.current.setVRM(vrm);
        controllerRef.current.setState(avatarState);

        if (onControllerReady) {
          onControllerReady(controllerRef.current);
        }

        setLoading(false);
      },
      (progress) => {
        if (progress.total > 0) {
          const percent = Math.round((progress.loaded / progress.total) * 100);
          setLoadingProgress(percent);
        }
      },
      (error) => {
        if (isDisposed) return;
        console.warn('Lỗi tải mô hình VRM:', error);
        setLoadError('Không thể tải file VRM. Hệ thống đang sử dụng giao diện thay thế.');
        setLoading(false);
      }
    );

    // 7. Resize Observer
    const handleResize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      if (newWidth === 0 || newHeight === 0) return;

      cameraRef.current.aspect = newWidth / newHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(newWidth, newHeight);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // 8. Render Animation Loop
    let lastTime = performance.now();

    const animate = () => {
      animationFrameIdRef.current = requestAnimationFrame(animate);

      const currentTime = performance.now();
      const delta = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;

      if (controllerRef.current && cameraRef.current) {
        controllerRef.current.update(delta, cameraRef.current.position);
      }

      controls.update();
      renderer.render(scene, camera);
    };

    animate();

    // 9. Cleanup Handler
    return () => {
      isDisposed = true;
      resizeObserver.disconnect();

      if (animationFrameIdRef.current !== null) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }

      controls.dispose();
      controllerRef.current.dispose();

      if (loadedVrm) {
        scene.remove(loadedVrm.scene);
        VRMUtils.deepDispose(loadedVrm.scene);
      }

      renderer.dispose();
      scene.clear();
      sceneRef.current = null;
      rendererRef.current = null;
      cameraRef.current = null;
      controlsRef.current = null;
    };
  }, [modelUrl, webglSupported]);

  // Fallback for WebGL unsupport or error
  if (!webglSupported || loadError) {
    return (
      <div
        className={`vrm-fallback-container ${className}`}
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'radial-gradient(circle at center, rgba(31, 27, 43, 0.9) 0%, rgba(14, 15, 27, 0.95) 100%)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)',
          position: 'relative',
          overflow: 'hidden',
          ...style,
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'url(/assets/ai-chan-bg.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'right center',
            opacity: 0.35,
            filter: 'blur(2px)',
          }}
        />
        <div
          style={{
            position: 'relative',
            zIndex: 2,
            textAlign: 'center',
            padding: '1.5rem',
            maxWidth: '320px',
            background: 'rgba(23, 24, 33, 0.85)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-default)',
            boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
          }}
        >
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>✨</div>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            AI-Chan Companion
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1rem' }}>
            {loadError || 'WebGL không được hỗ trợ trên môi trường hiện tại.'}
          </p>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              borderRadius: 'var(--radius-full)',
              background: 'rgba(167, 139, 250, 0.15)',
              border: '1px solid rgba(167, 139, 250, 0.3)',
              color: 'var(--accent)',
              fontSize: '0.75rem',
            }}
          >
            🟢 2D Ambient Mode Active
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`vrm-viewer-container ${className}`}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        ...style,
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          outline: 'none',
        }}
      />

      {/* Loading Overlay */}
      {loading && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(14, 15, 27, 0.65)',
            backdropFilter: 'blur(8px)',
            zIndex: 10,
            transition: 'opacity 0.3s ease',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              border: '3px solid rgba(167, 139, 250, 0.2)',
              borderTopColor: 'var(--primary)',
              animation: 'spin 1s linear infinite',
              marginBottom: '1rem',
              boxShadow: 'var(--accent-glow-sm)',
            }}
          />
          <style jsx>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
          <div style={{ color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 500, marginBottom: '4px' }}>
            Đang nạp mô hình AI-Chan 3D...
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
            {loadingProgress > 0 ? `${loadingProgress}%` : 'Đang chuẩn bị WebGL...'}
          </div>
        </div>
      )}
    </div>
  );
}
