import { WEAPONS, CHARMS, SUPERS } from '../data/weapons';
import { DIFFICULTIES, RANKING } from '../data/difficulty';

/** Checagens dos dados gerais (armas, amuletos, dificuldade, ranking). */
export function checkGameData(): string[] {
  const errs: string[] = [];
  for (const w of Object.values(WEAPONS)) {
    if (!(w.fireInterval > 0)) errs.push(`[arma ${w.id}] fireInterval inválido`);
    if (!(w.damage > 0)) errs.push(`[arma ${w.id}] dano inválido`);
    if (!(w.speed > 0)) errs.push(`[arma ${w.id}] velocidade inválida`);
    if (w.pattern === 'charge' && !w.charge) errs.push(`[arma ${w.id}] padrão charge sem dados de carga`);
    if (w.price < 0) errs.push(`[arma ${w.id}] preço negativo`);
  }
  for (const c of Object.values(CHARMS)) if (c.price < 0) errs.push(`[amuleto ${c.id}] preço negativo`);
  for (const s of Object.values(SUPERS)) if (!(s.duration > 0)) errs.push(`[super ${s.id}] duração inválida`);
  for (const d of Object.values(DIFFICULTIES)) {
    if (d.minTelegraph < 0.35) errs.push(`[dificuldade ${d.id}] telegraph mínimo < 0,35 s`);
    if (!(d.projectileSpeed > 0)) errs.push(`[dificuldade ${d.id}] projectileSpeed inválido`);
  }
  let prev = Infinity;
  for (const g of RANKING.grades) {
    if (g.min >= prev) errs.push(`[ranking] notas devem estar em ordem decrescente`);
    prev = g.min;
  }
  return errs;
}
