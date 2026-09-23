/**
 * Microbenchmark do CORE (independe de GPU): custo por tick da simulação com 800 projéteis
 * inimigos ativos + chefe atacando + 2 jogadores atirando. Meta: tick ≤ 4 ms.
 * Uso: tsx tools/bench-core.ts [ticks=3600] [--json]
 */
import { createBossBattle } from '../src/core/factory';
import { Btn } from '../src/core/input';
import { Motion } from '../src/core/projectiles';
import { Rng } from '../src/core/rng';
import { BOSSES } from '../src/data/bosses';

const TICKS = Number(process.argv.find((a) => /^\d+$/.test(a)) ?? 3600);
const JSON_OUT = process.argv.includes('--json');
const KINDS = ['gear', 'seed', 'numeral', 'spring', 'button', 'note', 'coal', 'ember'];

interface Result {
  boss: string;
  ticks: number;
  avgMs: number;
  p99Ms: number;
  maxMs: number;
  minProjectiles: number;
  heapGrowthMB: number;
}

function feed(sim: ReturnType<typeof createBossBattle>, rng: Rng): void {
  const pool = sim.enemyShots;
  let n = pool.activeCount;
  while (n < 800) {
    const p = pool.spawn();
    if (!p) break;
    const a = rng.next() * Math.PI * 2;
    const sp = 120 + rng.next() * 260;
    p.x = p.px = 200 + rng.next() * 1500;
    p.y = p.py = 100 + rng.next() * 700;
    p.vx = Math.cos(a) * sp;
    p.vy = Math.sin(a) * sp;
    p.gravity = 0;
    p.r = 12 + rng.next() * 16;
    p.kind = KINDS[n % KINDS.length]!;
    p.parry = n % 11 === 0;
    p.warn = p.warnTotal = 0;
    p.life = 1_000_000;
    p.age = 0;
    p.motion = Motion.Linear;
    p.spin = 2;
    p.rolling = false;
    p.floorKill = false;
    p.bounces = 0;
    p.shadow = false;
    p.offscreenWarn = false;
    n++;
  }
  for (const s of pool.items) {
    if (!s.active) continue;
    if (s.x < 60 || s.x > 1860) s.vx = -s.vx;
    if (s.y < 60 || s.y > 1000) s.vy = -s.vy;
  }
}

function run(id: string): Result {
  const def = BOSSES[id]!;
  const sim = createBossBattle(def, { seed: 7, coop: true });
  sim.invincible = true;
  const rng = new Rng(99);
  const times: number[] = [];
  let minProj = Infinity;
  // aquecimento (JIT) fora da medição
  for (let i = 0; i < 300; i++) {
    feed(sim, rng);
    sim.feedInput(0, Btn.Shoot | (i % 40 < 20 ? Btn.Right : Btn.Left));
    sim.feedInput(1, Btn.Shoot | Btn.Up);
    sim.step();
    sim.events.clear();
  }
  const heap0 = process.memoryUsage().heapUsed;
  for (let i = 0; i < TICKS; i++) {
    const t0 = performance.now();
    feed(sim, rng);
    sim.feedInput(0, Btn.Shoot | (i % 40 < 20 ? Btn.Right : Btn.Left) | (i % 90 === 0 ? Btn.Jump : 0));
    sim.feedInput(1, Btn.Shoot | Btn.Up | (i % 120 === 0 ? Btn.Dash : 0));
    sim.step();
    sim.events.clear();
    times.push(performance.now() - t0);
    minProj = Math.min(minProj, sim.enemyShots.activeCount);
    // o chefe não pode morrer durante a medição
    if (sim.boss && sim.boss.hp < sim.boss.maxHp * 0.3) sim.boss.hp = sim.boss.maxHp;
  }
  const heap1 = process.memoryUsage().heapUsed;
  times.sort((a, b) => a - b);
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const r2 = (v: number): number => Math.round(v * 1000) / 1000;
  return {
    boss: id,
    ticks: TICKS,
    avgMs: r2(avg),
    p99Ms: r2(times[Math.floor(times.length * 0.99)] ?? avg),
    maxMs: r2(times[times.length - 1] ?? avg),
    minProjectiles: minProj,
    heapGrowthMB: Math.round(((heap1 - heap0) / 1048576) * 10) / 10,
  };
}

const results = Object.keys(BOSSES).map(run);
if (JSON_OUT) console.log(JSON.stringify(results));
else {
  console.log(`bench:core — ${TICKS} ticks por chefe, 800 projéteis inimigos, 2 jogadores atirando (Node ${process.version})`);
  for (const r of results) console.log(`  ${r.boss.padEnd(10)} média ${r.avgMs.toFixed(3)} ms  p99 ${r.p99Ms.toFixed(3)} ms  máx ${r.maxMs.toFixed(3)} ms  proj.mín ${r.minProjectiles}  heap Δ ${r.heapGrowthMB} MB`);
  const worst = results.reduce((a, b) => (b.p99Ms > a.p99Ms ? b : a));
  const ok = worst.p99Ms <= 4;
  console.log(`bench:core — pior p99: ${worst.boss} ${worst.p99Ms.toFixed(3)} ms (meta ≤ 4 ms) → ${ok ? 'OK' : 'ACIMA DA META'}`);
  if (!ok) process.exitCode = 1;
}
