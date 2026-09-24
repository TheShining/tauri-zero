import { Component, type ReactNode } from "react";
import { Result, Button } from "antd";
import i18n from "./i18n";

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
      // class 组件无法用 hook，直接读 i18n 实例取文案（兜底页在崩溃时按当前语言渲染）。
      // A class component cannot use hooks, so read the i18n instance directly
      // (the fallback renders in the current language at crash time).
      return (
        <Result
          status="error"
          title={i18n.t("error.title")}
          subTitle={this.state.error?.message}
          extra={
            <Button type="primary" onClick={() => location.reload()}>
              {i18n.t("error.reload")}
            </Button>
          }
        />
      );
    }
    return this.props.children;
  }
}
