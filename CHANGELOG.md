# Changelog

## [0.2.0](https://github.com/TheShining/tauri-zero/compare/tauri-zero-v0.1.0...tauri-zero-v0.2.0) (2026-09-04)


### Features

* 使用 sqlx 实现 SQLite 持久化 / implement SQLite persistence with sqlx ([d1059d9](https://github.com/TheShining/tauri-zero/commit/d1059d9c43dac0e98e977e00ace587518264777c))
* 使用 tokio::fs 实现文件读写命令 / implement file read/write commands with tokio::fs ([21103b7](https://github.com/TheShining/tauri-zero/commit/21103b7feba6d9154b9ddfc462cd6211571a82ca))
* 初始化前端测试与路由配置 / Initialize frontend test and router setup ([a361ff2](https://github.com/TheShining/tauri-zero/commit/a361ff2ab64fcf7e3f78b85f7fa977f3aed06b39))
* 增加主题与国际化状态 / Add theme and i18n state ([4cce58a](https://github.com/TheShining/tauri-zero/commit/4cce58a0d04f29628fb16eb5eb51a57034f2305e))
* 增加应用布局与首页导航 / Add app layout and home navigation ([ab17136](https://github.com/TheShining/tauri-zero/commit/ab171366dd739b5449085d36f1fe1efdb95bef47))
* 新增 Rust 骨架（日志/错误/状态/命令） / add rust skeleton with logging, error, state, and commands ([d6a6e86](https://github.com/TheShining/tauri-zero/commit/d6a6e867a327a95f647dfb3fcb0e516a48cac043))
* 新增企业级前端骨架 / add enterprise frontend skeleton ([f60a4c2](https://github.com/TheShining/tauri-zero/commit/f60a4c20f637a7350489b052d5a4f9b556d5603f))
* 集成系统插件与自动更新 / integrate system plugins and auto updater ([2241729](https://github.com/TheShining/tauri-zero/commit/224172947a24c826daecc95e268c6180c4be2b27))


### Bug Fixes

* 修复 sqlx 构建报错（静态链接 CRT） / fix sqlx build error with static CRT linking ([3d8bdc6](https://github.com/TheShining/tauri-zero/commit/3d8bdc62f96aaccf4c61541207c3deaa58805702))
* 增强 Tauri 错误处理 / Improve Tauri error handling ([c3853c7](https://github.com/TheShining/tauri-zero/commit/c3853c76d5325c487ef23e6ca3595c1317929331))
* 移除配置文件 UTF-8 BOM / remove UTF-8 BOM from config files ([9befa41](https://github.com/TheShining/tauri-zero/commit/9befa4180861644afce87e25db6fadcb509d1e90))


### Performance Improvements

* 优化打包体积 / Optimize bundle size ([e966b25](https://github.com/TheShining/tauri-zero/commit/e966b25e661819d6150381c4bdeeb31d38b83c98))
