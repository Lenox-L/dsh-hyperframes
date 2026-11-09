window.__ModuleLoader__.load({
  id: 'dsh-hyperframes',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const { useState, useEffect, useRef, useMemo } = React

    /* ───────────── 调色板（跟随 DSH 日/夜，自带高对比度） ───────────── */

    const CSS = `
.hf{position:fixed;z-index:100;display:grid;grid-template-columns:clamp(172px,16vw,252px) minmax(0,1fr) clamp(248px,24vw,356px);grid-template-rows:minmax(0,1fr);
  container-type:inline-size;
  font:13px/1.5 "Segoe UI","Microsoft YaHei",system-ui,sans-serif;overflow:hidden;
  --hf-bg:#0b0d12;--hf-panel:#11141a;--hf-layer:#161a22;--hf-layer2:#1c222c;--hf-line:#242a36;--hf-line2:#333b4a;
  --hf-text:#eef1f7;--hf-dim:#a3adc0;--hf-accent:#5b8cff;--hf-danger:#ff6b6b;--hf-ok:#3fb950;--hf-warn:#e3b341;
  background:var(--hf-bg);color:var(--hf-text)}
.hf-light{--hf-bg:#ffffff;--hf-panel:#f5f6f8;--hf-layer:#ffffff;--hf-layer2:#eef1f5;--hf-line:#e2e5ec;--hf-line2:#c9cfdb;
  --hf-text:#15181f;--hf-dim:#5b6474;--hf-accent:#2f62e8;--hf-danger:#cf2f2f;--hf-ok:#1a8a3c;--hf-warn:#8a5f00}
.hf *{box-sizing:border-box}
.hf-col{display:flex;flex-direction:column;min-width:0;min-height:0;overflow:hidden}
.hf-col-side{border-right:1px solid var(--hf-line);background:var(--hf-panel)}
.hf-col-side .hf-bar{padding-right:7px}
.hf-col-aside{border-left:1px solid var(--hf-line);background:var(--hf-panel)}
.hf-col-main{background:var(--hf-bg)}
.hf-bar{display:flex;align-items:center;gap:10px;height:42px;min-height:42px;padding:0 14px;border-bottom:1px solid var(--hf-line);flex:none}
.hf-bar h1{margin:0;font-size:13px;font-weight:600;white-space:nowrap;color:var(--hf-text)}
.hf-bar-sub{font:11px/1.4 ui-monospace,Consolas,monospace;color:var(--hf-dim);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;direction:rtl;text-align:left}
.hf-grow{flex:1;min-width:0}
.hf-scroll{overflow:auto;min-height:0}
.hf-btn{border:1px solid var(--hf-line2);background:var(--hf-layer);color:var(--hf-text);border-radius:6px;padding:4px 10px;
  font:12px/1.7 inherit;cursor:pointer;white-space:nowrap}
.hf-btn:hover:not(:disabled){border-color:var(--hf-accent)}
.hf-btn:disabled{opacity:.45;cursor:default}
.hf-btn-primary{background:var(--hf-accent);border-color:var(--hf-accent);color:#fff}
.hf-btn-primary:hover:not(:disabled){filter:brightness(1.08)}
.hf-btn-danger{background:var(--hf-danger);border-color:var(--hf-danger);color:#fff}
.hf-btn-danger:hover:not(:disabled){filter:brightness(1.06)}
.hf-btn-quiet{background:transparent;border-color:transparent;color:var(--hf-dim)}
.hf-btn-quiet:hover:not(:disabled){background:rgba(128,128,128,.14);color:var(--hf-text)}
.hf-btn-sm{padding:2px 8px;font:11.5px/1.7 inherit}

.hf-section{display:flex;align-items:center;gap:8px;padding:14px 6px 6px 12px}
.hf-section span:first-child{flex:1;font-size:10.5px;font-weight:600;letter-spacing:.1em;color:var(--hf-dim);text-transform:uppercase}
.hf-count{flex:none;width:30px;text-align:center;font-size:10.5px;color:var(--hf-dim);font-variant-numeric:tabular-nums}
.hf-empty{padding:6px 12px 14px;font-size:12px;color:var(--hf-dim)}
.hf-input{flex:1;min-width:0;height:28px;padding:0 8px;border-radius:6px;font:12px inherit;outline:none;
  color:var(--hf-text);background:var(--hf-layer2);border:1px solid var(--hf-line)}
.hf-input:focus{border-color:var(--hf-accent)}
.hf-newrow{display:flex;align-items:center;gap:6px;padding:0 6px 8px 12px}

.hf-row{display:grid;grid-template-columns:56px minmax(0,1fr) 30px;align-items:center;gap:9px;
  padding:5px 6px 5px 12px;cursor:pointer;border-left:2px solid transparent}
.hf-row-plain{grid-template-columns:minmax(0,1fr) 30px}
.hf-row:hover{background:rgba(128,128,128,.12)}
.hf-row.is-active{border-left-color:var(--hf-accent);background:rgba(90,140,255,.12)}
.hf-row .thumb{width:56px;height:32px;border-radius:4px;border:1px solid var(--hf-line);background:#000 center/cover no-repeat;
  display:flex;align-items:center;justify-content:center;font-size:9.5px;letter-spacing:.04em;color:#cfd6e6}
.hf-row .meta{min-width:0}
.hf-row .name{font-size:12px;color:var(--hf-text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.hf-row .size{font:10px/1.6 ui-monospace,Consolas,monospace;color:var(--hf-dim)}
.hf-iconbtn{width:30px;height:28px;display:inline-flex;align-items:center;justify-content:center;padding:0;border:0;border-radius:6px;
  background:transparent;color:var(--hf-dim);cursor:pointer}
.hf-iconbtn:hover:not(:disabled){background:rgba(128,128,128,.16);color:var(--hf-text)}
.hf-iconbtn:disabled{opacity:.4;cursor:default}
.hf-x:hover{background:rgba(255,107,107,.16);color:var(--hf-danger)}

.hf-file{padding:4px 12px;font:11.5px/1.7 ui-monospace,Consolas,monospace;color:var(--hf-dim);cursor:pointer}
.hf-file:hover{background:rgba(128,128,128,.12);color:var(--hf-text)}

.hf-stage-wrap{flex:1;min-height:0;display:flex;flex-direction:column}
.hf-stage{flex:1;min-height:0;overflow:hidden;display:flex;align-items:center;justify-content:center;padding:14px;background:var(--hf-bg)}
.hf-frame{max-width:100%;max-height:100%;min-width:0;min-height:0;overflow:hidden;display:flex;align-items:center;justify-content:center}
.hf-frame video,.hf-frame img{max-width:100%;max-height:100%;border-radius:8px;background:#000;outline:1px solid var(--hf-line);
  box-shadow:0 10px 30px rgba(0,0,0,.3)}
.hf-frame-audio{flex-direction:column;gap:14px}
.hf-audio-card{display:flex;flex-direction:column;align-items:center;gap:10px;padding:26px 34px;border-radius:12px;
  background:var(--hf-layer);border:1px solid var(--hf-line)}
.hf-audio-icon{width:46px;height:46px;display:flex;align-items:center;justify-content:center;border-radius:50%;
  background:rgba(128,128,128,.12);color:var(--hf-text)}
.hf-audio-icon svg{width:22px;height:22px}
.hf-audio-name{font-size:12.5px;color:var(--hf-dim);max-width:340px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.hf-frame-audio audio{display:none}
.hf-frame:fullscreen{background:#000;padding:0;width:100vw;height:100vh;max-width:none;max-height:none;border-radius:0}
.hf-frame:fullscreen video{max-width:100vw;max-height:100vh;border-radius:0;outline:0}
.hf-placeholder{text-align:center;line-height:1.9}
.hf-placeholder b{display:block;font-size:14px;font-weight:600;color:var(--hf-text);margin-bottom:4px}
.hf-placeholder span{font-size:12px;color:var(--hf-dim)}

.hf-controls{display:flex;align-items:center;gap:10px;height:38px;min-height:38px;padding:0 14px;
  border-top:1px solid var(--hf-line);background:var(--hf-panel)}
.hf-controls .icon{width:30px;height:28px;display:inline-flex;align-items:center;justify-content:center;padding:0;border:0;border-radius:6px;
  background:transparent;color:var(--hf-text);cursor:pointer}
.hf-controls .icon:hover:not(:disabled){background:rgba(128,128,128,.16)}
.hf-controls .icon:disabled{opacity:.4;cursor:default}
.hf-controls .icon svg{width:15px;height:15px}
.hf-rate{min-width:38px;height:28px;padding:0 7px;border:0;border-radius:6px;background:transparent;
  color:var(--hf-text);font:11px/1 ui-monospace,Consolas,monospace;cursor:pointer;font-variant-numeric:tabular-nums}
.hf-rate:hover{background:rgba(128,128,128,.16)}
.hf-time{font:11.5px/1 ui-monospace,Consolas,monospace;color:var(--hf-dim);letter-spacing:.02em}
.hf-time b{color:var(--hf-text);font-weight:500}
.hf-vol{display:flex;align-items:center;gap:6px}
.hf-vol input{width:86px;height:3px;appearance:none;border-radius:2px;outline:none;background:var(--hf-line2)}
.hf-vol input::-webkit-slider-thumb{appearance:none;width:10px;height:10px;border-radius:50%;background:var(--hf-text);cursor:pointer}

.hf-timeline{flex:none;padding:6px 14px 26px;border-top:1px solid var(--hf-line);background:var(--hf-panel)}
.hf-tag{font:10.5px/16px ui-monospace,Consolas,monospace;color:var(--hf-accent)}
.hf-tl-grid{display:grid;grid-template-columns:40px minmax(0,1fr);gap:6px}
.hf-labels{display:flex;flex-direction:column;gap:4px}
.hf-labels div{display:flex;align-items:center;justify-content:center;border:1px solid var(--hf-line);border-radius:5px;
  color:var(--hf-dim);font:10px/1 ui-monospace,Consolas,monospace;letter-spacing:.08em;background:var(--hf-layer)}
.hf-scrollx{overflow-x:auto;overflow-y:hidden}
.hf-track{position:relative}
.hf-ruler{position:relative;height:20px;margin-bottom:4px;border-bottom:1px solid var(--hf-line);cursor:crosshair}
.hf-ruler div{position:absolute;bottom:0;width:1px;background:var(--hf-line2)}
.hf-ruler .major{height:8px}
.hf-ruler .minor{height:4px;opacity:.6}
.hf-ruler .tick-label{position:absolute;top:2px;bottom:auto;width:auto;height:auto;background:none;
  font:9.5px/1 ui-monospace,Consolas,monospace;color:var(--hf-dim);transform:translateX(3px)}
.hf-lane{position:relative;border:1px solid var(--hf-line);border-radius:5px;overflow:hidden;background:var(--hf-layer2);cursor:crosshair}
.hf-lane-video{height:74px;display:flex;gap:0}
.hf-lane-video img{flex:none;width:auto;height:100%;aspect-ratio:16/9;object-fit:cover;border-right:1px solid var(--hf-line);box-sizing:border-box}
.hf-lane-video img:last-child{border-right:0}
.hf-lane-empty{display:flex;align-items:center;justify-content:center;width:100%;font-size:11px;color:var(--hf-dim)}
.hf-lane-audio{height:50px;margin-top:5px}
.hf-lane-audio canvas{display:block;width:100%;height:100%}
.hf-selection{position:absolute;top:0;bottom:0;background:rgba(91,140,255,.2);
  border-left:1px solid var(--hf-accent);border-right:1px solid var(--hf-accent)}
.hf-selection-handle{position:absolute;top:0;bottom:0;width:5px;background:var(--hf-accent)}
.hf-selection-tag{position:absolute;top:3px;transform:translateX(-50%);padding:0 5px;border-radius:3px;white-space:nowrap;
  background:var(--hf-layer);border:1px solid var(--hf-line2);color:var(--hf-text);font:10px/15px ui-monospace,Consolas,monospace}
.hf-playhead{position:absolute;top:0;bottom:0;width:2px;background:#ff4d67;transition:left .12s linear}
.hf-playhead-head{position:absolute;width:11px;height:11px;margin-left:-5.5px;background:#ff4d67;clip-path:polygon(50% 100%,0 0,100% 0);transition:left .12s linear}

.hf-status{display:flex;align-items:center;gap:8px;padding:12px 12px 4px;font-size:11.5px;color:var(--hf-dim);min-width:0}
.hf-status span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.hf-dot{width:7px;height:7px;border-radius:50%;background:var(--hf-line2);flex:none}
.hf-dot.run{background:var(--hf-ok)}
.hf-dot.wait{background:var(--hf-warn)}
.hf-dot.busy{background:var(--hf-accent);animation:hf-blink 1.3s ease-in-out infinite}
@keyframes hf-blink{0%,100%{opacity:1}50%{opacity:.45}}

.hf-chips{display:flex;flex-wrap:wrap;gap:6px;padding:8px 12px 0;max-height:120px;overflow:auto}
.hf-chip{display:inline-flex;align-items:center;gap:6px;max-width:100%;padding:3px 5px 3px 9px;border-radius:20px;font-size:11px;
  border:1px solid var(--hf-line2);background:var(--hf-layer);color:var(--hf-text)}
.hf-chip span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:240px}
.hf-chip button{padding:0 3px;border:0;background:none;color:var(--hf-dim);font-size:13px;line-height:1;cursor:pointer}
.hf-hint{padding:8px 12px 0;font-size:11px;color:var(--hf-dim)}
.hf-warn{color:var(--hf-warn)}
.hf-compose{flex:1;min-height:0;display:flex;flex-direction:column;gap:8px;padding:10px 12px 12px}
.hf-compose textarea{flex:none;height:200px;resize:vertical;min-height:120px;max-height:340px;padding:10px 11px;border-radius:8px;font:12.5px/1.65 inherit;outline:none;
  color:var(--hf-text);background:var(--hf-layer2);border:1px solid var(--hf-line)}
.hf-compose textarea:focus{border-color:var(--hf-accent)}
.hf-compose textarea:disabled{opacity:.5}
.hf-compose-row{display:flex;gap:8px}
.hf-compose-row .hf-btn{flex:1}
.hf-config-entry{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:9px 12px;cursor:pointer;
  border-top:1px solid var(--hf-line);font-size:11.5px;color:var(--hf-dim)}
.hf-config-entry:hover{background:rgba(128,128,128,.12)}
.hf-config-entry b{font-weight:400;font-family:ui-monospace,Consolas,monospace;font-size:11px;color:var(--hf-text)}

.hf-config{flex:1;min-height:0;display:flex;flex-direction:column}
.hf-config-body{flex:1;min-height:0;overflow:auto;padding:12px}
.hf-field{padding:10px 0;border-bottom:1px solid var(--hf-line)}
.hf-field:last-child{border-bottom:0}
.hf-field label{display:block;margin-bottom:8px;font-size:11.5px;color:var(--hf-dim)}
.hf-choices{display:flex;flex-wrap:wrap;gap:6px}
.hf-choice{display:flex;align-items:baseline;gap:6px;padding:5px 9px;border-radius:6px;font:11.5px/1.6 inherit;cursor:pointer;
  border:1px solid transparent;background:transparent;color:var(--hf-text)}
.hf-choice small{font-size:9.5px;color:var(--hf-dim)}
.hf-choice:hover:not(:disabled){background:rgba(128,128,128,.14)}
.hf-choice.on{border-color:var(--hf-accent);background:rgba(91,140,255,.14)}
.hf-choice:disabled{opacity:.4;cursor:default}
.hf-config-foot{display:flex;gap:8px;padding:10px 12px;border-top:1px solid var(--hf-line)}

.hf-gate{max-width:520px;padding:22px 24px;border-radius:12px;background:var(--hf-layer);border:1px solid var(--hf-line)}
.hf-gate h2{margin:0 0 14px;font-size:15px;font-weight:600;color:var(--hf-text)}
.hf-dep{display:flex;align-items:center;gap:10px;padding:8px 2px;font-size:12px;border-top:1px solid var(--hf-line)}
.hf-dep:first-of-type{border-top:0}
.hf-dep i{width:7px;height:7px;border-radius:50%;flex:none}
.hf-dep.ok i{background:var(--hf-ok)}
.hf-dep.bad i{background:var(--hf-danger)}
.hf-dep b{font-weight:400;width:92px;flex:none;color:var(--hf-text)}
.hf-dep span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
  font:11px/1.6 ui-monospace,Consolas,monospace;color:var(--hf-dim)}
.hf-gate-actions{display:flex;gap:8px;margin-top:18px}
@container (max-width: 1120px){
  .hf-bar-sub{display:none}
  .hf-hide-narrow{display:none!important}
  .hf-chip span{max-width:150px}
  .hf-controls{gap:8px}
}
@container (max-width: 880px){
  .hf-hide-tiny{display:none!important}
  .hf-bar h1{max-width:150px;overflow:hidden;text-overflow:ellipsis}
}
.hf-modal{position:absolute;inset:0;z-index:20;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.48)}
.hf-modal-card{width:min(420px,86%);padding:18px 20px;border-radius:10px;background:var(--hf-layer);border:1px solid var(--hf-line2);
  box-shadow:0 22px 60px rgba(0,0,0,.45)}
.hf-modal-card h3{margin:0 0 8px;font-size:14px;font-weight:600;color:var(--hf-text)}
.hf-modal-card p{margin:0;font-size:12px;line-height:1.75;color:var(--hf-dim);word-break:break-word}
.hf-modal-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:16px}
.hf-log{margin-top:12px;max-height:140px;overflow:auto;padding:8px 10px;border-radius:6px;white-space:pre-wrap;
  border:1px solid var(--hf-line);background:var(--hf-bg);font:10.5px/1.6 ui-monospace,Consolas,monospace;color:var(--hf-dim)}
`

    /* ───────────── 常量 ───────────── */

    const RESOLUTIONS = [
      { width: 1280, height: 720, label: '1280×720', note: '16:9' },
      { width: 1920, height: 1080, label: '1920×1080', note: '16:9' },
      { width: 2560, height: 1440, label: '2560×1440', note: '16:9' },
    ]
    const FRAME_RATES = [24, 25, 30, 50, 60]
    const FORMATS = [
      { id: 'mp4', label: 'MP4', note: '通用' },
      { id: 'webm', label: 'WebM', note: '实验' },
    ]
    const VIDEO_RE = /\.(mp4|mov|webm|mkv|m4v)$/i
    const AUDIO_RE = /\.(mp3|wav|m4a|aac|flac|ogg)$/i

    const pad = (value, width = 2) => String(value).padStart(width, '0')
    const timecode = (seconds) => {
      const total = Math.max(0, Number(seconds) || 0)
      const minutes = Math.floor(total / 60)
      const rest = total - minutes * 60
      const whole = Math.floor(rest)
      return `${pad(minutes)}:${pad(whole)}.${pad(Math.round((rest - whole) * 1000), 3)}`
    }
    const shortTime = (seconds) => {
      const total = Math.max(0, Number(seconds) || 0)
      const minutes = Math.floor(total / 60)
      const rest = total - minutes * 60
      return minutes > 0 ? `${minutes}:${pad(Math.floor(rest))}` : `${rest.toFixed(1)}s`
    }
    const sameJson = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null)

    const fileSize = (bytes) => {
      const value = Number(bytes) || 0
      if (value > 1048576) return `${(value / 1048576).toFixed(1)} MB`
      if (value > 1024) return `${Math.round(value / 1024)} KB`
      return `${value} B`
    }

    /* ───────────── 图标 ───────────── */

    const Icon = ({ children, size = 15 }) =>
      h(
        'svg',
        {
          viewBox: '0 0 16 16',
          width: size,
          height: size,
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.6,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          'aria-hidden': true,
        },
        children,
      )

    const PlayIcon = () => h(Icon, null, h('path', { d: 'M4.8 3.2l7.4 4.8-7.4 4.8z', fill: 'currentColor', stroke: 'none' }))

    const PauseIcon = () =>
      h(
        Icon,
        null,
        h('rect', { x: 4.4, y: 3.2, width: 2.3, height: 9.6, rx: 0.9, fill: 'currentColor', stroke: 'none' }),
        h('rect', { x: 9.3, y: 3.2, width: 2.3, height: 9.6, rx: 0.9, fill: 'currentColor', stroke: 'none' }),
      )

    const VolumeIcon = ({ muted }) =>
      h(
        Icon,
        null,
        h('path', { d: 'M3.2 5.8h2.1L8.4 3.4v9.2L5.3 10.2H3.2z', fill: 'currentColor', stroke: 'none' }),
        muted
          ? h('path', { d: 'M10.6 5.9l3.4 4.2M14 5.9l-3.4 4.2', strokeWidth: 1.5 })
          : h('path', { d: 'M10.6 5.4a3.6 3.6 0 010 5.2M12.4 3.7a6.1 6.1 0 010 8.6', strokeWidth: 1.5 }),
      )

    const FullscreenIcon = ({ on }) =>
      h(
        Icon,
        null,
        h('path', {
          d: on
            ? 'M6.2 2.6v3.6H2.6M9.8 2.6v3.6h3.6M6.2 13.4V9.8H2.6M9.8 13.4V9.8h3.6'
            : 'M2.6 6.2V2.6h3.6M13.4 6.2V2.6H9.8M2.6 9.8v3.6h3.6M13.4 9.8v3.6H9.8',
          strokeWidth: 1.5,
        }),
      )

    const RefreshIcon = () =>
      h(Icon, null, h('path', { d: 'M13.2 8a5.2 5.2 0 1 1-1.7-3.8' }), h('path', { d: 'M13.3 2.6v3.3h-3.3' }))

    const PlusIcon = () => h(Icon, null, h('path', { d: 'M8 3.4v9.2M3.4 8h9.2' }))

    const CrossIcon = () => h(Icon, null, h('path', { d: 'M4.3 4.3l7.4 7.4M11.7 4.3l-7.4 7.4' }))

    /* ───────────── 数据层 ───────────── */

    const createApi = (sessionId) => {
      const query = (params) => {
        const search = new URLSearchParams({ sessionId })
        Object.entries(params ?? {}).forEach(([key, value]) => {
          if (value !== undefined && value !== null) search.set(key, String(value))
        })
        return search.toString()
      }
      return {
        get: (action, params) => fetch(`/hf/${action}?${query(params)}`).then((response) => response.json()),
        post: (action, body) =>
          fetch(`/hf/${action}`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ sessionId, ...body }),
          }).then((response) => response.json()),
        media: (project, rel) => `/hf/media?${query({ name: project, rel })}`,
      }
    }

    /* ───────────── 媒体分析 ───────────── */

    const seekTo = (video, time) =>
      new Promise((resolve) => {
        let settled = false
        const done = () => {
          if (settled) return
          settled = true
          video.removeEventListener('seeked', done)
          resolve()
        }
        video.addEventListener('seeked', done)
        setTimeout(done, 900)
        try {
          video.currentTime = time
        } catch {
          done()
        }
      })

    const readFilmstrip = async (url) => {
      const video = document.createElement('video')
      video.muted = true
      video.preload = 'auto'
      video.src = url
      const loaded = await new Promise((resolve) => {
        video.addEventListener('loadeddata', () => resolve(true), { once: true })
        video.addEventListener('error', () => resolve(false), { once: true })
        setTimeout(() => resolve(video.readyState >= 2), 6000)
      })
      if (!loaded) return { frames: [], duration: 0 }
      const duration = Number(video.duration) || 0
      const canvas = document.createElement('canvas')
      canvas.width = 168
      canvas.height = 94
      const context = canvas.getContext('2d')
      const frames = []
      const trackWidth = Math.max(820, Math.round(duration * 26))
      const total = Math.max(6, Math.min(Math.ceil(trackWidth / 132), 32))
      for (let index = 0; index < total; index += 1) {
        await seekTo(video, duration > 0 ? (duration * (index + 0.5)) / total : 0)
        try {
          context.drawImage(video, 0, 0, canvas.width, canvas.height)
          frames.push({ url: canvas.toDataURL('image/jpeg', 0.62) })
        } catch {
          frames.push({ url: '' })
        }
      }
      video.removeAttribute('src')
      return { frames, duration }
    }

    const readWaveform = async (url) => {
      const response = await fetch(url)
      const buffer = await response.arrayBuffer()
      if (buffer.byteLength > 120 * 1024 * 1024) return null
      const AudioCtor = window.AudioContext || window.webkitAudioContext
      if (!AudioCtor) return null
      const audio = new AudioCtor()
      const decoded = await audio.decodeAudioData(buffer.slice(0))
      audio.close?.()
      const channel = decoded.getChannelData(0)
      const bins = 420
      const step = Math.max(1, Math.floor(channel.length / bins))
      return Array.from({ length: bins }, (_, bin) => {
        let peak = 0
        const start = bin * step
        for (let i = 0; i < step; i += 6) peak = Math.max(peak, Math.abs(channel[start + i] ?? 0))
        return peak
      })
    }

    /* ───────────── 基础组件 ───────────── */

    const ColumnHeader = ({ title, subtitle, children }) =>
      h(
        'div',
        { className: 'hf-bar' },
        h('h1', null, title),
        subtitle ? h('div', { className: 'hf-bar-sub', title: subtitle }, subtitle) : h('div', { className: 'hf-grow' }),
        children,
      )

    const Section = ({ title, count, children }) =>
      h(
        'div',
        null,
        h('div', { className: 'hf-section' }, h('span', null, title), h('span', { className: 'hf-count' }, String(count))),
        children,
      )

    const Choice = ({ on, disabled, onClick, children }) =>
      h('button', { className: `hf-choice${on ? ' on' : ''}`, disabled, onClick }, children)

    const Status = ({ phase, line, running }) => {
      const table = {
        idle: ['就绪', ''],
        pending: ['等待发送', 'wait'],
        sending: ['发送中', 'busy'],
        running: ['运行中', 'run'],
        installing: ['安装依赖', 'busy'],
      }
      const [label, tone] = table[phase] ?? table.idle
      const showRuntime = line && (phase === 'idle' || phase === 'running')
      const text = showRuntime ? line : label
      const dot = running ? 'run' : tone
      return h('div', { className: 'hf-status', title: text }, h('i', { className: `hf-dot ${dot}` }), h('span', null, text))
    }

    /* ───────────── 主组件 ───────────── */

    function Workbench(props) {
      const sessionId = props.sessionId
      const api = useMemo(() => createApi(sessionId), [sessionId])

      const [theme, setTheme] = useState('dark')
      const [projects, setProjects] = useState([])
      const [workspace, setWorkspace] = useState('')
      const [project, setProject] = useState(null)
      const [deps, setDeps] = useState(null)
      const [error, setError] = useState('')
      const [busy, setBusy] = useState('')
      const [installLog, setInstallLog] = useState('')
      const [newName, setNewName] = useState('')
      const [selectedOutput, setSelectedOutput] = useState('')
      const [preview, setPreview] = useState(null)
      const [chips, setChips] = useState([])
      const [draft, setDraft] = useState('')
      const [note, setNote] = useState('')
      const [sending, setSending] = useState(false)
      const [running, setRunning] = useState(false)
      const [statusLine, setStatusLine] = useState('')
      const [duration, setDuration] = useState(0)
      const [frames, setFrames] = useState([])
      const [wave, setWave] = useState(null)
      const [time, setTime] = useState(0)
      const [playing, setPlaying] = useState(false)
      const [selection, setSelection] = useState(null)
      
      const [muted, setMuted] = useState(false)
      const [rate, setRate] = useState(1)
      const [volume, setVolume] = useState(1)
      const [configOpen, setConfigOpen] = useState(false)
      const [draftSettings, setDraftSettings] = useState(null)
      const [browsers, setBrowsers] = useState([])
      const [box, setBox] = useState(null)
      const [fullscreen, setFullscreen] = useState(false)
      const [caps, setCaps] = useState({ images: true, known: false, modelName: undefined })
      const [pendingDelete, setPendingDelete] = useState(null)

      const anchorRef = useRef(null)
      const pickedRef = useRef(false)
      const selectionRef = useRef(null)
      const videoRef = useRef(null)
      const canvasRef = useRef(null)
      const scrollerRef = useRef(null)
      const durationRef = useRef(0)
      const playingRef = useRef(false)
      const lastPaintRef = useRef(0)

      const outputRel = selectedOutput || project?.outputs?.[0]?.rel || ''
      const showingOutput = Boolean(project && !preview && outputRel)
      const outputUrl = showingOutput ? api.media(project.name, outputRel) : ''
      const settings = project?.settings ?? { width: 1920, height: 1080, fps: 30, format: 'mp4', browser: 'auto' }
      const fps = settings.fps || 30
      const ready = Boolean(deps?.ready)

      const phase = busy
        ? busy.startsWith('安装')
          ? 'installing'
          : 'sending'
        : sending
          ? 'sending'
          : running
            ? 'running'
            : draft.trim() || chips.length
              ? 'pending'
              : 'idle'

      /* 主题跟随：读取 DSH 页面背景亮度 */
      useEffect(() => {
        const detect = () => {
          const probe = getComputedStyle(document.body).backgroundColor || ''
          const match = probe.match(/(\d+)[,\s]+(\d+)[,\s]+(\d+)/)
          if (!match) return
          const [r, g, b] = [Number(match[1]), Number(match[2]), Number(match[3])]
          setTheme(0.2126 * r + 0.7152 * g + 0.0722 * b > 150 ? 'light' : 'dark')
        }
        detect()
        const observer = new MutationObserver(detect)
        observer.observe(document.body, { attributes: true, attributeFilter: ['class', 'style', 'data-theme'] })
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style', 'data-theme'] })
        return () => observer.disconnect()
      }, [])

      /* 覆盖会话正文区域 */
      useEffect(() => {
        const measure = () => {
          const element = anchorRef.current
          if (!element) return
          const rect = element.getBoundingClientRect()
          const next = {
            top: Math.round(rect.top),
            left: Math.round(rect.left),
            width: Math.round(rect.width),
            height: Math.round(Math.max(320, window.innerHeight - rect.top)),
          }
          setBox((current) => (current && Object.keys(next).every((key) => current[key] === next[key]) ? current : next))
        }
        measure()
        window.addEventListener('resize', measure)
        window.addEventListener('scroll', measure, true)
        const timer = setInterval(measure, 1200)
        return () => {
          window.removeEventListener('resize', measure)
          window.removeEventListener('scroll', measure, true)
          clearInterval(timer)
        }
      }, [])

      useEffect(() => {
        if (!pendingDelete) return undefined
        const onKey = (event) => event.key === 'Escape' && setPendingDelete(null)
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
      }, [pendingDelete])

      const confirmDelete = async () => {
        const target = pendingDelete
        setPendingDelete(null)
        if (!target) return
        if (target.type === 'project') await removeProject(target.name)
        else await removeFile(target.rel)
      }

      const loadProjects = async () => {
        const data = await api.get('projects')
        if (data?.error) return setError(data.error)
        setWorkspace(data.workspace ?? '')
        setProjects(data.projects ?? [])
        if (!pickedRef.current && data.projects?.length) {
          pickedRef.current = true
          let remembered = ''
          try {
            remembered = localStorage.getItem(`hf:last:${sessionId}`) ?? ''
          } catch {
            remembered = ''
          }
          openProject((data.projects.find((item) => item.name === remembered) ?? data.projects[0]).name)
        }
      }

      const openProject = async (name) => {
        setConfigOpen(false)
        setPreview(null)
        setSelection(null)
        setFrames([])
        setWave(null)
        setTime(0)
        try {
          localStorage.setItem(`hf:last:${sessionId}`, name)
        } catch {
          /* ignore */
        }
        const data = await api.get('project', { name })
        if (data?.error) return setError(data.error)
        setProject(data.project)
        setDeps(data.deps ?? null)
        setSelectedOutput((current) =>
          current && data.project.outputs.some((item) => item.rel === current) ? current : data.project.outputs[0]?.rel ?? '',
        )
        setError('')
      }

      const refreshProject = async () => {
        if (!project?.name || playingRef.current || document.hidden) return
        const data = await api.get('project', { name: project.name })
        if (data?.error) return
        setProject((current) => (sameJson(current, data.project) ? current : data.project))
        setDeps((current) => (sameJson(current, data.deps) ? current : data.deps ?? null))
        setSelectedOutput((current) =>
          current && data.project.outputs.some((item) => item.rel === current) ? current : data.project.outputs[0]?.rel ?? '',
        )
      }

      useEffect(() => {
        loadProjects()
      }, [sessionId])

      useEffect(() => {
        if (!project?.name) return undefined
        const timer = setInterval(refreshProject, 8000)
        return () => clearInterval(timer)
      }, [project?.name])

      useEffect(() => {
        let active = true
        const poll = async () => {
          if (document.hidden) return
          const data = await api.get('status')
          if (active) {
            setRunning(Boolean(data?.running))
            setStatusLine(String(data?.line ?? ''))
          }
        }
        poll()
        const timer = setInterval(poll, 2500)
        return () => {
          active = false
          clearInterval(timer)
        }
      }, [api])

      useEffect(() => {
        setFrames([])
        setWave(null)
        setDuration(0)
        setTime(0)
        setSelection(null)
        if (!outputUrl) return undefined
        let active = true
        const schedule = window.requestIdleCallback ?? ((run) => setTimeout(run, 600))
        schedule(() => {
          readFilmstrip(outputUrl).then((result) => {
            if (!active) return
            setFrames(result.frames)
            if (result.duration) setDuration(result.duration)
          })
        })
        schedule(() => {
          readWaveform(outputUrl)
            .then((peaks) => {
              if (active && peaks) setWave(peaks)
            })
            .catch(() => {})
        })
        return () => {
          active = false
        }
      }, [outputUrl])

      useEffect(() => {
        if (!wave || !canvasRef.current) return
        const canvas = canvasRef.current
        const width = canvas.clientWidth || 600
        const height = canvas.clientHeight || 36
        const ratio = window.devicePixelRatio || 1
        canvas.width = Math.floor(width * ratio)
        canvas.height = Math.floor(height * ratio)
        const context = canvas.getContext('2d')
        context.scale(ratio, ratio)
        context.clearRect(0, 0, width, height)
        context.fillStyle = theme === 'light' ? 'rgba(47,98,232,.55)' : 'rgba(91,140,255,.6)'
        const step = width / Math.max(1, wave.length)
        wave.forEach((peak, index) => {
          const bar = Math.max(0.02, Math.min(1, peak * 1.7)) * (height - 8)
          context.fillRect(index * step, (height - bar) / 2, Math.max(1, step - 0.7), bar)
        })
      }, [wave, theme])

      useEffect(() => {
        selectionRef.current = selection
      }, [selection])

      useEffect(() => {
        durationRef.current = duration
      }, [duration])

      useEffect(() => {
        if (scrollerRef.current) scrollerRef.current.scrollLeft = 0
      }, [outputUrl])

      useEffect(() => {
        const element = scrollerRef.current
        if (!element) return undefined
        const onWheel = (event) => {
          if (element.scrollWidth <= element.clientWidth) return
          if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return
          element.scrollLeft += event.deltaY
          event.preventDefault()
        }
        element.addEventListener('wheel', onWheel, { passive: false })
        return () => element.removeEventListener('wheel', onWheel)
      }, [outputUrl])

      useEffect(() => {
        let active = true
        const poll = async () => {
          if (document.hidden) return
          const data = await api.get('capabilities')
          if (active && data && typeof data.images === 'boolean') {
            setCaps((current) =>
              current.images === data.images && current.modelName === data.modelName ? current : data,
            )
          }
        }
        poll()
        const timer = setInterval(poll, 15000)
        return () => {
          active = false
          clearInterval(timer)
        }
      }, [api])

      const imageUnsupported = caps.images === false

      useEffect(() => {
        const video = videoRef.current
        if (!video) return undefined
        const onTime = () => {
          const at = video.currentTime || 0
          const range = selectionRef.current
          if (range && !video.paused) {
            const end = Math.max(range.start, range.end)
            if (at >= end - 0.001) {
              video.pause()
              video.currentTime = end
              setTime(end)
              return
            }
          }
          if (!video.paused) {
            const now = performance.now()
            if (now - lastPaintRef.current < 120) return
            lastPaintRef.current = now
          }
          setTime(at)
          const scroller = scrollerRef.current
          if (!scroller || durationRef.current <= 0) return
          const track = Math.max(820, Math.round(durationRef.current * 26))
          const x = (at / durationRef.current) * track
          const left = scroller.scrollLeft
          const width = scroller.clientWidth
          if (x < left + 40 || x > left + width - 60) {
            scroller.scrollLeft = Math.max(0, x - width / 2)
          }
        }
        const onMeta = () => setDuration(video.duration || 0)
        const onPlay = () => {
          playingRef.current = true
          setPlaying(true)
        }
        const onPause = () => {
          playingRef.current = false
          setPlaying(false)
        }
        video.addEventListener('timeupdate', onTime)
        video.addEventListener('loadedmetadata', onMeta)
        video.addEventListener('play', onPlay)
        video.addEventListener('pause', onPause)
        return () => {
          video.removeEventListener('timeupdate', onTime)
          video.removeEventListener('loadedmetadata', onMeta)
          video.removeEventListener('play', onPlay)
          video.removeEventListener('pause', onPause)
        }
      }, [outputUrl, preview?.rel])

      useEffect(() => {
        const video = videoRef.current
        if (!video) return
        video.muted = muted
        video.volume = volume
        video.playbackRate = rate
      }, [muted, volume, rate, outputUrl, preview?.rel])

      useEffect(() => {
        const onChange = () => setFullscreen(Boolean(document.fullscreenElement))
        document.addEventListener('fullscreenchange', onChange)
        return () => document.removeEventListener('fullscreenchange', onChange)
      }, [])

      const toggleFullscreen = () => {
        if (document.fullscreenElement) {
          document.exitFullscreen?.()
          return
        }
        const target = videoRef.current?.parentElement
        target?.requestFullscreen?.().catch(() => {})
      }

      /* 操作 */

      const addChip = (text) =>
        setChips((current) =>
          current.some((chip) => chip.text === text) ? current : [...current, { id: `${Date.now()}${Math.random()}`, text }],
        )

      const createProject = async () => {
        const name = newName.trim()
        if (!name) return
        setBusy('创建项目…')
        const data = await api.post('project', { name })
        setBusy('')
        if (data?.error) return setError(data.error)
        setNewName('')
        setWorkspace(data.workspace ?? workspace)
        setProject(data.project)
        setDeps(data.deps ?? null)
        pickedRef.current = true
        loadProjects()
      }

      const installDeps = async (kind) => {
        if (!project?.name) return
        setBusy('安装依赖…')
        setInstallLog('')
        const data = await api.post('install', { name: project.name, kind })
        setBusy('')
        setDeps(data.deps ?? deps)
        setInstallLog(String(data.output ?? '').slice(-2600))
        if (!data.ok) setNote('部分依赖安装失败')
      }

      const removeProject = async (name) => {
        const data = await api.post('project-delete', { name })
        if (data?.error) return setNote(data.error)
        if (project?.name === name) {
          setProject(null)
          setDeps(null)
          setPreview(null)
          setSelectedOutput('')
          pickedRef.current = false
        }
        setNote(`已删除项目 ${name}`)
        loadProjects()
      }

      const removeFile = async (rel) => {
        if (!project?.name) return
        const data = await api.post('delete', { name: project.name, rel })
        if (data?.error) return setNote(data.error)
        setProject(data.project)
        setDeps(data.deps ?? deps)
        setPreview((current) => (current?.rel === rel ? null : current))
        setSelectedOutput((current) => (current === rel ? '' : current))
        setNote(`已删除 ${rel.split('/').pop()}`)
      }

      const send = async (withRender) => {
        if (imageUnsupported) {
          setNote(`当前模型「${caps.modelName ?? '未知'}」不支持图片输入，已禁止发送`)
          return
        }
        const payload = [chips.map((chip) => chip.text).join('\n'), draft.trim()].filter(Boolean).join('\n\n')
        if (!payload) return
        setSending(true)
        const result = await api.post('send', { text: payload, name: project?.name, render: withRender })
        setSending(false)
        if (!result?.ok) return setNote(result?.error ?? '发送失败')
        setDraft('')
        setChips([])
        setNote(withRender ? '已发送，等待渲染产出' : '已发送')
      }

      const openConfig = async () => {
        const data = await api.get('browsers')
        setBrowsers(data?.browsers ?? [])
        setDraftSettings({ ...settings })
        setConfigOpen(true)
      }

      const saveConfig = async () => {
        if (!project?.name || !draftSettings) return
        const data = await api.post('settings', { name: project.name, settings: draftSettings })
        if (data?.error) return setNote(data.error)
        setProject(data.project)
        setDeps(data.deps ?? deps)
        setConfigOpen(false)
        setNote('配置已保存')
      }

      /* 时间轴 */

      const timeAt = (element, clientX) => {
        const rect = element.getBoundingClientRect()
        const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / Math.max(1, rect.width)))
        return Math.min(duration || 0, Math.max(0, Math.round(ratio * (duration || 0) * fps) / fps))
      }

      const startDrag = (event) => {        if (!duration) return
        const element = event.currentTarget
        const anchor = timeAt(element, event.clientX)
        element.setPointerCapture?.(event.pointerId)
        setSelection({ start: anchor, end: anchor })
        const onMove = (move) => setSelection({ start: anchor, end: timeAt(element, move.clientX) })
        const onUp = (up) => {
          const end = timeAt(element, up.clientX)
          const [from, to] = anchor <= end ? [anchor, end] : [end, anchor]
          setSelection(to - from > 0.03 ? { start: from, end: to } : null)
          if (to - from <= 0.03 && videoRef.current) videoRef.current.currentTime = anchor
          window.removeEventListener('pointermove', onMove)
          window.removeEventListener('pointerup', onUp)
        }
        window.addEventListener('pointermove', onMove)
        window.addEventListener('pointerup', onUp)
      }

      const togglePlay = () => {
        const video = videoRef.current
        if (!video) return
        if (!video.paused) return video.pause()
        if (selection) {
          const from = Math.min(selection.start, selection.end)
          const to = Math.max(selection.start, selection.end)
          if (video.currentTime < from || video.currentTime >= to - 0.02) {
            video.currentTime = from
            setTime(from)
          }
        }
        video.play().catch(() => {})
      }

      const injectSelection = (lane) => {
        if (!selection || !outputRel) return
        const from = Math.min(selection.start, selection.end)
        const to = Math.max(selection.start, selection.end)
        addChip(
          lane === 'audio'
            ? `[音频] ${outputRel} ${timecode(from)}–${timecode(to)}`
            : `[视频] ${outputRel} ${timecode(from)}–${timecode(to)}（${fps}fps，第 ${Math.round(from * fps)}–${Math.round(to * fps)} 帧）`,
        )
      }

      /* 派生值 */

      const assets = useMemo(() => {
        const groups = project?.assets ?? {}
        return [...(groups.image ?? []), ...(groups.video ?? []), ...(groups.audio ?? [])]
      }, [project])

      const compositions = useMemo(() => (project?.sources ?? []).filter((source) => source.rel.endsWith('.html')), [project])

      const sel = selection
        ? {
            left: `${(Math.min(selection.start, selection.end) / (duration || 1)) * 100}%`,
            width: `${Math.max(0.3, ((Math.max(selection.start, selection.end) - Math.min(selection.start, selection.end)) / (duration || 1)) * 100)}%`,
          }
        : null
      const playheadLeft = duration ? `${Math.min(100, (time / duration) * 100)}%` : '0%'
      const trackWidth = `${Math.max(820, Math.round((duration || 0) * 26))}px`

      const ticks = useMemo(() => {
        if (!duration) return []
        const steps = [0.1, 0.2, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600]
        const step = steps.find((candidate) => candidate >= duration / 8) ?? 600
        const nodes = []
        for (let at = 0; at <= duration + 1e-6; at += step) {
          const ratio = (at / duration) * 100
          nodes.push(h('div', { key: `m${at}`, className: 'major', style: { left: `${ratio}%` } }))
          nodes.push(h('div', { key: `l${at}`, className: 'tick-label', style: { left: `${ratio}%` } }, shortTime(at)))
          for (let sub = 1; sub < 4; sub += 1) {
            const minor = at + (step * sub) / 4
            if (minor > duration) break
            nodes.push(h('div', { key: `s${at}-${sub}`, className: 'minor', style: { left: `${(minor / duration) * 100}%` } }))
          }
        }
        return nodes
      }, [duration])

      /* 片段 */

      const renderGate = () =>
        h(
          'div',
          { className: 'hf-gate' },
          h('h2', null, '渲染环境未就绪'),
          (deps?.items ?? []).map((item) =>
            h(
              'div',
              { key: item.id, className: `hf-dep ${item.ok ? 'ok' : 'bad'}` },
              h('i'),
              h('b', null, item.label),
              h('span', { title: `${item.detail} — ${item.hint}` }, item.detail),
            ),
          ),
          h(
            'div',
            { className: 'hf-gate-actions' },
            h('button', { className: 'hf-btn hf-btn-primary', disabled: Boolean(busy), onClick: () => installDeps('all') }, busy ? '安装中…' : '安装依赖'),
            h('button', { className: 'hf-btn', disabled: Boolean(busy), onClick: () => installDeps('ffmpeg') }, '仅 FFmpeg'),
            h('button', { className: 'hf-btn', disabled: Boolean(busy), onClick: () => installDeps('hyperframes') }, '仅 HyperFrames'),
          ),
          installLog ? h('div', { className: 'hf-log' }, installLog) : null,
        )

      const renderStage = () => {
        if (!project) return h('div', { className: 'hf-placeholder' }, h('b', null, '未打开项目'), h('span', null, '在左侧新建或选择项目'))
        if (!deps) return h('div', { className: 'hf-placeholder' }, h('b', null, '检测环境…'))
        if (!deps.ready) return renderGate()
        if (preview) {
          const src = api.media(project.name, preview.rel)
          if (VIDEO_RE.test(preview.rel)) {
            return h('div', { className: 'hf-frame' }, h('video', { ref: videoRef, src, preload: 'auto', onClick: togglePlay }))
          }
          if (AUDIO_RE.test(preview.rel)) {
            return h(
              'div',
              { className: 'hf-frame hf-frame-audio' },
              h('div', { className: 'hf-audio-card' },
                h('div', { className: 'hf-audio-icon' }, h(VolumeIcon, { muted: false })),
                h('div', { className: 'hf-audio-name', title: preview.rel }, preview.rel.split('/').pop()),
              ),
              h('audio', { ref: videoRef, src, preload: 'auto' }),
            )
          }
          return h('div', { className: 'hf-frame' }, h('img', { src, alt: preview.rel }))
        }
        if (!outputUrl) return h('div', { className: 'hf-placeholder' }, h('b', null, '暂无产出'), h('span', null, '发送修改要求后自动渲染'))
        return h('div', { className: 'hf-frame' }, h('video', { ref: videoRef, src: outputUrl, preload: 'auto', onClick: togglePlay }))
      }

      const renderControls = () => {
        if (preview) {
          const videoPreview = VIDEO_RE.test(preview.rel) || AUDIO_RE.test(preview.rel)
          return h(
            'div',
            { className: 'hf-controls' },
            videoPreview
              ? h('button', { className: 'icon', onClick: togglePlay, title: playing ? '暂停' : '播放' }, playing ? h(PauseIcon) : h(PlayIcon))
              : null,
            videoPreview ? h('div', { className: 'hf-time' }, h('b', null, timecode(time)), ' / ', timecode(duration)) : null,
            h('div', { className: 'hf-time', style: { flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' } }, preview.rel),
            h('button', { className: 'hf-btn hf-btn-sm', onClick: () => addChip(`[素材] ${preview.rel}`) }, '注入到提示词'),
          )
        }
        if (!outputUrl) return null
        const range = selection
          ? {
              from: Math.min(selection.start, selection.end),
              to: Math.max(selection.start, selection.end),
            }
          : null
        return h(
          'div',
          { className: 'hf-controls' },
          h('button', { className: 'icon', onClick: togglePlay, title: playing ? '暂停' : '播放' }, playing ? h(PauseIcon) : h(PlayIcon)),
          h('div', { className: 'hf-time' }, h('b', null, timecode(time)), ' / ', timecode(duration)),
          h('span', { className: 'hf-time hf-hide-narrow' }, `${fps}fps · 第 ${Math.round(time * fps)} 帧`),
          h(
            'button',
            {
              className: 'hf-rate',
              title: '播放速度',
              onClick: () => {
                const order = [0.5, 1, 1.5, 2]
                setRate(order[(order.indexOf(rate) + 1) % order.length] ?? 1)
              },
            },
            `${rate}×`,
          ),
          range ? h('span', { className: 'hf-tag hf-hide-narrow' }, `${timecode(range.from)} → ${timecode(range.to)}`) : null,
          h('div', { className: 'hf-grow' }),
          range ? h('button', { className: 'hf-btn hf-btn-sm', onClick: () => injectSelection('video') }, '引用视频区间') : null,
          range ? h('button', { className: 'hf-btn hf-btn-sm', onClick: () => injectSelection('audio') }, '引用音频区间') : null,
          h(
            'div',
            { className: 'hf-vol' },
            h('button', { className: 'icon', onClick: () => setMuted(!muted), title: muted ? '取消静音' : '静音' }, h(VolumeIcon, { muted })),
            h('input', {
              className: 'hf-hide-tiny',
              type: 'range',
              min: 0,
              max: 1,
              step: 0.01,
              value: muted ? 0 : volume,
              onChange: (event) => {
                const value = Number(event.target.value)
                setVolume(value)
                setMuted(value === 0)
              },
            }),
          ),
          h('button', { className: 'icon', onClick: toggleFullscreen, title: fullscreen ? '退出全屏' : '全屏' }, h(FullscreenIcon, { on: fullscreen })),
        )
      }

      const renderTimeline = () => {
        if (!outputUrl) return null
        return h(
          'div',
          { className: 'hf-timeline' },
          h(
            'div',
            { className: 'hf-tl-grid' },
            h(
              'div',
              { className: 'hf-labels' },
              h('div', { style: { height: 20, border: 0, background: 'none' } }),
              h('div', { style: { height: 74 } }, 'V1'),
              h('div', { style: { height: 50, marginTop: 5 } }, 'A1'),
            ),
            h(
              'div',
              { className: 'hf-scrollx', ref: scrollerRef },
              h(
                'div',
                { className: 'hf-track', style: { width: trackWidth } },
                h('div', { className: 'hf-ruler', onPointerDown: startDrag }, ticks, h('div', { className: 'hf-playhead-head', style: { left: playheadLeft, top: 9 } })),
                h(
                  'div',
                  { className: 'hf-lane hf-lane-video', onPointerDown: startDrag },
                  frames.length === 0
                    ? h('div', { className: 'hf-lane-empty' }, '无缩略图')
                    : frames.map((frame, index) => h('img', { key: index, src: frame.url, alt: '', draggable: false })),
                  sel ? h('div', { className: 'hf-selection', style: sel }) : null,
                  sel ? h('div', { className: 'hf-selection-handle', style: { left: sel.left } }) : null,
                  sel ? h('div', { className: 'hf-selection-handle', style: { left: `calc(${sel.left} + ${sel.width} - 5px)` } }) : null,
                  sel
                    ? h(
                        'div',
                        { className: 'hf-selection-tag', style: { left: `calc(${sel.left} + ${sel.width} / 2)` } },
                        `${(Math.max(selection.start, selection.end) - Math.min(selection.start, selection.end)).toFixed(2)}s`,
                      )
                    : null,
                  h('div', { className: 'hf-playhead', style: { left: playheadLeft } }),
                ),
                h(
                  'div',
                  { className: 'hf-lane hf-lane-audio', onPointerDown: startDrag },
                  h('canvas', { ref: canvasRef }),
                  sel ? h('div', { className: 'hf-selection', style: sel }) : null,
                  h('div', { className: 'hf-playhead', style: { left: playheadLeft } }),
                ),
              ),
            ),
          ),
        )
      }

      const renderRow = ({ key, active, thumb, name, meta, onOpen, onDelete, deleteTitle }) =>
        h(
          'div',
          { key, className: `hf-row${thumb ? '' : ' hf-row-plain'}${active ? ' is-active' : ''}`, onClick: onOpen },
          thumb ? h('div', { className: 'thumb', style: thumb }, meta?.icon ?? null) : null,
          h('div', { className: 'meta' }, h('div', { className: 'name', title: name }, name), meta?.text ? h('div', { className: 'size' }, meta.text) : null),
          h(
            'button',
            {
              className: 'hf-iconbtn hf-x',
              title: deleteTitle,
              onClick: (event) => {
                event.stopPropagation()
                onDelete()
              },
            },
            h(CrossIcon),
          ),
        )

      const renderSidebar = () =>
        h(
          'div',
          { className: 'hf-col hf-col-side' },
          h(ColumnHeader, { title: 'HyperFrames' }, h('button', { className: 'hf-iconbtn', onClick: loadProjects, title: '刷新' }, h(RefreshIcon))),
          h(
            Section,
            { title: '项目', count: projects.length },
            h(
              'div',
              { className: 'hf-newrow' },
              h('input', {
                className: 'hf-input',
                value: newName,
                placeholder: '项目名称',
                onChange: (event) => setNewName(event.target.value),
                onKeyDown: (event) => event.key === 'Enter' && createProject(),
              }),
              h('button', {
                className: 'hf-iconbtn',
                style: { background: 'var(--hf-accent)', color: '#fff' },
                disabled: !newName.trim() || Boolean(busy),
                title: '新建项目',
                onClick: createProject,
              }, h(PlusIcon)),
            ),
            projects.map((item) =>
              renderRow({
                key: item.name,
                active: item.name === project?.name,
                name: item.name,
                meta: {},
                onOpen: () => openProject(item.name),
                onDelete: () => setPendingDelete({ type: 'project', label: item.name, name: item.name }),
                deleteTitle: '删除项目',
              }),
            ),
          ),
          h(
            Section,
            { title: '产出', count: project?.outputs?.length ?? 0 },
            project?.outputs?.length
              ? project.outputs.map((output) =>
                  renderRow({
                    key: output.rel,
                    active: output.rel === outputRel && !preview,
                    thumb: { backgroundImage: `url("${api.media(project.name, output.rel)}")` },
                    name: output.name,
                    meta: { text: fileSize(output.size) },
                    onOpen: () => {
                      setPreview(null)
                      setSelectedOutput(output.rel)
                    },
                    onDelete: () => setPendingDelete({ type: 'file', label: output.name, rel: output.rel }),
                    deleteTitle: '删除产出',
                  }),
                )
              : h('div', { className: 'hf-empty' }, '暂无产出'),
          ),
          h(
            Section,
            { title: '素材', count: assets.length },
            assets.length
              ? assets.map((asset) => {
                  const kind = asset.rel.includes('/images/') ? '图片' : asset.rel.includes('/video/') ? '视频' : '音频'
                  return renderRow({
                    key: asset.rel,
                    active: preview?.rel === asset.rel,
                    thumb: kind === '图片' ? { backgroundImage: `url("${api.media(project.name, asset.rel)}")` } : {},
                    name: asset.rel.split('/').pop(),
                    meta: { text: kind, icon: kind === '图片' ? null : h('span', null, kind === '视频' ? 'VIDEO' : 'AUDIO') },
                    onOpen: () => setPreview(preview?.rel === asset.rel ? null : asset),
                    onDelete: () => setPendingDelete({ type: 'file', label: asset.rel.split('/').pop(), rel: asset.rel }),
                    deleteTitle: '删除素材',
                  })
                })
              : h('div', { className: 'hf-empty' }, 'assets/ 目录为空'),
          ),
          h(
            Section,
            { title: '合成', count: compositions.length },
            compositions.map((source) =>
              h(
                'div',
                {
                  key: source.rel,
                  className: 'hf-file',
                  title: '点击复制路径',
                  onClick: () => navigator.clipboard?.writeText(source.rel).then(() => setNote(`已复制 ${source.rel}`), () => {}),
                },
                source.rel,
              ),
            ),
          ),
        )

      const renderMain = () =>
        h(
          'div',
          { className: 'hf-col hf-col-main' },
          h(ColumnHeader, { title: project?.name ?? 'HyperFrames', subtitle: project?.dir ?? workspace }),
          h('div', { className: 'hf-stage-wrap' }, h('div', { className: 'hf-stage' }, renderStage()), renderControls()),
          renderTimeline(),
        )

      const renderConfig = () => {
        const value = draftSettings ?? settings
        const pick = (patch) => setDraftSettings({ ...value, ...patch })
        return h(
          'div',
          { className: 'hf-config' },
          h(ColumnHeader, { title: '输出配置' }, h('button', { className: 'hf-btn hf-btn-quiet', onClick: () => setConfigOpen(false) }, '关闭')),
          h(
            'div',
            { className: 'hf-config-body hf-scroll' },
            h(
              'div',
              { className: 'hf-field' },
              h('label', null, '分辨率'),
              h(
                'div',
                { className: 'hf-choices' },
                RESOLUTIONS.map((item) =>
                  h(
                    Choice,
                    {
                      key: item.label,
                      on: value.width === item.width && value.height === item.height,
                      onClick: () => pick({ width: item.width, height: item.height }),
                    },
                    item.label,
                    h('small', null, item.note),
                  ),
                ),
              ),
            ),
            h(
              'div',
              { className: 'hf-field' },
              h('label', null, '帧率'),
              h('div', { className: 'hf-choices' }, FRAME_RATES.map((rate) => h(Choice, { key: rate, on: value.fps === rate, onClick: () => pick({ fps: rate }) }, `${rate} fps`))),
            ),
            h(
              'div',
              { className: 'hf-field' },
              h('label', null, '格式'),
              h(
                'div',
                { className: 'hf-choices' },
                FORMATS.map((item) => h(Choice, { key: item.id, on: value.format === item.id, onClick: () => pick({ format: item.id }) }, item.label, h('small', null, item.note))),
              ),
            ),
            h(
              'div',
              { className: 'hf-field' },
              h('label', null, '渲染浏览器'),
              h(
                'div',
                { className: 'hf-choices' },
                h(Choice, { on: value.browser === 'auto', onClick: () => pick({ browser: 'auto' }) }, '自动'),
                browsers.map((browser) =>
                  h(
                    Choice,
                    { key: browser.id, on: value.browser === browser.id, disabled: !browser.ok, onClick: () => pick({ browser: browser.id }) },
                    browser.label,
                  ),
                ),
              ),
            ),
          ),
          h(
            'div',
            { className: 'hf-config-foot' },
            h('button', { className: 'hf-btn hf-btn-primary', style: { flex: 1 }, onClick: saveConfig }, '保存'),
            h('button', { className: 'hf-btn', onClick: () => setConfigOpen(false) }, '取消'),
          ),
        )
      }

      const renderAside = () =>
        configOpen
          ? h('div', { className: 'hf-col hf-col-aside' }, renderConfig())
          : h(
              'div',
              { className: 'hf-col hf-col-aside' },
              h(
                ColumnHeader,
                { title: '提示词' },
                typeof props.openView === 'function'
                  ? h('button', { className: 'hf-btn hf-btn-quiet', onClick: () => props.openView('chat', '') }, '对话 →')
                  : null,
              ),
              h(Status, { phase, line: statusLine, running }),
              chips.length
                ? h(
                    'div',
                    { className: 'hf-chips' },
                    chips.map((chip) =>
                      h(
                        'div',
                        { key: chip.id, className: 'hf-chip', title: chip.text },
                        h('span', null, chip.text),
                        h('button', { onClick: () => setChips(chips.filter((item) => item.id !== chip.id)) }, '×'),
                      ),
                    ),
                  )
                : h('div', { className: 'hf-hint' }, '在时间轴拖选区间，或点击素材下方的注入按钮'),
              h(
                'div',
                { className: 'hf-compose' },
                h('textarea', {
                  value: draft,
                  disabled: !ready || sending,
                  placeholder: '描述需要修改的内容',
                  onChange: (event) => setDraft(event.target.value),
                  onKeyDown: (event) => (event.ctrlKey || event.metaKey) && event.key === 'Enter' && send(true),
                }),
                h(
                  'div',
                  { className: 'hf-compose-row' },
                  h(
                    'button',
                    {
                      className: 'hf-btn',
                      disabled: !ready || sending || imageUnsupported || (!draft.trim() && !chips.length),
                      title: '只发消息，不附加渲染要求',
                      onClick: () => send(false),
                    },
                    '发送',
                  ),
                  h(
                    'button',
                    {
                      className: 'hf-btn hf-btn-primary',
                      disabled: !ready || sending || imageUnsupported || (!draft.trim() && !chips.length),
                      title: '附加输出规格与渲染要求',
                      onClick: () => send(true),
                    },
                    sending ? '发送中…' : '发送并渲染',
                  ),
                ),
                imageUnsupported
                  ? h('div', { className: 'hf-hint hf-warn', style: { padding: 0 } },
                      `当前模型「${caps.modelName ?? '未知'}」不支持图片输入，已禁止发送；请切换到支持视觉的模型`)
                  : note
                    ? h('div', { className: 'hf-hint', style: { padding: 0 } }, note)
                    : null,
              ),
              h(
                'div',
                { className: 'hf-config-entry', onClick: openConfig },
                h('span', null, '输出配置'),
                h('b', null, `${settings.width}×${settings.height} · ${settings.fps}fps · ${String(settings.format).toUpperCase()}`),
              ),
            )

      const sidebarTree = useMemo(
        () => renderSidebar(),
        [projects, project, assets, compositions, preview, selectedOutput, newName, busy],
      )
      const asideTree = useMemo(
        () => renderAside(),
        [configOpen, draftSettings, browsers, chips, draft, note, sending, ready, deps, settings, phase, statusLine, project?.name],
      )

      return h(
        'div',
        { ref: anchorRef, style: { position: 'relative', width: '100%', height: '100%' } },
        box
          ? h(
              'div',
              {
                className: `hf${theme === 'light' ? ' hf-light' : ''}`,
                style:
                  box.width > 280 && box.height > 240
                    ? { top: box.top, left: box.left, width: box.width, height: box.height }
                    : { position: 'relative', width: '100%', height: '100%' },
              },
              h('style', null, CSS),
              sidebarTree,
              renderMain(),
              asideTree,
              pendingDelete
                ? h(
                    'div',
                    { className: 'hf-modal', onClick: () => setPendingDelete(null) },
                    h(
                      'div',
                      { className: 'hf-modal-card', onClick: (event) => event.stopPropagation() },
                      h('h3', null, pendingDelete.type === 'project' ? '删除项目' : '删除文件'),
                      h(
                        'p',
                        null,
                        pendingDelete.type === 'project'
                          ? `将删除项目「${pendingDelete.label}」及其中全部素材、产出与合成文件，删除后无法恢复。`
                          : `将删除「${pendingDelete.label}」，删除后无法恢复。`,
                      ),
                      h(
                        'div',
                        { className: 'hf-modal-actions' },
                        h('button', { className: 'hf-btn', onClick: () => setPendingDelete(null) }, '取消'),
                        h('button', { className: 'hf-btn hf-btn-danger', onClick: confirmDelete }, '删除'),
                      ),
                    ),
                  )
                : null,
              error ? h('div', { className: 'hf-log', style: { position: 'absolute', bottom: 8, left: 8, right: 8 } }, error) : null,
            )
          : null,
      )
    }

    return {
      inject: ['slots'],
      apply(ctx) {
        ctx.slots.inject('conversation.view', () =>
          ctx.slots.register({ name: 'conversation.view', id: 'hyperframes', order: 15, label: 'HyperFrames' }, Workbench),
        )
      },
    }
  },
})
