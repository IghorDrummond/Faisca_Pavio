import { createStageBattle } from '../core/factory';
import { ChallengeModule } from '../core/stages/challenge';
import { RunGunModule } from '../core/stages/runngun';
import { TUTORIAL_LENGTH, TutorialModule } from '../core/stages/tutorial';
import { LEVELS } from '../data/stages/levels';
import { registerStage } from './stages';

registerStage('tutorial', {
  title: 'ENSAIO GERAL',
  quote: '“Luz, câmera… ensaio! Ninguém se machuca no ensaio, prometo.”',
  song: 'tutorial',
  targetTime: 180,
  create: (o) => createStageBattle(new TutorialModule(), { ...o, right: TUTORIAL_LENGTH, spawnX: 200 }),
});

for (const [id, lvl] of Object.entries(LEVELS)) {
  registerStage(id, {
    title: id === 'runngun1' ? 'BASTIDORES EM CHAMAS' : 'FÁBRICA DE ECOS',
    quote: id === 'runngun1' ? '“O espetáculo não pode parar — nem que a coxia pegue fogo!”' : '“Aqui tudo se repete… se repete… se repete…”',
    song: id,
    targetTime: lvl.targetTime,
    bossVisual: lvl.miniboss.id,
    create: (o) => createStageBattle(new RunGunModule(lvl), { ...o, right: lvl.length, spawnX: 220 }),
  });
}

registerStage('challenge1', {
  title: 'DESAFIO DO BALÃO',
  quote: '“Cinco balões, nenhum pé no chão. Topa?”',
  song: 'tutorial',
  targetTime: 60,
  create: (o) => createStageBattle(new ChallengeModule('balao'), { ...o, spawnX: 300 }),
});

registerStage('challenge2', {
  title: 'DESAFIO DA FAGULHA',
  quote: '“Seis fagulhas azuis, e cuidado com as vermelhas!”',
  song: 'tutorial',
  targetTime: 60,
  create: (o) => createStageBattle(new ChallengeModule('fagulha'), { ...o, spawnX: 960 }),
});
