import type { DifficultyId } from '../core/types';

/**
 * Parâmetros de URL. Os de debug só têm efeito quando __DEBUG__ está ativo
 * (build de desenvolvimento/e2e) — em produção são ignorados e o código é removido.
 */
export interface LaunchParams {
  debug: boolean;
  boss: string | null;
  stage: string | null;
  phase: number;
  difficulty: DifficultyId | null;
  seed: number | null;
  benchmark: boolean;
  autoplay: boolean;
  coop: boolean;
  lang: string | null;
  scene: string | null;
  invincible: boolean;
  fast: boolean;
  shot: string | null;
}

function parse(): LaunchParams {
  const q = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');
  const dbg = __DEBUG__;
  const num = (k: string): number | null => {
    const v = q.get(k);
    if (v === null) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  const diff = q.get('difficulty');
  const lang = q.get('lang');
  return {
    debug: dbg && q.get('debug') === '1',
    boss: dbg ? q.get('boss') : null,
    stage: dbg ? q.get('stage') : null,
    phase: dbg ? (num('phase') ?? 1) : 1,
    difficulty: dbg && (diff === 'simples' || diff === 'normal' || diff === 'especialista') ? diff : null,
    seed: dbg ? num('seed') : null,
    benchmark: dbg && q.get('benchmark') === '1',
    autoplay: dbg && q.get('autoplay') === '1',
    coop: dbg && q.get('coop') === '1',
    lang: lang === 'en' || lang === 'pt-BR' ? lang : null,
    scene: dbg ? q.get('scene') : null,
    invincible: dbg && q.get('invincible') === '1',
    fast: dbg && q.get('fast') === '1',
    shot: dbg ? q.get('shot') : null,
  };
}

export const Params: LaunchParams = parse();
