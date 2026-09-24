# 前后端通信 / Frontend–Backend Communication

tauri-zero 的 React 与 Rust 通信分两类，开发时不要混淆：

| 类型 | 用途 | 前端入口 |
|------|------|----------|
| **Tauri IPC Command** | 调用本机 Rust 命令、访问数据库/文件/托盘等系统能力 | `src/api/ipc/client.ts` + `src/api/ipc/modules/` |
| **外部 HTTP** | 访问远程服务、网关或第三方 API | `src/api/http/request.ts` + `tauri-plugin-http` |

本文只描述 Tauri IPC Command 和 Tauri Event。外部 HTTP 请求见 `guide/frontend.md`。

## 目录隔离

```text
src/api/http/   # 外部网络请求：request<T>() / tauriFetch / HTTP 拦截器
src/api/ipc/    # 本地 Tauri IPC：ipcInvoke<T>() / Rust command 模块
```

两条通道必须保持隔离：

- `http/modules/*.ts` 只能依赖 `../request`；
- `ipc/modules/*.ts` 只能依赖 `../client`；
- HTTP API 不调用 Rust command，IPC API 不发起外部网络请求；
- HTTP 错误使用 `ApiError`，IPC 错误使用 `AppIpcError`。

## 通信链路

```text
React 组件 / Zustand store
  → src/api/ipc/modules/<domain>.ts
  → src/api/ipc/client.ts 的 ipcInvoke<T>()
  → @tauri-apps/api/core 的 invoke()
  → Rust #[tauri::command]
  → service / repo / platform
  → AppResult<T>
  → 成功值或 AppError 序列化结果
  → 前端 Promise
```

### 分层规则

1. 组件和 store **不直接导入 `invoke`**，也不手写命令字符串。
2. 所有 IPC 调用必须封装在 `src/api/ipc/modules/<domain>.ts`。
3. API 模块必须使用 `src/api/ipc/client.ts` 的 `ipcInvoke<T>()`，由它统一处理错误。
4. Rust 端 `command.rs` 只做参数提取和调用 service/platform，不承载业务逻辑。
5. SQL 留在 `repo.rs`，业务规则留在 `service.rs`，窗口/托盘等平台逻辑留在 `platform/`。
6. 外部 HTTP 使用 `request<T>()`，不要通过 Rust command 转发普通 HTTP。

## API 层

### 统一 IPC 入口

```ts
import { ipcInvoke } from "../api/ipc/client";

const content = await ipcInvoke<string>("read_text_file", {
  path: "/absolute/path/file.txt",
});
```

`src/api/ipc/client.ts` 是唯一允许直接导入 `@tauri-apps/api/core` 中 `invoke` 的运行时代码（测试可以 mock 该依赖）：

```ts
export async function ipcInvoke<T = unknown>(
  command: string,
  args?: Record<string, unknown>,
): Promise<T>
```

这样以后需要统一日志、超时、埋点或错误上报时，只需要改一处。

### 业务 API 模块

当前命令按领域封装在：

```text
src/api/
├── http/              # 外部网络请求，只走 tauri-plugin-http
│   ├── client.ts       # fetch 封装
│   ├── request.ts      # request<T>() + 拦截器 + ApiError
│   ├── types.ts        # HTTP 配置与响应类型
│   └── modules/
│       └── user.ts     # 远程用户接口
└── ipc/               # 本地 Tauri IPC，只走 Rust command
    ├── client.ts       # ipcInvoke<T>() + AppIpcError
    ├── client.test.ts  # IPC wrapper 测试
    ├── events.ts       # APP_EVENTS 事件名注册表 + payload 类型映射
    └── modules/
        ├── app.ts      # setCloseToTray
        ├── fs.ts       # readTextFile / writeTextFile / fileExists
        ├── note.ts     # Note CRUD
        ├── tray.ts     # TrayAction / trayAction
        └── window.ts   # 窗口管理：open/list/focus/hide/close/reveal
```

组件中的用法：

```tsx
import { listNotes, createNote } from "../api/ipc/modules/note";

const notes = await listNotes();
const note = await createNote("标题", "内容");
```

```tsx
import { setCloseToTray } from "../api/ipc/modules/app";

await setCloseToTray(true);
```

```tsx
import { trayAction, type TrayAction } from "../api/ipc/modules/tray";

await trayAction("settings");
```

## 统一 IPC 错误

Rust 端命令统一返回 `AppResult<T>`。失败时 `src-tauri/src/error.rs` 会把 `AppError` 序列化为：

```json
{
  "kind": "invalid_input",
  "code": "INVALID_INPUT",
  "message": "title is empty"
}
```

可用的 `kind` 与 `code`：

| kind | code | 场景 |
|------|------|------|
| `not_found` | `NOT_FOUND` | 数据不存在 |
| `invalid_input` | `INVALID_INPUT` | 参数或业务校验失败 |
| `internal` | `INTERNAL` | 未归类的内部错误 |
| `database` | `DATABASE` | SQLite / sqlx 错误 |
| `config` | `CONFIG` | 配置错误 |
| `unauthorized` | `UNAUTHORIZED` | 未授权 |

前端在 `src/api/ipc/client.ts` 中定义了对应类型：

```ts
import type { AppIpcErrorKind } from "../api/ipc/client";

export interface AppIpcErrorFields {
  readonly kind: AppIpcErrorKind;
  readonly code: string;
  readonly message: string;
  readonly cause?: unknown;
}
```

`ipcInvoke()` 会把两类异常统一转换为 `AppIpcError`：

- Rust 返回的 `{ kind, code, message }`：原样保留三个字段；
- 其他异常：包装为 `kind: "internal"` / `code: "INTERNAL"`，并把原始异常放在 `cause` 上。

处理错误时：

```tsx
import { isAppIpcError } from "../api/ipc/client";

try {
  await createNote("", "content");
} catch (error) {
  if (isAppIpcError(error)) {
    console.error(error.kind, error.code, error.message, error.cause);
  }
}
```

如果只是展示消息，可以直接使用 `error.message`。如果需要精确提示或重试策略，优先判断 `kind`，不要解析中文/英文文本。

## Rust 命令注册

所有命令统一注册在 `src-tauri/src/commands/mod.rs` 的 `all_handlers!` 宏中：

```rust
#[macro_export]
macro_rules! all_handlers {
    () => {
        tauri::generate_handler![
            commands::greet::greet,
            commands::app::increment_counter,

            domain::note::command::list_notes,
            domain::note::command::create_note,
            domain::note::command::update_note,
            domain::note::command::delete_note,

            platform::fs::read_text_file,
            platform::fs::write_text_file,
            platform::fs::file_exists,

            platform::tray::set_close_to_tray,
            platform::tray::tray_action,
        ]
    };
}
```

`lib.rs` 只调用 `crate::all_handlers!()`，新增命令时不需要修改应用入口。

## Tauri 事件

命令适合「前端请求 → 等待结果」的场景。窗口间通知和 Rust 主动通知使用 Tauri Event。

**所有自定义事件必须先注册到 `src/api/ipc/events.ts` 的 `APP_EVENTS`，并在 `AppEventPayloadMap` 中声明 payload 类型**；组件与 hook 不允许再手写事件字符串。

```ts
// src/api/ipc/events.ts
export const APP_EVENTS = {
  configChanged: "app://config-changed",
  trayNavigate: "tray://navigate",
  trayCheckUpdate: "tray://check-update",
  windowChanged: "window://changed",
  windowConfirmClose: "window://confirm-close",
} as const;
```

当前注册的事件：

| 常量 | 事件名 | 方向 | Payload | 用途 |
|------|--------|------|---------|------|
| `APP_EVENTS.configChanged` | `app://config-changed` | 任意窗口 → 全部窗口 | `{ theme, locale }` | 主题/语言跨窗口同步 |
| `APP_EVENTS.trayNavigate` | `tray://navigate` | 托盘弹窗/子窗口 → main | `"/settings"` | 让主窗口跳转路由 |
| `APP_EVENTS.trayCheckUpdate` | `tray://check-update` | Rust → main window | `null` | 触发更新检查 |
| `APP_EVENTS.windowChanged` | `window://changed` | Rust → 全部窗口 | `WindowSnapshot[]` | 窗口注册表快照推送 |
| `APP_EVENTS.windowConfirmClose` | `window://confirm-close` | Rust → 目标窗口 | window label | 请求前端确认关闭（有未保存内容） |

### 发送事件

```ts
import { emit } from "@tauri-apps/api/event";
import { APP_EVENTS } from "../api/ipc/events";

await emit(APP_EVENTS.configChanged, { theme, locale });
```

### 订阅事件

组件与 hook 中统一使用 `useTauriEvent`（`src/hooks/useTauriEvent.ts`），它内部处理了：

- handler 通过 ref 引用最新闭包，handler 身份变化不会反复订阅/退订；
- promise-then-cleanup 竞态：组件在 `listen()` resolve 前卸载时，unlisten 会被推迟到 promise 完成后执行，监听器不泄漏。

```tsx
import { APP_EVENTS } from "../api/ipc/events";
import { useTauriEvent } from "../hooks/useTauriEvent";

useTauriEvent(APP_EVENTS.trayNavigate, (event) => {
  void navigate(event.payload); // payload 类型由注册表自动推断为 string
});
```

需要控制「先 listen 成功、再拉取快照」这类顺序保证时（如 `useWindowEvents`），保留手写 `listen` 模式并注明原因。

## 新增 IPC Command

以新增 `settings` 域的 `list_settings` 为例：

### 1. Rust 端实现

在 `src-tauri/src/domain/settings/command.rs` 中定义薄命令：

```rust
#[tauri::command]
pub async fn list_settings(state: tauri::State<'_, SharedDbState>) -> AppResult<Vec<Setting>> {
    SettingService::list(&state.db).await
}
```

### 2. 注册命令

在 `src-tauri/src/commands/mod.rs` 的 `all_handlers!` 中追加：

```rust
domain::settings::command::list_settings,
```

### 3. 前端 API 模块

创建或更新 `src/api/ipc/modules/settings.ts`：

```ts
import { ipcInvoke } from "../client";

export interface Setting {
  id: number;
  key: string;
  value: string;
}

export function listSettings() {
  return ipcInvoke<Setting[]>("list_settings");
}
```

### 4. 组件调用

```tsx
import { listSettings } from "../api/ipc/modules/settings";

const settings = await listSettings();
```

## 约定清单

- 组件、store、hooks 不导入 `invoke`。
- `src/api/ipc/client.ts` 是唯一 IPC 调用出口；单元测试可以 mock `@tauri-apps/api/core`。
- 命令名、参数名和 DTO 字段必须与 Rust `#[tauri::command]` 及 serde 约定一致。
- Rust 命令返回 `AppResult<T>`，不要返回裸错误或 `Option` 语义模糊的值。
- 新命令必须注册到 `all_handlers!`。
- 新事件必须注册到 `src/api/ipc/events.ts` 的 `APP_EVENTS` 与 `AppEventPayloadMap`；组件内订阅统一使用 `useTauriEvent` hook，不手写事件字符串与 listen/cleanup 样板。
- 外部 HTTP 继续使用 `request<T>()`，不要伪装成 IPC command。
- 需要窗口权限的平台能力，在 `src-tauri/capabilities/default.json` 中显式声明。
