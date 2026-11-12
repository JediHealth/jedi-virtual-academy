# 绝地虚拟学院（Jedi Virtual Academy）

JediHealth 数字学院。纯静态网页：无构建、无服务器、无外部依赖，任何静态托管都能直接运行。

线上稳定版 **1.0.1**（`main` / `gh-pages` 分支）。开发中 **1.1 预览**（`v1.1-dev` 分支）：新增第四个区域“绝地运动康复馆”，首批开放颈椎四个动作的动态演示。1.1 的专业内容尚在审核，审核通过前不合并到 `main`、不发布到线上。

## 目录

```
index.html              页面骨架与界面结构
assets/style.css        学院样式
assets/data.js          学院内容数据：区域、题库、导师知识库、晶石、版本号
assets/app.js           学院引擎：渲染、移动、原有三个区域、存档
assets/rehab/           运动康复馆（1.1）
  library.js            运动知识库：部位、动作教学卡文字（每条带来源标记）
  dosage.js             训练参数（单独存放，带审核状态）
  motions.js            动作数据：关键帧 + 姿态通道（与画法无关）
  rig.js                人体骨架解算与 2D 渲染
  player.js             播放器：时间轴插值、播放 / 暂停 / 慢放
  hall.js               康复馆界面
  rehab.css             康复馆样式
archive/v1.0/           1.0 原始单文件版本
tests/e2e.js            原有三个区域的端到端回归
tests/rehab.js          康复馆回归
tools/build-single.py   合并成单文件（离线发送 / 私有预览用）
```

## 康复馆的数据是怎么分开的

- **知识**（library.js）、**剂量**（dosage.js）、**动画**（motions.js）三者只靠同一个动作 id 关联，可以各自替换。
- 动画数据只写解剖学通道（颈屈、侧屈、旋转、前后平移、肩带上提 / 下沉、躯干等，单位为度）和手的目标位置，不写任何像素坐标。`rig.js` 先在三维空间里解出骨架，再正交投影到画布——以后换成真正的三维模型，只需替换 `rig.js` 的绘制部分，`motions.js` 不用改。
- 新增动作：在三个数据文件里用同一个 id 各加一项，并把 id 加进 `REHAB_REGIONS` 对应部位的 `exercises`。
- 新增部位：把 `REHAB_REGIONS` 里该部位的 `open` 改为 `true` 并填上 `exercises`。
- 每条文字都有 `src`：`course` 原课程 / `ai` AI 补充 / `clin` 临床要点 / `jks` JKS 教学转化；`review:'pending'` 表示未审核。
- 内部完整课程资料不放进本仓库；仓库里只有整理后的教学卡内容。

## 本地运行

```
python3 -m http.server 8000     # 然后打开 http://localhost:8000
```

注意：把 html 文件直接通过微信发给手机是打不开的（微信的文件预览不执行脚本），必须通过网址访问。

## 线上地址与部署（GitHub Pages）

线上地址：https://jedihealth.github.io/jedi-virtual-academy/

- 网站从 `gh-pages` 分支发布；`main` 是开发主线。
- 发布：把 `main` 推到 `gh-pages`（`git push origin main:gh-pages`），一两分钟后线上自动更新。
- 想简化成“推 main 即发布”：在仓库 Settings → Pages 把来源分支改为 `main` / `(root)`。

## 更新内容

- 改题目、导师问答等：只改 `assets/data.js`。
- 每次发布前把 `data.js` 里的 `VERSION` 和 `index.html` 中的 `?v=…` 一起改成新版本号（`index.html` 里所有 `?v=` 都要改）——微信缓存很顽固，不改版本号用户可能看到旧版。
- 发布前跑回归：`python3 -m http.server 8765 &` 后 `node tests/e2e.js` 和 `node tests/rehab.js`。

## 存档

进度存在访问者浏览器的 localStorage（键 `jva_v1`）。同一浏览器再次访问可继续；微信与 Safari 各存各的；换设备不同步。账号与云端同步属于后续阶段。

## 1.1 发布流程

1. 在 `v1.1-dev` 上开发；用 `python3 tools/build-single.py preview.html` 生成单文件做私有预览。
2. 专业内容逐项审核；通过的把 `library.js` / `dosage.js` 中对应的 `review` 改为 `approved`。
3. 审核完成后：把版本号改为 `1.1.0`，合并到 `main`，再推送 `main` 到 `gh-pages` 上线。

## 后续扩展的落点

- 康复服务流程（询问 → 筛查 → 评估 → 处方 → 跟练 → 反馈 → 复评）：`REHAB_PIPELINE` 已列出各环节，界面目前只显示为规划；每个环节以后各自是 `assets/rehab/` 下的一个模块。
- 新殿堂：在 `data.js` 的 `ZONES` / `HS` 注册区域和互动点，在 `app.js` 的 `interact()` 里接上面板函数。
- AI 导师：替换 `app.js` 中 `askPanel()` 的本地关键词匹配为接口调用（需要后端，届时再引入）。
- 账号、课程、收费：需要后端服务，建议那时再把项目迁到带构建的结构，现在不提前引入。
