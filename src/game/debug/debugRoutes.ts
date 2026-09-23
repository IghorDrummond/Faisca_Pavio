/**
 * Rotas de debug por parâmetros de URL (?debug=1&boss=cuco&phase=2&seed=42&difficulty=normal...).
 * Só existe em builds com __DEBUG__ (dev/e2e) — importado dinamicamente e removido da produção.
 */
import type Phaser from 'phaser';
import { Params } from '../../platform/urlParams';
import { Router } from '../router';
import { CONTENT_PACK } from '../assets';
import type { BattleParams } from '../battleSetup';

export const DEBUG_PANEL_MARKER = 'debug-routes';

export function debugRoute(from: Phaser.Scene): void {
  if (Params.benchmark) {
    Router.go(from, 'Benchmark', {}, ['ilha1']);
    return;
  }
  if (Params.scene) {
    const packs = Params.scene === 'WorldMap' ? ['map'] : Params.scene === 'Shop' ? ['ilha1'] : Params.scene === 'Credits' ? ['final'] : [];
    Router.go(from, Params.scene, { debug: true }, packs);
    return;
  }
  const id = Params.boss ?? Params.stage ?? 'cuco';
  const p: BattleParams = {
    kind: Params.boss ? 'boss' : 'stage',
    id,
    difficulty: Params.difficulty ?? 'normal',
    coop: Params.coop,
    seed: Params.seed ?? 42,
    phase: Params.phase,
    from: 'debug',
    autoplay: Params.autoplay,
  };
  Router.go(from, 'Battle', p, [CONTENT_PACK[id] ?? 'ilha1']);
}
