import { useState, useCallback } from 'react';

interface ContextMenuState<T> {
  x: number;
  y: number;
  isOpen: boolean;
  data: T | null;
}

export function useContextMenu<T>() {
  const [state, setState] = useState<ContextMenuState<T>>({
    x: 0,
    y: 0,
    isOpen: false,
    data: null,
  });

  const open = useCallback((e: React.MouseEvent, data: T) => {
    e.preventDefault();
    setState({
      x: e.clientX,
      y: e.clientY,
      isOpen: true,
      data,
    });
  }, []);

  const close = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  return {
    ...state,
    open,
    close,
  };
}
