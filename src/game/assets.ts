import type Phaser from 'phaser';
import { ASSET_PACKS } from '../generated/assets';
import { AudioService } from '../services/audio';
import { Logger } from '../services/logger';
import type { PackEntry } from './assetTypes';

const loaded = new Set<string>();
let webpSupport: boolean | null = null;

/** WebP com fallback PNG caso algum navegador-alvo falhe. */
function supportsWebp(): boolean {
  if (webpSupport === null) {
    try {
      const c = document.createElement('canvas');
      c.width = c.height = 1;
      webpSupport = c.toDataURL('image/webp').startsWith('data:image/webp');
    } catch {
      webpSupport = false;
    }
  }
  return webpSupport;
}

/** Pacote exigido por cada conteúdo (batalha/fase/tela). */
export const CONTENT_PACK: Record<string, string> = {
  cuco: 'ilha1',
  agulha: 'ilha1',
  tutorial: 'ilha1',
  runngun1: 'ilha1',
  shop: 'ilha1',
  challenge1: 'ilha1',
  challenge2: 'ilha2',
  gramofone: 'ilha2',
  bigorna: 'ilha2',
  fuligem: 'ilha2',
  runngun2: 'ilha2',
  maestro: 'final',
  credits: 'final',
  map: 'map',
};

function pack(name: string): PackEntry | undefined {
  return ASSET_PACKS[name];
}

/**
 * Carregador de pacotes sob demanda (AssetPackLoader).
 * Cada ilha é um pacote; texturas e áudios de pacotes não usados podem ser liberados.
 */
export const AssetPackLoader = {
  packs(): string[] {
    return Object.keys(ASSET_PACKS);
  },

  isLoaded(name: string): boolean {
    return loaded.has(name) || !pack(name);
  },

  bytes(name: string): number {
    return pack(name)?.bytes ?? 0;
  },

  /** Enfileira no loader da cena os arquivos que faltam. Retorna true se algo foi enfileirado. */
  queue(scene: Phaser.Scene, name: string): boolean {
    const p = pack(name);
    if (!p || loaded.has(name)) return false;
    const webp = supportsWebp();
    let any = false;
    for (const a of p.atlases) {
      if (scene.textures.exists(a.key)) continue;
      const url = webp ? a.webp : a.png;
      const dir = url.slice(0, url.lastIndexOf('/') + 1);
      scene.load.multiatlas(a.key, url, dir);
      any = true;
    }
    for (const img of p.images) {
      if (scene.textures.exists(img.key)) continue;
      scene.load.image(img.key, webp ? img.webp : img.png);
      any = true;
    }
    for (const au of p.audio) {
      if (AudioService.has(au.key) || scene.cache.binary.exists(`au:${au.key}`)) continue;
      scene.load.binary(`au:${au.key}`, au.url);
      any = true;
    }
    return any;
  },

  /** Após o carregamento: cria animações e entrega áudio ao AudioService. */
  finalize(scene: Phaser.Scene, name: string): void {
    const p = pack(name);
    if (!p) return;
    for (const an of p.anims) {
      if (scene.anims.exists(an.key)) continue;
      if (!scene.textures.exists(an.atlas)) continue;
      scene.anims.create({
        key: an.key,
        frames: an.frames.map((f) => ({ key: an.atlas, frame: f })),
        frameRate: an.fps,
        repeat: an.repeat,
      });
    }
    for (const au of p.audio) {
      const k = `au:${au.key}`;
      if (scene.cache.binary.exists(k)) {
        AudioService.addRaw(au.key, scene.cache.binary.get(k) as ArrayBuffer);
        scene.cache.binary.remove(k);
      }
    }
    const complete = p.atlases.every((a) => scene.textures.exists(a.key)) && p.images.every((i) => scene.textures.exists(i.key));
    if (complete) loaded.add(name);
    else Logger.warn('Assets', `pacote ${name} incompleto`);
  },

  /** Libera texturas/áudios de um pacote (memória de GPU). */
  unload(scene: Phaser.Scene, name: string): void {
    const p = pack(name);
    if (!p || name === 'core' || !loaded.has(name)) return;
    for (const an of p.anims) if (scene.anims.exists(an.key)) scene.anims.remove(an.key);
    for (const a of p.atlases) if (scene.textures.exists(a.key)) scene.textures.remove(a.key);
    for (const i of p.images) if (scene.textures.exists(i.key)) scene.textures.remove(i.key);
    AudioService.release(p.audio.map((a) => a.key));
    loaded.delete(name);
    Logger.info('Assets', `pacote ${name} liberado`);
  },

  /** Todas as URLs de um pacote (para o download offline completo). */
  urls(name: string): string[] {
    const p = pack(name);
    if (!p) return [];
    return [...p.atlases.flatMap((a) => [a.webp]), ...p.images.map((i) => i.webp), ...p.audio.map((a) => a.url)];
  },

  imageInfo(key: string): { w: number; h: number; scale: number } | null {
    for (const p of Object.values(ASSET_PACKS)) {
      const i = p.images.find((x) => x.key === key);
      if (i) return i;
    }
    return null;
  },

  /** Escala de rasterização do atlas (sprites devem usar 1/escala). */
  atlasScale(atlas: string): number {
    for (const p of Object.values(ASSET_PACKS)) {
      const s = p.atlasScale[atlas];
      if (s) return s;
    }
    return 1;
  },

  audioKeys(name: string): string[] {
    return pack(name)?.audio.map((a) => a.key) ?? [];
  },
};
