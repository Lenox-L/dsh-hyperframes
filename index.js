// Host half of the HyperFrames studio bundle (v3).
// Project folders, dependency install, MP4 rendering, media streaming, and prompt injection.
import fs from 'node:fs/promises'
import { createReadStream, existsSync, readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import path from 'node:path'
import { spawnSync, spawn } from 'node:child_process'

export const name = 'hyperframes'
export const inject = ['webServer', 'sessions', 'workingDirectory']

const BUILD = 'hf-host-v3'
const ROUTE_PREFIX = '/hf'
const PROJECTS_DIRNAME = 'hyperframes'
const NODE_MIN_MAJOR = 22

const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.avif'])
const VIDEO_EXT = new Set(['.mp4', '.mov', '.webm', '.mkv', '.m4v'])
const AUDIO_EXT = new Set(['.mp3', '.wav', '.m4a', '.aac', '.flac', '.ogg'])

const MIME = {
  '.mp4': 'video/mp4',
  '.m4v': 'video/mp4',
  '.mov': 'video/quicktime',
  '.webm': 'video/webm',
  '.mkv': 'video/x-matroska',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.avif': 'image/avif',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.flac': 'audio/flac',
  '.ogg': 'audio/ogg',
  '.html': 'text/html; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
}

const STARTER_INDEX = `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920, height=1080" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js"></script>
    <style>
      :root {
        --ground: #0b0d12;
        --ink: #ffffff;
        --font-display: "Segoe UI", "Microsoft YaHei", sans-serif;
      }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body {
        margin: 0; width: 1920px; height: 1080px; overflow: hidden;
        background: var(--ground);
      }
      #root {
        width: 100%; height: 100%; display: flex; align-items: center;
        justify-content: center; font-family: var(--font-display);
      }
      #title { color: var(--ink); font-size: 96px; font-weight: 700; letter-spacing: -0.03em; }
    </style>
  </head>
  <body>
    <div
      id="root"
      data-composition-id="main"
      data-start="0"
      data-duration="10"
      data-width="1920"
      data-height="1080"
    >
      <h1 id="title" class="clip" data-start="0" data-duration="10" data-track-index="0">标题</h1>
    </div>
    <script>
      const tl = gsap.timeline({ paused: true });
      tl.fromTo("#title", { opacity: 0, filter: "blur(8px)" }, { opacity: 1, filter: "blur(0px)", duration: 0.4, ease: "power4.out" }, 0);
      window.__timelines["main"] = tl;
      tl.seek(0);
    </script>
  </body>
</html>
`

const STARTER_README = `# {{NAME}}

HyperFrames 视频项目。

## 目录

- \`index.html\` — 主合成（composition），渲染入口
- \`compositions/\` — 可复用的子合成
- \`scripts/\` — 生成/处理脚本
- \`assets/images/\` \`assets/video/\` \`assets/audio/\` — 素材
- \`output/\` — 渲染产物（MP4）

## 常用命令

\`\`\`bash
npx hyperframes compositions
npx hyperframes render -o output/v1.mp4
npx hyperframes lint .
\`\`\`
`

function safeName(raw) {
  const name = String(raw ?? '').trim()
  if (!name) throw new Error('项目名不能为空')
  if (name.length > 64) throw new Error('项目名过长（最多 64 字）')
  if (/[\\/:*?"<>|]/.test(name)) throw new Error('项目名不能包含 \\ / : * ? " < > |')
  if (name === '.' || name === '..' || name.startsWith('.')) throw new Error('项目名不能以 . 开头')
  return name
}

function safeRel(raw) {
  const rel = String(raw ?? '').replace(/\\/g, '/')
  if (!rel || rel.startsWith('/') || rel.includes('..')) throw new Error('非法路径')
  return rel
}

async function statSafe(abs) {
  try {
    return await fs.stat(abs)
  } catch {
    return undefined
  }
}

async function walk(root, rel = '', out = [], limit = 400) {
  if (out.length >= limit) return out
  let entries
  try {
    entries = await fs.readdir(path.join(root, rel), { withFileTypes: true })
  } catch {
    return out
  }
  for (const entry of entries) {
    if (out.length >= limit) break
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue
    const childRel = rel ? `${rel}/${entry.name}` : entry.name
    if (entry.isDirectory()) {
      await walk(root, childRel, out, limit)
    } else {
      const stat = await statSafe(path.join(root, childRel))
      out.push({ rel: childRel, size: stat?.size ?? 0, mtime: stat?.mtimeMs ?? 0 })
    }
  }
  return out
}

function classify(rel) {
  const ext = path.extname(rel).toLowerCase()
  if (IMAGE_EXT.has(ext)) return 'image'
  if (VIDEO_EXT.has(ext)) return 'video'
  if (AUDIO_EXT.has(ext)) return 'audio'
  if (ext === '.html') return 'html'
  return 'other'
}

function whereExecutable(command) {
  const probe = spawnSync(process.platform === 'win32' ? 'where.exe' : 'which', [command], {
    timeout: 4000,
    windowsHide: true,
    encoding: 'utf8',
  })
  if (probe.status !== 0) return undefined
  const first = String(probe.stdout ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)[0]
  return first || undefined
}

let npmRootCache
function npmGlobalRoot() {
  if (npmRootCache !== undefined) return npmRootCache
  const probe = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['root', '-g'], {
    timeout: 20000,
    windowsHide: true,
    encoding: 'utf8',
    shell: process.platform === 'win32',
  })
  npmRootCache = probe.status === 0 ? String(probe.stdout ?? '').trim() : ''
  return npmRootCache
}

const FFMPEG_DIRS = [
  'C:\\ffmpeg\\bin',
  path.join(process.env.LOCALAPPDATA ?? '', 'ffmpeg', 'bin'),
]

function detectFfmpeg(projectDir, workspaceDir) {
  if (process.env.FFMPEG_PATH && existsSync(process.env.FFMPEG_PATH)) return process.env.FFMPEG_PATH
  const exe = process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg'
  const candidates = [
    ...FFMPEG_DIRS.map((dir) => path.join(dir, exe)),
    path.join(projectDir, 'node_modules', 'ffmpeg-static', exe),
    path.join(projectDir, 'node_modules', '@ffmpeg-installer', 'win32-x64', exe),
    path.join(workspaceDir, PROJECTS_DIRNAME, 'node_modules', 'ffmpeg-static', exe),
    path.join(workspaceDir, PROJECTS_DIRNAME, 'node_modules', '@ffmpeg-installer', 'win32-x64', exe),
  ]
  for (const candidate of candidates) {
    if (candidate && existsSync(candidate)) return candidate
  }
  return whereExecutable('ffmpeg')
}

function detectFfprobe(ffmpegPath) {
  if (process.env.FFPROBE_PATH && existsSync(process.env.FFPROBE_PATH)) return process.env.FFPROBE_PATH
  const exe = process.platform === 'win32' ? 'ffprobe.exe' : 'ffprobe'
  const candidates = [
    ...FFMPEG_DIRS.map((dir) => path.join(dir, exe)),
    ffmpegPath ? path.join(path.dirname(ffmpegPath), exe) : '',
  ].filter(Boolean)
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate
  }
  return whereExecutable('ffprobe')
}
const BROWSER_CANDIDATES = [
  {
    id: 'chrome',
    label: 'Chrome',
    paths: [
      process.env.CHROME_PATH,
      path.join(process.env.ProgramFiles ?? 'C:\\Program Files', 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join(process.env.LOCALAPPDATA ?? '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
      '/usr/bin/google-chrome',
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    ],
  },
  {
    id: 'edge',
    label: 'Edge',
    paths: [
      path.join(process.env['ProgramFiles(x86)'] ?? 'C:\\Program Files (x86)', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
      path.join(process.env.ProgramFiles ?? 'C:\\Program Files', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
      '/usr/bin/microsoft-edge',
    ],
  },
  {
    id: 'chromium',
    label: 'Chromium',
    paths: [process.env.CHROMIUM_PATH, '/usr/bin/chromium', '/usr/bin/chromium-browser', '/snap/bin/chromium'],
  },
]

const startCache = new Map()

function canStart(exe) {
  if (!exe) return false
  if (startCache.has(exe)) return startCache.get(exe)
  let ok = false
  if (existsSync(exe)) {
    const probe = spawnSync(exe, ['--version'], { timeout: 8000, windowsHide: true, encoding: 'utf8' })
    ok = probe.status === 0
  }
  startCache.set(exe, ok)
  return ok
}

function listBrowsers() {
  return BROWSER_CANDIDATES.map((browser) => {
    const exe = browser.paths.filter(Boolean).find((candidate) => existsSync(candidate))
    return { id: browser.id, label: browser.label, path: exe, ok: canStart(exe) }
  })
}

function resolveBrowser(preference) {
  const browsers = listBrowsers()
  if (preference && preference !== 'auto') {
    const chosen = browsers.find((browser) => browser.id === preference)
    if (chosen?.ok) return chosen
    return { ...(chosen ?? { id: preference, label: preference, path: undefined }), ok: false }
  }
  return browsers.find((browser) => browser.ok) ?? { id: 'auto', label: '自动', path: undefined, ok: false }
}

const PROJECT_DEFAULTS = { width: 1920, height: 1080, fps: 30, format: 'mp4', browser: 'auto' }

function readSettings(meta) {
  return { ...PROJECT_DEFAULTS, ...(meta?.settings ?? {}) }
}

function readProjectMetaSync(dir) {
  try {
    return JSON.parse(readFileSync(path.join(dir, 'project.json'), 'utf8'))
  } catch {
    return {}
  }
}

function readPackageVersion(pkgJsonPath) {
  try {
    return JSON.parse(readFileSync(pkgJsonPath, 'utf8')).version
  } catch {
    return undefined
  }
}

function detectHyperframes(projectDir, workspaceDir) {
  const root = npmGlobalRoot()
  const candidates = [
    path.join(projectDir, 'node_modules', 'hyperframes', 'package.json'),
    path.join(workspaceDir, PROJECTS_DIRNAME, 'node_modules', 'hyperframes', 'package.json'),
    root ? path.join(root, 'hyperframes', 'package.json') : '',
  ].filter(Boolean)
  for (const candidate of candidates) {
    const version = readPackageVersion(candidate)
    if (version) return { installed: true, version, path: candidate, scope: candidate === candidates[2] ? 'global' : 'local' }
  }
  return { installed: false }
}

function dependencyReport(projectDir, workspaceDir, meta) {
  const settings = readSettings(meta)
  const nodeMajor = Number(process.versions.node.split('.')[0])
  const browser = resolveBrowser(settings.browser)
  const ffmpeg = detectFfmpeg(projectDir, workspaceDir)
  const ffprobe = detectFfprobe(ffmpeg)
  const hyperframes = detectHyperframes(projectDir, workspaceDir)
  const items = [
    {
      id: 'node',
      label: 'Node.js',
      ok: nodeMajor >= NODE_MIN_MAJOR,
      detail: `v${process.versions.node}`,
      hint: `需要 ${NODE_MIN_MAJOR}+`,
    },
    {
      id: 'hyperframes',
      label: 'HyperFrames',
      ok: hyperframes.installed,
      detail: hyperframes.installed ? `v${hyperframes.version}` : '未安装',
      hint: 'npm install -g hyperframes',
    },
    {
      id: 'ffmpeg',
      label: 'FFmpeg',
      ok: Boolean(ffmpeg && ffprobe),
      detail: ffmpeg ? (ffprobe ? path.dirname(ffmpeg) : '缺少 ffprobe') : '未安装',
      hint: '安装到 C:\\ffmpeg 并写入 PATH',
    },
    {
      id: 'browser',
      label: '渲染浏览器',
      ok: Boolean(browser.ok),
      detail: browser.ok ? `${browser.label}${browser.path ? ` · ${browser.path}` : ''}` : browser.path ? `${browser.label} 无法启动` : '未找到可用浏览器',
      hint: '可在配置中切换 Chrome / Edge / Chromium',
    },
  ]
  return {
    build: BUILD,
    items,
    ready: items.every((item) => item.ok),
    settings,
    browser: { id: browser.id, label: browser.label, ok: Boolean(browser.ok), path: browser.path },
  }
}

function run(command, args, options = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env ?? process.env,
      windowsHide: true,
      shell: process.platform === 'win32',
    })
    let output = ''
    const push = (chunk) => {
      output += String(chunk)
      if (output.length > 40000) output = output.slice(-40000)
    }
    child.stdout?.on('data', push)
    child.stderr?.on('data', push)
    const timer = setTimeout(() => {
      try {
        child.kill()
      } catch {
        /* ignore */
      }
    }, options.timeoutMs ?? 8 * 60 * 1000)
    child.on('error', (error) => {
      clearTimeout(timer)
      resolve({ ok: false, error: error.message, output })
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      resolve({ ok: code === 0, code, output })
    })
  })
}

export function apply(ctx) {
  const stamp = () => {
    const now = new Date()
    const pad = (value) => String(value).padStart(2, '0')
    return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
  }

  const resolveWorkspace = (sessionId) => {
    try {
      const session = ctx.sessions.get(sessionId)
      if (session) {
        const cwd = ctx.workingDirectory?.get?.(session) ?? session.header?.cwd
        if (cwd) return cwd
      }
    } catch {
      /* fall through */
    }
    return process.cwd()
  }

  const projectDirOf = (sessionId, rawName) => {
    const workspaceDir = resolveWorkspace(sessionId)
    const root = path.join(workspaceDir, PROJECTS_DIRNAME)
    return { workspaceDir, root, dir: path.join(root, safeName(rawName)) }
  }

  const readProjectMeta = async (dir) => {
    try {
      return JSON.parse(await fs.readFile(path.join(dir, 'project.json'), 'utf8'))
    } catch {
      return {}
    }
  }

  const listProject = async (dir, name) => {
    const meta = await readProjectMeta(dir)
    const files = await walk(dir)
    const outputs = files
      .filter((file) => file.rel.startsWith('output/') && classify(file.rel) === 'video')
      .sort((a, b) => b.mtime - a.mtime)
      .map((file) => ({ ...file, name: path.basename(file.rel) }))
    const assets = { image: [], video: [], audio: [] }
    for (const file of files) {
      if (!file.rel.startsWith('assets/')) continue
      const kind = classify(file.rel)
      if (assets[kind]) assets[kind].push(file)
    }
    const sources = files.filter(
      (file) => classify(file.rel) === 'html' || file.rel.endsWith('.js') || file.rel.endsWith('.css'),
    )
    return { name, dir, meta, settings: readSettings(meta), outputs, assets, sources, files }
  }

  const listProjects = async (root) => {
    let entries = []
    try {
      entries = await fs.readdir(root, { withFileTypes: true })
    } catch {
      return []
    }
    const projects = []
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith('.') || entry.name === 'node_modules') continue
      const dir = path.join(root, entry.name)
      const meta = await readProjectMeta(dir)
      const files = await walk(dir, '', [], 200)
      const outputs = files.filter((file) => file.rel.startsWith('output/') && classify(file.rel) === 'video')
      projects.push({
        name: entry.name,
        createdAt: meta.createdAt ?? (await statSafe(dir))?.birthtimeMs ?? 0,
        fps: meta.fps ?? 30,
        outputCount: outputs.length,
        latestOutput: outputs
          .slice()
          .sort((a, b) => b.mtime - a.mtime)
          .map((file) => file.rel)[0],
      })
    }
    return projects.sort((a, b) => b.createdAt - a.createdAt)
  }

  const createProject = async (sessionId, rawName) => {
    const { workspaceDir, dir } = projectDirOf(sessionId, rawName)
    const name = path.basename(dir)
    if (await statSafe(dir)) throw new Error(`项目「${name}」已存在`)
    await fs.mkdir(dir, { recursive: true })
    for (const sub of ['compositions', 'scripts', 'assets/images', 'assets/video', 'assets/audio', 'output']) {
      await fs.mkdir(path.join(dir, sub), { recursive: true })
    }
    await fs.writeFile(path.join(dir, 'index.html'), STARTER_INDEX, 'utf8')
    await fs.writeFile(
      path.join(dir, 'project.json'),
      JSON.stringify(
        { name, createdAt: Date.now(), fps: 30, width: 1920, height: 1080, entry: 'index.html', hyperframes: '0.9.x' },
        null,
        2,
      ),
      'utf8',
    )
    await fs.writeFile(path.join(dir, 'README.md'), STARTER_README.replaceAll('{{NAME}}', name), 'utf8')
    for (const sub of ['assets/images', 'assets/video', 'assets/audio']) {
      await fs.writeFile(path.join(dir, sub, '.gitkeep'), '', 'utf8')
    }
    return { workspaceDir, project: await listProject(dir, name) }
  }

  const installHyperframes = async () => run('npm', ['install', '-g', 'hyperframes', '--no-audit', '--no-fund'], { timeoutMs: 12 * 60 * 1000 })

  const appendUserPath = (dir) => {
    if (process.platform !== 'win32') return
    const script = [
      `$dir = '${dir.replace(/'/g, "''")}'`,
      `$cur = [Environment]::GetEnvironmentVariable('Path','User')`,
      `if (-not $cur) { $cur = '' }`,
      `$parts = @($cur -split ';' | Where-Object { $_ -ne '' })`,
      `if ($parts -notcontains $dir) { [Environment]::SetEnvironmentVariable('Path', (($parts + $dir) -join ';'), 'User') }`,
    ].join('; ')
    spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], {
      windowsHide: true,
      timeout: 20000,
      encoding: 'utf8',
    })
  }

  const writeFfmpegShims = async (binDir) => {
    if (process.platform !== 'win32') return
    const npmBin = path.join(process.env.APPDATA ?? '', 'npm')
    if (!npmBin || !existsSync(npmBin)) return
    for (const name of ['ffmpeg', 'ffprobe']) {
      const target = path.join(binDir, `${name}.exe`)
      if (!existsSync(target)) continue
      const shim = `@echo off\r\n"${target}" %*\r\n`
      try {
        await fs.writeFile(path.join(npmBin, `${name}.cmd`), shim, 'utf8')
      } catch {
        /* best effort */
      }
    }
  }

  const installFfmpeg = async (workspaceDir) => {
    const toolsDir = path.join(workspaceDir, PROJECTS_DIRNAME, '.tools')
    await fs.mkdir(toolsDir, { recursive: true })
    const installed = await run(
      'npm',
      ['install', '@ffmpeg-installer/ffmpeg', '@ffprobe-installer/ffprobe', '--no-audit', '--no-fund', '--prefix', toolsDir],
      { cwd: toolsDir, timeoutMs: 10 * 60 * 1000 },
    )
    if (!installed.ok) return { ok: false, stage: 'npm', output: installed.output.slice(-3000) }
    const exeName = process.platform === 'win32' ? '.exe' : ''
    const suffixes = ['win32-x64', 'win32-ia32', 'darwin-x64', 'darwin-arm64', 'linux-x64', 'linux-arm64']
    const findBinary = (scope, name) => {
      for (const suffix of suffixes) {
        const candidate = path.join(toolsDir, 'node_modules', scope, suffix, `${name}${exeName}`)
        if (existsSync(candidate)) return candidate
      }
      return undefined
    }
    const binaries = [
      { name: 'ffmpeg', scope: '@ffmpeg-installer' },
      { name: 'ffprobe', scope: '@ffprobe-installer' },
    ]
      .map((item) => ({ ...item, source: findBinary(item.scope, item.name) }))
      .filter((item) => item.source)
    if (binaries.length < 2) {
      return { ok: false, stage: 'locate', output: `找到 ${binaries.map((item) => item.name).join(',') || '无'}；${installed.output.slice(-1500)}` }
    }
    const copyAll = async (targetDir) => {
      await fs.mkdir(targetDir, { recursive: true })
      for (const binary of binaries) {
        await fs.copyFile(binary.source, path.join(targetDir, `${binary.name}${exeName}`))
      }
    }
    const targetDir = FFMPEG_DIRS[0]
    try {
      await copyAll(targetDir)
    } catch {
      const fallback = FFMPEG_DIRS[1]
      await copyAll(fallback)
      appendUserPath(fallback)
      await writeFfmpegShims(fallback)
      return { ok: true, dir: fallback, note: `C:\\ffmpeg 不可写，已装到 ${fallback}` }
    }
    appendUserPath(targetDir)
    await writeFfmpegShims(targetDir)
    return { ok: true, dir: targetDir }
  }

  const formatElapsed = (ms) => {
    const seconds = Math.max(0, Math.round(ms / 1000))
    if (seconds < 60) return `${seconds}秒`
    return `${Math.floor(seconds / 60)}分${String(seconds % 60).padStart(2, '0')}秒`
  }

  const agentStatus = (sessionId) => {
    const session = ctx.sessions.get(sessionId)
    const agents = ctx.get('agents')
    const agent = agents?.get?.(sessionId)
    let running = false
    let progress = { turn: 0, step: 0, tokens: 0, elapsedMs: 0, tool: '', running: false }
    try {
      const tail = Math.max(0, (session?.seq ?? 0) - 400)
      const events = session?.snapshotEvents?.(tail) ?? []
      let lastStart = -1
      let lastEnd = -1
      let startedAt = 0
      let endedAt = 0
      let turn = 0
      let step = 0
      let tokens = 0
      let tool = ''
      let activity = ''

      for (const event of events) {
        const data = event.data ?? {}
        if (event.type === 'turn/start') {
          lastStart = event.seq
          turn = data.turn ?? turn
          step = 0
          tokens = 0
          tool = ''
          startedAt = event.time
        } else if (event.type === 'turn/end') {
          lastEnd = event.seq
          endedAt = event.time
        } else if (event.type === 'step/start') {
          turn = data.turn ?? turn
          step = data.step ?? step
        } else if (event.type === 'assistant/message') {
          tokens += data.usage?.totalTokens ?? 0
          activity = '已完成回复'
        } else if (event.type === 'tool/call') {
          tool = data.name ?? tool
          activity = `正在调用 ${tool}`
        } else if (event.type === 'tool/result') {
          activity = '正在整理结果'
        }
        if (event.type === 'step/start') activity = '正在分析请求'
      }

      running = lastStart > lastEnd
      const elapsedMs = startedAt ? Math.max(0, (running ? Date.now() : endedAt || Date.now()) - startedAt) : 0
      progress = { turn, step, tokens, elapsedMs, tool, running, activity }
    } catch {
      running = false
    }

    let line = ''
    if (running) {
      line = progress.activity || '正在分析请求'
      if (progress.elapsedMs) line += ` · 已用 ${formatElapsed(progress.elapsedMs)}`
    } else if (progress.turn) {
      line = '已完成'
      if (progress.elapsedMs) line += ` · 用时 ${formatElapsed(progress.elapsedMs)}`
    }

    return {
      running,
      line,
      progress,
      agentPresent: Boolean(agent),
      agentMethods: agent ? Object.getOwnPropertyNames(Object.getPrototypeOf(agent)).slice(0, 80) : [],
      status: agent?.status ?? undefined,
    }
  }

  const sessionRoute = (session) => {
    try {
      const context = session?.requestContext?.()
      if (context?.provider && context?.model) return { provider: context.provider, model: context.model }
      const header = session?.requestHeader?.()
      if (header?.config?.provider && header?.config?.model) {
        return { provider: header.config.provider, model: header.config.model }
      }
    } catch {
      /* fall through */
    }
    return undefined
  }

  const imageCapability = async (sessionId) => {
    const session = ctx.sessions.get(sessionId)
    const route = sessionRoute(session)
    if (!route) return { known: false, images: true, provider: undefined, model: undefined, modelName: undefined }
    try {
      const llm = ctx.get('llm')
      if (!llm?.resolveModelInfo) return { ...route, known: false, images: true }
      const info = await llm.resolveModelInfo(route.provider, route.model)
      const modalities = info?.inputModalities
      const known = Array.isArray(modalities)
      return {
        ...route,
        modelName: info?.name ?? route.model,
        known,
        images: known ? modalities.includes('image') : true,
      }
    } catch {
      return { ...route, known: false, images: true }
    }
  }

  const sendToAgent = (sessionId, text) => {
    if (!text) return { ok: false, error: '内容为空' }
    const agents = ctx.get('agents')
    const agent = agents?.get?.(sessionId)
    if (!agent) return { ok: false, error: '没有找到当前会话的 Agent，请刷新页面重试。' }
    const message = Object.freeze({
      id: randomUUID(),
      role: 'user',
      content: Object.freeze([Object.freeze({ type: 'text', text })]),
      source: Object.freeze({ kind: 'user' }),
    })
    const attempts = []
    for (const method of ['followup', 'send']) {
      if (typeof agent[method] !== 'function') continue
      try {
        const result = method === 'followup' ? agent.followup(message) : agent.send(message, 'next-turn', true)
        if (result && typeof result.catch === 'function') result.catch(() => {})
        return { ok: true, via: method }
      } catch (error) {
        attempts.push(`${method}: ${error?.message ?? error}`)
      }
    }
    return { ok: false, error: attempts.join(' | ') || '当前 Agent 没有可用的消息入口。' }
  }

  const composeMessage = (payload) => {
    const text = String(payload.text ?? '').trim()
    const projectName = payload.name ? String(payload.name) : ''
    // 纯发送：原样投递，不附加任何项目/规格/渲染指令
    if (!projectName || payload.render === false) return text
    const { workspaceDir, dir } = projectDirOf(payload.sessionId ?? '', projectName)
    const meta = readProjectMetaSync(dir)
    const settings = readSettings(meta)
    const browser = resolveBrowser(settings.browser)
    const lines = [
      text,
      '',
      `—— HyperFrames 工作台 · 项目「${projectName}」`,
      `输出规格：${settings.width}×${settings.height} · ${settings.fps}fps · ${String(settings.format).toUpperCase()} · 渲染浏览器 ${browser.label}`,
    ]
    if (payload.render !== false) {
      const ext = settings.format === 'webm' ? 'webm' : 'mp4'
      const outRel = `output/${stamp()}.${ext}`
      lines.push(
        '修改完成后渲染产出：',
        `npx hyperframes render -o "${outRel}"`,
        browser.path ? `渲染前设置 $env:HYPERFRAMES_BROWSER_PATH="${browser.path}"。` : '',
        '完成后返回产物路径。',
      )
    }
    return lines.filter(Boolean).join('\n')
  }

  const readBody = (req) =>
    new Promise((resolve, reject) => {
      let raw = ''
      req.on('data', (chunk) => {
        raw += chunk
        if (raw.length > 4 * 1024 * 1024) reject(new Error('请求体过大'))
      })
      req.on('end', () => {
        if (!raw) return resolve({})
        try {
          resolve(JSON.parse(raw))
        } catch {
          resolve({})
        }
      })
      req.on('error', reject)
    })

  const sendJson = (res, status, value) => {
    const body = JSON.stringify(value)
    res.writeHead(status, {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'content-length': Buffer.byteLength(body),
    })
    res.end(body)
  }

  const sendBytes = async (req, res, abs) => {
    const stat = await statSafe(abs)
    if (!stat || !stat.isFile()) return sendJson(res, 404, { error: '文件不存在' })
    const type = MIME[path.extname(abs).toLowerCase()] ?? 'application/octet-stream'
    const etag = `"${stat.size.toString(16)}-${Math.floor(stat.mtimeMs).toString(16)}"`
    const headers = {
      'content-type': type,
      'accept-ranges': 'bytes',
      'cache-control': 'public, max-age=3600',
      etag,
      'last-modified': stat.mtime.toUTCString(),
    }
    if (req.headers['if-none-match'] === etag) {
      res.writeHead(304, { etag, 'cache-control': headers['cache-control'] })
      return res.end()
    }
    if (req.method === 'HEAD') {
      res.writeHead(200, { ...headers, 'content-length': stat.size })
      return res.end()
    }

    const total = stat.size
    const range = req.headers.range
    if (range) {
      const match = /bytes=(\d*)-(\d*)/.exec(range)
      if (match) {
        const start = match[1] ? Number(match[1]) : 0
        const end = match[2] ? Math.min(Number(match[2]), total - 1) : total - 1
        if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || start >= total) {
          res.writeHead(416, { ...headers, 'content-range': `bytes */${total}` })
          return res.end()
        }
        res.writeHead(206, {
          ...headers,
          'content-length': end - start + 1,
          'content-range': `bytes ${start}-${end}/${total}`,
        })
        const stream = createReadStream(abs, { start, end })
        stream.on('error', () => res.destroy())
        return stream.pipe(res)
      }
    }

    res.writeHead(200, { ...headers, 'content-length': total })
    const stream = createReadStream(abs)
    stream.on('error', () => res.destroy())
    stream.pipe(res)
  }

  const handler = async (req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1')
    const action = url.pathname.slice(ROUTE_PREFIX.length).replace(/^\//, '')
    const params = url.searchParams
    try {
      if (action === 'ping') return sendJson(res, 200, { ok: true, build: BUILD })

      if (action === 'whoami') {
        return sendJson(res, 200, {
          build: BUILD,
          sessions: (ctx.sessions.list?.() ?? []).map((session) => ({
            id: session.id,
            cwd: ctx.workingDirectory?.get?.(session) ?? session.header?.cwd,
          })),
        })
      }

      if (action === 'probe') {
        const agent = ctx.get('agents')?.get?.(params.get('sessionId') ?? '')
        if (!agent) return sendJson(res, 200, { agent: false })
        const sources = {}
        for (const method of ['followup', 'send', 'steer', 'inject']) {
          const fn = agent[method]
          sources[method] = typeof fn === 'function' ? { arity: fn.length, source: String(fn).slice(0, 400) } : null
        }
        return sendJson(res, 200, { agent: true, status: agent.status, methods: sources })
      }

      if (action === 'status') {
        return sendJson(res, 200, agentStatus(params.get('sessionId') ?? ''))
      }

      if (action === 'projects') {
        const { workspaceDir, root } = projectDirOf(params.get('sessionId') ?? '', 'placeholder')
        return sendJson(res, 200, { workspace: workspaceDir, root, projects: await listProjects(root) })
      }

      if (action === 'project' && req.method === 'POST') {
        const body = await readBody(req)
        const sessionId = body.sessionId ?? params.get('sessionId') ?? ''
        const created = await createProject(sessionId, body.name)
        return sendJson(res, 200, {
          workspace: created.workspaceDir,
          project: created.project,
          deps: dependencyReport(created.project.dir, created.workspaceDir, created.project.meta),
        })
      }

      if (action === 'project') {
        const { workspaceDir, dir } = projectDirOf(params.get('sessionId') ?? '', params.get('name'))
        if (!(await statSafe(dir))) return sendJson(res, 404, { error: '项目不存在' })
        const project = await listProject(dir, path.basename(dir))
        return sendJson(res, 200, {
          workspace: workspaceDir,
          project,
          deps: dependencyReport(dir, workspaceDir, project.meta),
        })
      }

      if (action === 'browsers') {
        return sendJson(res, 200, { browsers: listBrowsers() })
      }

      if (action === 'settings' && req.method === 'POST') {
        const body = await readBody(req)
        const { workspaceDir, dir } = projectDirOf(body.sessionId ?? '', body.name)
        const metaPath = path.join(dir, 'project.json')
        if (!(await statSafe(metaPath))) return sendJson(res, 404, { error: '项目不存在' })
        const meta = await readProjectMeta(dir)
        const settings = { ...readSettings(meta), ...(body.settings ?? {}) }
        meta.settings = settings
        await fs.writeFile(metaPath, JSON.stringify(meta, null, 2), 'utf8')
        const project = await listProject(dir, path.basename(dir))
        return sendJson(res, 200, { settings, project, deps: dependencyReport(dir, workspaceDir, meta) })
      }

      if (action === 'deps') {
        const { workspaceDir, dir } = projectDirOf(params.get('sessionId') ?? '', params.get('name'))
        return sendJson(res, 200, dependencyReport(dir, workspaceDir, await readProjectMeta(dir)))
      }

      if (action === 'install' && req.method === 'POST') {
        const body = await readBody(req)
        const { workspaceDir, dir } = projectDirOf(body.sessionId ?? '', body.name)
        const kind = body.kind ?? 'all'
        const steps = []
        if (kind === 'hyperframes' || kind === 'all') {
          steps.push({ step: 'hyperframes', ...(await installHyperframes()) })
        }
        if (kind === 'ffmpeg' || kind === 'all') {
          steps.push({ step: 'ffmpeg', ...(await installFfmpeg(workspaceDir)) })
        }
        const deps = dependencyReport(dir, workspaceDir, await readProjectMeta(dir))
        return sendJson(res, 200, {
          ok: steps.every((item) => item.ok),
          steps,
          deps,
          output: steps.map((item) => `[${item.step}]\n${item.output ?? item.note ?? ''}`).join('\n\n').slice(-4000),
        })
      }

      if (action === 'project-delete' && req.method === 'POST') {
        const body = await readBody(req)
        const { root, dir } = projectDirOf(body.sessionId ?? '', body.name)
        if (!path.resolve(dir).startsWith(path.resolve(root) + path.sep)) return sendJson(res, 400, { error: '非法路径' })
        if (!(await statSafe(dir))) return sendJson(res, 404, { error: '项目不存在' })
        await fs.rm(dir, { recursive: true, force: true })
        return sendJson(res, 200, { deleted: path.basename(dir) })
      }

      if (action === 'delete' && req.method === 'POST') {
        const body = await readBody(req)
        const { workspaceDir, dir } = projectDirOf(body.sessionId ?? '', body.name)
        const rel = safeRel(body.rel)
        if (!rel.startsWith('output/') && !rel.startsWith('assets/')) {
          return sendJson(res, 400, { error: '只能删除产出或素材文件' })
        }
        const abs = path.resolve(dir, rel)
        if (!abs.startsWith(path.resolve(dir) + path.sep)) return sendJson(res, 400, { error: '非法路径' })
        await fs.rm(abs, { force: true })
        const project = await listProject(dir, path.basename(dir))
        return sendJson(res, 200, {
          deleted: rel,
          project,
          deps: dependencyReport(dir, workspaceDir, project.meta),
        })
      }

      if (action === 'media') {
        const { dir } = projectDirOf(params.get('sessionId') ?? '', params.get('name'))
        const rel = safeRel(params.get('rel'))
        const abs = path.resolve(dir, rel)
        if (!abs.startsWith(path.resolve(dir) + path.sep)) return sendJson(res, 400, { error: '非法路径' })
        return sendBytes(req, res, abs)
      }

      if (action === 'send' && req.method === 'POST') {
        const body = await readBody(req)
        const capability = await imageCapability(body.sessionId ?? '')
        if (capability.images === false) {
          return sendJson(res, 200, {
            ok: false,
            code: 'IMAGE_UNSUPPORTED',
            error: `当前模型「${capability.modelName ?? capability.model}」不支持图片输入，已拒绝发送。请切换到支持视觉的模型。`,
          })
        }
        return sendJson(res, 200, sendToAgent(body.sessionId ?? '', composeMessage(body)))
      }

      if (action === 'capabilities') {
        return sendJson(res, 200, await imageCapability(params.get('sessionId') ?? ''))
      }

      return sendJson(res, 404, { error: `未知接口 ${action}` })
    } catch (error) {
      return sendJson(res, 400, { error: error?.message ?? String(error) })
    }
  }

  ctx.effect(() => ctx.webServer.register({ kind: 'prefix', path: ROUTE_PREFIX, handler }))
}
