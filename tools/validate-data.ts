/** Valida todos os dados de jogo. Falha (exit 1) se houver dado inválido — usado no build. */
import { checkBoss } from '../src/core/dataCheck';
import { BOSSES } from '../src/data/bosses';
import { DIFFICULTIES } from '../src/data/difficulty';
import { checkGameData } from '../src/core/gameDataCheck';

const errs: string[] = [];
for (const b of Object.values(BOSSES)) errs.push(...checkBoss(b, Object.values(DIFFICULTIES)));
errs.push(...checkGameData());
if (errs.length) {
  console.error(`validate:data — ${errs.length} problema(s):`);
  for (const e of errs) console.error('  - ' + e);
  process.exit(1);
}
console.log(`validate:data — OK (${Object.keys(BOSSES).length} chefes)`);
