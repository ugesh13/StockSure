import { sleep } from '../src/util.ts';
import { spawn } from 'node:child_process';

let isAlreadyRunning = false;
try {
  const check = await fetch('http://127.0.0.1:3000/health');
  if (check.ok) isAlreadyRunning = true;
} catch {}

let server: any = null;
if (!isAlreadyRunning) {
  console.log('Starting server for T0 test...');
  server = spawn('node', ['--env-file-if-exists=.env', 'src/server.ts'], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  server.stderr?.on('data', (d: any) => {
    console.error('[server err]', d.toString().trim());
  });

  console.log('Waiting 30 seconds after boot as required by T0a...');
  await sleep(30_000);
} else {
  console.log('Server already running on port 3000; testing /health directly...');
}

try {
  console.log('Running 10 consecutive /health calls:');
  const results: any[] = [];
  for (let i = 1; i <= 10; i++) {
    const t0 = performance.now();
    const res = await fetch('http://localhost:3000/health');
    const elapsed = performance.now() - t0;
    const body: any = await res.json();
    const kafkaOk = body?.services?.kafka?.ok;
    const kafkaAge = body?.services?.kafka?.age_ms;
    const status = res.status;
    console.log(`Call ${i}: status=${status}, elapsed=${elapsed.toFixed(1)}ms, kafka.ok=${kafkaOk}, kafka.age_ms=${kafkaAge}`);
    results.push({ call: i, status, elapsedMs: Number(elapsed.toFixed(1)), kafkaOk, kafkaAge });
    const spacing = isAlreadyRunning ? 1000 : 5000;
    if (i < 10) await sleep(spacing);
  }

  const allOk = results.every((r) => r.status === 200 && r.kafkaOk === true && r.elapsedMs < 1000);
  if (!allOk) {
    console.error('T0a FAILED: not all calls had status 200, kafka.ok=true, and elapsedMs < 1000');
    process.exit(1);
  }
  console.log('T0a PASSED!');
} finally {
  if (server) {
    server.kill('SIGINT');
    await sleep(2000);
  }
}

