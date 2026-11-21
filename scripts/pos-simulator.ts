// Simulates the stores. Every branch confirms its stock every 20 seconds (the freshness rule shows
// "confirm with store" for a branch that stays silent for more than 60 seconds).
//   npm run pos-sim                 heartbeats only
//   npm run pos-sim -- --sales      also a random in-store sale about every 15 seconds
const API = (process.env.API_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const KEY = process.env.STAFF_KEY ?? '';
const withSales = process.argv.includes('--sales');

if (!KEY) {
  console.error('STAFF_KEY is not set.');
  process.exit(1);
}

const headers = { 'content-type': 'application/json', 'x-staff-key': KEY };

async function post(path: string, body: unknown): Promise<number> {
  const res = await fetch(API + path, { method: 'POST', headers, body: JSON.stringify(body) }).catch(() => null);
  return res?.status ?? 0;
}

let branches: { id: number }[] = [];
for (let i = 0; i < 30; i++) {
  try {
    const res = await fetch(API + '/branches');
    if (res.ok) {
      const data = (await res.json()) as { branches: { id: number }[] };
      branches = data.branches ?? [];
      if (branches.length > 0) break;
    }
  } catch {}
  await new Promise((r) => setTimeout(r, 1000));
}
if (branches.length === 0) {
  console.error(`Failed to load branches from ${API} after 30 seconds.`);
  process.exit(1);
}
console.log(`Simulating ${branches.length} branches against ${API}${withSales ? ' (with sales)' : ''}`);

async function beat(): Promise<void> {
  for (const b of branches) {
    const s = await post('/pos/heartbeat', { branch_id: b.id });
    if (s !== 200) console.log(`heartbeat branch ${b.id} -> ${s}`);
  }
}
await beat();
setInterval(() => void beat(), 20_000);

if (withSales) {
  setInterval(() => {
    const branch = branches[Math.floor(Math.random() * branches.length)]!.id;
    const product = 4 + Math.floor(Math.random() * 146);
    void post('/pos/sale', { branch_id: branch, product_id: product, qty: 1 }).then((s) => console.log(`POS sale branch ${branch} product ${product} -> ${s}`));
  }, 15_000);
}
