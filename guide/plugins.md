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

const { checking, update, checkForUpdates, downloadAndInstall } = useUpdater();
```

更新源配置在 `src-tauri/tauri.conf.json` 的 `plugins.updater.endpoints`，签名公钥为 `plugins.updater.pubkey`。

> 私钥 `src-tauri/updater.key` 已被 `.gitignore` 忽略，请妥善保管；CI 通过 `TAURI_SIGNING_PRIVATE_KEY` 注入。
