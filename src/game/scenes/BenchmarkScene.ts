import Phaser from 'phaser';
import { createBossBattle } from '../../core/factory';
import { FixedStepper } from '../../core/loop';
import { Motion } from '../../core/projectiles';
import { CUCO } from '../../data/bosses/cuco';
import { attachFilm } from '../fx/film';
import type { FilmFilter } from '../fx/FilmFilter';
import { BattleView } from '../render/BattleView';
import { Router } from '../router';
import type { BattleSim } from '../../core/battle';

export const BENCHMARK_MARKER = '__BENCHMARK_SCENE__';
const KINDS = ['gear', 'seed', 'numeral', 'spring', 'button', 'note', 'coal', 'ember'];
const DURATION_MS = Number(new URLSearchParams(location.search).get('duration') ?? 60000);

export interface BenchmarkReport {
  marker: string;
  durationMs: number;
  frames: number;
  avgFps: number;
  minFps: number;
  p1Fps: number;
  p99FrameMs: number;
  avgFrameMs: number;
  projectiles: number;
  drawCalls: number | null;
  renderer: string;
  heapMB: number | null;
}

/** Cena de estresse: 800 projéteis + pós-processamento; relatório em window.__BENCHMARK__. */
export class BenchmarkScene extends Phaser.Scene {
  private sim!: BattleSim;
  private view!: BattleView;
  private film: FilmFilter | null = null;
  private stepper = new FixedStepper();
  private last = 0;
  private start = 0;
  private frames: number[] = [];
  private done = false;
  private text!: Phaser.GameObjects.Text;

  constructor() {
    super('Benchmark');
  }

  create(): void {
    this.sim = createBossBattle(CUCO, { seed: 7 });
    this.sim.invincible = true;
    this.add.rectangle(960, 540, 1920, 1080, 0x2a1d14).setDepth(-200);
    this.view = new BattleView(this, this.sim, 'cuco');
    this.film = attachFilm(this);
    this.text = this.add.text(20, 20, 'BENCHMARK', { fontFamily: 'monospace', fontSize: '22px', color: '#9fe870', backgroundColor: 'rgba(0,0,0,0.6)' }).setDepth(1000);
    this.last = this.start = performance.now();
    (window as unknown as { __BENCHMARK__?: BenchmarkReport | null }).__BENCHMARK__ = null;
    Router.reveal(this);
  }

  /** Mantém ~800 projéteis ativos circulando pela tela. */
  private feed(): void {
    const pool = this.sim.enemyShots;
    let n = pool.activeCount;
    while (n < 800) {
      const p = pool.spawn();
      if (!p) break;
      const a = Math.random() * Math.PI * 2;
      const sp = 120 + Math.random() * 260;
      p.x = p.px = 200 + Math.random() * 1500;
      p.y = p.py = 100 + Math.random() * 800;
      p.vx = Math.cos(a) * sp;
      p.vy = Math.sin(a) * sp;
      p.gravity = 0;
      p.r = 12 + Math.random() * 16;
      p.kind = KINDS[n % KINDS.length]!;
      p.parry = n % 11 === 0;
      p.warn = p.warnTotal = 0;
      p.life = 600;
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
    // mantém dentro da tela
    for (const s of pool.items) {
      if (!s.active) continue;
      if (s.x < 60 || s.x > 1860) s.vx = -s.vx;
      if (s.y < 60 || s.y > 1000) s.vy = -s.vy;
    }
  }

  override update(): void {
    const now = performance.now();
    const dt = now - this.last;
    this.last = now;
    if (this.done) return;
    this.frames.push(dt);
    const n = this.stepper.advance(dt);
    for (let i = 0; i < n; i++) {
      this.feed();
      this.sim.feedInput(0, 0);
      this.sim.step();
      this.sim.events.clear();
    }
    this.view.render(this.stepper.alpha, dt / 1000);
    this.film?.tick(dt);
    const elapsed = now - this.start;
    if (this.frames.length % 30 === 0) this.text.setText(`BENCHMARK ${Math.round(elapsed / 1000)}s  proj ${this.sim.enemyShots.activeCount}  fps ${this.game.loop.actualFps.toFixed(1)}`);
    if (elapsed >= DURATION_MS) this.finish(elapsed);
  }

  private finish(elapsed: number): void {
    this.done = true;
    const f = this.frames.slice(10).sort((a, b) => a - b);
    const avg = f.reduce((a, b) => a + b, 0) / Math.max(1, f.length);
    const p99 = f[Math.floor(f.length * 0.99)] ?? avg;
    const p1 = 1000 / p99;
    const gl = (this.renderer as Phaser.Renderer.WebGL.WebGLRenderer).gl;
    const dbg = gl?.getExtension('WEBGL_debug_renderer_info');
    const mem = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
    const r = this.renderer as unknown as { renderNodes?: { drawCallsThisFrame?: number } };
    const report: BenchmarkReport = {
      marker: BENCHMARK_MARKER,
      durationMs: Math.round(elapsed),
      frames: f.length,
      avgFps: Math.round((1000 / avg) * 10) / 10,
      minFps: Math.round((1000 / (f[f.length - 1] ?? avg)) * 10) / 10,
      p1Fps: Math.round(p1 * 10) / 10,
      p99FrameMs: Math.round(p99 * 100) / 100,
      avgFrameMs: Math.round(avg * 100) / 100,
      projectiles: this.sim.enemyShots.activeCount,
      drawCalls: r.renderNodes?.drawCallsThisFrame ?? null,
      renderer: dbg && gl ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : 'desconhecido',
      heapMB: mem ? Math.round((mem.usedJSHeapSize / 1048576) * 10) / 10 : null,
    };
    (window as unknown as { __BENCHMARK__?: BenchmarkReport }).__BENCHMARK__ = report;
    console.info('[benchmark]', JSON.stringify(report));
    this.text.setText(`BENCHMARK CONCLUÍDO\n${JSON.stringify(report, null, 1)}`);
  }
}
