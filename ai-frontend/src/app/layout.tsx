import React from 'react';
import type { Metadata, Viewport } from 'next';
import './globals.css';
import HydrationGuard from '@/components/HydrationGuard';

export const metadata: Metadata = {
  title: 'AI-Chan — Virtual Assistant Platform',
  description: 'Intelligent AI assistant platform with real-time SSE streaming, workflow projects, and extensible prompt engineering tools.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

// Inline script to remove attributes injected by browser extensions (Bitdefender, Urban VPN, etc.)
// before React hydration, and filter extension hydration mismatch warnings in the console.
const extensionHydrationFixScript = `
(function() {
  if (typeof window === 'undefined') return;

  // 1. Filter out console.error hydration mismatch warnings originating from extension attributes
  var origError = console.error;
  console.error = function() {
    var args = Array.prototype.slice.call(arguments);
    var str = args.map(function(a) {
      return typeof a === 'string' ? a : (a && a.message ? a.message : '');
    }).join(' ');
    if (str.indexOf('bis_skin_checked') !== -1 || str.indexOf('bis_register') !== -1 || str.indexOf('cz-shortcut-listen') !== -1) {
      return;
    }
    return origError.apply(console, arguments);
  };

  // 2. Clean extension attributes on DOM nodes
  function cleanAttr(node) {
    if (node && node.nodeType === 1) {
      if (node.hasAttribute('bis_skin_checked')) node.removeAttribute('bis_skin_checked');
      if (node.hasAttribute('bis_register')) node.removeAttribute('bis_register');
    }
  }

  // 3. Use MutationObserver to remove extension attributes as soon as injected
  try {
    var observer = new MutationObserver(function(mutations) {
      for (var i = 0; i < mutations.length; i++) {
        var m = mutations[i];
        if (m.type === 'attributes') {
          if (m.attributeName === 'bis_skin_checked' || m.attributeName === 'bis_register') {
            m.target.removeAttribute(m.attributeName);
          }
        } else if (m.type === 'childList') {
          for (var j = 0; j < m.addedNodes.length; j++) {
            var n = m.addedNodes[j];
            cleanAttr(n);
            if (n.querySelectorAll) {
              var els = n.querySelectorAll('[bis_skin_checked], [bis_register]');
              for (var k = 0; k < els.length; k++) {
                cleanAttr(els[k]);
              }
            }
          }
        }
      }
    });

    if (document.documentElement) {
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['bis_skin_checked', 'bis_register'],
        subtree: true,
        childList: true
      });
    }
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: extensionHydrationFixScript,
          }}
        />
      </head>
      <body suppressHydrationWarning>
        <HydrationGuard />
        {children}
      </body>
    </html>
  );
}
