# HyperFrames 工作台

把 [HyperFrames](https://github.com/heygen-com/hyperframes)（HTML → MP4 的确定性渲染）搬进 DeepSeek Harness 对话里的视频工作台插件。

在对话顶部多一个 `HyperFrames` 标签：左边管项目和素材，中间是播放器和时间轴，右边是提示词注入。选中时间轴区间或素材，一句话发给模型，模型改 HTML 合成、渲染 MP4，产出自动回到左侧列表。

![工作台截图](docs/workbench.png)

## 功能

- **项目即目录**：每个项目是 `<工作区>/hyperframes/<项目名>/`，含 `index.html`（合成）、`compositions/`、`assets/{images,video,audio}`、`scripts/`、`output/`
- **产出一栏**：扫描 `output/*.mp4`，带缩略图、大小，可播放、可删除（带确认）
- **素材一栏**：图片/视频/音频，点击预览，可注入提示词
- **时间轴**：刻度尺、缩略图条（16:9，带分割线）、音频波形、拖拽选区、区间内播放、倍速、音量、全屏；轨道按秒展开，支持滚轮横向滚动
- **提示词注入**：选区/素材生成引用文本，`发送` 或 `发送并渲染`（后者自动追加输出规格与渲染命令）
- **运行状态**：实时显示 `正在调用 <工具> · 已用 3分12秒` / `已完成 · 用时 4分01秒`
- **依赖自检**：Node / HyperFrames / FFmpeg / 渲染浏览器四项，缺什么就在画面上拦着并给一键安装
- **输出配置**：分辨率、帧率、格式、渲染浏览器，存进项目的 `project.json`

## 安装

插件本体就是一个标准 DSH bundle，包名 `dsh-hyperframes`。

```bash
git clone https://github.com/<you>/<repo>.git dsh-hyperframes
```

然后在 DSH 里用插件管理器安装目录（绝对路径）：

```
plugin_manager  action=install_bundle  target=<abs path to dsh-hyperframes>
```

或者手动把它写进 profile：`package.json` 的 `dsh.profile.bundles` 加上 `dsh-hyperframes`，`dependencies` 加上 `"dsh-hyperframes": "link:<绝对路径>"`，再 `pnpm install`。

装完重启 DSH（首次装会热启用），对话顶部就会出现 `HyperFrames` 标签。

## 依赖

| 依赖 | 说明 |
|---|---|
| Node.js ≥ 22 | 渲染 CLI 的要求 |
| hyperframes | `npm i -g hyperframes`（工作台内的「安装依赖」会自动做） |
| FFmpeg + FFprobe | 渲染必需；工作台会自动装到 `C:\ffmpeg\bin` 并写入用户 PATH |
| Chromium 内核浏览器 | Chrome / Edge / Chromium 任一；会自动探测，起不来的会被跳过 |

浏览器在「输出配置」里可以手动指定，避免自动探测选到坏掉的那一个。

## 目录结构

```
dsh-hyperframes/
├── package.json        # dsh.bundle.patch + dsh.client
├── cordis.patch.yml    # 把插件插进组合
├── index.js            # Host：项目/依赖/媒体流/发消息/状态
├── client.js           # Client：conversation.view 里的工作台
├── locale/*.json       # 插件市场里的标题和描述
└── icon.svg
```

## 已知限制

- 主要面向 Windows（FFmpeg 安装路径、PATH 写入用的是 PowerShell），macOS/Linux 下需要自己准备 ffmpeg
- 预览播放的是 `output/` 里的成片，不是实时合成的画面
- 纯发送（`发送`）不会要求渲染，产出要等下一次 `发送并渲染`

## License

MIT
