# 系统能力

tauri-zero 已集成常用 Tauri 官方插件。IPC 相关能力封装在 `src/api/ipc/modules/`，官方插件统一封装在 `src/api/plugins/`；业务代码禁止直接 import `@tauri-apps/plugin-*`（eslint `no-restricted-imports` 已固化，`src/api/` 豁免）。

## 文件系统

文件读写通过 Rust 命令实现（`src-tauri/src/platform/fs.rs`），前端封装在 `src/api/ipc/modules/fs.ts`：

```ts
import { readTextFile, writeTextFile, fileExists } from "../api/ipc/modules/fs";

const content = await readTextFile("/absolute/path/file.txt");
await writeTextFile("/absolute/path/file.txt", "hello");
const exists = await fileExists("/absolute/path/file.txt");
```

> 路径必须是绝对路径，命令层会校验。

## 对话框

```ts
import { pickFile, pickSavePath } from "../api/plugins/dialog";

const file = await pickFile();
const savePath = await pickSavePath("default.txt");
```

## 通知

```ts
import { notify } from "../api/plugins/notification";

await notify("标题", "内容");
```

## 剪贴板

```ts
import { copyText, readClipboard } from "../api/plugins/clipboard";

await copyText("复制内容");
const text = await readClipboard();
```

## 打开外部链接 / Shell

```ts
import { openExternal } from "../api/plugins/shell";

await openExternal("https://example.com");
```

## 自动更新

使用 `tauri-plugin-updater`，分三层：插件封装 `src/api/plugins/updater.ts`，状态编排 hook `src/hooks/useUpdater.ts`，设置页 UI `src/pages/settings/UpdateChecker.tsx`。

```tsx
import { useUpdater } from "../hooks/useUpdater";

const { busy, phase, update, progress, error, checkForUpdates, downloadAndInstall } = useUpdater();
```

更新源配置在 `src-tauri/tauri.conf.json` 的 `plugins.updater.endpoints`，签名公钥为 `plugins.updater.pubkey`。

> 私钥 `src-tauri/updater.key` 已被 `.gitignore` 忽略，请妥善保管；CI 通过 `TAURI_SIGNING_PRIVATE_KEY` 注入。

`phase` 表示检查、无更新、可更新、下载、安装、被未保存内容阻止、错误和重启状态；`progress` 包含已下载字节和可选总字节，`error` 包含失败阶段和原始消息。设置页已经接入中英反馈与进度，无总大小时显示已下载字节。

同窗口的 hook 实例共享状态与同步防重。支持 Web Locks 的同源 WebView 还会互斥检查、下载和安装；不支持时仅保证同窗口防重。锁被其他窗口占用时检查返回 `undefined`，无更新返回 `null`，调用方应区分这两种结果；检查失败会抛错，由入口呈现反馈。

托盘的「检查更新」通过 `openSettingsWindow("update")` 打开或聚焦设置更新页，由设置 WebView 自行检查和持有插件资源。一次性非敏感 localStorage token 保留新窗口就绪前的请求，已打开窗口通过 storage 事件接收；浏览器同页降级另发 DOM 通知。不会跨窗口传递 `Update` 资源，也不要求用户再手动检查一次。

下载安装前和下载完成后，都会调用后端 `window_list` 读取 dirty 状态。有未保存内容或无法读取状态时不安装；保存后重试可以复用已下载包。下载/安装失败释放资源并在重试时重新检查，重启失败只重试重启。

新增编辑窗口必须同步 `setWindowDirty` 才能参与此保护。两次读取是状态快照，不会原子冻结其他窗口编辑；接入后需按自己的编辑模式完成多窗口升级验收。发布与旧 endpoint 迁移步骤见 [CI/CD 与自动更新发布](./ci-cd.md)。
