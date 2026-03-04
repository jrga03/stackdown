import { useEffect, useRef, useState } from 'react';

export type MenuItemType =
  | { kind: 'button'; onActivate: () => void }
  | {
      kind: 'slider';
      value: number;
      min: number;
      max: number;
      step: number;
      onChange: (v: number) => void;
    }
  | {
      kind: 'toggle';
      options: string[];
      selectedIndex: number;
      onChange: (index: number) => void;
    }
  | { kind: 'keybind'; onCapture: () => void };

interface UseMenuNavigationOptions {
  items: MenuItemType[];
  onEscape?: () => void;
  enabled?: boolean;
}

export function useMenuNavigation({
  items,
  onEscape,
  enabled = true,
}: UseMenuNavigationOptions) {
  const [focusedIndex, setFocusedIndex] = useState(0);
  const itemsRef = useRef(items);
  const focusedRef = useRef(focusedIndex);
  const onEscapeRef = useRef(onEscape);

  itemsRef.current = items;
  focusedRef.current = focusedIndex;
  onEscapeRef.current = onEscape;

  // Clamp focusedIndex when items length changes
  useEffect(() => {
    if (items.length > 0 && focusedIndex >= items.length) {
      setFocusedIndex(items.length - 1);
    }
  }, [items.length]);

  useEffect(() => {
    if (!enabled) return;

    const handler = (e: KeyboardEvent) => {
      const count = itemsRef.current.length;
      if (count === 0) return;

      const idx = focusedRef.current;
      const item = itemsRef.current[idx]!;

      switch (e.code) {
        case 'ArrowUp': {
          e.preventDefault();
          e.stopPropagation();
          setFocusedIndex((idx - 1 + count) % count);
          break;
        }
        case 'ArrowDown': {
          e.preventDefault();
          e.stopPropagation();
          setFocusedIndex((idx + 1) % count);
          break;
        }
        case 'ArrowLeft': {
          if (item.kind === 'slider') {
            e.preventDefault();
            e.stopPropagation();
            const next = Math.max(item.min, item.value - item.step);
            item.onChange(next);
          } else if (item.kind === 'toggle') {
            e.preventDefault();
            e.stopPropagation();
            const next =
              (item.selectedIndex - 1 + item.options.length) %
              item.options.length;
            item.onChange(next);
          }
          break;
        }
        case 'ArrowRight': {
          if (item.kind === 'slider') {
            e.preventDefault();
            e.stopPropagation();
            const next = Math.min(item.max, item.value + item.step);
            item.onChange(next);
          } else if (item.kind === 'toggle') {
            e.preventDefault();
            e.stopPropagation();
            const next = (item.selectedIndex + 1) % item.options.length;
            item.onChange(next);
          }
          break;
        }
        case 'Enter': {
          e.preventDefault();
          e.stopPropagation();
          if (item.kind === 'button') {
            item.onActivate();
          } else if (item.kind === 'keybind') {
            item.onCapture();
          }
          break;
        }
        case 'Escape': {
          e.preventDefault();
          e.stopPropagation();
          onEscapeRef.current?.();
          break;
        }
        default:
          return; // Don't stop propagation for unhandled keys
      }
    };

    window.addEventListener('keydown', handler, { capture: true });
    return () => window.removeEventListener('keydown', handler, {
      capture: true,
    });
  }, [enabled]);

  const getItemProps = (index: number) => ({
    className: index === focusedIndex ? 'menu-focused' : '',
    onMouseEnter: () => setFocusedIndex(index),
    onClick: () => {
      const item = items[index];
      if (!item) return;
      if (item.kind === 'button') item.onActivate();
      else if (item.kind === 'keybind') item.onCapture();
    },
  });

  return { focusedIndex, getItemProps };
}
