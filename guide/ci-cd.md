# CI/CD 与发布

## CI

`.github/workflows/ci.yml` 在 PR 与 push 到 `main` 时，于 ubuntu / windows / macos 三平台执行：

lint → typecheck → test → rust:check → rust:clippy → rust:test

## 自动发版

使用 `release-please`（`.github/workflows/release-please.yml`），基于 Conventional Commits 自动生成版本与 changelog，并创建 release PR。

## 发布与自动更新

`.github/workflows/release.yml` 在推送 `v*` tag 时触发，三平台构建并上传产物（含 updater 的 `.json` 清单）。

自动更新流程：

1. 合并 release PR，release-please 打 tag。
2. release workflow 构建并上传产物 + 更新清单。
3. 客户端 `UpdateChecker` 检查更新并下载安装。

> 签名私钥通过 GitHub Secret `TAURI_SIGNING_PRIVATE_KEY` 注入，请勿提交到仓库。