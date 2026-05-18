function escapeHtml(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function renderUiMapHtml(params: { host: string; port: number }): string {
  const { host, port } = params;

  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Artifact Hub V2 UI Map</title>
    <style>
      :root {
        --bg: #07111f;
        --bg-soft: #0d1829;
        --panel: rgba(10, 20, 36, 0.86);
        --panel-soft: rgba(18, 31, 53, 0.82);
        --line: rgba(255, 255, 255, 0.12);
        --text: #eef5ff;
        --muted: #97a8c8;
        --feed: #55e6c1;
        --ops: #5ea8ff;
        --query: #ffbf5f;
        --hub: #a78bfa;
        --data: #56d68e;
        --detail: #f472b6;
        --shadow: 0 24px 80px rgba(0, 0, 0, 0.42);
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        min-height: 100vh;
        color: var(--text);
        font-family: "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
        background:
          radial-gradient(circle at 10% 10%, rgba(94, 168, 255, 0.18), transparent 28%),
          radial-gradient(circle at 88% 14%, rgba(167, 139, 250, 0.16), transparent 26%),
          radial-gradient(circle at 50% 80%, rgba(85, 230, 193, 0.08), transparent 24%),
          linear-gradient(180deg, #06101d 0%, #08111f 100%);
      }

      a {
        color: inherit;
      }

      .page {
        width: min(1480px, calc(100vw - 32px));
        margin: 18px auto 40px;
      }

      .hero {
        position: relative;
        overflow: hidden;
        padding: 28px 30px;
        border-radius: 28px;
        border: 1px solid var(--line);
        background:
          linear-gradient(135deg, rgba(94, 168, 255, 0.08), transparent 40%),
          linear-gradient(225deg, rgba(167, 139, 250, 0.1), transparent 45%),
          rgba(8, 18, 32, 0.88);
        box-shadow: var(--shadow);
      }

      .hero::after {
        content: "";
        position: absolute;
        inset: auto -10% -42% auto;
        width: 420px;
        height: 420px;
        border-radius: 999px;
        background: radial-gradient(circle, rgba(85, 230, 193, 0.16), transparent 60%);
        filter: blur(18px);
        pointer-events: none;
      }

      .eyebrow {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        border-radius: 999px;
        border: 1px solid rgba(94, 168, 255, 0.2);
        background: rgba(94, 168, 255, 0.08);
        color: #bdd9ff;
        font-size: 12px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .hero h1 {
        margin: 14px 0 10px;
        font-size: 42px;
        line-height: 1.05;
      }

      .hero p {
        margin: 0;
        max-width: 980px;
        color: var(--muted);
        font-size: 15px;
        line-height: 1.7;
      }

      .hero-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        margin-top: 18px;
      }

      .meta-pill {
        padding: 10px 12px;
        border-radius: 14px;
        border: 1px solid var(--line);
        background: rgba(255, 255, 255, 0.04);
        color: var(--muted);
        font-size: 13px;
      }

      .section {
        margin-top: 18px;
        border-radius: 28px;
        border: 1px solid var(--line);
        background: rgba(8, 16, 30, 0.86);
        box-shadow: var(--shadow);
      }

      .section-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
        padding: 20px 22px 0;
      }

      .section-head h2 {
        margin: 0;
        font-size: 22px;
      }

      .section-head span {
        color: var(--muted);
        font-size: 13px;
      }

      .canvas {
        position: relative;
        padding: 22px;
        min-height: 780px;
      }

      .connector-layer {
        position: absolute;
        inset: 22px;
        pointer-events: none;
      }

      .connector-layer svg {
        width: 100%;
        height: 100%;
      }

      .node {
        position: absolute;
        border-radius: 26px;
        border: 1px solid var(--line);
        background: linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.02));
        backdrop-filter: blur(18px);
        box-shadow: var(--shadow);
        overflow: hidden;
      }

      .node::before {
        content: "";
        position: absolute;
        inset: 0 auto 0 0;
        width: 4px;
        background: var(--accent);
      }

      .node .header {
        padding: 18px 20px 12px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        background: linear-gradient(180deg, rgba(255, 255, 255, 0.05), transparent);
      }

      .node .eyeline {
        color: var(--accent);
        text-transform: uppercase;
        letter-spacing: 0.08em;
        font-size: 11px;
        margin-bottom: 6px;
      }

      .node h3 {
        margin: 0;
        font-size: 20px;
      }

      .node p {
        margin: 8px 0 0;
        color: var(--muted);
        font-size: 13px;
        line-height: 1.6;
      }

      .node .body {
        padding: 16px 18px 18px;
      }

      .grid-tiles {
        display: grid;
        gap: 10px;
      }

      .grid-tiles.cols-2 {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .tile {
        border-radius: 16px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        background: rgba(255, 255, 255, 0.03);
        padding: 12px 12px 13px;
      }

      .tile strong {
        display: block;
        font-size: 13px;
        margin-bottom: 5px;
      }

      .tile span {
        display: block;
        color: var(--muted);
        font-size: 12px;
        line-height: 1.55;
      }

      #stage-feed {
        --accent: var(--feed);
        top: 28px;
        left: 22px;
        width: 44%;
        min-height: 324px;
      }

      #stage-ops {
        --accent: var(--ops);
        top: 28px;
        right: 22px;
        width: 34%;
        min-height: 324px;
      }

      #stage-query {
        --accent: var(--query);
        top: 396px;
        left: 20%;
        width: 27%;
        min-height: 204px;
      }

      #stage-hub {
        --accent: var(--hub);
        top: 396px;
        right: 18%;
        width: 27%;
        min-height: 204px;
      }

      #stage-data {
        --accent: var(--data);
        bottom: 24px;
        left: 18%;
        width: 64%;
        min-height: 172px;
      }

      .preview-shell {
        margin-top: 18px;
        padding: 18px 20px 22px;
      }

      .tabs {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        margin-bottom: 16px;
      }

      .tab-btn {
        padding: 10px 14px;
        border-radius: 999px;
        border: 1px solid var(--line);
        background: rgba(255, 255, 255, 0.04);
        color: var(--muted);
        cursor: pointer;
        transition: 180ms ease;
      }

      .tab-btn.active {
        background: rgba(94, 168, 255, 0.14);
        color: var(--text);
        border-color: rgba(94, 168, 255, 0.35);
      }

      .preview-grid {
        display: grid;
        gap: 16px;
      }

      .preview-panel {
        display: none;
        border-radius: 22px;
        border: 1px solid var(--line);
        background: linear-gradient(180deg, rgba(16, 28, 48, 0.92), rgba(10, 19, 35, 0.92));
        overflow: hidden;
      }

      .preview-panel.active {
        display: block;
      }

      .preview-bar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
        padding: 14px 18px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        background: rgba(255, 255, 255, 0.03);
      }

      .preview-bar strong {
        font-size: 15px;
      }

      .preview-bar span {
        color: var(--muted);
        font-size: 12px;
      }

      .wireframe {
        display: grid;
        gap: 14px;
        padding: 18px;
      }

      .wireframe.feed {
        grid-template-columns: 260px 1fr 300px;
      }

      .wireframe.detail {
        grid-template-columns: 1fr 320px;
      }

      .wireframe.ops {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .wf-card {
        border-radius: 18px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        background: rgba(255, 255, 255, 0.035);
        padding: 14px;
        min-height: 120px;
      }

      .wf-card h4 {
        margin: 0 0 10px;
        font-size: 14px;
      }

      .wf-card ul {
        margin: 0;
        padding-left: 18px;
        color: var(--muted);
        font-size: 12px;
        line-height: 1.65;
      }

      .footer-note {
        margin-top: 16px;
        padding: 16px 18px 22px;
        color: var(--muted);
        font-size: 13px;
        line-height: 1.7;
      }

      .diagram-shell {
        padding: 18px 20px 24px;
      }

      .diagram-tabs {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        margin-bottom: 16px;
      }

      .diagram-btn {
        padding: 10px 14px;
        border-radius: 999px;
        border: 1px solid var(--line);
        background: rgba(255, 255, 255, 0.04);
        color: var(--muted);
        cursor: pointer;
      }

      .diagram-btn.active {
        color: var(--text);
        background: rgba(167, 139, 250, 0.14);
        border-color: rgba(167, 139, 250, 0.35);
      }

      .diagram-panel {
        display: none;
        border-radius: 24px;
        border: 1px solid var(--line);
        background: linear-gradient(180deg, rgba(15, 26, 45, 0.94), rgba(10, 18, 33, 0.94));
        overflow: hidden;
      }

      .diagram-panel.active {
        display: block;
      }

      .diagram-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 14px;
        padding: 16px 18px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        background: rgba(255, 255, 255, 0.03);
      }

      .diagram-header strong {
        font-size: 17px;
      }

      .diagram-header span {
        color: var(--muted);
        font-size: 12px;
      }

      .diagram-canvas {
        padding: 18px;
      }

      .flow-strip {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 12px;
      }

      .flow-stage {
        position: relative;
        border-radius: 20px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        background: rgba(255, 255, 255, 0.03);
        padding: 14px;
        min-height: 156px;
      }

      .flow-stage::after {
        content: "→";
        position: absolute;
        right: -12px;
        top: 50%;
        transform: translateY(-50%);
        color: rgba(255, 255, 255, 0.28);
        font-size: 24px;
      }

      .flow-stage:last-child::after {
        display: none;
      }

      .flow-stage h4,
      .object-card h4,
      .lens-card h4 {
        margin: 0 0 8px;
        font-size: 14px;
      }

      .flow-stage p,
      .object-card p,
      .lens-card p {
        margin: 0;
        color: var(--muted);
        font-size: 12px;
        line-height: 1.6;
      }

      .lens-grid,
      .object-grid {
        display: grid;
        gap: 12px;
        margin-top: 14px;
      }

      .lens-grid {
        grid-template-columns: repeat(4, minmax(0, 1fr));
      }

      .object-grid {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }

      .lens-card,
      .object-card {
        border-radius: 18px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        background: rgba(255, 255, 255, 0.03);
        padding: 14px;
      }

      .object-grid .object-card {
        min-height: 150px;
      }

      .dual-layout {
        display: grid;
        grid-template-columns: 1fr 110px 1fr;
        gap: 14px;
        align-items: stretch;
      }

      .dual-card {
        border-radius: 22px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        background: rgba(255, 255, 255, 0.035);
        padding: 16px;
      }

      .dual-card.research {
        box-shadow: inset 0 0 0 1px rgba(85, 230, 193, 0.12);
      }

      .dual-card.market {
        box-shadow: inset 0 0 0 1px rgba(94, 168, 255, 0.12);
      }

      .dual-card h4 {
        margin: 0 0 10px;
        font-size: 18px;
      }

      .dual-card ul {
        margin: 0;
        padding-left: 18px;
        color: var(--muted);
        font-size: 12px;
        line-height: 1.7;
      }

      .dual-core {
        display: grid;
        grid-template-rows: 1fr auto 1fr;
        gap: 10px;
        align-items: center;
      }

      .dual-core .core-pill,
      .dual-core .core-arrow {
        display: grid;
        place-items: center;
        border-radius: 18px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        background: rgba(255, 255, 255, 0.035);
        padding: 12px;
        color: var(--muted);
        font-size: 12px;
        text-align: center;
      }

      .dual-core .core-arrow {
        font-size: 24px;
        color: rgba(255, 255, 255, 0.35);
      }

      @media (max-width: 1280px) {
        .canvas {
          min-height: auto;
          display: grid;
          gap: 16px;
        }

        .connector-layer {
          display: none;
        }

        .node {
          position: static;
          width: auto !important;
          min-height: 0 !important;
        }

        .wireframe.feed,
        .wireframe.detail,
        .wireframe.ops,
        .grid-tiles.cols-2,
        .flow-strip,
        .lens-grid,
        .object-grid,
        .dual-layout {
          grid-template-columns: 1fr;
        }
      }
    </style>
  </head>
  <body>
    <main class="page">
      <section class="hero">
        <div class="eyebrow">Visual Prototype / ${escapeHtml(host)}:${port}</div>
        <h1>Artifact Hub V2 可视化页面架构</h1>
        <p>
          这不是一张静态说明图，而是一个真正可访问的页面原型。它把新版产物中台拆成
          Feed 内容门户、Ops 治理控制台、共享的 Query Layer、共享的 Hub API，以及统一的
          dreambuddy 数据底座，方便你直接判断信息架构和页面职责是否合理。
        </p>
        <div class="hero-meta">
          <div class="meta-pill">Feed 保留旧版产物浏览心智</div>
          <div class="meta-pill">Ops 承接 route / trace / queue / strategy / archive</div>
          <div class="meta-pill">Query Layer 迁移旧版 content.server.ts 价值</div>
          <div class="meta-pill">dreambuddy 作为统一 artifacts / meta / config 真相源</div>
        </div>
      </section>

      <section class="section">
        <div class="section-head">
          <h2>页面层级总览</h2>
          <span>真实 Web UI 分层，不是后端部署图</span>
        </div>
        <div class="canvas">
          <div class="connector-layer" aria-hidden="true">
            <svg viewBox="0 0 1200 760" preserveAspectRatio="none">
              <path d="M 520 235 C 560 300, 520 340, 430 395" fill="none" stroke="rgba(255,191,95,0.5)" stroke-width="3" stroke-dasharray="8 8" />
              <path d="M 830 235 C 780 300, 820 340, 770 395" fill="none" stroke="rgba(167,139,250,0.5)" stroke-width="3" stroke-dasharray="8 8" />
              <path d="M 430 600 C 430 642, 480 666, 560 682" fill="none" stroke="rgba(86,214,142,0.42)" stroke-width="3" />
              <path d="M 770 600 C 770 642, 720 666, 640 682" fill="none" stroke="rgba(86,214,142,0.42)" stroke-width="3" />
              <path d="M 1020 235 C 1036 280, 1010 335, 940 395" fill="none" stroke="rgba(94,168,255,0.36)" stroke-width="2" />
            </svg>
          </div>

          <article class="node" id="stage-feed">
            <div class="header">
              <div class="eyeline">Primary Entry</div>
              <h3>Feed Content Portal</h3>
              <p>产物首页、分类聚合页、详情页，负责内容浏览、搜索、筛选和阅读。</p>
            </div>
            <div class="body">
              <div class="grid-tiles cols-2">
                <div class="tile"><strong>/feed 首页</strong><span>左栏筛选 + 中栏卡片流 + 右栏轻量运行态摘要</span></div>
                <div class="tile"><strong>/feed/[category]</strong><span>按 trading、knowledge、dream 等业务域聚合浏览</span></div>
                <div class="tile"><strong>/feed/[category]/[artifactId]</strong><span>正文、frontmatter、trace/task/result 侧边信息</span></div>
                <div class="tile"><strong>适配旧版心智</strong><span>继承旧版 Feed 的列表到详情路径，不再做丑的独立控制台页</span></div>
              </div>
            </div>
          </article>

          <article class="node" id="stage-ops">
            <div class="header">
              <div class="eyeline">Operations Entry</div>
              <h3>Ops Governance Console</h3>
              <p>独立治理入口，聚合健康、路由、Trace、队列、策略和归档治理。</p>
            </div>
            <div class="body">
              <div class="grid-tiles">
                <div class="tile"><strong>Health + Queue</strong><span>Hub / Gateway / DB / tasks / results 全局健康与积压状态</span></div>
                <div class="tile"><strong>Route Sandbox + Trace Monitor</strong><span>Decide / Execute / DAG / Trace replay / SSE event stream</span></div>
                <div class="tile"><strong>Strategy + Archive</strong><span>经典策略库、统计聚合、Archive Guard inbox/registry 观测</span></div>
              </div>
            </div>
          </article>

          <article class="node" id="stage-query">
            <div class="header">
              <div class="eyeline">Shared Content Layer</div>
              <h3>Artifact Query Layer</h3>
              <p>迁移旧版 <code>content.server.ts</code> 的内容聚合价值，专供 Feed 使用。</p>
            </div>
            <div class="body">
              <div class="grid-tiles">
                <div class="tile"><strong>核心职责</strong><span>分类映射、excerpt、tags、chain_phase、Markdown/JSON 详情读取</span></div>
                <div class="tile"><strong>输出对象</strong><span>ArtifactIndex / ArtifactsData / ArtifactContent / SearchResult</span></div>
              </div>
            </div>
          </article>

          <article class="node" id="stage-hub">
            <div class="header">
              <div class="eyeline">Shared Governance Layer</div>
              <h3>Hub API / Route / Trace</h3>
              <p>承接新版 V2 的路由决策、Trace、事件流、任务写入和结果回收。</p>
            </div>
            <div class="body">
              <div class="grid-tiles">
                <div class="tile"><strong>已有能力</strong><span>/route/decide、/route/execute、/traces/:traceId、/events/stream</span></div>
                <div class="tile"><strong>对 UI 提供</strong><span>DAG、task/result 状态、queues snapshot、ops health、strategy governance</span></div>
              </div>
            </div>
          </article>

          <article class="node" id="stage-data">
            <div class="header">
              <div class="eyeline">Single Source Of Truth</div>
              <h3>dreambuddy Data Fabric</h3>
              <p>统一 artifacts、meta、config、queues 与 archive registry，新版所有 UI 都从这里取数。</p>
            </div>
            <div class="body">
              <div class="grid-tiles cols-2">
                <div class="tile"><strong>artifacts</strong><span>普通分类产物、strategy、tasks、results、archive inbox</span></div>
                <div class="tile"><strong>meta</strong><span>artifact_hub.sqlite、archive_registry.sqlite、审计与追踪元数据</span></div>
                <div class="tile"><strong>config</strong><span>artifact-hub.config.json、archive-guard.config.json 等统一配置</span></div>
                <div class="tile"><strong>运行协议</strong><span>task_*.json / result_*.json / inbox manifest / processed / failed</span></div>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section class="section">
        <div class="section-head">
          <h2>页面原型预览</h2>
          <span>点击切换 Feed 首页、详情页、Ops 首页的结构预览</span>
        </div>
        <div class="preview-shell">
          <div class="tabs" role="tablist" aria-label="UI previews">
            <button class="tab-btn active" type="button" data-tab="feed-home">Feed 首页</button>
            <button class="tab-btn" type="button" data-tab="feed-detail">详情页</button>
            <button class="tab-btn" type="button" data-tab="ops-home">Ops 首页</button>
          </div>

          <div class="preview-grid">
            <section class="preview-panel active" data-panel="feed-home">
              <div class="preview-bar">
                <strong>Feed 首页结构</strong>
                <span>内容优先，治理信息退到右栏摘要</span>
              </div>
              <div class="wireframe feed">
                <div class="wf-card">
                  <h4>Left Filters</h4>
                  <ul>
                    <li>部门 / 分类 / A 阶段</li>
                    <li>状态 / 时间范围</li>
                    <li>标签组合筛选</li>
                  </ul>
                </div>
                <div class="wf-card">
                  <h4>Artifact Stream</h4>
                  <ul>
                    <li>搜索与排序条</li>
                    <li>卡片流：title / excerpt / tags / status</li>
                    <li>分页或无限滚动</li>
                  </ul>
                </div>
                <div class="wf-card">
                  <h4>Runtime Summary</h4>
                  <ul>
                    <li>最近 Trace</li>
                    <li>最近 task / result</li>
                    <li>系统健康摘要</li>
                  </ul>
                </div>
              </div>
            </section>

            <section class="preview-panel" data-panel="feed-detail">
              <div class="preview-bar">
                <strong>Feed 详情页结构</strong>
                <span>阅读主线 + 运行态侧边信息</span>
              </div>
              <div class="wireframe detail">
                <div class="wf-card">
                  <h4>Main Reading Area</h4>
                  <ul>
                    <li>Markdown / JSON / code block 正文</li>
                    <li>标题、标签、时间、状态、chain_phase</li>
                    <li>引用和关联产物跳转</li>
                  </ul>
                </div>
                <div class="wf-card">
                  <h4>Side Context</h4>
                  <ul>
                    <li>frontmatter / file path / relative url</li>
                    <li>task_id / result / trace_id / route mode</li>
                    <li>archive state / latest event</li>
                  </ul>
                </div>
              </div>
            </section>

            <section class="preview-panel" data-panel="ops-home">
              <div class="preview-bar">
                <strong>Ops 首页结构</strong>
                <span>治理控制台，承接当前 V2 已有成果</span>
              </div>
              <div class="wireframe ops">
                <div class="wf-card">
                  <h4>Aggregated Health</h4>
                  <ul>
                    <li>Hub / Gateway / DB / Queue</li>
                    <li>全局健康与更新时间</li>
                  </ul>
                </div>
                <div class="wf-card">
                  <h4>Queue Snapshot</h4>
                  <ul>
                    <li>tasks_total / results_total / pending_total</li>
                    <li>pending ids / latest files</li>
                  </ul>
                </div>
                <div class="wf-card">
                  <h4>Route Sandbox / Trace</h4>
                  <ul>
                    <li>Decide / Execute / DAG</li>
                    <li>Trace replay / event timeline</li>
                  </ul>
                </div>
                <div class="wf-card">
                  <h4>Strategy + Archive</h4>
                  <ul>
                    <li>Strategy library / strategy stats</li>
                    <li>Archive Guard inbox / registry audit</li>
                  </ul>
                </div>
              </div>
            </section>
          </div>
        </div>

        <div class="footer-note">
          当前最合理的实施路径仍然是：先恢复 <code>/feed</code> 的真实内容页面，让旧版产物中台的可见入口回来；
          再将新版 V2 已经有的 route、trace、queue、strategy、archive 能力逐步挂到 <code>/ops</code>，最终形成
          “内容门户 + 治理控制台 + 统一数据底座”的完整产品结构。
        </div>
      </section>

      <section class="section">
        <div class="section-head">
          <h2>AI 黑箱治理可视化</h2>
          <span>把总图、双中台结构图、治理对象模型图做成真实页面区块</span>
        </div>
        <div class="diagram-shell">
          <div class="diagram-tabs" role="tablist" aria-label="governance diagrams">
            <button class="diagram-btn active" type="button" data-diagram-tab="governance-overview">AI 黑箱治理总图</button>
            <button class="diagram-btn" type="button" data-diagram-tab="dual-console">双中台页面结构图</button>
            <button class="diagram-btn" type="button" data-diagram-tab="object-model">治理对象模型图</button>
          </div>

          <section class="diagram-panel active" data-diagram="governance-overview">
            <div class="diagram-header">
              <strong>AI 黑箱治理总图</strong>
              <span>从意图到审计回放的全链路治理闭环</span>
            </div>
            <div class="diagram-canvas">
              <div class="flow-strip">
                <div class="flow-stage">
                  <h4>Intent & Input</h4>
                  <p>用户、运营、系统的目标输入，带上约束、优先级、来源和上下文。</p>
                </div>
                <div class="flow-stage">
                  <h4>Decision & Route</h4>
                  <p>AI 为什么这样判断、这样推荐、这样路由，必须留下 reason、policy、evidence。</p>
                </div>
                <div class="flow-stage">
                  <h4>Execution & Artifact</h4>
                  <p>实际调用了什么链路、写了什么任务、产出了什么结果和产物。</p>
                </div>
                <div class="flow-stage">
                  <h4>Distribution & Audit</h4>
                  <p>为什么把哪些内容推给哪些人，并且事后能回放、复盘、问责。</p>
                </div>
              </div>
              <div class="lens-grid">
                <div class="lens-card">
                  <h4>决策黑箱</h4>
                  <p>解释 AI 为什么这么判断、这么推荐、这么选路由。</p>
                </div>
                <div class="lens-card">
                  <h4>执行黑箱</h4>
                  <p>展示链路节点、work order、result、耗时、异常和产物输出。</p>
                </div>
                <div class="lens-card">
                  <h4>分发黑箱</h4>
                  <p>说明内容、策略、推送任务为何发给某类人、某个渠道、某个时机。</p>
                </div>
                <div class="lens-card">
                  <h4>审计黑箱</h4>
                  <p>支持 Trace、Event、DAG、证据链、结果回放与责任归因。</p>
                </div>
              </div>
            </div>
          </section>

          <section class="diagram-panel" data-diagram="dual-console">
            <div class="diagram-header">
              <strong>双中台页面结构图</strong>
              <span>同仓双入口，共享一套底层能力与治理内核</span>
            </div>
            <div class="diagram-canvas">
              <div class="dual-layout">
                <article class="dual-card research">
                  <h4>内部研究中台</h4>
                  <ul>
                    <li>基线入口：沿用旧版 <code>/feed</code> 内容门户与产物治理体验</li>
                    <li>关注 AI 如何生成、引用、路由、沉淀研究产物</li>
                    <li>主页面：产物 Feed、详情页、决策解释、执行链路、Trace 回放、归档治理</li>
                    <li>核心目标：解决研究链路中的决策黑箱、执行黑箱、审计黑箱</li>
                  </ul>
                </article>
                <div class="dual-core">
                  <div class="core-pill">共享底座<br />dreambuddy/artifacts<br />dreambuddy/meta<br />dreambuddy/config</div>
                  <div class="core-arrow">⇄</div>
                  <div class="core-pill">共享治理内核<br />Query Layer<br />Hub API<br />Route / Trace / Event</div>
                </div>
                <article class="dual-card market">
                  <h4>市场化中台</h4>
                  <ul>
                    <li>面向内部销售/运营，第一阶段以运营分发为主</li>
                    <li>关注内容路由、用户分层、推送分发、投放管理与效果反馈</li>
                    <li>主页面：内容池、用户分层、分发任务、投放状态、分发审计</li>
                    <li>核心目标：解决分发黑箱、审计黑箱，并对接策略与用户管理</li>
                  </ul>
                </article>
              </div>
            </div>
          </section>

          <section class="diagram-panel" data-diagram="object-model">
            <div class="diagram-header">
              <strong>治理对象模型图</strong>
              <span>用统一对象把“可见、可解释、可控制、可审计”串起来</span>
            </div>
            <div class="diagram-canvas">
              <div class="object-grid">
                <div class="object-card">
                  <h4>Intent</h4>
                  <p>记录谁提出了什么目标、来自哪里、附带哪些约束和优先级，是治理链路的起点。</p>
                </div>
                <div class="object-card">
                  <h4>Decision</h4>
                  <p>记录为什么这样判断、推荐和路由，必须带上 reason、policy_version、evidence。</p>
                </div>
                <div class="object-card">
                  <h4>Execution</h4>
                  <p>记录实际执行了哪些节点、技能、任务、结果、耗时、异常和状态变化。</p>
                </div>
                <div class="object-card">
                  <h4>Artifact</h4>
                  <p>记录生成了什么产物、属于哪个分类、对应哪个 trace、状态如何、能给谁看。</p>
                </div>
                <div class="object-card">
                  <h4>Distribution</h4>
                  <p>记录产物或策略通过什么渠道投给哪些人、为什么命中这个分层、反馈怎样。</p>
                </div>
                <div class="object-card">
                  <h4>Audit</h4>
                  <p>汇总 Trace、Event、Decision、Execution、Distribution，支持事后回放、复盘和问责。</p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </section>

      <script>
        const buttons = Array.from(document.querySelectorAll(".tab-btn"));
        const panels = Array.from(document.querySelectorAll(".preview-panel"));
        const diagramButtons = Array.from(document.querySelectorAll(".diagram-btn"));
        const diagramPanels = Array.from(document.querySelectorAll(".diagram-panel"));

        function activateTab(name) {
          buttons.forEach((btn) => btn.classList.toggle("active", btn.dataset.tab === name));
          panels.forEach((panel) => panel.classList.toggle("active", panel.dataset.panel === name));
        }

        function activateDiagram(name) {
          diagramButtons.forEach((btn) => btn.classList.toggle("active", btn.dataset.diagramTab === name));
          diagramPanels.forEach((panel) => panel.classList.toggle("active", panel.dataset.diagram === name));
        }

        buttons.forEach((btn) => {
          btn.addEventListener("click", () => activateTab(btn.dataset.tab || "feed-home"));
        });

        diagramButtons.forEach((btn) => {
          btn.addEventListener("click", () => activateDiagram(btn.dataset.diagramTab || "governance-overview"));
        });
      </script>
  </body>
</html>`;
}
