// Vercel serverless entry for the StockSure Fastify API.
// The API is written in TypeScript with `.ts` import paths and runs natively on Node 22.18+
// (type stripping). This plain-JS entry loads those raw .ts sources directly, so Vercel does
// not need to compile them. Background loops (outbox relay, sweeper) do not run on Vercel.
let appPromise;

async function getApp() {
  if (!appPromise) {
    appPromise = (async () => {
      const { loadConfigOrExit } = await import('../src/config.ts');
      loadConfigOrExit(['pg', 'kafka', 'opensearch', 'api']);
      const { buildApp } = await import('../src/app.ts');
      const app = await buildApp();
      await app.ready();
      return app;
    })().catch((err) => {
      appPromise = undefined; // allow a retry on the next request
      throw err;
    });
  }
  return appPromise;
}

export default async function handler(req, res) {
  try {
    const app = await getApp();
    app.server.emit('request', req, res);
  } catch (err) {
    console.error('StockSure API failed to start:', err);
    res.statusCode = 500;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ error: 'api_start_failed', message: String(err?.message || err) }));
  }
}
