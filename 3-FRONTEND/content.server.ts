import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import type { ArtifactIndex, ArtifactContent, ArtifactsData } from './types';

// ============================================================
// 核心配置：后端产物目录
// ============================================================
const ARTIFACTS_ROOT = path.join(
  process.env.HOME || '/Users/zhangjiangtao',
  '.workbuddy/artifacts'
);

// 分类目录 → 部门映射
const CATEGORY_TO_DEPARTMENT: Record<string, string> = {
  'masters': 'knowledge',
  'tools': 'knowledge',
  'macro': 'knowledge',
  'risk': 'knowledge',
  'exit': 'knowledge',
  'practice': 'knowledge',
  'web_strategy': 'knowledge',
  'advanced_orders': 'knowledge',
  'audit': 'support',
  'oneirology': 'dream',      // 做梦部
  'trading': 'trading',       // 交易部
  'a_series': 'trading',      // A系列产物 → 交易部
  'tasks': 'dashboard',       // 前端任务 → Dashboard
  'results': 'dashboard',     // 执行结果 → Dashboard
};

// ============================================================
// 扫描后端产物目录，生成前端需要的索引
// ============================================================

// A0-A9 分类的正则表达式
const A_PHASE_REGEX = /^A([0-9])$/i;

function extractAPhase(filename: string, chainPhase?: string): string {
  // 优先使用已有的 chain_phase
  if (chainPhase && A_PHASE_REGEX.test(chainPhase.toUpperCase())) {
    return chainPhase.toUpperCase();
  }
  
  // 从文件名中提取 A0-A9
  const match = filename.match(/A([0-9])/i);
  if (match) {
    return 'A' + match[1];
  }
  
  return chainPhase || '';
}

/**
 * 扫描 tasks/ 和 results/ 目录（无index.json，直接包含JSON文件）
 * tasks/: task_*.json → 显示为 dashboard_task
 * results/: result_*.json → 显示为 dashboard_result
 */
function scanTaskResultDir(
  catDir: string,
  category: string,
  department: string,
  index: ArtifactIndex[],
  artifacts: any[]
): void {
  if (!fs.existsSync(catDir)) return;

  let files: string[];
  try {
    files = fs.readdirSync(catDir).filter(f => f.endsWith('.json')).slice(0, 50);
  } catch { return; }

  for (const f of files) {
    const filePath = path.join(catDir, f);
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(content);

      const isResult = f.startsWith('result_');
      const taskId = isResult ? (data.task_id || f.replace('result_', '').replace('.json', '')) : (data.task_id || f.replace('.json', ''));
      const intentType = data.intent?.type || data.execution_summary?.chain_executed?.[0] || 'unknown';
      const status = data.status || 'unknown';
      const dateStr = String(data.created_at || data.updated_at || '');

      // 提取 excerpt
      let excerpt = '';
      if (data.message) {
        excerpt = data.message.slice(0, 200);
      } else if (data.content) {
        excerpt = data.content
          .replace(/^#+\s+/gm, '')
          .replace(/[\r\n]+/g, ' ')
          .replace(/\*+/g, '')
          .replace(/`[^`]*`/g, '')
          .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
          .replace(/<[^>]*>/g, '')
          .replace(/\s{2,}/g, ' ')
          .trim()
          .slice(0, 200);
      }

      const aPhase = extractAPhase(f, data.execution_summary?.chain_executed?.[0] || '');

      const artifactIndex: ArtifactIndex = {
        id: `${category}/${f.replace('.json', '')}`,
        title: isResult
          ? `执行结果: ${(data.execution_summary?.chain_executed || []).join('→')} | ${taskId}`
          : `Dashboard任务: ${data.message?.slice(0, 40) || taskId}`,
        department,
        type: isResult ? 'dashboard_result' : 'dashboard_task',
        date: dateStr || new Date().toISOString(),
        status,
        chain_phase: aPhase || 'dashboard',
        url: `/feed/${category}/${f.replace('.json', '')}`,
        tags: ['dashboard', isResult ? 'result' : 'task', intentType, status].join(' '),
        excerpt: excerpt || undefined,
      };

      index.push(artifactIndex);

      artifacts.push({
        id: artifactIndex.id,
        title: artifactIndex.title,
        department: artifactIndex.department,
        type: artifactIndex.type,
        date: artifactIndex.date,
        status: artifactIndex.status,
        chain_phase: artifactIndex.chain_phase,
        file_path: filePath,
        relative_url: artifactIndex.url,
        size_bytes: fs.statSync(filePath).size,
        tags: artifactIndex.tags.split(' ').filter(Boolean),
      });
    } catch { /* skip invalid JSON */ }
  }
}

function scanArtifacts(): { index: ArtifactIndex[]; data: ArtifactsData } {
  const index: ArtifactIndex[] = [];
  const artifacts: any[] = [];
  
  if (!fs.existsSync(ARTIFACTS_ROOT)) {
    console.warn(`[content] Artifacts root not found: ${ARTIFACTS_ROOT}`);
    return { index: [], data: emptyArtifactsData() };
  }

  // 扫描7个分类目录
  const categories = fs.readdirSync(ARTIFACTS_ROOT).filter(f => {
    const fp = path.join(ARTIFACTS_ROOT, f);
    return fs.statSync(fp).isDirectory() && !f.startsWith('.');
  });

  for (const category of categories) {
    const catDir = path.join(ARTIFACTS_ROOT, category);
    const department = CATEGORY_TO_DEPARTMENT[category] || 'knowledge';
    
    // ====== tasks/ 和 results/ 目录：直接扫描JSON文件（无index.json） ======
    if (category === 'tasks' || category === 'results') {
      scanTaskResultDir(catDir, category, department, index, artifacts);
      continue;
    }
    
    // ====== 标准目录：读取 index.json ======
    // 读取分类的 index.json
    const indexFile = path.join(catDir, 'index.json');
    if (!fs.existsSync(indexFile)) continue;

    try {
      const catIndex = JSON.parse(fs.readFileSync(indexFile, 'utf-8'));
      // 兼容两种格式：{ artifacts: [...] } 或纯数组 [...]
      const catArtifacts = Array.isArray(catIndex) ? catIndex : (catIndex.artifacts || []);

      for (const item of catArtifacts) {
        const rawId = item.artifact_id || item.id || 'unknown';
        // Strip category prefix if id contains it (e.g., "exit/L0_rules" → "L0_rules")
        const artifactId = rawId.includes('/') ? rawId.split('/').pop()! : rawId;
        const filename = item.filename || `${artifactId}.md`;
        const filePath = path.join(catDir, filename);

        // 读取 .md 或 .json 文件的 frontmatter
        let frontmatter: Record<string, any> = {};
        let content = '';
        const mdPath = filePath;
        const jsonPath = filePath.replace(/\.md$/i, '.json');

        if (fs.existsSync(mdPath)) {
          try {
            const fileContent = fs.readFileSync(mdPath, 'utf-8');
            const parsed = matter(fileContent);
            frontmatter = parsed.data;
            content = parsed.content;
          } catch (e) {
            console.warn(`[content] gray-matter failed, using index.json: ${mdPath}`);
            frontmatter = {
              title: item.title,
              type: item.type || 'knowledge',
              status: item.status,
              tags: item.tags,
              department: department,
              date: catIndex.last_updated,
            };
          }
        } else if (fs.existsSync(jsonPath)) {
          // JSON 产物回退：读取 .json 并转换为 markdown
          try {
            const jsonContent = fs.readFileSync(jsonPath, 'utf-8');
            const jsonData = JSON.parse(jsonContent);
            frontmatter = {
              title: item.title || jsonData.title || artifactId,
              type: item.type || 'knowledge',
              status: item.status,
              tags: item.tags,
              department: department,
              date: item.date || jsonData.timestamp || catIndex.last_updated,
            };
            content = jsonToMarkdown(jsonData, artifactId);
          } catch (e) {
            console.warn(`[content] JSON parse failed: ${jsonPath}`, e);
          }
        }

        // 提取 A0-A9 阶段
        const aPhase = extractAPhase(filename, item.chain_phase || frontmatter.chain_phase);
        
        // Extract excerpt from content (first 200 chars, strip markdown)
        const rawContent = content || '';
        const excerptText = rawContent
          .replace(/^#+\s+/gm, '')      // remove headings
          .replace(/[\r\n]+/g, ' ')      // newlines to space
          .replace(/\*+/g, '')           // remove bold/italic markers
          .replace(/`[^`]*`/g, '')       // remove inline code
          .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // remove links, keep text
          .replace(/<[^>]*>/g, '')        // remove HTML tags
          .replace(/\|/g, ' ')            // remove table pipes
          .replace(/-+/g, ' ')            // remove dash lines
          .replace(/\s{2,}/g, ' ')        // collapse spaces
          .trim()
          .slice(0, 200);

        // 构建 ArtifactIndex（前端 FeedClient 需要）
        const artifactIndex: ArtifactIndex = {
          id: `${category}/${artifactId}`,
          title: frontmatter.title || item.title || artifactId,
          department: frontmatter.department || department,
          type: frontmatter.type || 'knowledge',
          date: String(frontmatter.date || item.date || catIndex.last_updated || new Date().toISOString()),
          status: frontmatter.status || item.status || 'completed',
          chain_phase: aPhase || frontmatter.chain_phase || item.chain_phase || '',
          url: `/feed/${category}/${artifactId}`,
          tags: Array.isArray(frontmatter.tags) ? frontmatter.tags.join(' ') :
                Array.isArray(item.tags) ? item.tags.join(' ') :
                (typeof frontmatter.tags === 'string' ? frontmatter.tags :
                 typeof item.tags === 'string' ? item.tags : ''),
          excerpt: excerptText || undefined,
        };

        index.push(artifactIndex);

        // 构建详细 artifact（用于 statistics）
        artifacts.push({
          id: artifactIndex.id,
          title: artifactIndex.title,
          department: artifactIndex.department,
          type: artifactIndex.type,
          date: artifactIndex.date,
          status: artifactIndex.status,
          chain_phase: artifactIndex.chain_phase,
          file_path: filePath,
          relative_url: artifactIndex.url,
          size_bytes: fs.existsSync(filePath) ? fs.statSync(filePath).size : 0,
          tags: artifactIndex.tags.split(' ').filter(Boolean),
        });
      }
    } catch (e) {
      console.warn(`[content] Failed to process category ${category}:`, e);
    }
  }

  // 按 date 倒序排序（最新优先），unknown 日期排最后
  index.sort((a, b) => {
    const dateA = String(a.date || 'unknown');
    const dateB = String(b.date || 'unknown');
    if (dateA === 'unknown' || dateA === '' || dateA === 'null' || dateA === 'undefined') return 1;
    if (dateB === 'unknown' || dateB === '' || dateB === 'null' || dateB === 'undefined') return -1;
    const cmp = dateB.localeCompare(dateA);
    if (cmp !== 0) return cmp;
    // 同日按 id 倒序（id 含时间戳如 a4_validation_20260506_1215）
    return String(b.id).localeCompare(String(a.id));
  });

  // 构建 A0-A9 分类统计
  const byAPhase: Record<string, number> = {};
  const A_PHASES = ['A0', 'A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'A9'];
  
  // 统计每个 A 阶段的产物数量
  for (const a of artifacts) {
    const phase = a.chain_phase;
    if (A_PHASES.includes(phase)) {
      byAPhase[phase] = (byAPhase[phase] || 0) + 1;
    }
  }

  // 构建 statistics
  const statistics = {
    by_department: countBy(artifacts, 'department'),
    by_type: countBy(artifacts, 'type'),
    by_status: countBy(artifacts, 'status'),
    by_chain_phase: countBy(artifacts, 'chain_phase'),
    by_a_phase: byAPhase,
  };

  const data: ArtifactsData = {
    version: '2.1',
    generated_at: new Date().toISOString(),
    total: artifacts.length,
    statistics,
    artifacts,
  };

  return { index, data };
}

// ============================================================
// 辅助函数
// ============================================================

/** Convert a JSON object to readable markdown for display */
function jsonToMarkdown(data: any, title: string): string {
  if (!data || typeof data !== 'object') {
    return String(data || '');
  }

  const lines: string[] = [];
  lines.push(`# ${title}\n`);

  // 优先渲染的关键字段（展平，不嵌套）
  const TOP_KEYS = ['timestamp', 'account', 'check_type', 'dry_run', 'has_position',
    'final_decision', 'decision_reason', 'action_taken', 'market_regime'];
  const NESTED_SECTIONS = ['position', 'market_features', 'exit_skill_result',
    'execution_result', 'errors', 'trend_indicators'];

  // 先渲染顶层简单字段
  for (const key of TOP_KEYS) {
    if (data[key] !== undefined && data[key] !== null && typeof data[key] !== 'object') {
      lines.push(`**${key}**: ${data[key]}`);
    }
  }

  // 顶层布尔值字段
  for (const key of ['dry_run', 'has_position']) {
    if (data[key] !== undefined) {
      lines.push(`**${key}**: ${data[key] ? '✅ Yes' : '❌ No'}`);
    }
  }

  lines.push('');

  // 渲染嵌套对象为表格或列表
  for (const section of NESTED_SECTIONS) {
    if (!data[section] || typeof data[section] !== 'object') continue;

    const val = data[section];
    lines.push(`## ${section.replace(/_/g, ' ').toUpperCase()}`);
    lines.push('');

    if (Array.isArray(val)) {
      // 数组类型：渲染为列表
      if (val.length === 0) {
        lines.push('_No data_\n');
      } else if (typeof val[0] === 'object') {
        // 对象数组：渲染为表格
        const keys = Object.keys(val[0]);
        lines.push('| ' + keys.join(' | ') + ' |');
        lines.push('| ' + keys.map(() => '---').join(' | ') + ' |');
        for (const row of val) {
          lines.push('| ' + keys.map(k => formatCell(row[k])).join(' | ') + ' |');
        }
      } else {
        for (const item of val) {
          lines.push(`- ${item}`);
        }
      }
    } else {
      // 对象类型：渲染为 key-value 表格
      const keys = Object.keys(val);
      if (keys.length === 0) {
        lines.push('_No data_\n');
      } else {
        lines.push('| Key | Value |');
        lines.push('| --- | --- |');
        for (const k of keys) {
          lines.push(`| ${k} | ${formatCell(val[k])} |`);
        }
      }
    }
    lines.push('');
  }

  // 渲染剩余未处理的字段
  const processedKeys = new Set([...TOP_KEYS, ...NESTED_SECTIONS]);
  for (const key of Object.keys(data)) {
    if (processedKeys.has(key)) continue;
    const val = data[key];
    if (val === undefined || val === null) continue;
    lines.push(`## ${key.replace(/_/g, ' ')}`);
    lines.push('');
    if (typeof val === 'object') {
      lines.push('```json');
      lines.push(JSON.stringify(val, null, 2));
      lines.push('```\n');
    } else {
      lines.push(String(val));
      lines.push('');
    }
  }

  return lines.join('\n');
}

/** Format a cell value for markdown table */
function formatCell(val: any): string {
  if (val === null || val === undefined) return '-';
  if (typeof val === 'boolean') return val ? '✅' : '❌';
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val).replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

function countBy(arr: any[], key: string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of arr) {
    const val = item[key] || 'unknown';
    counts[val] = (counts[val] || 0) + 1;
  }
  return counts;
}

function emptyArtifactsData(): ArtifactsData {
  return {
    version: '2.0',
    generated_at: new Date().toISOString(),
    total: 0,
    statistics: { by_department: {}, by_type: {}, by_status: {}, by_chain_phase: {}, by_a_phase: {} },
    artifacts: [],
  };
}

// ============================================================
// 缓存机制（避免每次请求都扫描文件系统）
// ============================================================
let _cacheIndex: ArtifactIndex[] | null = null;
let _cacheData: ArtifactsData | null = null;
let _cacheMtime = 0;

/**
 * 计算所有 index.json 的最新 mtime（精确到子目录）
 * 解决原来只检查根目录 mtime 导致新增产物不刷新的问题
 */
function computeIndexMtime(): number {
  let maxMtime = 0;
  try {
    const categories = fs.readdirSync(ARTIFACTS_ROOT).filter(f => {
      const fp = path.join(ARTIFACTS_ROOT, f);
      return fs.statSync(fp).isDirectory() && !f.startsWith('.');
    });
    for (const cat of categories) {
      const indexFile = path.join(ARTIFACTS_ROOT, cat, 'index.json');
      if (fs.existsSync(indexFile)) {
        const mtime = fs.statSync(indexFile).mtimeMs;
        if (mtime > maxMtime) maxMtime = mtime;
      }
    }
  } catch {}
  return maxMtime;
}

function getCache() {
  // 检查缓存是否有效（5秒短过期兜底）
  if (_cacheIndex && Date.now() - _cacheMtime < 5000) {
    return { index: _cacheIndex, data: _cacheData! };
  }

  // 检查所有 index.json 是否有更新（精确检测子目录变更）
  const latestMtime = computeIndexMtime();
  if (_cacheIndex && latestMtime === _cacheMtime) {
    return { index: _cacheIndex, data: _cacheData! };
  }
  _cacheMtime = latestMtime;

  // 重新扫描
  const { index, data } = scanArtifacts();
  _cacheIndex = index;
  _cacheData = data;
  return { index, data };
}

/** 手动刷新缓存（供 API 路由调用，新增产物后主动触发） */
export function invalidateCache(): void {
  _cacheIndex = null;
  _cacheData = null;
  _cacheMtime = 0;
}

// ============================================================
// 导出接口（保持与原代码兼容）
// ============================================================

/** Get the flat artifacts index for listing/searching */
export function getArtifactsIndex(): ArtifactIndex[] {
  const { index } = getCache();
  return index;
}

/** Get the full artifacts data with statistics */
export function getArtifactsData(): ArtifactsData {
  const { data } = getCache();
  return data;
}

/** Get a single artifact content by its slug (path without .md) */
export function getArtifactBySlug(slug: string): ArtifactContent | null {
  // slug format: "category/artifact_id" or "category/filename_without_md"
  const parts = slug.split('/');
  if (parts.length < 2) return null;

  const category = parts[0];
  const artifactId = parts.slice(1).join('/').replace(/\.md$/, '');

  const catDir = path.join(ARTIFACTS_ROOT, category);
  if (!fs.existsSync(catDir)) return null;

  // 读取 index.json 获取该 artifact 的元数据
  let indexMeta: Record<string, any> = {};
  const indexFile = path.join(catDir, 'index.json');
  if (fs.existsSync(indexFile)) {
    try {
      const catIndex = JSON.parse(fs.readFileSync(indexFile, 'utf-8'));
      const items = Array.isArray(catIndex) ? catIndex : (catIndex.artifacts || []);
      const matched = items.find((i: any) => {
        const rawId = i.artifact_id || i.id || '';
        const id = rawId.includes('/') ? rawId.split('/').pop()! : rawId;
        return id === artifactId;
      });
      if (matched) indexMeta = matched;
    } catch {}
  }

  // 尝试几种可能的 .md 文件名
  const mdCandidates = [
    path.join(catDir, `${artifactId}.md`),
    path.join(catDir, `${artifactId.toUpperCase()}.md`),
    path.join(catDir, 'INDEX.md'),
    path.join(catDir, 'index.md'),
  ];

  let mdPath = '';
  for (const fp of mdCandidates) {
    if (fs.existsSync(fp)) {
      mdPath = fp;
      break;
    }
  }

  // 如果 .md 存在，优先读取 markdown
  if (mdPath) {
    try {
      const fileContent = fs.readFileSync(mdPath, 'utf-8');
      const { data, content } = matter(fileContent);
      return { frontmatter: data, content, slug };
    } catch (err) {
      console.error(`[content] Failed to read artifact: ${slug}`, err);
    }
  }

  // .md 不存在，尝试 .json 回退
  const jsonPath = path.join(catDir, `${artifactId}.json`);
  if (fs.existsSync(jsonPath)) {
    try {
      const jsonContent = fs.readFileSync(jsonPath, 'utf-8');
      const jsonData = JSON.parse(jsonContent);
      const frontmatter: Record<string, any> = {
        title: indexMeta.title || jsonData.title || artifactId,
        type: indexMeta.type || 'knowledge',
        status: indexMeta.status,
        tags: indexMeta.tags,
        department: indexMeta.department || CATEGORY_TO_DEPARTMENT[category] || 'knowledge',
        date: indexMeta.date || jsonData.timestamp || new Date().toISOString(),
      };
      const content = jsonToMarkdown(jsonData, artifactId);
      return { frontmatter, content, slug };
    } catch (err) {
      console.error(`[content] Failed to read JSON artifact: ${slug}`, err);
    }
  }

  return null;
}

/** Get all unique slugs for static generation */
export function getAllSlugs(): string[] {
  const index = getArtifactsIndex();
  // url is like "/feed/masters/INDEX", strip leading "/feed/"
  return index.map((a) => a.url.replace('/feed/', '').replace(/^\//, ''));
}
