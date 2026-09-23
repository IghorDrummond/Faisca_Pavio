import { PT_BR } from './pt-BR';
import { EN } from './en';

/** Título de trabalho centralizado (pode ser alterado depois). */
export const GAME_TITLE = 'FAÍSCA & PAVIO';

export type Lang = 'pt-BR' | 'en';
let lang: Lang = 'pt-BR';

export function setLang(l: Lang): void {
  lang = l;
}

export function getLang(): Lang {
  return lang;
}

/** Tradução com interpolação {nome}. Textos sempre tratados como texto (nunca HTML). */
export function t(key: keyof typeof PT_BR, vars?: Record<string, string | number>): string {
  const dict: Record<string, string> = lang === 'en' ? { ...PT_BR, ...EN } : PT_BR;
  let s = dict[key] ?? String(key);
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
  return s;
}

export type TKey = keyof typeof PT_BR;
