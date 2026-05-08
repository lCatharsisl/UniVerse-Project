import { useEffect, useRef, useState } from 'react';

type PullToRefreshOptions = {
  enabled?: boolean;
  maxPull?: number;
  threshold?: number;
  activationDistance?: number;
  onRefresh: () => Promise<void> | void;
};

type PullToRefreshState = {
  isPulling: boolean;
  isReady: boolean;
  isRefreshing: boolean;
  pullDistance: number;
};

export function usePullToRefresh(
  container: HTMLElement | null,
  { enabled = true, maxPull = 108, threshold = 72, activationDistance = 18, onRefresh }: PullToRefreshOptions,
): PullToRefreshState {
  const pullDistanceRef = useRef(0);
  const onRefreshRef = useRef(onRefresh);
  const refreshingRef = useRef(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    if (!container || !enabled) {
      setPullDistance(0);
      setIsPulling(false);
      setIsReady(false);
      setIsRefreshing(false);
      return;
    }

    let startY = 0;
    let startX = 0;
    let dragging = false;
    let verticalLock = false;
    let armedAtTop = false;

    const isAtAbsoluteTop = () => container.scrollTop <= 2;

    const resetVisualState = () => {
      pullDistanceRef.current = 0;
      setPullDistance(0);
      setIsPulling(false);
      setIsReady(false);
    };

    const reset = () => {
      dragging = false;
      verticalLock = false;
      armedAtTop = false;
      resetVisualState();
    };

    const shouldIgnoreTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false;
      return Boolean(target.closest('input, textarea, select, button, a, [data-no-pull-refresh="true"]'));
    };

    const hasOwnScrollableAncestor = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false;

      let current: HTMLElement | null = target;
      while (current && current !== container) {
        const style = window.getComputedStyle(current);
        const overflowY = style.overflowY;
        const canScroll =
          (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') &&
          current.scrollHeight > current.clientHeight + 1;

        if (canScroll) {
          return current.scrollTop > 0;
        }

        current = current.parentElement;
      }

      return false;
    };

    const onTouchStart = (event: TouchEvent) => {
      if (refreshingRef.current) return;
      if (!isAtAbsoluteTop()) return;
      if (shouldIgnoreTarget(event.target)) return;
      if (hasOwnScrollableAncestor(event.target)) return;
      startX = event.touches[0]?.clientX ?? 0;
      startY = event.touches[0]?.clientY ?? 0;
      dragging = true;
      armedAtTop = true;
    };

    const onTouchMove = (event: TouchEvent) => {
      if (!dragging || refreshingRef.current || !armedAtTop) return;
      if (!isAtAbsoluteTop() || hasOwnScrollableAncestor(event.target)) {
        reset();
        return;
      }

      const currentY = event.touches[0]?.clientY ?? 0;
      const currentX = event.touches[0]?.clientX ?? 0;
      const delta = currentY - startY;
      const deltaX = currentX - startX;

      if (delta <= 0) {
        resetVisualState();
        return;
      }

      if (!verticalLock) {
        if (Math.abs(deltaX) > Math.abs(delta) * 0.7) {
          reset();
          return;
        }
        if (delta < activationDistance) return;
        verticalLock = true;
      }

      const effectiveDelta = Math.max(0, delta - activationDistance);
      const damped = Math.min(maxPull, Math.pow(effectiveDelta, 0.94) * 0.84);
      pullDistanceRef.current = damped;
      setIsPulling(true);
      setPullDistance(damped);
      setIsReady(damped >= threshold);

      event.preventDefault();
    };

    const onTouchEnd = () => {
      if (!dragging || refreshingRef.current) {
        reset();
        return;
      }

      const shouldRefresh = pullDistanceRef.current >= threshold;
      reset();

      if (!shouldRefresh) return;

      refreshingRef.current = true;
      setIsRefreshing(true);
      Promise.resolve(onRefreshRef.current()).finally(() => {
        refreshingRef.current = false;
        setIsRefreshing(false);
      });
    };

    container.addEventListener('touchstart', onTouchStart, { passive: true });
    container.addEventListener('touchmove', onTouchMove, { passive: false });
    container.addEventListener('touchend', onTouchEnd);
    container.addEventListener('touchcancel', onTouchEnd);

    return () => {
      container.removeEventListener('touchstart', onTouchStart);
      container.removeEventListener('touchmove', onTouchMove);
      container.removeEventListener('touchend', onTouchEnd);
      container.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [activationDistance, container, enabled, maxPull, onRefresh, threshold]);

  return { isPulling, isReady, isRefreshing, pullDistance };
}
