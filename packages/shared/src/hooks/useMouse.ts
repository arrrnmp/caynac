import { useEffect, useRef } from 'react';
import { useStdin, type DOMElement } from 'ink';

export interface MouseEvent {
  x: number;   // 1-based terminal column
  y: number;   // 1-based terminal row
  kind: 'down' | 'up' | 'wheel' | 'move';
  button?: 'left' | 'middle' | 'right';
  wheelDirection?: 'up' | 'down';
}

interface UseMouseOptions {
  isActive?: boolean;
}

const SGR_MOUSE_RE = /\u001B\[<(\d+);(\d+);(\d+)([Mm])/g;
const MOUSE_ENABLE = '\u001B[?1003h\u001B[?1006h';
const MOUSE_DISABLE = '\u001B[?1000l\u001B[?1002l\u001B[?1003l\u001B[?1005l\u001B[?1006l\u001B[?1015l';
let activeMouseHooks = 0;

function setMouseMode(enabled: boolean) {
  if (!process.stdout.isTTY) return;
  process.stdout.write(enabled ? MOUSE_ENABLE : MOUSE_DISABLE);
}

function decodeMouseEvent(btnCode: number, x: number, y: number, suffix: string): MouseEvent | null {
  // Wheel events (64 up, 65 down, etc.)
  if ((btnCode & 64) === 64) {
    return {
      x,
      y,
      kind: 'wheel',
      wheelDirection: (btnCode & 1) === 1 ? 'down' : 'up',
    };
  }

  const buttonBits = btnCode & 3;
  const button =
    buttonBits === 0 ? 'left' :
    buttonBits === 1 ? 'middle' :
    buttonBits === 2 ? 'right' :
    undefined;

  // Motion/hover events (button state encoded in low bits, with motion bit set).
  if ((btnCode & 32) === 32) {
    return {
      x,
      y,
      kind: 'move',
      button,
    };
  }

  // Release can appear as suffix "m" (SGR) or btnCode low bits = 3 in some modes.
  if (suffix === 'm' || (btnCode & 3) === 3) {
    return { x, y, kind: 'up' };
  }

  if (!button) return null;

  return {
    x,
    y,
    kind: 'down',
    button,
  };
}

export function useMouse(
  handler: (event: MouseEvent) => void,
  options: UseMouseOptions = {},
) {
  const { stdin } = useStdin();
  const isActive = options.isActive ?? true;
  const handlerRef = useRef(handler);

  handlerRef.current = handler;

  useEffect(() => {
    if (!isActive) return;

    activeMouseHooks += 1;
    if (activeMouseHooks === 1) setMouseMode(true);

    const onData = (chunk: string | Buffer) => {
      const input = typeof chunk === 'string' ? chunk : chunk.toString('utf8');
      let match: RegExpExecArray | null;

      SGR_MOUSE_RE.lastIndex = 0;
      while ((match = SGR_MOUSE_RE.exec(input)) !== null) {
        const btnCode = Number.parseInt(match[1] ?? '', 10);
        const x = Number.parseInt(match[2] ?? '', 10);
        const y = Number.parseInt(match[3] ?? '', 10);
        const suffix = match[4] ?? 'M';

        if (!Number.isFinite(btnCode) || !Number.isFinite(x) || !Number.isFinite(y)) continue;

        const event = decodeMouseEvent(btnCode, x, y, suffix);
        if (!event) continue;
        handlerRef.current(event);
      }
    };

    stdin.on('data', onData);
    return () => {
      stdin.off('data', onData);
      activeMouseHooks = Math.max(0, activeMouseHooks - 1);
      if (activeMouseHooks === 0) setMouseMode(false);
    };
  }, [isActive, stdin]);
}

export interface Rect {
  x: number;      // 0-based
  y: number;      // 0-based
  width: number;
  height: number;
}

export function getAbsoluteRect(node: DOMElement | null | undefined): Rect | null {
  if (!node?.yogaNode) return null;

  let x = 0;
  let y = 0;
  let current: DOMElement | undefined = node;

  while (current) {
    const yogaNode = current.yogaNode;
    if (yogaNode) {
      x += Math.round(yogaNode.getComputedLeft());
      y += Math.round(yogaNode.getComputedTop());
    }
    current = current.parentNode;
  }

  return {
    x,
    y,
    width: Math.round(node.yogaNode.getComputedWidth()),
    height: Math.round(node.yogaNode.getComputedHeight()),
  };
}

export function isMouseInRect(event: MouseEvent, rect: Rect): boolean {
  const x0 = event.x - 1;
  const y0 = event.y - 1;
  return (
    x0 >= rect.x &&
    x0 < rect.x + rect.width &&
    y0 >= rect.y &&
    y0 < rect.y + rect.height
  );
}
