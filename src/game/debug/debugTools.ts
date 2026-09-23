/**
 * Ferramentas de debug da batalha (somente __DEBUG__): painel (tecla `), atalhos Shift+número,
 * overlay de monitoramento, hitboxes, autoplay e exposição de estado para testes.
 */
import Phaser from 'phaser';
import { METER } from '../../data/tuning';
import { Params } from '../../platform/urlParams';
import { drawDebug } from '../render/DebugDraw';
import type { BattleScene } from '../scenes/BattleScene';
import { BotBrain } from '../../core/bot';

export const DEBUG_PANEL_MARKER = 'debug-tools';

interface DebugState {
  hitboxes: boolean;
  overlay: boolean;
  slow: boolean;
  panel: boolean;
}

export function attachBattleDebug(scene: BattleScene): void {
  const st: DebugState = { hitboxes: Params.debug, overlay: Params.debug, slow: false, panel: false };
  const gfx = scene.add.graphics().setDepth(900);
  const text = scene.add.text(12, 60, '', { fontFamily: 'monospace', fontSize: '18px', color: '#9fe870', backgroundColor: 'rgba(0,0,0,0.6)', padding: { x: 8, y: 6 } }).setDepth(901);
  const panel = scene.add
    .text(960, 540, '', { fontFamily: 'monospace', fontSize: '22px', color: '#ffffff', backgroundColor: 'rgba(0,0,0,0.85)', padding: { x: 20, y: 16 }, align: 'left' })
    .setOrigin(0.5)
    .setDepth(902)
    .setVisible(false);
  panel.setText(
    [
      'DEBUG (` fecha)',
      'Shift+1  invencibilidade',
      'Shift+2  hitboxes',
      'Shift+3  overlay de monitoramento',
      'Shift+4  próxima fase',
      'Shift+5  forçar próximo ataque',
      'Shift+6  encher medidor',
      'Shift+7  câmera lenta 25%',
      'Shift+8  captura com metadados',
      'Shift+9  autoplay (bot)',
    ].join('\n'),
  );
  const bot = new BotBrain();
  let autoplay = Params.autoplay;
  if (autoplay) scene.inputOverride = (pi) => bot.decide(scene.sim, pi);
  let attackCursor = 0;

  const onKey = (e: KeyboardEvent): void => {
    if (e.code === 'Backquote') {
      st.panel = !st.panel;
      panel.setVisible(st.panel);
      return;
    }
    if (!e.shiftKey) return;
    const b = scene.sim.boss;
    switch (e.code) {
      case 'Digit1':
        scene.sim.invincible = !scene.sim.invincible;
        break;
      case 'Digit2':
        st.hitboxes = !st.hitboxes;
        break;
      case 'Digit3':
        st.overlay = !st.overlay;
        break;
      case 'Digit4':
        b?.skipToNextPhase();
        break;
      case 'Digit5':
        if (b) {
          const ids = b.phase.attacks.map((a) => a.id);
          b.forceAttack(ids[attackCursor++ % ids.length] ?? '');
        }
        break;
      case 'Digit6':
        for (const p of scene.sim.players) p.meter = METER.cards * METER.perCard;
        break;
      case 'Digit7':
        st.slow = !st.slow;
        break;
      case 'Digit8':
        console.info('[captura]', JSON.stringify(snapshot(scene)));
        break;
      case 'Digit9':
        autoplay = !autoplay;
        scene.inputOverride = autoplay ? (pi) => bot.decide(scene.sim, pi) : null;
        break;
    }
  };
  window.addEventListener('keydown', onKey);
  // controle programático para testes E2E
  (window as unknown as { __BATTLE_CTL__?: unknown }).__BATTLE_CTL__ = {
    marker: DEBUG_PANEL_MARKER,
    scene,
    win: (): void => {
      const mod = scene.sim.module as unknown as { complete?: boolean; enterArena?: (s: unknown) => void } | null;
      if (!scene.sim.boss && mod?.enterArena) mod.enterArena(scene.sim);
      const b = scene.sim.boss;
      if (b) {
        b.hp = 0;
        b.knockout();
      } else if (mod && 'complete' in mod) mod.complete = true;
    },
    retry: (): void => scene.retry(),
    kill: (): void => {
      for (const p of scene.sim.players) if (p.joined) p.die(scene.sim);
    },
  };
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => window.removeEventListener('keydown', onKey));
  scene.events.on(Phaser.Scenes.Events.POST_UPDATE, () => {
    if (st.slow) (scene as unknown as { stepper: { timeScale: number } }).stepper.timeScale = 0.25;
    if (st.hitboxes) drawDebug(gfx, scene.sim, 1, false);
    else gfx.clear();
    text.setVisible(st.overlay);
    if (st.overlay) text.setText(overlayText(scene));
    (window as unknown as { __BATTLE__?: unknown }).__BATTLE__ = snapshot(scene);
  });
}

function overlayText(scene: BattleScene): string {
  const sim = scene.sim;
  const p = sim.players[0]!;
  const b = sim.boss;
  const loop = scene.game.loop;
  const mem = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
  return [
    `FPS ${loop.actualFps.toFixed(1)}  frame ${loop.delta.toFixed(1)} ms`,
    `tick ${sim.tick}  semente ${scene.params.seed}  ${scene.phase}`,
    `proj inimigos ${sim.enemyShots.activeCount}  jogador ${sim.playerShots.activeCount}  perigos ${sim.hazards.activeCount}`,
    `objetos em cena ${scene.children.length}  fx ${scene.view.fx.activeCount}`,
    mem ? `heap ${(mem.usedJSHeapSize / 1048576).toFixed(1)} MB` : 'heap n/d',
    `P1 ${p.state} hp ${p.hp} cartas ${p.cards} mira ${p.aim} invuln ${p.invuln}`,
    b ? `chefe ${b.state} fase ${b.phaseIndex + 1} hp ${Math.ceil(b.hp)}/${b.maxHp} ataque ${b.currentAttackId}` : '',
    `justiça: violações ${sim.fairnessViolations}  invencível ${sim.invincible}`,
  ].join('\n');
}

export function snapshot(scene: BattleScene): Record<string, unknown> {
  const sim = scene.sim;
  const b = sim.boss;
  return {
    phase: scene.phase,
    tick: sim.tick,
    result: sim.result,
    seed: scene.params.seed,
    boss: b ? { id: b.def.id, state: b.state, phase: b.phaseIndex, hp: b.hp, maxHp: b.maxHp, attack: b.currentAttackId } : null,
    players: sim.players.map((p) => ({ joined: p.joined, state: p.state, hp: p.hp, x: p.x, y: p.y, cards: p.cards })),
    enemyShots: sim.enemyShots.activeCount,
    playerShots: sim.playerShots.activeCount,
    hazards: sim.hazards.activeCount,
    children: scene.children.length,
    fx: scene.view.fx.activeCount,
    retries: scene.retries,
    fairness: sim.fairnessViolations,
    hitsByAttack: Object.fromEntries(sim.hitsByAttack),
  };
}
