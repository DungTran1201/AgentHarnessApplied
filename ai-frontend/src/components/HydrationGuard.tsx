'use client';

import { useEffect } from 'react';

/**
 * HydrationGuard Component
 *
 * Purpose:
 * 1. Clean attributes injected by browser extensions (Bitdefender TrafficLight, Urban VPN, etc.)
 *    into the DOM (bis_skin_checked, bis_register, cz-shortcut-listen).
 * 2. Continuously monitor via MutationObserver during the SPA lifecycle to remove them immediately.
 * 3. Intercept console.error to filter extension-caused hydration mismatch warnings,
 *    preventing the Next.js dev overlay from obstructing developer view.
 */
export default function HydrationGuard() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Clean existing extension attributes in DOM
    const cleanAttributes = () => {
      try {
        const elements = document.querySelectorAll('[bis_skin_checked], [bis_register]');
        elements.forEach((el) => {
          el.removeAttribute('bis_skin_checked');
          el.removeAttribute('bis_register');
        });
      } catch {}
    };

    cleanAttributes();

    // 2. Set up MutationObserver to automatically strip injected extension attributes
    let observer: MutationObserver | null = null;
    try {
      observer = new MutationObserver((mutations) => {
        for (const m of mutations) {
          if (
            m.type === 'attributes' &&
            (m.attributeName === 'bis_skin_checked' || m.attributeName === 'bis_register')
          ) {
            (m.target as Element).removeAttribute(m.attributeName);
          } else if (m.type === 'childList') {
            m.addedNodes.forEach((node) => {
              if (node instanceof Element) {
                if (node.hasAttribute('bis_skin_checked')) node.removeAttribute('bis_skin_checked');
                if (node.hasAttribute('bis_register')) node.removeAttribute('bis_register');
                node.querySelectorAll?.('[bis_skin_checked], [bis_register]').forEach((child) => {
                  child.removeAttribute('bis_skin_checked');
                  child.removeAttribute('bis_register');
                });
              }
            });
          }
        }
      });

      if (document.documentElement) {
        observer.observe(document.documentElement, {
          attributes: true,
          attributeFilter: ['bis_skin_checked', 'bis_register'],
          subtree: true,
          childList: true,
        });
      }
    } catch {}

    // 3. Intercept console.error to filter extension hydration mismatch warnings
    const originalConsoleError = console.error;
    console.error = (...args: any[]) => {
      const errorString = args
        .map((a) => (typeof a === 'string' ? a : a?.message || ''))
        .join(' ');

      if (
        errorString.includes('bis_skin_checked') ||
        errorString.includes('bis_register') ||
        errorString.includes('cz-shortcut-listen')
      ) {
        return; // Ignore hydration mismatch noise injected by browser extensions
      }

      originalConsoleError.apply(console, args);
    };

    return () => {
      if (observer) observer.disconnect();
      console.error = originalConsoleError;
    };
  }, []);

  return null;
}
