import express from 'express';
import path from 'node:path';
import api from './routes.mjs';
import { llmInfo } from './llm.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const app = express();
app.disable('x-powered-by');

app.use('/api', api);
app.use(express.static(path.join(ROOT, 'web'), { extensions: ['html'] }));
app.get('/health', (req, res) => res.json({ ok: true, llm: llmInfo(), at: new Date().toISOString() }));
app.use((req, res) => {
  if (req.path.startsWith('/api')) return res.status(404).json({ error: '接口不存在', code: 'NOT_FOUND' });
  res.sendFile(path.join(ROOT, 'web', 'index.html'));
});
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const message = err?.message || '服务异常';
  const status = err?.code === 'LIMIT_FILE_SIZE' ? 413 : 500;
  console.error('[error]', message);
  res.status(status).json({ error: message, code: err?.code || 'INTERNAL_ERROR' });
});

const PORT = Number(process.env.PORT || 5173);
app.listen(PORT, () => {
  console.log(`智能招聘辅助平台已启动：http://localhost:${PORT}`);
  console.log(`大模型：${llmInfo().model} @ ${llmInfo().baseUrl}`);
});
