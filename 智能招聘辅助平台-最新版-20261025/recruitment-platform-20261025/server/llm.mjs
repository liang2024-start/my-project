import { normalizeForMatch } from './pdf.mjs';

const BASE_URL = process.env.LLM_BASE_URL || 'https://api.deepseek.com';
const API_KEY = process.env.LLM_API_KEY || '';
const MODEL = process.env.LLM_MODEL || 'deepseek-flash';
export const PROMPT_VERSION = 'parse-v1';

export const llmInfo = () => ({ baseUrl: BASE_URL, model: MODEL, configured: !!API_KEY });

async function chat(messages, { json = false, maxTokens = 4000, temperature = 0.1, timeoutMs = 180000 } = {}) {
  if (!API_KEY) throw new Error('未配置大模型 API Key');
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${BASE_URL.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
      signal: ctrl.signal,
      body: JSON.stringify({
        model: MODEL,
        messages,
        temperature,
        max_tokens: maxTokens,
        ...(json ? { response_format: { type: 'json_object' } } : {}),
      }),
    });
    const raw = await res.text();
    if (!res.ok) throw new Error(`LLM ${res.status}: ${raw.slice(0, 300)}`);
    const body = JSON.parse(raw);
    const msg = body.choices?.[0]?.message || {};
    // 推理模型可能只返回 reasoning_content（预算不足），这里显式报错，避免把空结论当成功
    if (!msg.content) throw new Error('LLM 返回内容为空（可能 max_tokens 不足）');
    return { content: msg.content, usage: body.usage };
  } finally {
    clearTimeout(timer);
  }
}

function safeJson(text) {
  const trimmed = String(text).trim().replace(/^```json/i, '').replace(/^```/, '').replace(/```$/, '').trim();
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start < 0 || end < 0) throw new Error('LLM 未返回 JSON');
  return JSON.parse(trimmed.slice(start, end + 1));
}

const SYSTEM_PROMPT = `你是招聘初筛辅助助手，只做"对照条件逐项核对"，不做录用决策。
硬性规则：
1) 只能依据简历原文判断，禁止推测或补全简历中不存在的信息。
2) 简历没有写到的内容，verdict 必须是 insufficient_info，并在 questions 中列出需要核实的问题。
3) 只有简历明确写出不满足时，才能给 not_matched；not_matched 必须附原文证据。
4) 每条结论必须给出 evidence_quote，且必须是简历原文中连续的一段（20-200 字），不得改写、拼接或摘要。
5) evidence_hint 用来说明证据出处（如"工作经历-2023.10"）。
6) 严禁输出任何"淘汰/不通过/建议放弃"类结论；你只输出核对结果与待核实问题。
输出 JSON：{"score":0-100,"grade":"A|B|C","tags":["能力标签"],"criteria":[{"id":"C1","verdict":"matched|not_matched|insufficient_info","evidence_quote":"","evidence_hint":""}],"questions":[""]}`;

/**
 * 调用大模型解析简历，并做服务端校验：
 * - 未写到的信息不得判 not_matched（降级为 insufficient_info）
 * - 结论必须有可定位的原文证据，否则标记 evidence_missing
 */
export async function parseResume({ jobName, criteria, resumeText }) {
  if (!resumeText || resumeText.trim().length < 50) {
    throw new Error('简历文本为空或过短，无法解析：请上传可复制文本的 PDF，或人工补充简历文本后重试');
  }
  const criteriaText = criteria
    .map((c) => `${c.id} ${c.name}（${c.type}，权重${c.weight}）：${c.rule || '（用人部门未填写判定规则，按条件名称结合岗位描述理解，边界不清时列入待核实问题）'}`)
    .join('\n');
  const { content, usage } = await chat(
    [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `【岗位】${jobName}\n【已确认条件】\n${criteriaText}\n\n【简历原文】\n${resumeText}` },
    ],
    { json: true, maxTokens: 4000 }
  );
  const raw = safeJson(content);
  const normalizedResume = normalizeForMatch(resumeText);

  const warnings = [];
  const resultCriteria = criteria.map((c) => {
    const found = (raw.criteria || []).find((x) => String(x.id).toUpperCase() === c.id.toUpperCase()) || {};
    let verdict = ['matched', 'not_matched', 'insufficient_info'].includes(found.verdict) ? found.verdict : 'insufficient_info';
    const quote = String(found.evidence_quote || '').trim();
    const evidenceOk = quote.length >= 8 && normalizedResume.includes(normalizeForMatch(quote));
    if (!evidenceOk) {
      if (verdict === 'not_matched') {
        verdict = 'insufficient_info';
        warnings.push(`${c.id} 结论缺少可定位原文证据，已按规则降级为「信息不足」`);
      } else if (verdict === 'matched') {
        warnings.push(`${c.id} 结论缺少可定位原文证据，已标记「证据缺失」待人工复核`);
      }
    }
    return {
      id: c.id, name: c.name, type: c.type, weight: c.weight, rule: c.rule || '',
      verdict,
      evidence_quote: evidenceOk ? quote : '',
      evidence_hint: found.evidence_hint || '',
      evidence_missing: !evidenceOk && verdict === 'matched',
    };
  });

  const score = Math.max(0, Math.min(100, Math.round(Number(raw.score) || 0)));
  const grade = ['A', 'B', 'C'].includes(raw.grade) ? raw.grade : score >= 80 ? 'A' : score >= 65 ? 'B' : 'C';
  const tags = Array.isArray(raw.tags) ? raw.tags.slice(0, 8).map(String) : [];
  const questions = Array.isArray(raw.questions) ? raw.questions.slice(0, 8).map(String) : [];
  // 兜底：每条"信息不足 / 不符合"的条件都必须有对应的待核实问题（R10/E1）
  for (const c of resultCriteria) {
    if (c.verdict === 'matched') continue;
    if (questions.some((q) => q.includes(c.name))) continue;
    questions.push(
      c.verdict === 'insufficient_info'
        ? `请核实「${c.id} ${c.name}」：简历未提供明确信息，需与候选人确认或补充材料`
        : `请核实「${c.id} ${c.name}」：简历显示不满足该条件，需确认是否有简历未体现的相关经历`
    );
  }
  const evidenceMissing = resultCriteria.some((c) => c.evidence_missing) || warnings.length > 0;

  return {
    score, grade, tags,
    criteria: resultCriteria,
    questions,
    evidenceMissing,
    warnings,
    model: MODEL,
    promptVersion: PROMPT_VERSION,
    usage,
  };
}

/** 生成推荐材料草稿（推荐理由 + 差距说明），失败时回退到本地拼装 */export async function draftRecommendation({ candidate, jobName, parsed }) {
  const matched = parsed.criteria.filter((c) => c.verdict === 'matched').length;
  const insufficient = parsed.criteria.filter((c) => c.verdict === 'insufficient_info').length;
  const notMatched = parsed.criteria.filter((c) => c.verdict === 'not_matched').length;
  const summary = parsed.criteria
    .map((c) => `${c.id} ${c.name}：${c.verdict === 'matched' ? '符合' : c.verdict === 'not_matched' ? '不符合' : '信息不足'}`)
    .join('；');
  try {
    const { content } = await chat(
      [
        {
          role: 'system',
          content: '你是招聘专员的材料助手。根据核对结论起草推荐理由与差距说明，事实必须来自结论，不得夸大或编造。输出 JSON：{"reason":"","gap":""}，每条 60-160 字，中文，语气客观。',
        },
        {
          role: 'user',
          content: `候选人：${candidate}\n岗位：${jobName}\n评分：${parsed.score}（${parsed.grade}级）\n能力标签：${parsed.tags.join('、')}\n逐项结论：${summary}\n符合 ${matched} 项 / 信息不足 ${insufficient} 项 / 不符合 ${notMatched} 项\n待核实问题：${parsed.questions.join('；')}`,
        },
      ],
      { json: true, maxTokens: 1200 }
    );
    const j = safeJson(content);
    return { reason: String(j.reason || '').trim(), gap: String(j.gap || '').trim(), source: 'llm' };
  } catch (e) {
    const reason = `候选人 ${candidate} 对照「${jobName}」已确认条件：符合 ${matched} 项、信息不足 ${insufficient} 项、不符合 ${notMatched} 项，AI 评分 ${parsed.score} 分（${parsed.grade} 级）。能力标签：${parsed.tags.join('、') || '暂无'}。`;
    const gap = insufficient || notMatched
      ? `差距与待核实：${parsed.criteria.filter((c) => c.verdict !== 'matched').map((c) => `${c.name}（${c.verdict === 'not_matched' ? '不符合' : '信息不足'}）`).join('、')}，需在面试或补充材料中确认。`
      : '已确认条件均有原文证据支撑，暂未发现明显差距。';
    return { reason, gap, source: 'fallback', error: e.message };
  }
}

/* =====================================================================
   岗位画像分析：把用人部门的岗位描述 + 已确认条件，翻译成专员可直接用于
   筛简历的"理解说明书"。只做解释与提炼，不做录用判断。
===================================================================== */
const ANALYSIS_PROMPT_VERSION = 'job-analysis-v1';
const ANALYSIS_SYSTEM = `你是招聘需求分析助手，服务对象是招聘专员。你的任务是把用人部门写的岗位描述与已确认条件，翻译成专员能直接拿来筛简历的理解说明书。
要求：
1) 只能依据给出的岗位描述与条件，不得引入外部行业假设，不得编造公司背景。
2) 语言具体、可执行：写到"简历里出现什么、做过什么、能说出什么"的程度，不要空话（如"沟通能力强"）。
3) 每个必备条件都要说明：什么样的项目经历算符合、什么样的不算、简历里通常体现在哪一段。
4) 不得输出"淘汰/不通过"类结论，也不得给候选人打分。
输出 JSON：
{
 "summary": "120字以内的岗位一句话理解（这个岗位到底解决什么问题）",
 "coreGoal": "该岗位入职后 6 个月最核心的交付目标",
 "mustHave": [{"name":"","why":"","evidence":"简历中应出现什么证据","hint":"通常出现在简历哪个部分"}],
 "niceToHave": [{"name":"","why":""}],
 "screeningSignals": [{"signal":"简历里的正向信号","why":"说明什么"}],
 "redFlags": [{"signal":"看起来相关但实际不满足的经历","why":""}],
 "askCandidates": ["建议在初筛沟通时向候选人确认的问题"],
 "askDept": ["仍需要用人部门进一步明确的点"]
}`;

export async function analyzeJob({ jobName, dept, description, criteria, clarifications = [] }) {
  const criteriaText = criteria
    .map((c) => `${c.id} ${c.name}（${c.type}，权重${c.weight}%）${c.rule ? '：' + c.rule : ''}`)
    .join('\n');
  const qaText = clarifications.length
    ? clarifications.map((c) => `问：${c.question}\n答：${c.answer || '（未回复）'}`).join('\n')
    : '（暂无）';
  const messages = [
    { role: 'system', content: ANALYSIS_SYSTEM },
    {
      role: 'user',
      content: `【岗位名称】${jobName}\n【用人部门】${dept}\n【岗位描述】${description}\n【已确认条件】\n${criteriaText}\n【已有的澄清问答】\n${qaText}`,
    },
  ];
  try {
    let j;
    try {
      // deepseek-flash 是推理模型，max_tokens 给小了会被截断成非法 JSON
      j = safeJson((await chat(messages, { json: true, maxTokens: 6000, temperature: 0.3 })).content);
    } catch (e1) {
      j = safeJson((await chat(
        [
          ...messages,
          { role: 'system', content: '上一次输出不是合法 JSON（可能被截断）。请重新输出，务必是完整闭合的 JSON：每个数组最多 4 条，每条字段值不超过 60 字，不要输出 JSON 以外的任何文字。' },
        ],
        { json: true, maxTokens: 6000, temperature: 0.2 }
      )).content);
    }
    const arr = (v) => (Array.isArray(v) ? v.filter(Boolean) : []);
    return {
      summary: String(j.summary || '').trim(),
      coreGoal: String(j.coreGoal || '').trim(),
      mustHave: arr(j.mustHave).map((x) => ({
        name: String(x.name || ''), why: String(x.why || ''),
        evidence: String(x.evidence || ''), hint: String(x.hint || ''),
      })),
      niceToHave: arr(j.niceToHave).map((x) => ({ name: String(x.name || ''), why: String(x.why || '') })),
      screeningSignals: arr(j.screeningSignals).map((x) => ({ signal: String(x.signal || ''), why: String(x.why || '') })),
      redFlags: arr(j.redFlags).map((x) => ({ signal: String(x.signal || ''), why: String(x.why || '') })),
      askCandidates: arr(j.askCandidates).map(String),
      askDept: arr(j.askDept).map(String),
      model: MODEL,
      promptVersion: ANALYSIS_PROMPT_VERSION,
      source: 'llm',
    };
  } catch (e) {
    // 回退：用条件本身拼一份最小可用的说明，保证页面不空
    return {
      summary: `${jobName}（${dept}）：${description}`.slice(0, 160),
      coreGoal: '（大模型分析暂不可用，以下由已确认条件直接生成）',
      mustHave: criteria.filter((c) => c.type === '必备').map((c) => ({
        name: c.name, why: `权重 ${c.weight}%`, evidence: c.rule || `简历中需体现「${c.name}」相关经历`, hint: '工作经历',
      })),
      niceToHave: criteria.filter((c) => c.type === '加分').map((c) => ({ name: c.name, why: `权重 ${c.weight}%` })),
      screeningSignals: [], redFlags: [], askCandidates: [], askDept: [],
      model: MODEL, promptVersion: ANALYSIS_PROMPT_VERSION, source: 'fallback', error: e.message,
    };
  }
}

