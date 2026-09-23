import { describe, expect, it } from 'vitest';
import { Btn } from '../../src/core/input';
import { InputServiceImpl } from '../../src/platform/input';

type Listener = (e: unknown) => void;

/** Alvo de eventos mínimo (substitui window no Node). */
function fakeTarget(): { target: Window; key: (type: 'keydown' | 'keyup', code: string, repeat?: boolean) => void } {
  const listeners = new Map<string, Listener[]>();
  const target = {
    addEventListener: (type: string, fn: Listener) => listeners.set(type, [...(listeners.get(type) ?? []), fn]),
  } as unknown as Window;
  const key = (type: 'keydown' | 'keyup', code: string, repeat = false): void => {
    const e = { code, repeat, ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, preventDefault: () => undefined };
    for (const fn of listeners.get(type) ?? []) fn(e);
  };
  return { target, key };
}

function setup(): { input: InputServiceImpl; key: ReturnType<typeof fakeTarget>['key'] } {
  const input = new InputServiceImpl();
  const { target, key } = fakeTarget();
  input.attach(target);
  return { input, key };
}

describe('fila de eventos de borda do teclado', () => {
  it('toque rápido (keydown+keyup entre dois ticks) confirma no menu', () => {
    const { input, key } = setup();
    key('keydown', 'Enter');
    key('keyup', 'Enter');
    input.poll();
    expect(input.menu('confirm')).toBe(true);
    input.endTick();
    input.poll();
    expect(input.menu('confirm')).toBe(false);
  });

  it('toque rápido não é perdido nas ações de jogo com buffer (pulo, dash, parry)', () => {
    const { input, key } = setup();
    key('keydown', 'Space');
    key('keyup', 'Space');
    input.poll();
    expect(input.playerBits(0) & Btn.Jump).toBeTruthy();
    input.endTick();
    input.poll();
    expect(input.playerBits(0) & Btn.Jump).toBe(0);
  });

  it('repetição automática da tecla (event.repeat) não gera confirmações múltiplas', () => {
    const { input, key } = setup();
    key('keydown', 'Enter');
    input.poll();
    expect(input.menu('confirm')).toBe(true);
    input.endTick();
    let fired = 0;
    for (let i = 0; i < 90; i++) {
      key('keydown', 'Enter', true);
      input.poll();
      if (input.menu('confirm')) fired++;
      input.endTick();
    }
    expect(fired).toBe(0);
  });

  it('segurar uma direção repete no menu após o atraso; confirmar não repete', () => {
    const { input, key } = setup();
    key('keydown', 'ArrowDown');
    key('keydown', 'Enter');
    let down = 0;
    let confirm = 0;
    for (let i = 0; i < 60; i++) {
      input.poll();
      if (input.menu('down')) down++;
      if (input.menu('confirm')) confirm++;
      input.endTick();
    }
    expect(confirm).toBe(1);
    expect(down).toBeGreaterThan(1);
  });

  it('Enter confirma e também é pausa; pauseOnly() não dispara junto com confirmar', () => {
    const { input, key } = setup();
    key('keydown', 'Enter');
    input.poll();
    expect(input.menu('confirm')).toBe(true);
    expect(input.menu('pause')).toBe(true);
    expect(input.pauseOnly()).toBe(false);
    input.endTick();
    key('keyup', 'Enter');
    input.poll(); // tick sem teclas: a ação "pausa" é solta
    input.endTick();
    key('keydown', 'KeyP');
    input.poll();
    expect(input.pauseOnly()).toBe(true);
  });

  it('entrada do P2 pelo teclado dividido aceita toque rápido', () => {
    const { input, key } = setup();
    key('keydown', 'Numpad0');
    key('keyup', 'Numpad0');
    input.poll();
    expect(input.keyboardJoinPressed()).toBe(true);
    input.endTick();
    input.poll();
    expect(input.keyboardJoinPressed()).toBe(false);
  });

  it('dois toques da mesma tecla em ticks consecutivos geram duas confirmações', () => {
    const { input, key } = setup();
    let confirm = 0;
    for (let i = 0; i < 2; i++) {
      key('keydown', 'Enter');
      key('keyup', 'Enter');
      input.poll();
      if (input.menu('confirm')) confirm++;
      input.endTick();
      input.poll();
      input.endTick();
    }
    expect(confirm).toBe(2);
  });

  it('perda de foco (blur) limpa teclas e bordas', () => {
    const { input, key } = setup();
    key('keydown', 'Enter');
    input.clearKeys();
    input.poll();
    expect(input.menu('confirm')).toBe(false);
  });
});
