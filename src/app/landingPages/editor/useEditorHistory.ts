// useEditorHistory — a tiny undo/redo snapshot stack over an arbitrary
// document value (used by the editor for the whole LandingPage document).
// Keeps a simple array of snapshots plus a cursor index; `set()` truncates
// any "future" (redo) snapshots before pushing, matching standard undo/redo
// semantics used by most editors.
import { useCallback, useRef, useState } from 'react';

const MAX_HISTORY = 100;

export interface EditorHistory<T> {
  value: T;
  /** Push a new value onto the stack (becomes the new current state). */
  set: (next: T) => void;
  /** Replace the current snapshot in place without creating a new undo step
   * (useful for continuous edits you want to coalesce, e.g. text typing). */
  replace: (next: T) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export function useEditorHistory<T>(initial: T): EditorHistory<T> {
  const stackRef = useRef<T[]>([initial]);
  const cursorRef = useRef(0);
  // Re-render trigger — the stack/cursor live in refs so `set` can safely
  // truncate + push without stale-closure bugs, but we still need React to
  // re-render when they change.
  const [, forceRender] = useState(0);
  const bump = () => forceRender((n) => n + 1);

  const set = useCallback((next: T) => {
    const stack = stackRef.current;
    const cursor = cursorRef.current;
    const truncated = stack.slice(0, cursor + 1);
    truncated.push(next);
    // Cap history length so long editing sessions don't grow memory unbounded.
    const overflow = truncated.length - MAX_HISTORY;
    if (overflow > 0) truncated.splice(0, overflow);
    stackRef.current = truncated;
    cursorRef.current = truncated.length - 1;
    bump();
  }, []);

  const replace = useCallback((next: T) => {
    const stack = stackRef.current;
    const cursor = cursorRef.current;
    stack[cursor] = next;
    bump();
  }, []);

  const undo = useCallback(() => {
    if (cursorRef.current <= 0) return;
    cursorRef.current -= 1;
    bump();
  }, []);

  const redo = useCallback(() => {
    if (cursorRef.current >= stackRef.current.length - 1) return;
    cursorRef.current += 1;
    bump();
  }, []);

  return {
    value: stackRef.current[cursorRef.current],
    set,
    replace,
    undo,
    redo,
    canUndo: cursorRef.current > 0,
    canRedo: cursorRef.current < stackRef.current.length - 1,
  };
}
