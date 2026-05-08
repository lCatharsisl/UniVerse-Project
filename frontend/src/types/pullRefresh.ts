export const PULL_REFRESH_EVENT = 'uv:pull-refresh-request';

export type PullRefreshRequestDetail = {
  path: string;
  enqueue: (task: Promise<unknown>) => void;
};
