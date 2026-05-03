import { Component, type ReactNode, type ErrorInfo } from "react";
import { Film } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="min-h-[300px] flex flex-col items-center justify-center gap-4 p-8 text-center rounded-xl"
          style={{ background: "rgba(168,85,247,0.04)", border: "1px solid rgba(168,85,247,0.15)" }}>
          <div className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{ background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.25)" }}>
            <Film className="w-7 h-7 text-purple-400" />
          </div>
          <div>
            <p className="text-white font-bold text-lg mb-1">Something went wrong</p>
            <p className="text-white/40 text-sm max-w-xs">
              {this.state.error?.message ?? "An unexpected error occurred."}
            </p>
          </div>
          <button
            onClick={this.handleReset}
            className="px-5 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:scale-105"
            style={{ background: "rgba(168,85,247,0.2)", border: "1px solid rgba(168,85,247,0.3)" }}
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export class GlobalErrorBoundary extends Component<{ children: ReactNode }, State> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[GlobalErrorBoundary] Caught unhandled error:", error, info);
  }

  handleReload = () => {
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-6 p-8 text-center">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center"
            style={{ background: "rgba(168,85,247,0.1)", border: "2px solid rgba(168,85,247,0.3)", boxShadow: "0 0 40px rgba(168,85,247,0.2)" }}>
            <Film className="w-10 h-10 text-purple-400" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white mb-2">Oops!</h1>
            <p className="text-white/50 max-w-sm text-sm leading-relaxed">
              Something crashed unexpectedly. Your data is safe — this is just a display glitch.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:scale-105"
              style={{ background: "rgba(168,85,247,0.2)", border: "1px solid rgba(168,85,247,0.35)" }}
            >
              Try Again
            </button>
            <button
              onClick={this.handleReload}
              className="px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:scale-105"
              style={{ background: "linear-gradient(135deg,#a855f7,#7c3aed)", boxShadow: "0 0 20px rgba(168,85,247,0.4)" }}
            >
              Go Home
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
