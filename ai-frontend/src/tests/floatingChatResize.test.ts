import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Helper functions mirroring the FloatingProjectChat resize algorithms
function calculateBounds(canvasWidth: number, canvasHeight: number) {
  const maxW = Math.max(260, canvasWidth - 32);
  const maxH = Math.max(220, canvasHeight - 32);
  const minW = Math.min(300, maxW);
  const minH = Math.min(320, maxH);
  return { maxW, maxH, minW, minH };
}

function calculateResizeWidth(
  startW: number,
  startX: number,
  currentX: number,
  minW: number,
  maxW: number
) {
  // Dragging left (startX - currentX > 0) increases width
  const deltaX = startX - currentX;
  return Math.max(minW, Math.min(maxW, startW + deltaX));
}

function calculateResizeHeight(
  startH: number,
  startY: number,
  currentY: number,
  minH: number,
  maxH: number
) {
  // Dragging upward (startY - currentY > 0) increases height
  const deltaY = startY - currentY;
  return Math.max(minH, Math.min(maxH, startH + deltaY));
}

function isDragGesture(deltaX: number, deltaY: number) {
  return Math.abs(deltaX) >= 4 || Math.abs(deltaY) >= 4;
}

describe('Floating Project Chat: Drag-to-Resize & Viewport Boundary Invariants', () => {
  it('1. Horizontal resize increases width when dragging left and decreases when dragging right', () => {
    const { minW, maxW } = calculateBounds(1600, 900);
    const startW = 380;
    const startX = 500;

    // Drag left by 80px (clientX = 420)
    const expandedW = calculateResizeWidth(startW, startX, 420, minW, maxW);
    assert.equal(expandedW, 460);
    assert.ok(expandedW > startW, 'Dragging left must increase width');

    // Drag right by 60px (clientX = 560)
    const shrunkW = calculateResizeWidth(startW, startX, 560, minW, maxW);
    assert.equal(shrunkW, 320);
    assert.ok(shrunkW < startW, 'Dragging right must decrease width');
  });

  it('2. Vertical resize increases height when dragging upward and decreases when dragging downward', () => {
    const { minH, maxH } = calculateBounds(1600, 900);
    const startH = 460;
    const startY = 400;

    // Drag up by 70px (clientY = 330)
    const expandedH = calculateResizeHeight(startH, startY, 330, minH, maxH);
    assert.equal(expandedH, 530);
    assert.ok(expandedH > startH, 'Dragging upward must increase height');

    // Drag down by 80px (clientY = 480)
    const shrunkH = calculateResizeHeight(startH, startY, 480, minH, maxH);
    assert.equal(shrunkH, 380);
    assert.ok(shrunkH < startH, 'Dragging downward must decrease height');
  });

  it('3. Strict boundary clamping across all required viewports (never escapes canvas)', () => {
    const viewports = [
      { name: '1920x1080 (Desktop Large)', canvasW: 1660, canvasH: 1028 },
      { name: '1440x900 (Desktop Standard)', canvasW: 1180, canvasH: 848 },
      { name: '1280x800 (Laptop)', canvasW: 1020, canvasH: 748 },
      { name: '1024x768 (Tablet Landscape)', canvasW: 764, canvasH: 716 },
      { name: '768x1024 (Tablet Portrait)', canvasW: 508, canvasH: 972 },
      { name: '390x844 (Mobile Viewport)', canvasW: 390, canvasH: 792 },
    ];

    for (const vp of viewports) {
      const { minW, maxW, minH, maxH } = calculateBounds(vp.canvasW, vp.canvasH);

      // Extreme drag left (attempt to expand infinitely past canvas)
      const extremeWidth = calculateResizeWidth(380, 500, -10000, minW, maxW);
      assert.equal(extremeWidth, maxW, `Width must clamp to maxW on ${vp.name}`);
      assert.ok(
        extremeWidth <= vp.canvasW - 32,
        `Width (${extremeWidth}) must never exceed canvas width minus insets on ${vp.name}`
      );

      // Extreme drag up (attempt to expand infinitely past canvas)
      const extremeHeight = calculateResizeHeight(460, 500, -10000, minH, maxH);
      assert.equal(extremeHeight, maxH, `Height must clamp to maxH on ${vp.name}`);
      assert.ok(
        extremeHeight <= vp.canvasH - 32,
        `Height (${extremeHeight}) must never exceed canvas height minus insets on ${vp.name}`
      );

      // Extreme drag right/down (attempt to shrink below min)
      const minClampedW = calculateResizeWidth(380, 500, 10000, minW, maxW);
      assert.equal(minClampedW, minW, `Width must clamp to minW on ${vp.name}`);

      const minClampedH = calculateResizeHeight(460, 500, 10000, minH, maxH);
      assert.equal(minClampedH, minH, `Height must clamp to minH on ${vp.name}`);
    }
  });

  it('4. Distinguishes click from drag gesture via 4px threshold', () => {
    // Under 4px: click gesture
    assert.equal(isDragGesture(0, 0), false, '0px is a click');
    assert.equal(isDragGesture(2, 1), false, '2px is a click');
    assert.equal(isDragGesture(-3, 0), false, '3px is a click');

    // 4px or greater: drag gesture
    assert.equal(isDragGesture(4, 0), true, '4px is a drag gesture');
    assert.equal(isDragGesture(-5, 0), true, '-5px is a drag gesture');
    assert.equal(isDragGesture(0, 6), true, '6px vertical is a drag gesture');
  });

  it('5. Independent horizontal and vertical adjustment without fixed aspect ratio', () => {
    const { minW, maxW, minH, maxH } = calculateBounds(1440, 900);
    let currentW = 380;
    let currentH = 460;

    // Resize width only
    currentW = calculateResizeWidth(currentW, 500, 400, minW, maxW);
    assert.equal(currentW, 480);
    assert.equal(currentH, 460, 'Height must remain unchanged when width is adjusted');

    // Resize height only
    currentH = calculateResizeHeight(currentH, 500, 450, minH, maxH);
    assert.equal(currentH, 510);
    assert.equal(currentW, 480, 'Width must remain unchanged when height is adjusted');
  });
});
