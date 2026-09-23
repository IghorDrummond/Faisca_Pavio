import Phaser from 'phaser';
import { METER } from '../../data/tuning';
import { t } from '../../i18n';
import { InputService, keyLabel } from '../../platform/input';
import { SettingsService } from '../../services/settings';
import { COLORS, CSS, style, titleStyle } from '../../ui/theme';
import type { BattleScene } from './BattleScene';
import { BOSS_VISUALS } from '../render/bossVisuals';

const WEAPON_ICON: Record<string, string> = {
  reta: 'shot_reta_0',
  leque: 'shot_leque_0',
  teleguiada: 'shot_teleguiada_0',
  rojao: 'shot_rojao_0',
};

const CAPTIONS: Record<string, string> = {
  warn_tick: '[tique-taque de aviso]',
  warn_cuckoo: '[cuco cantando]',
  warn_bell: '[sino de aviso]',
  warn_spring: '[mola rangendo]',
  warn_horn: '[buzina de aviso]',
  warn_scratch: '[disco arranhando]',
  warn: '[aviso]',
  bossPhase: '[o chefe muda de forma!]',
  parry: '[parry!]',
  playerHurt: '[ai!]',
  knockout: '[sino do nocaute]',
};

interface PlayerHud {
  root: Phaser.GameObjects.Container;
  card: Phaser.GameObjects.Graphics;
  hpText: Phaser.GameObjects.Text;
  meter: Phaser.GameObjects.Graphics;
  w1: Phaser.GameObjects.Image;
  w2: Phaser.GameObjects.Image;
  charm: Phaser.GameObjects.Text;
  lastCards: number;
  flip: number[];
}

/** HUD por jogador (canto inferior), letreiros, cartão de título, legendas e barra opcional do chefe. */
export class HudScene extends Phaser.Scene {
  private battle!: BattleScene;
  private huds: PlayerHud[] = [];
  private banner!: Phaser.GameObjects.Text;
  private bannerSub!: Phaser.GameObjects.Text;
  private card!: Phaser.GameObjects.Container;
  private bossBar!: Phaser.GameObjects.Graphics;
  private caption!: Phaser.GameObjects.Text;
  private captionTimer = 0;
  private joinHint!: Phaser.GameObjects.Text;
  private fps!: Phaser.GameObjects.Text;
  private shownGo = false;
  private shownReady = false;
  private shownKo = false;
  private time0 = 0;

  constructor() {
    super('Hud');
  }

  init(d: { battle: BattleScene }): void {
    this.battle = d.battle;
    this.huds = [];
    this.shownGo = this.shownReady = this.shownKo = false;
  }

  create(): void {
    const scale = SettingsService.get('hudScale');
    for (let i = 0; i < 2; i++) this.huds.push(this.makePlayerHud(i, scale));
    this.bossBar = this.add.graphics();
    this.banner = this.add.text(960, 460, '', titleStyle(150)).setOrigin(0.5).setAlpha(0);
    this.bannerSub = this.add.text(960, 580, '', style(34, CSS.paper, { stroke: CSS.ink, strokeThickness: 6 })).setOrigin(0.5).setAlpha(0);
    this.caption = this.add.text(960, 70, '', style(28, CSS.white, { backgroundColor: 'rgba(0,0,0,0.6)', padding: { x: 14, y: 6 } })).setOrigin(0.5).setAlpha(0);
    this.joinHint = this.add.text(1890, 1050, '', style(22, CSS.paper, { stroke: CSS.ink, strokeThickness: 4 })).setOrigin(1, 1).setAlpha(0.8);
    this.fps = this.add.text(12, 10, '', style(20, '#9fe870', { stroke: '#000', strokeThickness: 4 })).setVisible(SettingsService.get('showFps'));
    this.card = this.makeTitleCard();
    this.time0 = 0;
  }

  private makePlayerHud(i: number, scale: number): PlayerHud {
    const x = i === 0 ? 40 : 1880;
    const root = this.add.container(x, 1040).setScale(scale);
    const side = i === 0 ? 1 : -1;
    const card = this.add.graphics();
    const hpText = this.add.text(side * 60, -36, '', style(34, CSS.ink)).setOrigin(0.5);
    const meter = this.add.graphics();
    const w1 = this.add.image(side * 170, -40, 'fx', WEAPON_ICON.reta!).setScale(0.8);
    const w2 = this.add.image(side * 220, -34, 'fx', WEAPON_ICON.reta!).setScale(0.5).setAlpha(0.6);
    const charm = this.add.text(side * 270, -40, '', style(18, CSS.paper, { stroke: CSS.ink, strokeThickness: 4 })).setOrigin(i === 0 ? 0 : 1, 0.5);
    root.add([card, hpText, meter, w1, w2, charm]);
    return { root, card, hpText, meter, w1, w2, charm, lastCards: 0, flip: [0, 0, 0, 0, 0] };
  }

  private makeTitleCard(): Phaser.GameObjects.Container {
    const b = this.battle;
    const c = this.add.container(960, 540);
    const g = this.add.graphics();
    g.fillStyle(0x0d0906, 0.85);
    g.fillRect(-960, -540, 1920, 1080);
    g.fillStyle(COLORS.ink, 1);
    g.fillRoundedRect(-560, -210, 1120, 420, 30);
    g.fillStyle(COLORS.paper, 1);
    g.fillRoundedRect(-540, -190, 1080, 380, 24);
    g.lineStyle(4, COLORS.ink, 1);
    g.strokeRoundedRect(-510, -160, 1020, 320, 16);
    const vis = b.bossId ? (b.title || undefined) : undefined;
    const name = b.params.kind === 'boss' ? (bossTitle(b.params.id) ?? b.params.id) : b.title || vis || '';
    const quote = b.params.kind === 'boss' ? (bossQuote(b.params.id) ?? '') : b.quote;
    const t1 = this.add.text(0, -40, name, titleStyle(88, CSS.accent)).setOrigin(0.5);
    const t2 = this.add.text(0, 70, quote, style(30, CSS.ink, { fontStyle: 'italic', wordWrap: { width: 960 }, align: 'center' })).setOrigin(0.5);
    c.add([g, t1, t2]);
    c.setDepth(100);
    return c;
  }

  showBanner(text: string, sub = '', dur = 900, color = CSS.gold): void {
    this.banner.setText(text).setColor(color).setAlpha(1).setScale(0.3);
    this.bannerSub.setText(sub).setAlpha(sub ? 1 : 0);
    this.tweens.killTweensOf(this.banner);
    this.tweens.add({ targets: this.banner, scale: 1, duration: 260, ease: 'Back.easeOut' });
    this.tweens.add({ targets: [this.banner, this.bannerSub], alpha: 0, delay: dur, duration: 250 });
  }

  onRetry(): void {
    this.shownGo = this.shownReady = this.shownKo = false;
    this.card.setVisible(false);
  }

  onSimEvent(type: string, _a: number, _player: number, str: string): void {
    if (!SettingsService.get('subtitles')) return;
    let cap = '';
    if (type === 'warn') cap = CAPTIONS[str] ?? CAPTIONS.warn!;
    else if (type === 'bossPhase' || type === 'parry' || type === 'playerHurt') cap = CAPTIONS[type] ?? '';
    else if (type === 'bossKnockout') cap = CAPTIONS.knockout!;
    if (cap) {
      this.caption.setText(cap).setAlpha(1);
      this.captionTimer = 1.2;
    }
  }

  override update(_time: number, delta: number): void {
    const b = this.battle;
    if (!b.sim) return;
    this.time0 += delta / 1000;
    const phase = b.phase;
    this.card.setVisible(phase === 'card');
    if (phase === 'intro' && !this.shownReady) {
      this.shownReady = true;
      this.showBanner(t('ready'), '', 1100);
    }
    if (phase === 'fight' && !this.shownGo) {
      this.shownGo = true;
      this.showBanner(t('go'), '', 600, CSS.accent);
    }
    if (phase === 'ko' && !this.shownKo) {
      this.shownKo = true;
      this.showBanner(t('knockout'), '', 1800, CSS.accent);
    }
    if (this.captionTimer > 0) {
      this.captionTimer -= delta / 1000;
      if (this.captionTimer <= 0) this.caption.setAlpha(0);
    }
    for (const p of b.sim.players) this.drawPlayer(p.index);
    this.drawBossBar();
    const p2 = b.sim.players[1];
    if (p2 && !p2.joined && phase === 'fight') {
      const key = keyLabel(SettingsService.get('keys').split2.jump[0] ?? 'Numpad0');
      this.joinHint.setText(t('p2Join', { key: InputService.connectedPads().length > 1 ? 'START' : key }));
    } else this.joinHint.setText('');
    if (this.fps.visible) this.fps.setText(`${this.game.loop.actualFps.toFixed(0)} FPS`);
  }

  private drawPlayer(i: number): void {
    const h = this.huds[i]!;
    const p = this.battle.sim.players[i]!;
    h.root.setVisible(p.joined);
    if (!p.joined) return;
    const side = i === 0 ? 1 : -1;
    const g = h.card;
    g.clear();
    // cartão de vida estilo ingresso de cinema
    const last = p.hp === 1 && p.alive;
    const blink = last && Math.floor(this.time0 * 4) % 2 === 0;
    const cx = side * 60;
    g.fillStyle(COLORS.ink, 1);
    g.fillRoundedRect(cx - 58, -76, 116, 76, 10);
    g.fillStyle(p.hp <= 0 ? 0x6b5a48 : blink ? COLORS.red : COLORS.paper, 1);
    g.fillRoundedRect(cx - 52, -70, 104, 64, 8);
    g.fillStyle(COLORS.ink, 1);
    g.fillCircle(cx - 52, -38, 8);
    g.fillCircle(cx + 52, -38, 8);
    h.hpText.setText(p.alive ? `PV ${p.hp}` : p.state === 'ghost' ? '☁' : '✕').setColor(blink ? CSS.white : CSS.ink);
    // medidor: 5 cartas que viram ao encher
    const m = h.meter;
    m.clear();
    const full = Math.floor(p.meter / METER.perCard);
    const frac = (p.meter % METER.perCard) / METER.perCard;
    if (full > h.lastCards) for (let k = h.lastCards; k < full; k++) h.flip[k] = 1;
    h.lastCards = full;
    for (let k = 0; k < METER.cards; k++) {
      const x = side * (130 + k * 34) - 14;
      const f = h.flip[k] ?? 0;
      if (f > 0) h.flip[k] = Math.max(0, f - 0.08);
      const wScale = f > 0 ? Math.abs(Math.cos(f * Math.PI)) : 1;
      const cw = 26 * wScale;
      const filled = k < full;
      m.fillStyle(COLORS.ink, 1);
      m.fillRoundedRect(x + 13 - cw / 2 - 3, -120 - 3, cw + 6, 40, 5);
      m.fillStyle(filled ? COLORS.gold : 0x4a3a2a, 1);
      m.fillRoundedRect(x + 13 - cw / 2, -120, cw, 34, 4);
      if (!filled && k === full) {
        m.fillStyle(COLORS.accent, 0.9);
        m.fillRect(x + 13 - cw / 2, -120 + 34 * (1 - frac), cw, 34 * frac);
      }
      if (filled) {
        m.fillStyle(COLORS.ink, 1);
        m.fillCircle(x + 13, -103, 5);
      }
    }
    // armas ativa e secundária
    const wa = p.mode === 'plane' ? (p.planeWeapon === 'shot' ? 'shot_plane_0' : 'shot_bomb_0') : (WEAPON_ICON[p.currentWeapon] ?? 'shot_reta_0');
    const wb = p.mode === 'plane' ? (p.planeWeapon === 'shot' ? 'shot_bomb_0' : 'shot_plane_0') : (WEAPON_ICON[p.loadout.weapons[p.activeWeapon === 0 ? 1 : 0]] ?? 'shot_reta_0');
    h.w1.setFrame(wa).setPosition(side * 330, -40);
    h.w2.setFrame(wb).setPosition(side * 380, -34);
    h.charm.setPosition(side * 420, -40).setText(p.loadout.charm ? t(`c_${p.loadout.charm}` as never) : '');
  }

  private drawBossBar(): void {
    const g = this.bossBar;
    g.clear();
    const boss = this.battle.sim.boss;
    if (!boss || !SettingsService.get('bossHpBar')) return;
    const w = 800;
    const x = 960 - w / 2;
    g.fillStyle(COLORS.ink, 1);
    g.fillRoundedRect(x - 6, 24, w + 12, 30, 10);
    g.fillStyle(0x4a3a2a, 1);
    g.fillRoundedRect(x, 30, w, 18, 8);
    g.fillStyle(COLORS.accent, 1);
    g.fillRoundedRect(x, 30, Math.max(8, w * (1 - boss.progress)), 18, 8);
    g.fillStyle(COLORS.paper, 1);
    for (const mk of boss.phaseMarkers()) g.fillRect(x + w * (1 - mk) - 2, 26, 4, 26);
  }
}

function bossTitle(id: string): string | undefined {
  return BOSS_VISUALS[id]?.title;
}

function bossQuote(id: string): string | undefined {
  return BOSS_VISUALS[id]?.quote;
}
