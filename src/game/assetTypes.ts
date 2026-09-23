/** Tipos do manifesto de assets gerado por tools/build-assets.ts. */
export interface AtlasEntry {
  key: string;
  webp: string;
  png: string;
}
export interface ImageEntry {
  key: string;
  webp: string;
  png: string;
  w: number;
  h: number;
  scale: number;
}
export interface AnimEntry {
  key: string;
  atlas: string;
  frames: string[];
  fps: number;
  repeat: number;
  scale: number;
}
export interface AudioEntry {
  key: string;
  url: string;
  pack: string;
  bytes: number;
  kind: 'sfx' | 'sample' | 'loop';
}
export interface PackEntry {
  atlases: AtlasEntry[];
  images: ImageEntry[];
  anims: AnimEntry[];
  audio: AudioEntry[];
  bytes: number;
  gpuBytes: number;
  atlasScale: Record<string, number>;
}
export type AssetPacks = Record<string, PackEntry>;
