import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

/**
 * Catches render-time crashes so a thrown error shows a friendly, recoverable
 * screen instead of unmounting the whole tree and leaving a blank green page.
 * Without this, any uncaught error anywhere in the app = silent green screen.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // keep a breadcrumb in the console for debugging deployed builds
    console.error("TurtWatch crashed:", error, info.componentStack);
  }

  private reload = () => {
    this.setState({ error: null });
    window.location.reload();
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="app">
        <div
          className="screen center stack"
          style={{ alignItems: "center", justifyContent: "center", minHeight: "80vh", textAlign: "center", gap: 14 }}
          role="alert"
        >
          <div style={{ fontSize: 56 }} aria-hidden>🐢💤</div>
          <h1 style={{ margin: 0 }}>Our turtle tripped</h1>
          <p className="muted" style={{ marginTop: 0, maxWidth: 320 }}>
            Something went wrong loading your pond. Your turtles are safe — let's try again.
          </p>
          <button className="pill" onClick={this.reload}>Reload TurtWatch</button>
          <details style={{ maxWidth: 340, textAlign: "left", opacity: 0.7 }}>
            <summary style={{ cursor: "pointer", fontSize: 13 }}>Details</summary>
            <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: 11, marginTop: 8 }}>
              {error.message}
            </pre>
          </details>
        </div>
      </div>
    );
  }
}
