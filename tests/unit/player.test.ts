import { describe, expect, it } from 'vitest';
import { Btn } from '../../src/core/input';
import { PLAYER_TUNING as T } from '../../src/data/tuning';
import { emptyArena, run, settle } from '../helpers';

function measureJump(holdTicks: number): number {
  const sim = emptyArena();
  settle(sim);
  const p = sim.players[0]!;
  const y0 = p.y;
  let minY = y0;
  for (let i = 0; i < 90; i++) {
    sim.feedInput(0, i < holdTicks ? Btn.Jump : 0);
    sim.step();
    sim.events.clear();
    minY = Math.min(minY, p.y);
  }
  return y0 - minY;
}

describe('TEST-01 máquina de estados do jogador', () => {
  it('começa em intro e vai para idle', () => {
    const sim = emptyArena();
    expect(sim.players[0]!.state).toBe('intro');
    settle(sim);
    expect(sim.players[0]!.state).toBe('idle');
  });

  it('idle → run → jump → fall → idle', () => {
    const sim = emptyArena();
    settle(sim);
    const p = sim.players[0]!;
    run(sim, 5, Btn.Right);
    expect(p.state).toBe('run');
    run(sim, 1, Btn.Right | Btn.Jump);
    expect(p.state).toBe('jump');
    run(sim, 30, Btn.Jump);
    expect(p.state).toBe('fall');
    run(sim, 60, 0);
    expect(p.state).toBe('idle');
    expect(p.grounded).toBe(true);
  });

  it('estado proibido é impedido', () => {
    const sim = emptyArena();
    settle(sim);
    const p = sim.players[0]!;
    p.forceState('victory');
    expect(p.setState('run')).toBe(false);
    expect(p.state).toBe('victory');
  });

  it('agachar reduz hurtbox em ~45% e não anda; lock parado mira 8 direções', () => {
    const sim = emptyArena();
    settle(sim);
    const p = sim.players[0]!;
    const box = { x: 0, y: 0, hw: 0, hh: 0 };
    p.hurtbox(box);
    const standH = box.hh * 2;
    const x0 = p.x;
    run(sim, 10, Btn.Down | Btn.Right);
    expect(p.state).toBe('crouch');
    p.hurtbox(box);
    expect(box.hh * 2).toBeCloseTo(standH * T.crouchHeightFactor, 3);
    expect(Math.abs(p.x - x0)).toBeLessThan(10);
    const x1 = p.x;
    run(sim, 10, Btn.Lock | Btn.Up | Btn.Left);
    expect(p.state).toBe('lock');
    expect(p.aim).toBe(5);
    expect(Math.abs(p.x - x1)).toBeLessThan(10);
  });

  it('velocidade horizontal: 100% em 2 ticks, para em 2 ticks', () => {
    const sim = emptyArena();
    settle(sim);
    const p = sim.players[0]!;
    run(sim, 2, Btn.Right);
    expect(p.vx).toBeCloseTo(T.runSpeed, 5);
    run(sim, 2, 0);
    expect(p.vx).toBe(0);
  });

  it('ajuste fino: toque de 1–2 ticks move 10–20 px', () => {
    const sim = emptyArena();
    settle(sim);
    const p = sim.players[0]!;
    const x0 = p.x;
    run(sim, 2, Btn.Right);
    run(sim, 4, 0);
    const d = p.x - x0;
    expect(d).toBeGreaterThanOrEqual(10);
    expect(d).toBeLessThanOrEqual(26);
  });
});

describe('pulo variável, coyote, buffer', () => {
  it('pulo segurado ≈ 290 px e toque ≈ 120 px', () => {
    const full = measureJump(60);
    const tap = measureJump(1);
    expect(full).toBeGreaterThan(270);
    expect(full).toBeLessThan(310);
    expect(tap).toBeGreaterThan(100);
    expect(tap).toBeLessThan(145);
  });

  it('coyote time permite pular até 6 ticks após sair da plataforma', () => {
    const sim = emptyArena({ platforms: [{ x: 700, y: 700, w: 200 }] });
    const p = sim.players[0]!;
    p.x = p.px = 880;
    p.y = p.py = 700;
    run(sim, 40, 0);
    expect(p.onPlatform).not.toBe(0);
    // anda até sair da borda
    let ticksOff = -1;
    for (let i = 0; i < 40; i++) {
      sim.feedInput(0, Btn.Right);
      sim.step();
      sim.events.clear();
      if (!p.grounded) {
        ticksOff = i;
        break;
      }
    }
    expect(ticksOff).toBeGreaterThan(-1);
    run(sim, 4, Btn.Right);
    run(sim, 1, Btn.Right | Btn.Jump);
    expect(p.vy).toBeLessThan(-1000);
  });

  it('jump buffer: apertar pouco antes de aterrissar pula ao tocar o chão', () => {
    const sim = emptyArena();
    settle(sim);
    const p = sim.players[0]!;
    run(sim, 1, Btn.Jump);
    run(sim, 20, Btn.Jump);
    // cai até perto do chão
    while (p.y < 880) run(sim, 1, 0);
    run(sim, 1, Btn.Jump);
    run(sim, 6, Btn.Jump);
    expect(p.vy).toBeLessThan(0);
    expect(p.state).toBe('jump');
  });
});

describe('dash', () => {
  it('~260 px em 0,2 s ignorando gravidade; 1 dash aéreo por pulo', () => {
    const sim = emptyArena();
    settle(sim);
    const p = sim.players[0]!;
    run(sim, 1, Btn.Jump);
    run(sim, 10, Btn.Jump);
    const x0 = p.x;
    const y0 = p.y;
    run(sim, 1, Btn.Jump | Btn.Dash);
    run(sim, 11, Btn.Jump);
    expect(p.x - x0).toBeGreaterThan(240);
    expect(p.x - x0).toBeLessThan(280);
    expect(Math.abs(p.y - y0)).toBeLessThan(1);
    expect(p.airDash).toBe(false);
    const x1 = p.x;
    run(sim, 1, Btn.Dash);
    run(sim, 4, 0);
    expect(p.state).not.toBe('dash');
    expect(p.x - x1).toBeLessThan(80);
  });
});

describe('TEST-02 dano, invencibilidade e morte', () => {
  it('perde 1 de vida, fica 1,5 s invencível e morre com 0', () => {
    const sim = emptyArena();
    settle(sim);
    const p = sim.players[0]!;
    expect(p.hurt(sim)).toBe(true);
    expect(p.hp).toBe(2);
    expect(p.invuln).toBe(90);
    expect(p.hurt(sim)).toBe(false);
    run(sim, 95, 0);
    expect(p.hurt(sim)).toBe(true);
    run(sim, 95, 0);
    expect(p.hurt(sim)).toBe(true);
    expect(p.state).toBe('dead');
    run(sim, 60, 0);
    expect(p.state).toBe('ghost');
    run(sim, 3, 0);
    expect(sim.result).toBe('defeat');
  });

  it('Cartola de Sorte absorve o primeiro golpe', () => {
    const sim = emptyArena();
    const p = sim.players[0]!;
    p.loadout.charm = 'cartolaSorte';
    sim.reset(1);
    settle(sim);
    expect(p.hurt(sim)).toBe(false);
    expect(p.hp).toBe(3);
    run(sim, 95, 0);
    expect(p.hurt(sim)).toBe(true);
    expect(p.hp).toBe(2);
  });

  it('Coração de Cera: +1 vida máxima', () => {
    const sim = emptyArena();
    sim.players[0]!.loadout.charm = 'coracaoCera';
    sim.reset(1);
    expect(sim.players[0]!.hp).toBe(4);
  });

  it('Fumaça de Palco: dash invencível', () => {
    const sim = emptyArena();
    const p = sim.players[0]!;
    p.loadout.charm = 'fumacaPalco';
    sim.reset(1);
    settle(sim);
    run(sim, 1, Btn.Dash);
    expect(p.state).toBe('dash');
    expect(p.invulnerable).toBe(true);
  });
});
