import Phaser from 'phaser';
import type { BattleSim } from '../../core/battle';
import { FixedStepper } from '../../core/loop';
import { InputService } from '../../platform/input';
import { Lifecycle } from '../../platform/lifecycle';
import { ErrorContext } from '../../platform/shell';
import { Params } from '../../platform/urlParams';
import { AudioService } from '../../services/audio';
import { EventBus } from '../../services/eventBus';
import { Logger } from '../../services/logger';
import { SettingsService } from '../../services/settings';
import { SONGS } from '../../data/music';
import { Btn } from '../../core/input';
import { playEventSound } from '../audioMap';
import { type BattleParams, buildBattle } from '../battleSetup';
import { applyFilmSettings, attachFilm } from '../fx/film';
import type { FilmFilter } from '../fx/FilmFilter';
import { BattleView } from '../render/BattleView';
import { Router } from '../router';
import { Telemetry } from '../../services/telemetry';

export type BattlePhase = 'card' | 'intro' | 'fight' | 'ko' | 'victory' | 'defeat';

/** Cena de batalha: chefes, fase aérea, run'n'gun e tutorial (via módulos de fase). */
export class BattleScene extends Phaser.Scene {
  sim!: BattleSim;
  view!: BattleView;
  params!: BattleParams;
  private stepper = new FixedStepper();
  private last = 0;
  private film: FilmFilter | null = null;
  paused = false;
  phase: BattlePhase = 'card';
  private cardTimer = 0;
  private resultSent = false;
  private unsub: (() => void)[] = [];
  bossId: string | null = null;
  song = 'cuco';
  targetTime = 120;
  coins = 0;
  title = '';
  quote = '';
  retries = 0;
  /** hook de debug/autoplay: substitui o input do P1/P2 */
  inputOverride: ((player: number) => number) | null = null;
  private slowmo = 0;
  private musicLevel = -1;
  onTick: (() => void) | null = null;

  constructor() {
    super('Battle');
  }

  init(p: BattleParams): void {
    this.params = p;
    this.phase = 'card';
    this.resultSent = false;
    this.paused = false;
    this.retries = 0;
    this.musicLevel = -1;
  }

  create(): void {
    const setup = buildBattle(this.params);
    this.sim = setup.sim;
    this.bossId = setup.bossId;
    this.song = setup.song;
    this.targetTime = setup.targetTime;
    this.coins = setup.coins;
    this.title = setup.title;
    this.quote = setup.quote;
    if (Params.invincible) this.sim.invincible = true;
    if (this.params.phase && this.params.phase > 1 && this.sim.boss) this.sim.boss.startAtPhase(this.params.phase - 1);
    this.sim.beatProvider = () => AudioService.musicBeat();
    this.sim.onMusicHook = (op, v) => {
      if (op === 'skip') AudioService.sequencer.skip(v);
      else AudioService.sequencer.tempoUp(v);
    };
    this.add.rectangle(960, 540, 1920, 1080, 0x2a1d14).setDepth(-200);
    this.view = new BattleView(this, this.sim, this.bossId, this.params.kind === 'stage' ? this.params.id : null);
    this.film = attachFilm(this);
    this.stepper.reset();
    this.stepper.timeScale = SettingsService.get('gameSpeed');
    this.last = performance.now();
    ErrorContext.boss = this.params.id;
    ErrorContext.seed = this.params.seed;
    ErrorContext.difficulty = this.params.difficulty;
    this.scene.launch('Hud', { battle: this });
    this.scene.bringToTop('Hud');
    this.scene.bringToTop('Iris');
    // cartão de título (pulável); na repetição vai direto
    this.phase = 'card';
    this.cardTimer = SettingsService.get('fastTransitions') ? 0.6 : 1.8;
    this.startMusic();
    AudioService.startVinyl();
    this.unsub.push(
      EventBus.on('app:pause', ({ reason }) => {
        if (this.phase === 'victory' || this.phase === 'defeat') return;
        this.pause(reason);
      }),
      EventBus.on('settings:changed', ({ key }) => {
        if (this.film) applyFilmSettings(this.film);
        this.view.applySettings();
        if (key === 'gameSpeed') this.stepper.timeScale = SettingsService.get('gameSpeed');
      }),
    );
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanup());
    Telemetry.battleStart(this.params);
    Router.reveal(this);
    if (__DEBUG__) void import('../debug/debugTools').then((m) => m.attachBattleDebug(this));
  }

  private startMusic(): void {
    const song = SONGS[this.song];
    if (song) AudioService.playSong(song, 0, true);
  }

  private cleanup(): void {
    for (const u of this.unsub) u();
    this.unsub.length = 0;
    this.scene.stop('Hud');
    this.scene.stop('Pause');
    this.scene.stop('Defeat');
  }

  pause(reason: string): void {
    if (this.paused || this.phase === 'victory') return;
    this.paused = true;
    AudioService.setMuffled(true);
    AudioService.play('pause_on', { bus: 'voice' });
    this.scene.launch('Pause', { battle: this, reason });
    this.scene.bringToTop('Pause');
    this.scene.bringToTop('Iris');
  }

  resume(): void {
    if (!this.paused) return;
    this.paused = false;
    AudioService.setMuffled(false);
    AudioService.play('pause_off', { bus: 'voice' });
    InputService.resetToggles();
    this.scene.stop('Pause');
    this.last = performance.now();
    this.stepper.reset();
  }

  /** Retry instantâneo: reset completo do estado, sem recarregar assets. */
  retry(): void {
    this.retries++;
    Telemetry.retry(this.params);
    this.scene.stop('Defeat');
    this.scene.stop('Pause');
    this.paused = false;
    AudioService.setMuffled(false);
    this.sim.reset(this.params.seed + this.retries);
    if (this.params.phase && this.params.phase > 1 && this.sim.boss) this.sim.boss.startAtPhase(this.params.phase - 1);
    if (Params.invincible) this.sim.invincible = true;
    this.view.reset();
    this.stepper.reset();
    this.last = performance.now();
    this.phase = 'intro';
    this.resultSent = false;
    this.slowmo = 0;
    this.musicLevel = -1;
    this.startMusic();
    (this.scene.get('Hud') as { onRetry?: () => void } | null)?.onRetry?.();
    Logger.info('Battle', `retry #${this.retries}`);
  }

  exitTo(target: 'map' | 'menu'): void {
    AudioService.setMuffled(false);
    AudioService.stopMusic(0.4);
    if (target === 'map') Router.go(this, 'WorldMap', {}, ['map']);
    else Router.go(this, 'Title', {}, []);
  }

  override update(): void {
    const now = performance.now();
    const frameMs = now - this.last;
    this.last = now;
    AudioService.sequencer.pump();
    if (this.paused || Lifecycle.contextLost) {
      InputService.poll();
      InputService.endTick();
      this.view.render(this.stepper.alpha, 0);
      return;
    }
    if (this.phase === 'card') {
      InputService.poll();
      if (InputService.menu('confirm') && this.retries === 0) this.cardTimer = Math.min(this.cardTimer, 0.1);
      InputService.endTick();
      this.cardTimer -= frameMs / 1000;
      if (this.cardTimer <= 0) this.phase = 'intro';
      this.view.render(0, frameMs / 1000);
      this.film?.tick(frameMs);
      return;
    }
    // câmera lenta do nocaute
    const speed = SettingsService.get('gameSpeed') * (this.slowmo > 0 ? 0.5 : 1);
    this.stepper.timeScale = speed;
    const n = this.stepper.advance(frameMs);
    for (let i = 0; i < n; i++) {
      InputService.poll();
      this.handleJoin();
      for (let pi = 0; pi < 2; pi++) {
        const bits = this.inputOverride ? this.inputOverride(pi) : InputService.playerBits(pi);
        this.sim.feedInput(pi, bits & ~Btn.Pause);
      }
      // P / Enter / Esc / Start de qualquer dispositivo pausam
      if (InputService.menu('pause') && (this.phase === 'fight' || this.phase === 'intro' || this.phase === 'ko')) {
        InputService.endTick();
        this.pause('user');
        return;
      }
      InputService.endTick();
      this.sim.step();
      this.onTick?.();
      if (this.slowmo > 0) this.slowmo--;
    }
    this.processEvents(now / 1000);
    this.updatePhase();
    this.updateMusicLayer();
    this.view.render(this.stepper.alpha, frameMs / 1000);
    const cam = this.cameras.main;
    // câmera: fixa nos chefes; segue (só avançando) no run'n'gun/tutorial
    cam.setScroll(this.sim.viewLeft - this.view.shake.x, -this.view.shake.y);
    this.film?.tick(frameMs);
  }

  private handleJoin(): void {
    const p2 = this.sim.players[1];
    if (!p2 || p2.joined || this.phase !== 'fight') return;
    const pad = InputService.pollJoinPad();
    if (pad >= 0) {
      InputService.joinPlayer2(pad);
      this.sim.joinPlayer(1);
    } else if (InputService.keyboardJoinPressed()) {
      InputService.joinPlayer2('keyboard');
      this.sim.joinPlayer(1);
    }
  }

  private processEvents(nowSec: number): void {
    const ev = this.sim.events;
    const hud = this.scene.get('Hud') as { onSimEvent?: (type: string, a: number, player: number, str: string) => void } | null;
    for (let i = 0; i < ev.length; i++) {
      const e = ev.get(i);
      this.view.onEvent(e.type, e.x, e.y, e.a, e.b, e.player, e.str);
      playEventSound(e, nowSec);
      hud?.onSimEvent?.(e.type, e.a, e.player, e.str);
      if (e.type === 'playerHurt' && e.player >= 0) InputService.rumble(e.player, 0.8, 0.5, 220);
      if (e.type === 'parry' && e.player >= 0) InputService.rumble(e.player, 0.3, 0.7, 120);
      if (e.type === 'bossKnockout') this.slowmo = 30;
      if (e.type === 'playerDie') Telemetry.death(this.params, this.sim);
    }
    ev.clear();
  }

  private updatePhase(): void {
    const sim = this.sim;
    if (this.phase === 'intro') {
      const b = sim.boss;
      if (!b || b.state !== 'intro') this.phase = 'fight';
    }
    if (this.phase === 'fight' && sim.boss && (sim.boss.state === 'knockout' || sim.boss.state === 'dead')) this.phase = 'ko';
    if (sim.result === 'victory' && !this.resultSent && (sim.resultTicks > 90 || !sim.boss)) {
      this.resultSent = true;
      this.phase = 'victory';
      this.time.delayedCall(sim.boss ? 400 : 1200, () => this.goResults());
    }
    if (sim.result === 'defeat' && this.phase !== 'defeat') {
      this.phase = 'defeat';
      this.time.delayedCall(700, () => {
        if (this.phase !== 'defeat') return;
        this.scene.launch('Defeat', { battle: this });
        this.scene.bringToTop('Defeat');
        this.scene.bringToTop('Iris');
      });
    }
  }

  private updateMusicLayer(): void {
    const b = this.sim.boss;
    const lv = b ? Math.min(3, b.phaseIndex + (this.phase === 'fight' || this.phase === 'ko' ? 1 : 0)) : 3;
    if (lv !== this.musicLevel) {
      this.musicLevel = lv;
      AudioService.setMusicLayer(lv);
    }
  }

  private goResults(): void {
    const sim = this.sim;
    const p = sim.players.filter((x) => x.joined);
    const data = {
      params: this.params,
      timeSec: sim.fightTicks / 60,
      targetTime: this.targetTime,
      hpLeft: Math.max(...p.map((x) => x.hp)),
      parries: p.reduce((a, x) => a + x.stats.parries, 0),
      cardsUsed: p.reduce((a, x) => a + x.stats.cardsUsed, 0),
      damageTaken: p.reduce((a, x) => a + x.stats.damageTaken, 0),
      coins: this.coins,
      collected: (sim.module as { collectedCoins?: () => string[] } | null)?.collectedCoins?.() ?? [],
    };
    Telemetry.victory(this.params, data.timeSec);
    AudioService.stopMusic(0.6);
    Router.go(this, 'Result', data, []);
  }
}
