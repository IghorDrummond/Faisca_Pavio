/** npm run validate:balance — tempos teóricos por arma, moedas vs custo, consistência dos dados; exporta CSV. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { balanceTable, TARGET_RANGE, toCsv, weaponDps } from '../src/core/balance';
import { checkBoss } from '../src/core/dataCheck';
import { checkGameData } from '../src/core/gameDataCheck';
import { totalCoinsAvailable, totalShopCost } from '../src/core/economy';
import { BOSSES } from '../src/data/bosses';
import { DIFFICULTIES } from '../src/data/difficulty';
import { WEAPONS } from '../src/data/weapons';

const problems: string[] = [];
for (const b of Object.values(BOSSES)) problems.push(...checkBoss(b, Object.values(DIFFICULTIES)));
problems.push(...checkGameData());

const rows = balanceTable(Object.values(BOSSES));
for (const r of rows) {
  if (r.difficulty === 'normal' && r.weapon === 'reta' && (r.seconds < TARGET_RANGE[0] || r.seconds > TARGET_RANGE[1])) problems.push(`${r.boss}: ${r.seconds}s no Normal com Faísca Reta (fora de ${TARGET_RANGE.join('–')} s)`);
}
for (const id of Object.keys(WEAPONS) as (keyof typeof WEAPONS)[]) console.log(`DPS ${id}: ${weaponDps(id).toFixed(1)}`);
const coins = totalCoinsAvailable();
const cost = totalShopCost();
console.log(`Moedas disponíveis: ${coins}; custo total da loja: ${cost}; com 85% de coleta: ${(coins * 0.85).toFixed(1)}`);
if (coins * 0.85 < cost) problems.push('moedas insuficientes para comprar tudo com ~85% de coleta');
mkdirSync('docs', { recursive: true });
writeFileSync('docs/balanceamento.csv', toCsv(rows));
console.log('CSV: docs/balanceamento.csv');
for (const r of rows.filter((x) => x.difficulty === 'normal' && x.weapon === 'reta')) console.log(`  ${r.boss}: ~${r.seconds}s (vida ${r.hp})`);
if (problems.length) {
  console.error('validate:balance — problemas:\n  ' + problems.join('\n  '));
  process.exit(1);
}
console.log('validate:balance — OK');
