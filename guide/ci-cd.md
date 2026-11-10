# CI/CD 与自动更新发布 / CI/CD and Updater Releases

tauri-zero 使用 GitHub Releases 分发安装包与更新清单。接入自己的项目时，先完成仓库地址与签名身份配置，再发布第一个版本。

## 接入准备 / Integration setup

1. 修改 `src-tauri/tauri.conf.json` 中的应用名、identifier，以及 `plugins.updater.endpoints` 的仓库地址。更新地址使用 `https://github.com/<owner>/<repo>/releases/latest/download/latest.json`。
2. 配置自己的 updater 密钥对和公钥（见下文）。已有用户的应用必须沿用其已安装版本信任的公钥。
3. 在 GitHub 仓库配置以下 Actions secrets：

| Secret | 用途 |
| --- | --- |
| `RELEASE_PLEASE_TOKEN` | 创建 release PR、草稿和 tag；需有仓库 Contents、Pull requests 写权限，并能触发后续工作流 |
| `TAURI_SIGNING_PRIVATE_KEY` | updater 签名私钥完整内容；必填，发布前检查非空 |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | 私钥密码；仅有密码的私钥需要 |

构建与上传使用工作流自带的 `GITHUB_TOKEN`，权限限制为所需 job 的 Contents 写权限。release-please 使用 PAT 或相应 GitHub App token：普通 `GITHUB_TOKEN` 产生的 tag push 不会自动触发另一个工作流。

updater 签名用于校验更新包，Windows 代码签名、macOS 签名/公证属于各平台的分发要求，需要接入开发者另行配置。

## 发布流程 / Release flow

```text
push main → CI 检查 + release-please 维护 release PR
合并 release PR → 版本文件同步 + vX.Y.Z tag + 草稿 Release
               → prepare：版本/私钥检查，定位草稿与提交 SHA
               → build：四目标并行构建、签名、上传草稿资产
               → publish：下载资产并验签，生成五份更新清单
                          全部成功后发布并设为 latest
```

| 工作流 | 触发 | 职责 |
| --- | --- | --- |
| `.github/workflows/ci.yml` | PR、push main | 前端、发布脚本与 Rust 检查；不需要签名私钥 |
| `.github/workflows/release-please.yml` | push main | 更新说明、release PR 与草稿/tag |
| `.github/workflows/release.yml` | push `v*` tag、手动指定 tag | 验证、构建、验签、清单与正式发布 |

`release-please-config.json` 启用 `draft` 与 `force-tag-creation`：草稿尚未公开时就创建 tag，既能触发构建，也能让 release-please 正确识别历史版本。

只接受稳定 `vX.Y.Z` tag。`package.json`、`src-tauri/Cargo.toml`、`src-tauri/tauri.conf.json` 和 `.release-please-manifest.json` 的版本必须与 tag 一致。beta/灰度渠道不在当前工作流支持范围内。

## 构建目标与清单 / Targets and manifests

| 更新目标 | Rust target | 更新包 |
| --- | --- | --- |
| `windows-x86_64` | `x86_64-pc-windows-msvc` | NSIS `.exe` |
| `linux-x86_64` | `x86_64-unknown-linux-gnu` | `.AppImage` |
| `darwin-x86_64` | `x86_64-apple-darwin` | `.app.tar.gz` |
| `darwin-aarch64` | `aarch64-apple-darwin` | `.app.tar.gz` |

同时提供 MSI、DEB、DMG 手动安装包。Debian 安装版使用 `linux-x86_64-deb` 条目中的已签名 `.deb` 升级，AppImage 使用通用 `linux-x86_64` 条目，避免混用包格式。Linux 使用 Ubuntu 22.04 构建；目标系统仍须满足 Tauri/WebKitGTK 等运行依赖。

官方 `tauri-apps/tauri-action` 负责构建与上传，每个目标都显式指定架构。发布资产命名为 `[name]_[version]_[platform]_[arch][setup][ext]`，例如：

```text
tauri-zero_0.6.0_windows_x64-setup.exe
tauri-zero_0.6.0_windows_x64-setup.exe.sig
tauri-zero_0.6.0_linux_amd64.AppImage
tauri-zero_0.6.0_darwin_x64.app.tar.gz
tauri-zero_0.6.0_darwin_aarch64.app.tar.gz
```

矩阵任务不写共享清单，避免并行覆盖。`scripts/release.mjs finalize` 集中读取草稿的实际资产，下载四个目标的更新包（含 Debian 专用包）及 `.sig`，按配置公钥验证 Ed25519 签名、包内容和可信注释；签名不匹配、缺平台、空包、重复或错误 URL 均停止发布。

集中生成的清单包含 `version`、`notes`、`pub_date` 与各平台的 `url`、`signature`。`signature` 是 `.sig` 文件正文；URL 固定到对应 tag，不使用会变化的 `/latest/download/` 包地址。

以下五个 JSON 内容一致，都包含四个平台及 Debian 安装类型的专用条目：

- `latest.json`：新客户端统一入口。
- `windows-x86_64.json`、`linux-x86_64.json`、`darwin-x86_64.json`、`darwin-aarch64.json`：兼容旧客户端的按平台 endpoint。

因此已有安装版即使仍使用 `{{target}}-{{arch}}.json`，也能找到新版本。兼容成立的前提是新包由旧客户端信任的同一密钥签名。

## 密钥管理 / Signing keys

新项目首次接入可以执行：

```bash
pnpm updater:keygen
```

脚本生成 `src-tauri/updater.key` 和 `updater.key.pub`，验证公钥后写入 `tauri.conf.json`。任一密钥文件已存在就拒绝执行，不支持 `--force`。脚本不会把签名材料输出到日志。私钥已 gitignore，应备份并妥善保管。

从模板创建独立新应用时，模板公钥不代表你拥有对应私钥；确认尚无需要兼容的已发布安装版后，移出模板附带的公钥文件，再生成自己的身份。已有应用不要为了修复发布而重新生成密钥。

需要密码时，可使用 Tauri CLI 的交互生成方式，并把相应密码配置到上述 secret；随后将生成的公钥写入 `plugins.updater.pubkey`。失败的首次生成可能留下密钥文件，先检查并备份，不要盲目重试覆盖。

本地打包：

```powershell
# 仅设置本机进程变量，不输出私钥。/ Set the local process variable without printing the private key.
$env:TAURI_SIGNING_PRIVATE_KEY = (Get-Content src-tauri/updater.key -Raw).Trim()
pnpm tauri:build
```

私钥加密时，还需在当前进程设置 `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`。

## 失败恢复与重跑 / Recovery and reruns

任一目标失败或验签失败，Release 保持草稿，客户端继续看到上一正式版本。同 tag 的发布流程串行执行，所有 tag 的最终发布共享一个锁，并在发布前再次比较正式版本，拒绝旧构建抢回 latest。

对失败草稿可在 Actions 的 `release` 工作流选择 **Run workflow**，填写原 tag；或者重跑失败 jobs。脚本复用草稿、保留 release-please 更新说明，重新生成清单。已发布版本拒绝重建与覆盖，需要发布更高版本。

手动 tag 同样支持，但须指向包含新发布脚本的提交，并保持四份版本文件一致。历史 tag 不会自动获得后来新增的工作流代码。每个 build job 开始时会重新检查 draft，避免单独重跑旧 job 覆盖正式资产；不要手动提前发布仍在构建的草稿。

## 验证与验收 / Verification and acceptance

本地无需联网或真实签名私钥即可运行：

```bash
pnpm test:release
pnpm test
pnpm typecheck
```

发布脚本测试覆盖真实测试密钥验签、包篡改、错误公钥、缺平台、版本不一致、草稿重跑和旧版本保护。客户端测试覆盖错误、无更新、下载进度、防重复与安装前 dirty 检查。

正式接入仍须完成两个版本的实际升级：

1. 在各目标机器安装旧版，并保存一条业务数据。
2. 用同一签名身份发布更高测试版本，确认草稿在所有构建和验签完成前保持私有。
3. 从旧版检查更新，完成下载、验签、安装、重启，确认版本变化与业务数据保留。
4. 打开未保存编辑窗口，分别在下载前、下载期间修改，确认安装被阻止，保存后可重试。
5. 验证断网、下载/安装失败和重新检查；Windows 安装器可能直接退出应用，macOS/Linux 通常在安装返回后重启。

本地自动化通过不能代替三平台安装、系统签名/公证和多窗口运行验收。
