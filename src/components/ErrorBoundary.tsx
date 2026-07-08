import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
  info: ErrorInfo | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, info: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary] captured error:", error, info);
    this.setState({ info });
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background text-foreground p-6">
        <div className="max-w-md w-full rounded-xl border border-border bg-card p-6 shadow-lg">
          <h1 className="font-display text-xl font-semibold mb-2">
            Ocurrió un error inesperado
          </h1>
          <p className="text-sm text-muted-foreground mb-4">
            La aplicación se recuperó de un fallo. Por favor recarga para continuar.
          </p>
          <button
            onClick={this.handleReload}
            className="w-full rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90 transition"
          >
            Recargar
          </button>
          <details className="mt-4 text-xs text-muted-foreground">
            <summary className="cursor-pointer">Detalles técnicos</summary>
            <pre className="mt-2 whitespace-pre-wrap break-words">
              {this.state.error.message}
              {"\n"}
              {this.state.error.stack}
            </pre>
          </details>
        </div>
      </div>
    );
  }
}
