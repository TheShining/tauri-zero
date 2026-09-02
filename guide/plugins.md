# 系统能力

tauri-zero 已集成常用 Tauri 官方插件，前端封装在 `src/utils/`。

## 文件系统

文件读写通过 Rust 命令实现（`src-tauri/src/commands/fs.rs`），前端封装在 `src/utils/fs.ts`：

```ts
import { readTextFile, writeTextFile, fileExists } from "../utils/fs";

const content = await readTextFile("/absolute/path/file.txt");
await writeTextFile("/absolute/path/file.txt", "hello");
const exists = await fileExists("/absolute/path/file.txt");
```

> 路径必须是绝对路径，命令层会校验。

## 对话框

```ts
import { pickFile, pickSavePath } from "../utils/system";

const file = await pickFile();
const savePath = await pickSavePath("default.txt");
```

## 通知

```ts
import { notify } from "../utils/system";

await notify("标题", "内容");
```

## 剪贴板

```ts
import { copyText, readClipboard } from "../utils/system";

await copyText("复制内容");
const text = await readClipboard();
```

## 打开外部链接 / Shell

```ts
import { openExternal } from "../utils/system";

await openExternal("https://example.com");
```

## 自动更新

使用 `tauri-plugin-updater`，前端封装在 `src/hooks/useUpdater.ts` 与 `src/components/UpdateChecker.tsx`。

```tsx
import { useUpdater } from "../hooks/useUpdater";

const { checking, update, checkForUpdates, downloadAndInstall } = useUpdater();
```

更新源配置在 `src-tauri/tauri.conf.json` 的 `plugins.updater.endpoints`，签名公钥为 `plugins.updater.pubkey`。

> 私钥 `src-tauri/updater.key` 已被 `.gitignore` 忽略，请妥善保管；CI 通过 `TAURI_SIGNING_PRIVATE_KEY` 注入。