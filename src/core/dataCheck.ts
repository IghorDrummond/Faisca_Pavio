import { secToTicks } from './constants';
import type { AttackAction, BossDef, DifficultyDef, EmitterDef, HazardDef, ProjSpec } from './types';

/**
 * Checagens de consistência dos dados (rodadas no build e nos testes).
 * Retorna lista de problemas; vazia = dados válidos.
 */
export function checkBoss(b: BossDef, difficulties: DifficultyDef[]): string[] {
  const errs: string[] = [];
  const at = (m: string): void => void errs.push(`[${b.id}] ${m}`);
  if (!(b.hp > 0)) at('hp deve ser > 0');
  if (!(b.targetTime > 0)) at('targetTime deve ser > 0');
  if (b.phases.length < 1) at('sem fases');
  const ids = new Set<string>();
  for (const a of b.attacks) {
    if (ids.has(a.id)) at(`ataque duplicado: ${a.id}`);
    ids.add(a.id);
    if (!(a.active > 0)) at(`${a.id}: active deve ser > 0`);
    if (a.recovery < 0) at(`${a.id}: recovery negativo`);
    for (const d of difficulties) {
      const t = Math.max(secToTicks(d.minTelegraph), Math.round(secToTicks(a.telegraph) * d.telegraph));
      if (t < secToTicks(d.minTelegraph)) at(`${a.id}: telegraph abaixo do mínimo em ${d.id}`);
    }
    if (a.telegraph <= 0) at(`${a.id}: telegraph deve ser > 0`);
    for (const act of a.actions) checkAction(act, a.id, at);
    const hasParry = a.actions.some((x) => actionHasParry(x));
    if (a.containsParry !== hasParry) at(`${a.id}: containsParry=${a.containsParry} não confere com as ações`);
    for (const c of a.cannotFollow ?? []) if (!b.attacks.some((x) => x.id === c)) at(`${a.id}: cannotFollow referencia ${c} inexistente`);
  }
  let prev = Infinity;
  b.phases.forEach((p, i) => {
    if (!(p.hpStart <= 1 && p.hpStart > 0)) at(`fase ${p.id}: hpStart fora de (0,1]`);
    if (p.hpStart >= prev) at(`fase ${p.id}: hpStart deve decrescer`);
    prev = p.hpStart;
    if (i === 0 && p.hpStart !== 1) at('primeira fase deve começar em 1');
    if (p.attacks.length < 1) at(`fase ${p.id}: sem ataques`);
    let parry = false;
    for (const o of p.attacks) {
      const a = b.attacks.find((x) => x.id === o.id);
      if (!a) at(`fase ${p.id}: ataque ${o.id} inexistente`);
      else if (a.containsParry && !a.expertOnly) parry = true;
      if (!(o.weight > 0)) at(`fase ${p.id}: peso inválido para ${o.id}`);
    }
    if (p.ambient) for (const act of p.ambient.actions) if (actionHasParry(act)) parry = true;
    if (!parry) at(`fase ${p.id}: nenhum objeto de parry na fase`);
    if (p.transition < 1.5 || p.transition > 3) at(`fase ${p.id}: transição deve durar 1,5–3 s`);
    if (p.breatherEvery[0] < 8 || p.breatherEvery[1] > 12) at(`fase ${p.id}: respiro fora de 8–12 s`);
    if (p.breatherTime[0] < 1 || p.breatherTime[1] > 2) at(`fase ${p.id}: duração do respiro fora de 1–2 s`);
    if (p.bodies.length < 1) at(`fase ${p.id}: sem corpos`);
    const hurt = p.bodies.some((bd) => bd.parts.some((pt) => pt.hurt));
    if (!hurt) at(`fase ${p.id}: nenhum ponto vulnerável`);
  });
  if (b.phases.length < 3 || b.phases.length > 4) at(`chefe deve ter 3–4 fases (tem ${b.phases.length})`);
  return errs;
}

function projHasParry(p: ProjSpec): boolean {
  return (p.parryEvery ?? 0) > 0 || (p.parryChance ?? 0) > 0;
}

function emitterHasParry(e: EmitterDef): boolean {
  return projHasParry(e.proj);
}

function hazardHasParry(h: HazardDef): boolean {
  return h.type === 'crosser' && h.parry === true;
}

export function actionHasParry(a: AttackAction): boolean {
  if (a.do === 'emit') return emitterHasParry(a.emitter);
  if (a.do === 'hazard') return hazardHasParry(a.hazard);
  return false;
}

function checkAction(a: AttackAction, id: string, at: (m: string) => void): void {
  if (a.t < 0) at(`${id}: ação com t negativo`);
  if (a.do === 'emit') {
    const e = a.emitter;
    if (e.proj.radius <= 0) at(`${id}: raio de projétil inválido`);
    if (e.proj.kind.includes('parry') || e.proj.kind.includes('cyan')) at(`${id}: use parryEvery/parryChance, não kinds cianos`);
    if ('count' in e && e.count < 1) at(`${id}: count < 1`);
    if (e.type === 'rain' && e.warn < 0.4) at(`${id}: chuva precisa de aviso de sombra >= 0,4 s`);
  }
  if (a.do === 'hazard') {
    const h = a.hazard;
    if ('warn' in h && h.type !== 'platform' && h.warn < 0.3) at(`${id}: perigo ${h.type} com aviso < 0,3 s`);
  }
}
