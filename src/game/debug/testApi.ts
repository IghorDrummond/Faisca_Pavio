/**
 * API de teste somente leitura (window.__FP_TEST__), para os testes E2E esperarem por ESTADO
 * OBSERVÁVEL em vez de tempo fixo. Existe só em builds com __DEBUG__ (dev/e2e): este módulo é
 * importado dinamicamente e fica fora do bundle de produção (verificado por check:bundle).
 */
import type Phaser from 'phaser';
import { InputService } from '../../platform/input';
import { Lifecycle } from '../../platform/lifecycle';
import { GameState } from '../../services/gameState';
import { AssetPackLoader } from '../assets';
import { Router } from '../router';
import type { BattleScene } from '../scenes/BattleScene';
import type { IrisScene } from '../scenes/IrisScene';
import { snapshot } from './debugTools';

export const TEST_API_MARKER = 'fp-test-api';

/** cenas sobrepostas (não passam pelo roteador) */
const OVERLAYS = new Set(['Pause', 'Defeat', 'Options', 'Equip', 'Hud']);

interface MenuLike {
  index: number;
  enabled: boolean;
  rows?: { text: { text: string } }[];
}

function menuInfo(m: MenuLike | null | undefined): { index: number; enabled: boolean; labels: string[] } | null {
  if (!m || !m.rows) return null;
  return { index: m.index, enabled: m.enabled, labels: m.rows.map((r) => r.text.text) };
}

export function installTestApi(game: Phaser.Game): void {
  const mgr = game.scene;
  const iris = (): IrisScene | null => mgr.getScene('Iris') as IrisScene | null;
  const active = (): string[] => mgr.getScenes(true).map((s) => s.scene.key);
  const api = {
    marker: TEST_API_MARKER,
    /** cenas ativas (inclui Boot/Iris) */
    scenes: active,
    /** tela atual segundo o roteador */
    current: (): string => Router.current,
    /** transição de íris em andamento (fechando ou abrindo) */
    transitioning: (): boolean => {
      const i = iris();
      return !!i && (i.busy || i.radius < 1400);
    },
    /**
     * Tela pronta para entrada: roteada, ativa, íris totalmente aberta, sem carregamento.
     * Para o menu principal, também exige a lista de slots já lida do IndexedDB.
     */
    ready: (key: string): boolean => {
      if (!mgr.isActive(key) || mgr.isActive('Loading')) return false;
      if (!OVERLAYS.has(key) && Router.current !== key) return false;
      if (api.transitioning()) return false;
      const sc = mgr.getScene(key) as unknown as { slotsLoaded?: boolean; acceptsInput?: boolean };
      if (sc.slotsLoaded === false || sc.acceptsInput === false) return false;
      return true;
    },
    /** menu focado da cena (menu, modal de mapa ou confirmação) */
    menu: (key: string): { index: number; enabled: boolean; labels: string[] } | null => {
      const s = mgr.getScene(key) as unknown as { menu?: MenuLike | null; modal?: MenuLike | null; confirm?: MenuLike | null } | null;
      if (!s || !mgr.isActive(key)) return null;
      return menuInfo(s.confirm) ?? menuInfo(s.modal) ?? menuInfo(s.menu);
    },
    /** batalha atual (fase da cena, jogadores, chefe, contagens de objetos) ou null */
    battle: (): Record<string, unknown> | null => {
      if (!mgr.isActive('Battle') && !mgr.isPaused('Battle')) return null;
      const b = mgr.getScene('Battle') as BattleScene;
      if (!b.sim) return null;
      const hud = mgr.getScene('Hud') as unknown as { huds?: { root: { visible: boolean } }[] } | null;
      return {
        ...snapshot(b),
        paused: b.paused,
        params: { kind: b.params.kind, id: b.params.id, difficulty: b.params.difficulty },
        hudVisible: hud?.huds?.map((h) => h.root.visible) ?? [],
        inputSlots: InputService.slots.map((s) => ({ joined: s.joined, profile: s.profile, device: s.device })),
      };
    },
    /** objetos de jogo em todas as cenas ativas */
    objects: (): number => mgr.getScenes(true).reduce((a, s) => a + s.children.length, 0),
    save: (): unknown => GameState.save,
    packLoaded: (id: string): boolean => AssetPackLoader.isLoaded(id),
    /** quadros renderizados desde o boot */
    frame: (): number => game.loop.frame,
    contextLost: (): boolean => Lifecycle.contextLost,
  };
  (window as unknown as { __FP_TEST__?: unknown }).__FP_TEST__ = api;
}
