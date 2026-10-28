import fs from 'node:fs';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

/** 抽取 PDF 文本：按页保留段落顺序，压缩多余空白 */
export async function extractPdfText(filePath) {
  const data = new Uint8Array(fs.readFileSync(filePath));
  const task = pdfjs.getDocument({ data, useSystemFonts: true, isEvalSupported: false });
  const doc = await task.promise;
  const pages = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((it) => it.str)
      .join(' ')
      .replace(/[ \t]+/g, ' ')
      .replace(/\s*\n\s*/g, '\n')
      .trim();
    pages.push(text);
  }
  await task.destroy();
  return pages.join('\n\n').replace(/\n{3,}/g, '\n\n').trim();
}

/** 从简历文本里抽候选人姓名与联系方式（用于导入与去重提示） */
export function guessCandidateMeta(text, fallbackName = '') {
  const nameFromFile = fallbackName.replace(/^[A-Z]{2}\d{3}_/, '').replace(/\.pdf$/i, '').trim();
  const email = (text.match(/[\w.+-]+@[\w-]+\.[\w.]+/) || [])[0] || null;
  const phone = (text.match(/1[3-9]\d{9}/) || [])[0] || null;
  return { name: nameFromFile || '未命名候选人', email, phone };
}

export const normalizeForMatch = (s = '') => s.replace(/[\s\u3000]+/g, '');
