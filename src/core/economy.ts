import type { SaveData } from './save';
import type { CharmId, SuperId, WeaponId } from './types';
import { CHARMS, WEAPONS } from '../data/weapons';

export type ShopItem = { kind: 'weapon'; id: WeaponId } | { kind: 'charm'; id: CharmId };

export function priceOf(item: ShopItem): number {
  return item.kind === 'weapon' ? WEAPONS[item.id].price : CHARMS[item.id].price;
}

export function owns(s: SaveData, item: ShopItem): boolean {
  return item.kind === 'weapon' ? s.owned.weapons.includes(item.id) : s.owned.charms.includes(item.id);
}

export type BuyResult = 'ok' | 'owned' | 'poor';

/** Compra com/sem saldo; nunca duplica. Retorna o novo save (imutável). */
export function buy(s: SaveData, item: ShopItem): { save: SaveData; result: BuyResult } {
  if (owns(s, item)) return { save: s, result: 'owned' };
  const price = priceOf(item);
  if (s.coins < price) return { save: s, result: 'poor' };
  const next: SaveData = {
    ...s,
    coins: s.coins - price,
    owned: {
      weapons: item.kind === 'weapon' ? [...s.owned.weapons, item.id] : [...s.owned.weapons],
      charms: item.kind === 'charm' ? [...s.owned.charms, item.id] : [...s.owned.charms],
      supers: [...s.owned.supers],
    },
  };
  return { save: next, result: 'ok' };
}

/**
 * Credita moedas de uma fase SOMENTE na conclusão (coletar e morrer não conta).
 * Cada moeda tem id estável: creditada uma única vez para sempre.
 */
export function creditCoins(s: SaveData, coinIds: string[]): { save: SaveData; gained: number } {
  const fresh = coinIds.filter((id) => !s.coinsCollected.includes(id));
  if (!fresh.length) return { save: s, gained: 0 };
  return { save: { ...s, coins: s.coins + fresh.length, coinsCollected: [...s.coinsCollected, ...fresh] }, gained: fresh.length };
}

export function grantSuper(s: SaveData, id: SuperId): SaveData {
  if (s.owned.supers.includes(id)) return s;
  return { ...s, owned: { ...s.owned, supers: [...s.owned.supers, id] } };
}

/** Fontes de moedas do jogo (usadas pelo script de balanceamento). */
export const COIN_SOURCES = {
  tutorial: 2,
  bossFirstWin: 2,
  bosses: 5, // cuco, agulha, gramofone, bigorna, fuligem
  runngunHidden: 5,
  runngunClear: 2,
  runnguns: 2,
  mapHidden: 3,
  npc: 1,
};

export function totalCoinsAvailable(): number {
  const c = COIN_SOURCES;
  return c.tutorial + c.bossFirstWin * c.bosses + (c.runngunHidden + c.runngunClear) * c.runnguns + c.mapHidden + c.npc;
}

export function totalShopCost(): number {
  const w = Object.values(WEAPONS).reduce((a, x) => a + x.price, 0);
  const ch = Object.values(CHARMS).reduce((a, x) => a + x.price, 0);
  return w + ch;
}
