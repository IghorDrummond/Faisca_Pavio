import type Phaser from 'phaser';
import { SettingsService } from '../../services/settings';
import { COLOR_MATRICES, FilmFilter, ensureFilmFilterNode } from './FilmFilter';

/** Anexa o pós-processamento de filme à câmera principal da cena (WebGL). */
export function attachFilm(scene: Phaser.Scene): FilmFilter | null {
  if (!ensureFilmFilterNode(scene)) return null;
  const f = new FilmFilter(scene.cameras.main);
  scene.cameras.main.filters.external.add(f);
  applyFilmSettings(f);
  return f;
}

/** Aplica configurações: qualidade (Baixo desliga os efeitos mais caros), sliders e acessibilidade. */
export function applyFilmSettings(f: FilmFilter): void {
  const s = SettingsService.all;
  const q = s.postQuality;
  const reduced = s.reduceFlashes;
  f.grain = q === 'low' ? 0 : s.grain * (q === 'medium' ? 0.7 : 1);
  f.scratches = q === 'low' ? 0 : s.scratches * (q === 'medium' ? 0.6 : 1);
  f.vignette = s.vignette;
  f.desaturate = s.desaturate;
  f.flicker = s.flicker && !reduced && q !== 'low';
  f.jitter = s.frameJitter && !reduced;
  f.blackWhite = s.blackWhite;
  f.colorMatrix = COLOR_MATRICES[s.colorblind];
}
