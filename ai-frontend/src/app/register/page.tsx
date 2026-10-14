'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Icon from '@/components/ui/Icon';
import { getErrorMessage } from '@/lib/errors';

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [discordLoading, setDiscordLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const err = params.get('error');
      if (err) {
        if (err === 'oauth_cancelled') {
          setError('Discord registration was cancelled.');
        } else if (err === 'invalid_state') {
          setError('Authentication request is invalid or expired. Please try again.');
        } else if (err === 'unverified_email') {
          setError('Discord account email is unverified. Please verify your email on Discord before continuing.');
        } else if (err === 'discord_exchange_failed') {
          setError('Failed to complete Discord authentication exchange. Please try again later.');
        } else {
          setError(`Discord authentication error: ${err}`);
        }
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email.trim() || !password) {
      setError('Please enter both Email and Password.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Confirmation password does not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password,
          full_name: fullName.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Registration failed.');
      }

      setSuccess('Account created successfully! Redirecting to sign in...');
      setTimeout(() => {
        router.push('/login');
      }, 1200);
    } catch (err: any) {
      setError(getErrorMessage(err, 'Could not create account. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleDiscordRegister = () => {
    setDiscordLoading(true);
    window.location.href = '/api/v1/auth/discord/login';
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
      backgroundColor: 'var(--bg-base)'
    }}>
      <div className="card" style={{
        width: '100%',
        maxWidth: '420px',
        padding: '2rem'
      }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'var(--accent)',
            color: '#000',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: '1.1rem',
            marginBottom: '0.75rem'
          }}>
            AI
          </div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
            Create an account
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Start your AI-Chan productivity workspace
          </p>
        </div>

        {error && (
          <div style={{
            background: 'var(--danger-bg)',
            border: '1px solid var(--danger-border)',
            color: 'var(--danger)',
            padding: '10px 12px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.85rem',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <Icon name="alert" size={15} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div style={{
            background: 'rgba(62, 207, 142, 0.1)',
            border: '1px solid rgba(62, 207, 142, 0.3)',
            color: 'var(--accent)',
            padding: '10px 12px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.85rem',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <Icon name="check" size={15} />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Full Name
            </label>
            <input
              type="text"
              className="input"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Alex Johnson"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Email Address
            </label>
            <input
              type="email"
              autoComplete="email"
              spellCheck={false}
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Password (min. 6 characters)
            </label>
            <input
              type="password"
              autoComplete="new-password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Confirm Password
            </label>
            <input
              type="password"
              autoComplete="new-password"
              className="input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading || discordLoading}
            className="btn btn-primary"
            style={{ width: '100%', padding: '10px', marginTop: '0.5rem', justifyContent: 'center' }}
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        {/* Divider */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          margin: '1.25rem 0',
          gap: '12px'
        }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Or register with
          </span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
        </div>

        {/* Discord OAuth Button */}
        <button
          type="button"
          onClick={handleDiscordRegister}
          disabled={discordLoading || loading}
          style={{
            width: '100%',
            padding: '10px 14px',
            background: '#5865F2',
            color: '#ffffff',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.88rem',
            fontWeight: 600,
            cursor: (discordLoading || loading) ? 'not-allowed' : 'pointer',
            opacity: discordLoading ? 0.8 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.893.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
          </svg>
          {discordLoading ? 'Redirecting to Discord...' : 'Register with Discord'}
        </button>

        <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
