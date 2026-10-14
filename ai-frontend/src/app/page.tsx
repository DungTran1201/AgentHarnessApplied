'use client';

import React from 'react';
import Link from 'next/link';
import Icon from '@/components/ui/Icon';

export default function HomePage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      {/* Navigation Header */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1rem 2rem',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'var(--bg-surface)',
          backdropFilter: 'blur(16px)',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#000',
              fontWeight: 700,
              fontSize: '1rem',
            }}
          >
            AI
          </div>
          <span
            style={{
              fontSize: '1.15rem',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              color: 'var(--text-primary)'
            }}
          >
            AI-Chan
          </span>
        </div>

        <nav style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <Link
            href="/chat"
            className="btn btn-secondary"
            style={{ fontSize: '0.85rem', padding: '6px 14px' }}
          >
            <Icon name="chat" size={14} />
            <span>Chat</span>
          </Link>
          <Link
            href="/projects"
            className="btn btn-secondary"
            style={{ fontSize: '0.85rem', padding: '6px 14px' }}
          >
            <Icon name="projects" size={14} />
            <span>Projects</span>
          </Link>
          <Link
            href="/prompts"
            className="btn btn-secondary"
            style={{ fontSize: '0.85rem', padding: '6px 14px' }}
          >
            <Icon name="prompts" size={14} />
            <span>Prompts</span>
          </Link>
          <Link
            href="/skills"
            className="btn btn-secondary"
            style={{ fontSize: '0.85rem', padding: '6px 14px' }}
          >
            <Icon name="skills" size={14} />
            <span>Skills</span>
          </Link>
          <Link
            href="/login"
            className="btn btn-secondary"
            style={{ fontSize: '0.85rem', padding: '6px 14px' }}
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="btn btn-primary"
            style={{ fontSize: '0.85rem', padding: '6px 16px' }}
          >
            Get Started Free
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
        <div style={{ position: 'relative', zIndex: 1, maxWidth: '800px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 14px',
              borderRadius: 'var(--radius-full)',
              background: 'rgba(62, 207, 142, 0.1)',
              border: '1px solid rgba(62, 207, 142, 0.3)',
              color: 'var(--accent)',
              fontSize: '0.8rem',
              fontWeight: 600,
              marginBottom: '1.5rem',
            }}
          >
            <span>Professional AI Engineering Workspace</span>
          </div>

          <h1
            style={{
              fontSize: 'clamp(2.2rem, 5vw, 3.5rem)',
              fontWeight: 800,
              lineHeight: 1.15,
              letterSpacing: '-0.03em',
              marginBottom: '1rem',
              color: 'var(--text-primary)',
            }}
          >
            AI-Chan Platform
          </h1>

          <p
            style={{
              fontSize: '1.1rem',
              lineHeight: 1.6,
              color: 'var(--text-secondary)',
              marginBottom: '2rem',
              maxWidth: '640px',
              margin: '0 auto 2rem',
            }}
          >
            A high-performance AI workspace with real-time SSE streaming, visual project pipelines, system prompt libraries, and modular agent skills.
          </p>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              href="/chat"
              className="btn btn-primary"
              style={{ padding: '10px 24px', fontSize: '0.95rem' }}
            >
              <span>Open Workspace</span>
            </Link>

            <Link
              href="/login"
              className="btn btn-secondary"
              style={{ padding: '10px 20px', fontSize: '0.95rem' }}
            >
              Sign In
            </Link>
          </div>
        </div>

        {/* Feature Cards Grid */}
        <section
          style={{
            marginTop: '4rem',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '1.25rem',
            maxWidth: '1020px',
            width: '100%',
            position: 'relative',
            zIndex: 1,
          }}
        >
          {[
            {
              icon: 'chat' as const,
              title: 'Real-time Streaming',
              desc: 'Sub-second SSE token generation with instant client-side cancellation and error recovery.',
            },
            {
              icon: 'settings' as const,
              title: 'Multi-Provider Failover',
              desc: 'Automatic routing and failover across Gemini, OpenAI, and custom AI provider models.',
            },
            {
              icon: 'projects' as const,
              title: 'Project Workflows',
              desc: 'Visual node pipelines linking user inputs, LLM models, system prompts, and streaming outputs.',
            },
            {
              icon: 'prompts' as const,
              title: 'Prompt Library',
              desc: 'Versioned system prompt repositories with dynamic reference binding across workflows.',
            },
            {
              icon: 'skills' as const,
              title: 'Modular Agent Skills',
              desc: 'Standardized SKILL.md packages with frontmatter validation, asset uploads, and ZIP import/export.',
            },
            {
              icon: 'dashboard' as const,
              title: 'Telemetry & Quota',
              desc: 'Real-time telemetry, model latency monitoring, and daily shared token quota tracking.',
            },
          ].map((item, idx) => (
            <div
              key={idx}
              className="card"
              style={{
                padding: '1.25rem',
                textAlign: 'left',
              }}
            >
              <div style={{ color: 'var(--accent)', marginBottom: '0.75rem' }}>
                <Icon name={item.icon} size={20} />
              </div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-primary)' }}>{item.title}</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{item.desc}</p>
            </div>
          ))}
        </section>
      </main>

      {/* Footer */}
      <footer
        style={{
          borderTop: '1px solid var(--border-subtle)',
          padding: '1.25rem',
          textAlign: 'center',
          fontSize: '0.8rem',
          color: 'var(--text-muted)',
        }}
      >
        © 2026 AI-Chan Platform. Professional AI Workspace.
      </footer>
    </div>
  );
}