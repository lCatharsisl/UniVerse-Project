import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = { children: ReactNode };

type State = { error: Error | null };

export class RootErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[RootErrorBoundary]', error, info.componentStack);
  }

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    const isDev = import.meta.env.DEV;
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-4 bg-slate-950 px-6 text-center text-white">
        <p className="text-lg font-black">UniVerse yüklenirken bir hata oluştu.</p>
        {isDev ? (
          <pre className="max-h-[40vh] w-full max-w-lg overflow-auto rounded-xl bg-black/50 p-4 text-left text-xs text-red-200">
            {error.message}
          </pre>
        ) : null}
        <button
          type="button"
          className="rounded-xl bg-white px-5 py-3 text-sm font-black text-slate-900"
          onClick={() => window.location.reload()}
        >
          Yenile
        </button>
      </div>
    );
  }
}
