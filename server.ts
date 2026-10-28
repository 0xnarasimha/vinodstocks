import express from 'express';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PYTHON_SCRIPT = path.join(__dirname, 'python_backend', 'engine.py');

function invokePythonEngine(command: string, payload: Record<string, unknown> = {}) {
  const output = execFileSync('python3', [PYTHON_SCRIPT, command, JSON.stringify(payload)], {
    encoding: 'utf-8',
    maxBuffer: 10 * 1024 * 1024,
  });
  return JSON.parse(output);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.get('/api/state', (_req, res) => {
    try {
      const result = invokePythonEngine('get_state');
      res.json(result);
    } catch (err) {
      res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'Python engine error' });
    }
  });

  app.post('/api/transactions', (req, res) => {
    try {
      const result = invokePythonEngine('record_transaction', req.body || {});
      res.status(200).json(result);
    } catch (err) {
      res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'Python engine error' });
    }
  });

  app.post('/api/products', (req, res) => {
    try {
      const result = invokePythonEngine('add_product', req.body || {});
      res.status(200).json(result);
    } catch (err) {
      res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'Python engine error' });
    }
  });

  app.patch('/api/products/:productId/reorder-level', (req, res) => {
    try {
      const result = invokePythonEngine('update_reorder_level', {
        product_id: Number(req.params.productId),
        reorder_level: req.body?.reorder_level,
      });
      res.status(200).json(result);
    } catch (err) {
      res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'Python engine error' });
    }
  });

  app.post('/api/suppliers', (req, res) => {
    try {
      const result = invokePythonEngine('add_supplier', req.body || {});
      res.status(200).json(result);
    } catch (err) {
      res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'Python engine error' });
    }
  });

  app.post('/api/reset', (_req, res) => {
    try {
      const result = invokePythonEngine('reset_demo');
      res.json(result);
    } catch (err) {
      res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'Python engine error' });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`PyStock Server running on http://localhost:${PORT}`);
  });
}

startServer();
