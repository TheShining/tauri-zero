# CI/CD 与发布

tauri-zero 用三个 GitHub Actions 工作流串起「质量门禁 → 自动发版 → 构建分发」的完整链路。

## 三个工作流的分工

| 工作流 | 文件 | 触发时机 | 职责 |
| --- | --- | --- | --- |
| CI | `.github/workflows/ci.yml` | PR 与 push 到 `main` | 质量门禁：lint / typecheck / test / Rust 检查 |
| release-please | `.github/workflows/release-please.yml` | push 到 `main` | 自动发版：算版本号、生成 changelog、创建 release PR 与 tag |
| release | `.github/workflows/release.yml` | push `v*` tag | 构建分发：三平台打包、签名、上传产物与更新清单 |

三者关系：

```text
提交(Conventional Commits) → push main
        │
        ├─ CI：跑质量门禁（不打包）
        │
        └─ release-please：生成 release PR
                 │
                 └─ 合并 release PR → 打 tag（如 v0.1.1）+ 创建 GitHub Release
                          │
                          └─ release：三平台构建 + 签名 + 上传产物/更新清单
                                   │
                                   └─ 客户端 UpdateChecker 拉取清单 → 自动更新
```

### CI（质量门禁）

`.github/workflows/ci.yml` 在 PR 与 push 到 `main` 时，于 ubuntu / windows / macos 三平台执行：

```text
lint → typecheck → test → rust:check → rust:clippy → rust:test
```

它只做检查，不执行 `tauri build`，因此不需要签名私钥。

### release-please（自动发版）

`.github/workflows/release-please.yml` 使用 `googleapis/release-please-action`，基于 Conventional Commits 自动：

1. 计算下一个版本号：`feat` → minor，`fix` → patch，`BREAKING CHANGE` → major。
2. 生成/更新 `CHANGELOG.md`。
3. 创建 release PR，同步更新 `package.json`、`src-tauri/tauri.conf.json`、`src-tauri/Cargo.toml` 的版本号。
4. 合并 release PR 后，自动打 `v*` tag 并创建 GitHub Release。

> 版本号同步规则见 `release-please-config.json` 与 `.release-please-manifest.json`。

### release（构建分发）

`.github/workflows/release.yml` 在推送 `v*` tag 时触发，三平台构建并上传产物（含 updater 的 `.json` 清单）。

## 自动更新签名密钥

Tauri 的自动更新（updater）使用 minisign 签名，需要一对密钥：

- **私钥** `src-tauri/updater.key`：给更新产物签名，**必须保密**，已被 `.gitignore` 忽略。
- **公钥** `src-tauri/updater.key.pub`：随应用分发，客户端用它校验签名，可提交到仓库。

### 生成密钥

在项目根目录执行：

```bash
pnpm tauri signer generate -w src-tauri/updater.key
```

- `-w` 指定私钥输出路径，同时会在同目录生成 `updater.key.pub` 公钥。
- 命令会询问是否设置密码；本地/CI 无密码场景直接回车跳过即可。
- 若已存在密钥，加 `-f` 强制覆盖（会作废旧密钥，慎用）。

生成后：

1. 把公钥内容填入 `src-tauri/tauri.conf.json` 的 `plugins.updater.pubkey`（`updater.key.pub` 文件内容即该值）。
2. 妥善保管私钥，不要提交到仓库。

### 配置 GitHub Actions

1. 打开 GitHub 仓库 → **Settings → Secrets and variables → Actions → New repository secret**。
2. 新建名为 `TAURI_SIGNING_PRIVATE_KEY` 的 secret。
3. 把 `src-tauri/updater.key` 的**完整内容**（一整行 base64 字符串）粘贴为 secret 值。
4. `release.yml` 已通过环境变量注入：

   ```yaml
   env:
     TAURI_SIGNING_PRIVATE_KEY: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY }}
   ```

> 若生成密钥时设置了密码，还需额外配置 `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` secret。

### 本地打包

本地执行 `pnpm tauri build` 同样需要私钥，否则会报 `A public key has been found, but no private key`。

```powershell
# PowerShell
$env:TAURI_SIGNING_PRIVATE_KEY = (Get-Content src-tauri/updater.key -Raw).Trim()
pnpm tauri build
```

```bash
# bash / zsh
export TAURI_SIGNING_PRIVATE_KEY="$(cat src-tauri/updater.key)"
pnpm tauri build
```

## 自动更新流程

1. 合并 release PR，release-please 打 tag。
2. release workflow 构建并上传产物 + 更新清单。
3. 客户端 `UpdateChecker` 检查更新并下载安装。
