'use client';

import React from 'react';
import Link from 'next/link';

export default function HomePage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#0E0F1B', color: 'var(--text-primary)' }}>
      {/* Navigation Header */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1rem 2rem',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'rgba(14, 15, 27, 0.85)',
          backdropFilter: 'blur(16px)',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'var(--accent-gradient)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.2rem',
              boxShadow: 'var(--accent-glow)',
            }}
          >
            ✨
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span
              style={{
                fontSize: '1.25rem',
                fontWeight: 700,
                letterSpacing: '-0.02em',
                background: 'linear-gradient(135deg, #FFFFFF 0%, #C4B5FD 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              AI-Chan
            </span>
          </div>
        </div>

        <nav style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <Link
            href="/chat"
            style={{
              color: 'var(--accent)',
              textDecoration: 'none',
              fontSize: '0.88rem',
              fontWeight: 600,
              padding: '8px 16px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(167, 139, 250, 0.12)',
              border: '1px solid rgba(167, 139, 250, 0.25)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: 'var(--accent-glow-sm)',
            }}
          >
            <span>💬</span>
            <span>Workspace & Companion</span>
          </Link>
          <Link
            href="/projects"
            style={{
              color: 'var(--text-secondary)',
              textDecoration: 'none',
              fontSize: '0.88rem',
              fontWeight: 500,
              padding: '8px 14px',
              borderRadius: 'var(--radius-sm)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>🧩</span>
            <span>Projects</span>
          </Link>
          <Link
            href="/prompts"
            style={{
              color: 'var(--text-secondary)',
              textDecoration: 'none',
              fontSize: '0.88rem',
              fontWeight: 500,
              padding: '8px 14px',
              borderRadius: 'var(--radius-sm)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>📜</span>
            <span>Prompts</span>
          </Link>
          <Link
            href="/login"
            style={{
              color: 'var(--text-secondary)',
              textDecoration: 'none',
              fontSize: '0.88rem',
              fontWeight: 500,
              padding: '8px 14px',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            Đăng nhập
          </Link>
          <Link
            href="/register"
            style={{
              background: 'var(--accent-gradient)',
              color: '#FFFFFF',
              textDecoration: 'none',
              fontSize: '0.88rem',
              fontWeight: 600,
              padding: '8px 18px',
              borderRadius: 'var(--radius-sm)',
              boxShadow: 'var(--accent-glow-sm)',
            }}
          >
            Đăng ký miễn phí
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '4rem 1.5rem',
          textAlign: 'center',
          position: 'relative',
        }}
      >
        {/* Glow ambient background */}
        <div
          style={{
            position: 'absolute',
            top: '20%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '600px',
            height: '400px',
            background: 'radial-gradient(circle, rgba(167, 139, 250, 0.22) 0%, rgba(139, 92, 246, 0.1) 50%, transparent 70%)',
            filter: 'blur(70px)',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: '840px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 16px',
              borderRadius: 'var(--radius-full)',
              background: 'rgba(167, 139, 250, 0.15)',
              border: '1px solid rgba(167, 139, 250, 0.35)',
              color: 'var(--accent)',
              fontSize: '0.85rem',
              fontWeight: 600,
              marginBottom: '1.75rem',
            }}
          >
            <span>✨ Anime Minimalism × Technical AI Workspace × 3D VRM Companion</span>
          </div>

          <h1
            style={{
              fontSize: 'clamp(2.5rem, 5.5vw, 4rem)',
              fontWeight: 800,
              lineHeight: 1.15,
              letterSpacing: '-0.03em',
              marginBottom: '1.25rem',
              color: '#FFFFFF',
            }}
          >
            AI-Chan Desktop <br />
            <span
              style={{
                background: 'var(--accent-gradient)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Virtual Companion
            </span>{' '}
            & AI Workspace
          </h1>

          <p
            style={{
              fontSize: '1.15rem',
              lineHeight: 1.65,
              color: 'var(--text-secondary)',
              marginBottom: '2.5rem',
              maxWidth: '680px',
              margin: '0 auto 2.5rem',
            }}
          >
            Trải nghiệm trợ lý ảo AI cao cấp tích hợp nhân vật 3D VRM sống động, chuyển đổi linh hoạt giữa Workspace Mode và Companion Mode, hỗ trợ streaming SSE thời gian thực, Multi-Provider Failover và quản lý luồng trực quan.
          </p>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              href="/chat"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: 'var(--accent-gradient)',
                color: '#ffffff',
                padding: '14px 32px',
                borderRadius: 'var(--radius-md)',
                fontSize: '1.05rem',
                fontWeight: 600,
                textDecoration: 'none',
                boxShadow: 'var(--accent-glow)',
                transition: 'transform 0.2s ease',
              }}
            >
              <span>Vào AI-Chan Workspace Ngay</span>
              <span>➔</span>
            </Link>

            <Link
              href="/login"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(31, 27, 43, 0.8)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-primary)',
                padding: '14px 26px',
                borderRadius: 'var(--radius-md)',
                fontSize: '1.05rem',
                fontWeight: 500,
                textDecoration: 'none',
              }}
            >
              Đăng Nhập Tài Khoản
            </Link>
          </div>
        </div>

        {/* Feature Cards Grid */}
        <section
          style={{
            marginTop: '5rem',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '1.5rem',
            maxWidth: '1080px',
            width: '100%',
            position: 'relative',
            zIndex: 1,
          }}
        >
          {[
            {
              icon: '🌸',
              title: '3D VRM Companion Tương Tác',
              desc: 'Tích hợp mô hình VRM 3D thực thụ qua Three.js với cử động thở nhẹ, chớp mắt tự nhiên và khẩu hình nói đồng bộ với phản hồi của AI.',
            },
            {
              icon: '🎭',
              title: 'Chế Độ Kép Workspace / Companion',
              desc: 'Chuyển đổi liền mạch giữa Workspace Mode tập trung năng suất và Companion Mode 3D toàn cảnh không làm gián đoạn hội thoại.',
            },
            {
              icon: '⚡',
              title: 'Streaming SSE Thời Gian Thực',
              desc: 'Từng token phản hồi được truyền trực tiếp về trình duyệt với độ trễ dưới 2 giây và hỗ trợ hủy luồng tức thì.',
            },
            {
              icon: '🛡️',
              title: 'Multi-Provider Failover',
              desc: 'Tự động bắt lỗi và chuyển đổi dự phòng thông minh giữa Gemini và OpenAI trong suốt với người dùng.',
            },
<<<<<<< HEAD
            {
              icon: '🎨',
              title: 'Giao Diện Chuẩn UX & Markdown',
              desc: 'Hỗ trợ định dạng bảng, toán học, tô màu mã nguồn và sao chép code chỉ với một cú nhấp chuột.'
            },
            {
              icon: '🧩',
              title: 'Visual Project Editor',
              desc: 'Thiết kế đồ thị dự án trực quan: Web Input, Model Node, System Prompt và Output Node với xác thực chu trình DAG an toàn.'
            }
=======
>>>>>>> recover_doc
          ].map((item, idx) => (
            <div
              key={idx}
              style={{
                background: 'rgba(23, 24, 33, 0.85)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-lg)',
                padding: '1.5rem',
                textAlign: 'left',
                backdropFilter: 'blur(10px)',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
              }}
            >
              <div style={{ fontSize: '1.8rem', marginBottom: '0.75rem' }}>{item.icon}</div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '0.5rem', color: '#FFFFFF' }}>{item.title}</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>{item.desc}</p>
            </div>
          ))}
        </section>
      </main>

      {/* Footer */}
      <footer
        style={{
          borderTop: '1px solid var(--border-subtle)',
          padding: '1.5rem',
          textAlign: 'center',
          fontSize: '0.85rem',
          color: 'var(--text-muted)',
        }}
      >
        © 2026 AI-Chan Platform. Anime Minimalism × Technical AI Workspace × 3D VRM Companion.
      </footer>
    </div>
  );
}
