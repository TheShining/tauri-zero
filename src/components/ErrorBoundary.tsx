import { Component, type ReactNode } from "react";
import { Result, Button } from "antd";

interface Props {
  children: ReactNode;
}
interface State {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: unknown) {
    console.error("ErrorBoundary caught:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Result
          status="error"
          title="应用出错了"
          subTitle={this.state.error?.message}
          extra={
            <Button type="primary" onClick={() => location.reload()}>
              刷新
            </Button>
          }
        />
      );
    }
    return this.props.children;
  }
}
