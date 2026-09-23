import { describe, expect, it } from 'vitest';
import { AttackSelector } from '../../src/core/boss';
import { createBossBattle } from '../../src/core/factory';
import { Btn } from '../../src/core/input';
import { Motion } from '../../src/core/projectiles';
import { Rng } from '../../src/core/rng';
import type { AttackDef } from '../../src/core/types';
import { CUCO } from '../../src/data/bosses/cuco';
import { METER } from '../../src/data/tuning';
import { WEAPONS } from '../../src/data/weapons';
import { emptyArena, run, settle } from '../helpers';
import type { BattleSim } from '../../src/core/battle';

function spawnCyan(sim: BattleSim, x: number, y: number, parry = true): void {
  const s = sim.spawnEnemyProjectile()!;
  s.x = s.px = x;
  s.y = s.py = y;
  s.vx = s.vy = 0;
  s.gravity = 0;
  s.r = 20;
  s.kind = 'seed';
  s.parry = parry;
  s.warn = s.warnTotal = 0;
  s.life = 600;
  s.motion = Motion.Linear;
  s.floorKill = false;
  s.bounces = 0;
  s.rolling = false;
  s.spin = 0;
}

describe('TEST-03 parry', () => {
  it('só com objeto ciano, dentro da janela; recarrega o dash e dá 1 carta', () => {
    const sim = emptyArena();
    settle(sim);
    const p = sim.players[0]!;
    // pula, gasta o dash aéreo e sobe até perto do objeto
    run(sim, 1, Btn.Jump);
    run(sim, 8, Btn.Jump);
    run(sim, 1, Btn.Jump | Btn.Dash);
    run(sim, 14, Btn.Jump);
    expect(p.airDash).toBe(false);
    spawnCyan(sim, p.x, p.y - 70);
    run(sim, 1, 0);
    run(sim, 1, Btn.Jump); // segundo toque no ar = parry
    run(sim, 3, 0);
    expect(p.stats.parries).toBe(1);
    expect(p.cards).toBe(1);
    expect(p.airDash).toBe(true);
    expect(sim.enemyShots.activeCount).toBe(0);
  });

  it('objeto comum não é "parryável" e causa dano', () => {
    const sim = emptyArena();
    settle(sim);
    const p = sim.players[0]!;
    run(sim, 1, Btn.Jump);
    run(sim, 10, Btn.Jump);
    spawnCyan(sim, p.x, p.y - 70, false);
    run(sim, 1, Btn.Jump);
    run(sim, 3, 0);
    expect(p.stats.parries).toBe(0);
    expect(p.hp).toBe(2);
  });

  it('parry fora da janela (tarde demais) não conta', () => {
    const sim = emptyArena();
    sim.invincible = true;
    settle(sim);
    const p = sim.players[0]!;
    run(sim, 1, Btn.Jump);
    run(sim, 6, Btn.Jump);
    run(sim, 1, 0);
    run(sim, 1, Btn.Jump); // parry no vazio
    run(sim, 14, 0); // janela de 10 ticks expira
    spawnCyan(sim, p.x, p.y - 70);
    run(sim, 2, 0);
    expect(p.stats.parries).toBe(0);
  });
});

describe('TEST-04 medidor', () => {
  it('acumula com dano, EX gasta 1 carta, super gasta 5, limite de 5', () => {
    const sim = createBossBattle(CUCO, { seed: 1 });
    const p = sim.players[0]!;
    p.addMeter(METER.perCard * 9, sim);
    expect(p.cards).toBe(5);
    p.meter = METER.perCard * 2;
    run(sim, 150, 0); // passa a intro
    run(sim, 1, Btn.Ex);
    expect(p.cards).toBe(1);
    expect(p.stats.cardsUsed).toBe(1);
    run(sim, 30, 0);
    p.meter = METER.perCard * 5;
    run(sim, 1, Btn.Ex);
    expect(p.state).toBe('super');
    expect(p.meter).toBe(0);
    expect(p.stats.cardsUsed).toBe(6);
  });

  it('dano ao chefe enche o medidor', () => {
    const sim = createBossBattle(CUCO, { seed: 1 });
    const p = sim.players[0]!;
    run(sim, 150, 0);
    p.x = p.px = 1100;
    for (let i = 0; i < 400; i++) run(sim, 1, Btn.Shoot);
    expect(p.meter).toBeGreaterThan(0);
    expect(p.stats.damageDealt).toBeGreaterThan(0);
  });
});

describe('TEST-05 armas', () => {
  it('Faísca Reta: 8 tiros/s', () => {
    const sim = emptyArena();
    settle(sim);
    const p = sim.players[0]!;
    run(sim, 60, Btn.Shoot);
    expect(p.stats.shotsFired).toBeGreaterThanOrEqual(7);
    expect(p.stats.shotsFired).toBeLessThanOrEqual(9);
  });

  it('Leque: 3 projéteis com alcance ~480 px', () => {
    const sim = emptyArena();
    sim.players[0]!.loadout.weapons = ['leque', 'reta'];
    sim.reset(1);
    settle(sim);
    run(sim, 1, Btn.Shoot);
    expect(sim.playerShots.activeCount).toBe(3);
    run(sim, 30, 0);
    expect(sim.playerShots.activeCount).toBe(0); // somem antes de atravessar a tela
    const maxTravel = WEAPONS.leque.range;
    expect(maxTravel).toBe(480);
  });

  it('Rojão: tiro fraco sem carga, foguete carregado após 0,6 s', () => {
    const sim = emptyArena();
    sim.players[0]!.loadout.weapons = ['rojao', 'reta'];
    sim.reset(1);
    settle(sim);
    run(sim, 5, Btn.Shoot);
    run(sim, 1, 0);
    const weak = sim.playerShots.items.find((s) => s.active);
    expect(weak?.kind).toBe('shot_rojao_weak');
    run(sim, 60, 0);
    run(sim, 40, Btn.Shoot);
    run(sim, 1, 0);
    const rocket = sim.playerShots.items.find((s) => s.active && s.kind === 'shot_rojao');
    expect(rocket?.damage).toBe(45);
    expect(rocket?.explosionRadius).toBeGreaterThan(0);
  });

  it('troca instantânea entre as 2 armas', () => {
    const sim = emptyArena();
    settle(sim);
    const p = sim.players[0]!;
    expect(p.currentWeapon).toBe('reta');
    run(sim, 1, Btn.Swap);
    expect(p.currentWeapon).toBe('rojao');
  });
});

describe('TEST-06 AttackSelector', () => {
  const attacks = new Map<string, AttackDef>(CUCO.attacks.map((a) => [a.id, a]));
  const opts = [
    { id: 'pendulo', weight: 5 },
    { id: 'engrenagens', weight: 1 },
    { id: 'sementes', weight: 1 },
  ];

  it('respeita pesos e nunca repete 3 vezes seguidas', () => {
    const sel = new AttackSelector();
    const rng = new Rng(7);
    const seq: string[] = [];
    for (let i = 0; i < 400; i++) seq.push(sel.pick(opts, attacks, rng)!);
    for (let i = 2; i < seq.length; i++) expect(seq[i] === seq[i - 1] && seq[i] === seq[i - 2]).toBe(false);
    const counts = seq.reduce<Record<string, number>>((m, s) => ((m[s] = (m[s] ?? 0) + 1), m), {});
    expect(counts.pendulo!).toBeGreaterThan(counts.engrenagens!);
  });

  it('semente reprodutível', () => {
    const a = new AttackSelector();
    const b = new AttackSelector();
    const ra = new Rng(99);
    const rb = new Rng(99);
    for (let i = 0; i < 50; i++) expect(a.pick(opts, attacks, ra)).toBe(b.pick(opts, attacks, rb));
  });

  it('respeita cannotFollow', () => {
    const sel = new AttackSelector();
    const rng = new Rng(3);
    const o2 = [
      { id: 'ponteiros', weight: 1 },
      { id: 'numerais', weight: 50 },
    ];
    for (let i = 0; i < 100; i++) {
      const prev = sel.last;
      const id = sel.pick(o2, attacks, rng);
      if (prev === 'ponteiros') expect(id).not.toBe('numerais');
    }
  });
});

describe('TEST-07 transição de fase', () => {
  it('limite de vida troca a fase, limpa projéteis e deixa todos invulneráveis', () => {
    const sim = createBossBattle(CUCO, { seed: 2 });
    const b = sim.boss!;
    run(sim, 150, 0);
    expect(b.state).not.toBe('intro');
    spawnCyan(sim, 900, 500, false);
    b.damage(b.maxHp * 0.35, 'main');
    expect(b.phaseIndex).toBe(1);
    expect(b.state).toBe('transition');
    expect(b.invulnerable).toBe(true);
    expect(sim.enemyShots.activeCount).toBe(0);
    expect(b.damage(100, 'main')).toBe(false);
    const p = sim.players[0]!;
    // jogador invulnerável durante a transição (objeto em cima dele não causa dano)
    spawnCyan(sim, p.x, p.y - 60, false);
    run(sim, 5, 0);
    expect(p.hp).toBe(3);
    run(sim, 130, 0);
    expect(b.state).not.toBe('transition');
  });

  it('nocaute ao zerar a vida; no Simples a última fase é pulada', () => {
    const sim = createBossBattle(CUCO, { seed: 2, difficulty: 'simples' });
    const b = sim.boss!;
    run(sim, 150, 0);
    b.damage(b.maxHp * 0.4, 'main');
    run(sim, 150, 0);
    b.damage(b.maxHp * 0.3, 'main');
    expect(b.state).toBe('knockout');
    expect(b.phaseIndex).toBeLessThan(2);
  });
});

describe('vitória prevalece sobre morte no mesmo tick', () => {
  it('chefe zerado e jogador atingido no mesmo tick → vitória', () => {
    const sim = createBossBattle(CUCO, { seed: 4 });
    const b = sim.boss!;
    const p = sim.players[0]!;
    run(sim, 150, 0);
    p.hp = 1;
    b.hp = 1;
    spawnCyan(sim, p.x, p.y - 60, false);
    // tiro que vai acertar o chefe já neste tick
    p.x = p.px = 1300;
    const s = sim.spawnPlayerShot()!;
    Object.assign(s, { owner: 0, x: 1500, px: 1490, y: 500, py: 500, vx: 100, vy: 0, r: 10, damage: 50, travel: 0, range: Infinity, kind: 'shot_reta', homingTurn: 0, pierce: 0, explosionRadius: 0, splitCount: 0, life: 60, isEx: false, meterGain: 0, gravity: 0 });
    spawnCyan(sim, p.x, p.y - 60, false);
    run(sim, 1, 0);
    expect(sim.boss!.state).toBe('knockout');
    expect(p.hp).toBe(1); // o nocaute no mesmo tick protege o jogador
    run(sim, 300, 0);
    expect(sim.result).toBe('victory');
  });
});
