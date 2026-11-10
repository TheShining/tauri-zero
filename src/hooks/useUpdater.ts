import { useSyncExternalStore } from "react";
import { checkUpdate, relaunchApp } from "../api/plugins/updater";
import { listWindows } from "../api/ipc/modules/window";

type Update = NonNullable<Awaited<ReturnType<typeof checkUpdate>>>;
type Stage = "check" | "download" | "install" | "windows" | "restart";
type Phase =
  | "idle"
  | "checking"
  | "available"
  | "current"
  | "downloading"
  | "installing"
  | "blocked"
  | "busy"
  | "error"
  | "installed";
interface UpdaterState {
  phase: Phase;
  busy: boolean;
  update: Pick<Update, "version" | "body"> | null;
  progress: { downloaded: number; total?: number };
  error: { stage: Stage; message: string } | null;
}

let state: UpdaterState = {
  phase: "idle",
  busy: false,
  update: null,
  progress: { downloaded: 0 },
  error: null,
};
let candidate: Update | null = null;
let downloaded = false;
let installed = false;
let running = false;
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
const getSnapshot = () => state;
function publish(patch: Partial<UpdaterState>) {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
}

async function disposeCandidate() {
  const previous = candidate;
  candidate = null;
  downloaded = false;
  // 失败重试重新获取插件资源，清理异常不覆盖原始错误。
  // Obtain fresh plugin resources on retry; cleanup errors must preserve the original failure.
  await previous?.close().catch(() => undefined);
}

// 同窗口共享状态和同步门闩；支持 Web Locks 的同源窗口还共享整个操作的互斥锁。
// Share state and a synchronous guard in this window; same-origin windows also share a Web Lock when supported.
async function exclusively<T>(operation: () => Promise<T>): Promise<T | undefined> {
  if (running) return;
  running = true;
  publish({ busy: true });
  try {
    if (navigator.locks) {
      return await navigator.locks.request(
        "tauri-zero-updater",
        { ifAvailable: true },
        async (lock) => {
          if (!lock) {
            publish({ phase: "busy", error: null });
            return;
          }
          return operation();
        },
      );
    }
    return await operation();
  } finally {
    running = false;
    publish({ busy: false });
  }
}

function fail(stage: Stage, error: unknown) {
  publish({
    phase: "error",
    error: { stage, message: error instanceof Error ? error.message : String(error) },
  });
}

async function checkForUpdates() {
  try {
    return await exclusively(async () => {
      publish({ phase: "checking", error: null, update: null, progress: { downloaded: 0 } });
      await disposeCandidate();
      installed = false;
      candidate = await checkUpdate();
      publish({ phase: candidate ? "available" : "current", update: candidate });
      return candidate;
    });
  } catch (error) {
    fail("check", error);
    throw error;
  }
}

async function windowsAreSaved() {
  if ((await listWindows()).some((window) => window.dirty)) {
    publish({ phase: "blocked", error: null });
    return false;
  }
  return true;
}

async function downloadAndInstall() {
  if (!state.update && !installed) return;
  try {
    await exclusively(async () => {
      let stage: Stage = "windows";
      publish({ error: null });
      try {
        if (!(await windowsAreSaved())) return;
        if (!installed) {
          if (!candidate) {
            stage = "check";
            publish({ phase: "checking", progress: { downloaded: 0 } });
            candidate = await checkUpdate();
            publish({ update: candidate });
            if (!candidate) {
              publish({ phase: "current" });
              return;
            }
          }
          if (!downloaded) {
            stage = "download";
            publish({ phase: "downloading", progress: { downloaded: 0 } });
            await candidate.download((event) => {
              if (event.event === "Started") {
                publish({ progress: { downloaded: 0, total: event.data.contentLength } });
              } else if (event.event === "Progress") {
                publish({
                  progress: {
                    ...state.progress,
                    downloaded: state.progress.downloaded + event.data.chunkLength,
                  },
                });
              }
            });
            downloaded = true;
          }
          // 下载期间用户可能继续编辑；安装前重新读取后端权威状态，读取失败时停止安装。
          // Users may edit during download; reread authoritative backend state before installation and stop if it fails.
          stage = "windows";
          if (!(await windowsAreSaved())) return;
          stage = "install";
          publish({ phase: "installing" });
          // Windows 成功启动安装器后可能直接退出；只有 install 返回后才请求重启。
          // Windows may exit after launching its installer; request a relaunch only if install returns.
          await candidate.install();
          installed = true;
          await disposeCandidate();
        }
        stage = "restart";
        publish({ phase: "installed" });
        await relaunchApp();
      } catch (error) {
        if (stage === "download" || stage === "install") await disposeCandidate();
        fail(stage, error);
      }
    });
  } catch (error) {
    fail("install", error);
  }
}

/** 更新流程唯一入口；设置与托盘复用状态，通知由调用方按入口呈现。 / Single updater entry; settings and tray share state and present feedback at their own entry point. */
export function useUpdater() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot);
  return {
    ...snapshot,
    checking: snapshot.phase === "checking",
    checkForUpdates,
    downloadAndInstall,
  };
}
