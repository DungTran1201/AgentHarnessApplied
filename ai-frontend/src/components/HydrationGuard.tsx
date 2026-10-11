'use client';

import { useEffect } from 'react';

/**
 * HydrationGuard Component
 *
 * Nhiệm vụ:
 * 1. Làm sạch các thuộc tính do Browser Extension (Bitdefender TrafficLight, Urban VPN, v.v.)
 *    tự động chèn vào DOM (bis_skin_checked, bis_register, cz-shortcut-listen).
 * 2. Giám sát liên tục qua MutationObserver trong suốt vòng đời SPA để loại bỏ ngay lập tức.
 * 3. Chặn các log cảnh báo hydration mismatch do extension gây ra tại console.error,
 *    ngăn chặn Next.js Dev Overlay che màn hình làm việc của lập trình viên.
 */
export default function HydrationGuard() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Dọn dẹp thuộc tính extension hiện có trong DOM
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

    // 2. Thiết lập MutationObserver để tự động xóa thuộc tính khi extension cố tình inject vào
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

    // 3. Intercept console.error để lọc các cảnh báo hydration mismatch từ extension
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
        return; // Bỏ qua thông báo lỗi gây ra bởi extension
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
