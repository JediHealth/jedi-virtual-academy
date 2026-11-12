# 绝地虚拟学院（Jedi Virtual Academy）

JediHealth 数字学院。纯静态网页：无构建、无服务器、无外部依赖，任何静态托管都能直接运行。

当前版本 **1.0.1**（1.0 的在线部署与移动端/微信适配版，功能与 1.0 相同）。

## 目录

```
index.html            页面骨架与界面结构
assets/style.css      样式
assets/data.js        内容数据：题库、导师知识库、脊柱分段、关节模型、晶石、版本号
assets/app.js         引擎：渲染、移动、各区域活动、存档
archive/v1.0/         1.0 原始单文件版本（保留，可单独双击运行）
tests/e2e.js          端到端回归测试（Playwright）
```

## 本地运行

```
python3 -m http.server 8000     # 然后打开 http://localhost:8000
```

注意：把 html 文件直接通过微信发给手机是打不开的（微信的文件预览不执行脚本），必须通过网址访问。

## 部署（GitHub Pages）

1. 仓库 Settings → Pages → Source 选 “Deploy from a branch”，分支 `main`，目录 `/ (root)`。
2. 之后每次 `git push` 到 `main`，一两分钟后线上自动更新。
3. 地址：`https://<账号>.github.io/<仓库名>/`

## 更新内容

- 改题目、导师问答等：只改 `assets/data.js`。
- 每次发布前把 `data.js` 里的 `VERSION` 和 `index.html` 中三处 `?v=1.0.1` 一起改成新版本号——微信缓存很顽固，不改版本号用户可能看到旧版。
- 发布前可跑回归：`python3 -m http.server 8765 &` 后 `node tests/e2e.js`。

## 存档

进度存在访问者浏览器的 localStorage（键 `jva_v1`）。同一浏览器再次访问可继续；微信与 Safari 各存各的；换设备不同步。账号与云端同步属于后续阶段。

## 后续扩展的落点

- 新殿堂：在 `data.js` 加内容数据，在 `app.js` 的 `HS`/`interact()` 注册一个新互动点和对应面板函数。
- AI 导师：替换 `app.js` 中 `askPanel()` 的本地关键词匹配为接口调用（需要后端，届时再引入）。
- 账号、课程、收费：需要后端服务，建议那时再把项目迁到带构建的结构，现在不提前引入。
