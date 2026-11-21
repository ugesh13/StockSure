import { spawn, type ChildProcess } from 'node:child_process';
import readline from 'node:readline';

const API_PORT = process.env.PORT ?? '3000';
const HEALTH_URL = `http://127.0.0.1:${API_PORT}/health`;

console.log('=== STARTING STOCKSURE DEMO PROCESSES ===');

const processes: { name: string; proc: ChildProcess }[] = [];

function pipeLines(stream: NodeJS.ReadableStream | null, prefix: string, isErr = false) {
  if (!stream) return;
  const rl = readline.createInterface({ input: stream });
  rl.on('line', (line) => {
    if (line.trim()) {
      if (isErr) {
        console.error(`[${prefix}] ${line}`);
      } else {
        console.log(`[${prefix}] ${line}`);
      }
    }
  });
}

function startProcess(name: string, file: string, args: string[] = []): ChildProcess {
  const proc = spawn(process.execPath, ['--env-file-if-exists=.env', file, ...args], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env },
  });
  pipeLines(proc.stdout, name, false);
  pipeLines(proc.stderr, name, true);
  proc.on('exit', (code, signal) => {
    console.log(`[${name}] exited with code ${code ?? signal}`);
  });
  processes.push({ name, proc });
  return proc;
}

// 1. Start API
startProcess('api', 'src/server.ts');

// 2. Start Worker
startProcess('worker', 'src/worker.ts');

// 3. Start POS simulator
startProcess('pos', 'scripts/pos-simulator.ts');

// 4. Poll health until green
let ready = false;
const startTime = Date.now();
const maxWaitMs = 60_000;

async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(HEALTH_URL, { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      const data = (await res.json()) as any;
      if (
        data.ok === true &&
        data.kafka_patch === true &&
        data.services?.postgres?.ok === true &&
        data.services?.kafka?.ok === true &&
        data.services?.opensearch?.ok === true
      ) {
        return true;
      }
    }
  } catch {}
  return false;
}

console.log('Waiting for API health check at ' + HEALTH_URL + '...');

while (Date.now() - startTime < maxWaitMs) {
  if (await checkHealth()) {
    ready = true;
    break;
  }
  await new Promise((r) => setTimeout(r, 1000));
}

if (ready) {
  console.log('\n========================================');
  console.log('READY — StockSure API, Worker & POS Simulator are live!');
  console.log('========================================\n');
} else {
  console.error('\nFAIL: API health did not turn green within 60 s.');
  stopAll();
  process.exit(1);
}

import { execSync } from 'node:child_process';

function stopAll() {
  console.log('\nStopping demo processes...');
  for (const { name, proc } of processes) {
    if (proc.pid) {
      if (process.platform === 'win32') {
        try {
          execSync(`taskkill /F /T /PID ${proc.pid}`, { stdio: 'ignore' });
        } catch {}
      } else {
        try {
          proc.kill('SIGTERM');
        } catch {}
      }
    }
  }
  process.exit(0);
}

process.on('SIGINT', () => {
  console.log('\nReceived SIGINT (Ctrl+C).');
  stopAll();
});

process.on('SIGTERM', () => {
  console.log('\nReceived SIGTERM.');
  stopAll();
});
