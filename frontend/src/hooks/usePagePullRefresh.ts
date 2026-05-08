import { useEffect, useRef } from 'react';
import { PULL_REFRESH_EVENT, type PullRefreshRequestDetail } from '../types/pullRefresh';

export function usePagePullRefresh(
  pathMatch: (path: string) => boolean,
  onRefresh: () => Promise<void> | void,
) {
  const onRefreshRef = useRef(onRefresh);
  useEffect(() => { onRefreshRef.current = onRefresh; });

  useEffect(() => {
    const handler = (event: Event) => {
      const e = event as CustomEvent<PullRefreshRequestDetail>;
      if (!pathMatch(e.detail?.path ?? '')) return;
      e.preventDefault();
      e.detail.enqueue(Promise.resolve(onRefreshRef.current()));
    };
    window.addEventListener(PULL_REFRESH_EVENT, handler);
    return () => window.removeEventListener(PULL_REFRESH_EVENT, handler);
  }, [pathMatch]);
}
