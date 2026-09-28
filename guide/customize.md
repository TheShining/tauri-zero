# 从 demo 到自己的业务 / From Demo to Your Business

tauri-zero 的内置 demo 是一个**真实的便签小应用**（Zero Notes），不是功能清单页：
笔记列表（主窗口）、独立编辑窗口、托盘"新建笔记"，把路由、IPC、SQLite、多窗口、
dirty 关闭拦截、跨窗口配置广播等能力串进了真实使用场景。

tauri-zero ships a real mini notes app as its demo instead of a feature checklist:
a note list (main window), standalone editor windows, and a tray "new note" action that
string routing, IPC, SQLite, multi-window, dirty-close interception, and cross-window
config broadcasting into real usage scenarios.

## 哪些属于 demo，哪些属于脚手架 / Demo vs. Scaffold

接入时只需要替换 demo 部分，脚手架能力原样保留。

When integrating, you only replace the demo parts; all scaffold capabilities stay as-is.

| 属于 demo（可删可换） | 属于脚手架（保留） |
|----------------------|-------------------|
| `src/pages/notes/`（列表 + 编辑器 + demo 图标） | `src/router/`、`src/layouts/`、`src/stores/` |
| `src/utils/notes.ts`（新建/时间格式化） | `src/api/ipc/client.ts`、`src/api/http/`、`src/api/plugins/` |
| `src/api/ipc/modules/note.ts` | `src/api/ipc/modules/window.ts`、`tray.ts`、`app.ts`、`fs.ts` |
| `src-tauri/src/domain/note/` | `src-tauri/src/platform/`（window/tray/fs/dwm）、`state/`、`db.rs`、`error.rs` |
| `src-tauri/migrations/` 中的 notes 表迁移 | `commands/mod.rs` 的 `all_handlers!` 注册机制 |
| `locales` 中的 `notes.*` / `editor.*` 词条 | i18n 机制本身、`useConfigSync` 跨窗口同步 |

### 值得借鉴的 demo 模式 / Patterns worth reusing from the demo

- **dirty 派生**：编辑器把后端返回的 note 作为"已保存快照"，dirty = 编辑态 ≠ 快照，
  然后同步给后端窗口注册表，关闭拦截全自动发生。
- **跨窗口刷新**：编辑窗口保存后 `emit("note://changed")`，列表页用 `useTauriEvent` 刷新，
  不依赖跨窗口共享 store。
- **复用窗口去重**：`openWindow({ kind: "document", contextId })` 在目标已打开时自动聚焦，
  列表点击不需要判断窗口是否存在。

- **Dirty by derivation**: the editor treats the loaded note as the "saved snapshot", computes
  dirty as editing-state ≠ snapshot, then syncs it to the backend window registry, so close
  interception happens automatically.
- **Cross-window refresh**: after saving, the editor emits `note://changed` and the list page
  refreshes via `useTauriEvent`, with no cross-window shared store.
- **Window dedupe**: `openWindow({ kind: "document", contextId })` focuses the existing window
  when the target is already open, so list clicks never need to check for an open window.

## 替换为你自己的业务域 / Replace with your own domain

以把"笔记"换成"待办"为例，步骤如下（细节见 [rust.md](./rust.md) 与 [frontend.md](./frontend.md)）：

Using "todo" instead of "note" as an example (see [rust.md](./rust.md) and [frontend.md](./frontend.md) for details):

1. **新迁移**：在 `src-tauri/migrations/` 添加建表 SQL（时间戳前缀递增），可删除 notes 初始化迁移。
2. **新领域**：复制 `src-tauri/src/domain/note/` 为 `domain/todo/`，改模型/repo/service/command；
   在 `domain/mod.rs` 声明，在 `commands/mod.rs` 的 `all_handlers!` 里注册命令、移除 note 命令。
3. **前端 API**：复制 `src/api/ipc/modules/note.ts` 为 `todo.ts`，改命令名与类型。
4. **页面**：新建 `src/pages/todos/` 页面并注册路由；删除 `src/pages/notes/`、`src/utils/notes.ts`。
5. **入口接线**：托盘的"新建笔记"项改为你的业务动作（见 [system-tray.md](./system-tray.md)），
   或直接删除 `TrayAction::NewNote` 与对应菜单项。
6. **清理**：删掉 `locales` 中 `notes.*` / `editor.*` 词条，替换为你的业务文案。

> 提示：先跑通 `pnpm tauri:dev` 确认你的新域可用，再删除 note 相关代码；
> note 域本身就是一个"端到端最小闭环"的参考实现。
>
> Tip: verify your new domain works with `pnpm tauri:dev` before deleting the note code;
> the note domain is itself a reference implementation of a minimal end-to-end loop.
