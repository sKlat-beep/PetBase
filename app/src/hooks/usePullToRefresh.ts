import { useRef, useCallback, useEffect } from 'react';

interface Options {
  onRefresh: () => Promise<void>;
  threshold?: number;
  containerRef: React.RefObject<HTMLElement | null>;
}

export function usePullToRefresh({ onRefresh, threshold = 80, containerRef }: Options) {
  const startY = useRef(0);
  const pulling = useRef(false);
  const isRefreshing = useRef(false);

  const onTouchStart = useCallback((e: TouchEvent) => {
    const el = containerRef.current;
    if (!el || el.scrollTop > 0) return;
    startY.current = e.touches[0].clientY;
    pulling.current = true;
  }, [containerRef]);

  const onTouchMove = useCallback((e: TouchEvent) => {
    if (!pulling.current || isRefreshing.current) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta > 0) e.preventDefault();
  }, []);

  const onTouchEnd = useCallback(async (e: TouchEvent) => {
    if (!pulling.current) return;
    pulling.current = false;
    const delta = e.changedTouches[0].clientY - startY.current;
    if (delta >= threshold && !isRefreshing.current) {
      isRefreshing.current = true;
      await onRefresh();
      isRefreshing.current = false;
    }
  }, [onRefresh, threshold]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [onTouchStart, onTouchMove, onTouchEnd, containerRef]);
}
