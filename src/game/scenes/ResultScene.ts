import Phaser from 'phaser';
import { creditCoins } from '../../core/economy';
import { recordBossWin, recordStageClear } from '../../core/progression';
import { computeRank, type RankResult } from '../../core/ranking';
import { RANKING } from '../../data/difficulty';
import { SONGS } from '../../data/music';
import { t } from '../../i18n';
import { InputService } from '../../platform/input';
import { AudioService } from '../../services/audio';
import { GameState } from '../../services/gameState';
import { OnlineService } from '../../services/online';
import { SettingsService } from '../../services/settings';
import { Telemetry } from '../../services/telemetry';
import { COLORS, CSS, drawPanel, style, titleStyle } from '../../ui/theme';
import type { BattleParams } from '../battleSetup';
import { Router } from '../router';

export interface ResultData {
  params: BattleParams;
  timeSec: number;
  targetTime: number;
  hpLeft: number;
  parries: number;
  cardsUsed: number;
  damageTaken: number;
  coins: number;
  collected: string[];
}

/** Vitória: contagem animada dos critérios e nota (D..S). Salva melhor nota por chefe/dificuldade. */
export class ResultScene extends Phaser.Scene {
  private d!: ResultData;
  private rank!: RankResult;
  private done = false;
  private rows: { label: string; value: string }[] = [];
  private notes: string[] = [];
  private shownAt = 0;

  constructor() {
    super('Result');
  }

  init(d: ResultData): void {
    this.d = d;
    this.done = false;
    this.notes = [];
  }

  create(): void {
    const d = this.d;
    const speed = SettingsService.get('gameSpeed');
    this.rank = computeRank(
      { timeSec: d.timeSec, targetTime: d.targetTime, hpLeft: d.hpLeft, parries: d.parries, cardsUsed: d.cardsUsed, difficulty: d.params.difficulty, damageTaken: d.damageTaken, gameSpeed: speed },
      RANKING,
    );
    this.applyProgress();
    const song = SONGS.victory;
    if (song) AudioService.playSong(song, 0, true);
    this.add.rectangle(960, 540, 1920, 1080, 0x2a1d14);
    const g = this.add.graphics();
    drawPanel(g, 360, 90, 1200, 900);
    this.add.text(960, 170, t('results'), titleStyle(90)).setOrigin(0.5);
    const mm = Math.floor(d.timeSec / 60);
    const ss = Math.floor(d.timeSec % 60);
    const tm = Math.floor(d.targetTime / 60);
    const ts = Math.floor(d.targetTime % 60);
    this.rows = [
      { label: t('time'), value: `${mm}:${String(ss).padStart(2, '0')} / ${tm}:${String(ts).padStart(2, '0')}` },
      { label: t('hpLeft'), value: `${d.hpLeft}` },
      { label: t('parries'), value: `${Math.min(RANKING.maxParries, d.parries)} / ${RANKING.maxParries}` },
      { label: t('superCards'), value: `${Math.min(RANKING.maxSuperCards, d.cardsUsed)} / ${RANKING.maxSuperCards}` },
      { label: t('difficulty'), value: t(`diff_${d.params.difficulty}` as never) },
      { label: t('damageTaken'), value: `${d.damageTaken}` },
    ];
    this.rows.forEach((r, i) => {
      const y = 290 + i * 74;
      const l = this.add.text(500, y, r.label, style(38)).setOrigin(0, 0.5).setAlpha(0);
      const v = this.add.text(1180, y, r.value, style(38, CSS.accent)).setOrigin(1, 0.5).setAlpha(0);
      this.tweens.add({ targets: [l, v], alpha: 1, x: '+=0', delay: 250 + i * 280, duration: 200, onStart: () => AudioService.play('ui_move', { bus: 'voice' }) });
    });
    // carimbo da nota
    const stamp = this.add.text(1340, 560, this.rank.grade, titleStyle(200, CSS.accent)).setOrigin(0.5).setAlpha(0).setScale(3).setAngle(-12);
    this.add.text(1340, 400, t('grade'), style(34)).setOrigin(0.5);
    this.tweens.add({
      targets: stamp,
      alpha: 1,
      scale: 1,
      delay: 250 + this.rows.length * 280 + 200,
      duration: 260,
      ease: 'Back.easeOut',
      onStart: () => AudioService.play('hit_heavy', { bus: 'sfx', priority: 3 }),
      onComplete: () => {
        this.done = true;
        this.shownAt = this.time.now;
      },
    });
    let ny = 780;
    if (this.rank.assisted) this.notes.unshift(t('assisted', { pct: Math.round(speed * 100) }));
    for (const n of this.notes) {
      this.add.text(960, ny, n, style(30, CSS.ink)).setOrigin(0.5);
      ny += 44;
    }
    this.add.text(960, 950, `▶ ${t('continue')}`, style(34, CSS.gold, { stroke: CSS.ink, strokeThickness: 6 })).setOrigin(0.5).setInteractive({ useHandCursor: true }).on('pointerdown', () => this.next());
    Telemetry.rank(d.params.id, this.rank.grade);
    Router.reveal(this);
  }

  private applyProgress(): void {
    const d = this.d;
    if (!GameState.save || d.params.from !== 'map') return;
    const assisted = this.rank.assisted;
    if (d.params.kind === 'boss') {
      const r = recordBossWin(GameState.save, d.params.id, d.params.difficulty, this.rank.grade, d.timeSec, d.coins);
      GameState.save = r.save;
      if (r.ember) this.notes.push(t('embersEarned'));
      if (r.coins) this.notes.push(t('coinsEarned', { n: r.coins }));
      if (r.newRecord) this.notes.push(t('newRecord'));
      if (!assisted && SettingsService.get('onlineOptIn')) OnlineService.submitScore(d.params.id, d.params.difficulty, d.timeSec, this.rank.grade);
    } else {
      let s = recordStageClear(GameState.save, d.params.id, this.rank.grade, d.timeSec);
      // moedas de fase só são creditadas na conclusão
      const c = creditCoins(s, d.collected);
      s = c.save;
      GameState.save = s;
      if (c.gained) this.notes.push(t('coinsEarned', { n: c.gained }));
    }
    void GameState.persist();
  }

  /** contagem do ranking terminou e a tela já aceita Confirmar */
  get acceptsInput(): boolean {
    return this.done && this.time.now - this.shownAt > 300;
  }

  private next(): void {
    if (!this.done) return;
    AudioService.stopMusic(0.4);
    const d = this.d;
    if (d.params.from === 'map') Router.go(this, d.params.id === 'maestro' ? 'Credits' : 'WorldMap', {}, d.params.id === 'maestro' ? ['final'] : ['map']);
    else Router.go(this, 'Title', {}, []);
  }

  override update(): void {
    InputService.poll();
    if (this.acceptsInput && (InputService.menu('confirm') || InputService.menu('back'))) this.next();
    InputService.endTick();
    void COLORS;
  }
}
