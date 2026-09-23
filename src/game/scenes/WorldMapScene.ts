import Phaser from 'phaser';
import { creditCoins } from '../../core/economy';
import { Btn } from '../../core/input';
import { finalBossAllowed, type MapNode } from '../../core/progression';
import { gradeValue } from '../../core/ranking';
import type { DifficultyId, Grade } from '../../core/types';
import { BOSSES } from '../../data/bosses';
import { SONGS } from '../../data/music';
import { t } from '../../i18n';
import { InputService } from '../../platform/input';
import { applyUpdate, updateAvailable } from '../../platform/pwa';
import { AudioService } from '../../services/audio';
import { EventBus } from '../../services/eventBus';
import { GameState } from '../../services/gameState';
import { CSS, drawPanel, style, titleStyle } from '../../ui/theme';
import { Menu, type MenuItem } from '../../ui/Menu';
import { AssetPackLoader, CONTENT_PACK } from '../assets';
import { Router } from '../router';
import { BOAT, BRIDGE, MAP_COINS, MAP_H, MAP_NODES, MAP_W, NPCS, moveOnMap, nearestNode, nearestNpc, nodeDone, nodeUnlocked } from '../../core/worldmap';
import { attachFilm } from '../fx/film';
import type { FilmFilter } from '../fx/FilmFilter';

const NODE_ICON: Record<string, string> = {
  tutorial: 'icon_tutorial',
  shop: 'icon_shop',
  cuco: 'icon_cuco',
  agulha: 'icon_agulha',
  runngun1: 'icon_runngun1',
  challenge1: 'icon_challenge',
  challenge2: 'icon_challenge',
  gramofone: 'icon_gramofone',
  bigorna: 'icon_bigorna',
  fuligem: 'icon_fuligem',
  runngun2: 'icon_runngun2',
  maestro: 'icon_maestro',
};

const NODE_NAME: Record<string, string> = {
  tutorial: 'ENSAIO GERAL',
  shop: 'EMPÓRIO DO SEU TRAPO',
  cuco: 'SENHOR CUCO',
  agulha: 'MADAME AGULHA',
  runngun1: 'BASTIDORES EM CHAMAS',
  challenge1: 'DESAFIO DO BALÃO',
  challenge2: 'DESAFIO DA FAGULHA',
  gramofone: 'TIO GRAMOFONE',
  bigorna: 'IRMÃS BIGORNA',
  fuligem: 'COMODORO FULIGEM',
  runngun2: 'FÁBRICA DE ECOS',
  maestro: 'O MAESTRO DE CORDA',
};

const SPEED = 330;

/** Mapa-múndi em visão de cima. */
export class WorldMapScene extends Phaser.Scene {
  private px = 300;
  private py = 820;
  private player!: Phaser.GameObjects.Sprite;
  private nodes = new Map<string, Phaser.GameObjects.Image>();
  private labels = new Map<string, Phaser.GameObjects.Text>();
  private npcSprites: Phaser.GameObjects.Sprite[] = [];
  private coinSprites = new Map<string, Phaser.GameObjects.Sprite>();
  private prompt!: Phaser.GameObjects.Text;
  private dialog: Phaser.GameObjects.Container | null = null;
  private dialogLines: string[] = [];
  private dialogIdx = 0;
  private modal: Menu | null = null;
  private modalObjs: Phaser.GameObjects.GameObject[] = [];
  private hud!: Phaser.GameObjects.Text;
  private bridge!: Phaser.GameObjects.Graphics;
  private dir: 'side' | 'down' | 'up' = 'down';
  private film: FilmFilter | null = null;
  private lastMs = 0;
  private prefetching = false;
  private updateBtn: Phaser.GameObjects.Text | null = null;
  private ch: 'faisca' | 'pavio' = 'faisca';

  constructor() {
    super('WorldMap');
  }

  create(): void {
    const s = GameState.save;
    if (!s) {
      Router.go(this, 'MainMenu');
      return;
    }
    this.px = s.map.x;
    this.py = s.map.y;
    this.cameras.main.setBounds(0, 0, MAP_W, MAP_H);
    if (this.textures.exists('map_bg')) {
      const bg = this.add.image(0, 0, 'map_bg').setOrigin(0, 0);
      bg.setScale(MAP_W / (bg.width || MAP_W));
    } else this.add.rectangle(MAP_W / 2, MAP_H / 2, MAP_W, MAP_H, 0x6b8fa0);
    this.bridge = this.add.graphics();
    this.drawBridge(nodeDone(s, 'bridge'), s.embers.length >= 5);
    for (const n of MAP_NODES) {
      if (n.kind === 'bridge') continue;
      const key = NODE_ICON[n.id] ?? 'icon_tutorial';
      const img = this.add.image(n.x, n.y, 'map', key).setDepth(n.y);
      this.nodes.set(n.id, img);
      const lab = this.add.text(n.x, n.y - 110, '', style(24, CSS.ink, { backgroundColor: '#efe2c4', padding: { x: 10, y: 4 } })).setOrigin(0.5).setDepth(3000).setVisible(false);
      this.labels.set(n.id, lab);
    }
    for (const npc of NPCS) {
      const spr = this.add.sprite(npc.x, npc.y, 'map', `${npc.sprite}_0`).setDepth(npc.y).setOrigin(0.5, 0.9);
      if (this.anims.exists(npc.sprite)) spr.play(npc.sprite);
      this.npcSprites.push(spr);
    }
    for (const c of MAP_COINS) {
      if (s.coinsCollected.includes(c.id)) continue;
      const spr = this.add.sprite(c.x, c.y, 'fx', 'coin_0').setDepth(c.y).setScale(0.8);
      spr.play('coin');
      this.coinSprites.set(c.id, spr);
    }
    this.ch = 'faisca';
    this.player = this.add.sprite(this.px, this.py, 'players', `${this.ch}_map_down_0`).setOrigin(0.5, 112 / 120).setScale(1.3);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.prompt = this.add.text(960, 1000, '', style(30, CSS.paper, { stroke: CSS.ink, strokeThickness: 6 })).setOrigin(0.5).setScrollFactor(0).setDepth(5000);
    this.hud = this.add.text(30, 24, '', style(28, CSS.paper, { stroke: CSS.ink, strokeThickness: 6 })).setScrollFactor(0).setDepth(5000);
    this.add.text(1890, 24, 'Equipamento: V / Y   ·   Pausa: P / Start', style(20, CSS.paper, { stroke: CSS.ink, strokeThickness: 4 })).setOrigin(1, 0).setScrollFactor(0).setDepth(5000);
    this.refreshNodes();
    this.film = attachFilm(this);
    const song = SONGS.map;
    if (song) AudioService.playSong(song, 0);
    this.lastMs = performance.now();
    this.showUpdate();
    const off = EventBus.on('pwa:update', () => this.showUpdate());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, off);
    void GameState.persist();
    Router.reveal(this);
  }

  private showUpdate(): void {
    if (!updateAvailable() || this.updateBtn) return;
    this.updateBtn = this.add
      .text(960, 70, `⟳ ${t('updateAvailable')}`, style(26, CSS.ink, { backgroundColor: '#e8b64c', padding: { x: 14, y: 8 } }))
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(6000)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        void GameState.persist().then(() => applyUpdate());
      });
  }

  private drawBridge(bridge: boolean, boat: boolean): void {
    const g = this.bridge;
    g.clear();
    if (bridge) {
      g.fillStyle(0x1c120b, 1);
      g.fillRect(BRIDGE.x - 4, BRIDGE.y - 4, BRIDGE.w + 8, BRIDGE.h + 8);
      g.fillStyle(0x9a6a3a, 1);
      g.fillRect(BRIDGE.x, BRIDGE.y, BRIDGE.w, BRIDGE.h);
      for (let x = BRIDGE.x + 10; x < BRIDGE.x + BRIDGE.w; x += 26) {
        g.lineStyle(4, 0x5a3a1e, 1);
        g.lineBetween(x, BRIDGE.y, x, BRIDGE.y + BRIDGE.h);
      }
    }
    if (boat) {
      g.fillStyle(0x1c120b, 1);
      g.fillEllipse(BOAT.x + BOAT.w / 2, BOAT.y + BOAT.h / 2, BOAT.w + 30, BOAT.h + 10);
      g.fillStyle(0xb8773f, 1);
      g.fillEllipse(BOAT.x + BOAT.w / 2, BOAT.y + BOAT.h / 2, BOAT.w + 20, BOAT.h);
    }
  }

  private refreshNodes(): void {
    const s = GameState.save!;
    for (const n of MAP_NODES) {
      const img = this.nodes.get(n.id);
      if (!img) continue;
      const unlocked = nodeUnlocked(s, n);
      img.setAlpha(unlocked ? 1 : 0.35);
      if (nodeDone(s, n.id) && n.kind !== 'shop') img.setTint(0xfff0c0);
    }
    const coins = s.coins;
    this.hud.setText(`${t('coins', { n: coins })}   ·   Brasas: ${s.embers.length}/5`);
  }

  private bestGrade(id: string): Grade | null {
    const s = GameState.save!;
    const r = s.bosses[id];
    let best: Grade | null = null;
    if (r) for (const g of Object.values(r.best)) if (g && (!best || gradeValue(g) > gradeValue(best))) best = g;
    const st = s.stages[id];
    if (st?.best && (!best || gradeValue(st.best) > gradeValue(best))) best = st.best;
    return best;
  }

  private openNode(n: MapNode): void {
    if (this.modal) return;
    const s = GameState.save!;
    if (!nodeUnlocked(s, n)) {
      AudioService.play('ui_denied', { bus: 'voice' });
      return;
    }
    if (n.kind === 'shop') {
      this.saveAndGo('Shop', {}, ['ilha1']);
      return;
    }
    if (n.kind === 'final' && !finalBossAllowed(s)) {
      this.say([t('needNormal')], 'Vô Lampião');
      return;
    }
    const isBoss = n.kind === 'boss' || n.kind === 'final';
    const diffs: DifficultyId[] = s.expertUnlocked ? ['simples', 'normal', 'especialista'] : ['simples', 'normal'];
    const items: MenuItem[] = isBoss
      ? diffs.map((d) => ({ kind: 'button' as const, label: () => `${t('enterStage')} — ${t(`diff_${d}` as never)}`, onSelect: () => this.enter(n, d), hint: () => t(`diffDesc_${d}` as never) }))
      : [{ kind: 'button', label: () => t('enterStage'), onSelect: () => this.enter(n, s.difficulty) }];
    items.push({ kind: 'button', label: () => t('cancel'), onSelect: () => this.closeModal() });
    const g = this.add.graphics().setScrollFactor(0).setDepth(7000);
    drawPanel(g, 560, 240, 800, 600);
    const title = this.add.text(960, 320, NODE_NAME[n.id] ?? n.id, titleStyle(52, CSS.accent)).setOrigin(0.5).setScrollFactor(0).setDepth(7001);
    const best = this.bestGrade(n.id);
    const info = this.add
      .text(960, 390, `${nodeDone(s, n.id) ? t('cleared') : ''}${best ? `   ${t('bestRank', { g: best })}` : ''}`, style(28))
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(7001);
    this.modal = new Menu(this, 960, 480, items, { width: 640, rowH: 70, fontSize: 32, hintY: 740 });
    this.modal.container.setScrollFactor(0).setDepth(7002);
    this.modal.onBack = () => this.closeModal();
    if (isBoss) {
      this.modal.index = Math.max(0, diffs.indexOf(s.difficulty));
      this.modal.refresh();
    }
    this.modalObjs = [g, title, info];
  }

  private closeModal(): void {
    this.modal?.destroy();
    this.modal = null;
    for (const o of this.modalObjs) o.destroy();
    this.modalObjs = [];
  }

  private enter(n: MapNode, d: DifficultyId): void {
    const s = GameState.save!;
    const kind = n.kind === 'boss' || n.kind === 'final' ? 'boss' : 'stage';
    const id = n.id;
    if (kind === 'boss' && !BOSSES[id]) return;
    this.closeModal();
    this.saveAndGo('Battle', { kind, id, difficulty: d, coop: InputService.slots[1]?.joined ?? false, seed: (Date.now() % 100000) | 0, from: 'map', loadout: s.equip }, [CONTENT_PACK[id] ?? 'ilha1']);
  }

  private saveAndGo(key: string, data: object, packs: string[]): void {
    GameState.update((s) => ({ ...s, map: { x: this.px, y: this.py, island: this.px > 1760 ? 1 : 0 } }));
    AudioService.stopMusic(0.4);
    Router.go(this, key, data, packs, { x: this.player.x - this.cameras.main.scrollX, y: this.player.y - this.cameras.main.scrollY });
  }

  private say(lines: string[], name: string): void {
    this.dialogLines = lines;
    this.dialogIdx = 0;
    const c = this.add.container(0, 0).setScrollFactor(0).setDepth(7000);
    const g = this.add.graphics();
    drawPanel(g, 260, 760, 1400, 260);
    const nm = this.add.text(320, 790, name, style(30, CSS.accent));
    const tx = this.add.text(320, 840, lines[0] ?? '', style(32, CSS.ink, { wordWrap: { width: 1280 } }));
    c.add([g, nm, tx]);
    c.setData('text', tx);
    this.dialog = c;
    AudioService.play('chime', { bus: 'voice', volume: 0.5 });
  }

  private advanceDialog(): void {
    if (!this.dialog) return;
    this.dialogIdx++;
    if (this.dialogIdx >= this.dialogLines.length) {
      this.dialog.destroy();
      this.dialog = null;
      return;
    }
    (this.dialog.getData('text') as Phaser.GameObjects.Text).setText(this.dialogLines[this.dialogIdx] ?? '');
  }

  private prefetch(n: MapNode | null): void {
    if (!n || this.prefetching) return;
    const pack = CONTENT_PACK[n.id];
    if (!pack || AssetPackLoader.isLoaded(pack)) return;
    this.prefetching = true;
    if (AssetPackLoader.queue(this, pack)) {
      this.load.once(Phaser.Loader.Events.COMPLETE, () => {
        AssetPackLoader.finalize(this, pack);
        this.prefetching = false;
      });
      this.load.start();
    } else this.prefetching = false;
  }

  override update(): void {
    const now = performance.now();
    const dt = Math.min(0.05, (now - this.lastMs) / 1000);
    this.lastMs = now;
    AudioService.sequencer.pump();
    this.film?.tick(dt * 1000);
    InputService.poll();
    const s = GameState.save;
    if (!s) {
      InputService.endTick();
      return;
    }
    if (this.modal) {
      this.modal.update();
      InputService.endTick();
      return;
    }
    if (this.dialog) {
      if (InputService.menu('confirm') || InputService.menu('back')) this.advanceDialog();
      InputService.endTick();
      return;
    }
    const bits = InputService.playerBits(0);
    const dx = (bits & Btn.Right ? 1 : 0) - (bits & Btn.Left ? 1 : 0);
    const dy = (bits & Btn.Down ? 1 : 0) - (bits & Btn.Up ? 1 : 0);
    if (dx || dy) {
      const r = moveOnMap(s, this.px, this.py, dx, dy, SPEED, dt);
      this.px = r.x;
      this.py = r.y;
      this.dir = dy < 0 && !dx ? 'up' : dy > 0 && !dx ? 'down' : 'side';
      if (dx) this.player.setFlipX(dx < 0);
      const anim = `${this.ch}_map_${this.dir}`;
      if (this.player.anims.currentAnim?.key !== anim || !this.player.anims.isPlaying) this.player.play(anim);
    } else this.player.anims.stop();
    this.player.setPosition(this.px, this.py).setDepth(this.py);
    // moedas escondidas
    for (const c of MAP_COINS) {
      const spr = this.coinSprites.get(c.id);
      if (spr && Math.hypot(c.x - this.px, c.y - this.py) < 60) {
        spr.destroy();
        this.coinSprites.delete(c.id);
        GameState.update((sv) => creditCoins(sv, [c.id]).save);
        AudioService.play('coin', { priority: 2 });
        this.refreshNodes();
      }
    }
    const node = nearestNode(this.px, this.py);
    const npc = nearestNpc(this.px, this.py, 90);
    for (const [id, lab] of this.labels) lab.setVisible(id === node?.id);
    if (node) {
      const lab = this.labels.get(node.id);
      const best = this.bestGrade(node.id);
      const unlocked = nodeUnlocked(s, node);
      lab?.setText(`${NODE_NAME[node.id] ?? node.id}${unlocked ? '' : ` — ${t('locked')}`}${best ? `  (${best})` : ''}${nodeDone(s, node.id) && node.kind !== 'shop' ? ' ✓' : ''}`);
      this.prompt.setText(unlocked ? `▶ ${t('enterStage')}` : t('locked'));
      this.prefetch(node);
    } else if (npc) this.prompt.setText(`▶ Conversar com ${npc.name}`);
    else this.prompt.setText('');
    if (InputService.menu('confirm') && (node || npc)) {
      if (node) this.openNode(node);
      else if (npc) {
        const lines = [...npc.lines];
        if (npc.givesCoin && !s.coinsCollected.includes(`npc:${npc.id}`)) {
          GameState.update((sv) => creditCoins(sv, [`npc:${npc.id}`]).save);
          AudioService.play('coin', { priority: 2 });
          this.refreshNodes();
        } else if (npc.givesCoin) lines[lines.length - 1] = 'Já te dei a moedinha, sô!';
        this.say(lines, npc.name);
      }
      // o Enter que abriu o cartão/diálogo não pode ser reprocessado como pausa neste tick
      InputService.endTick();
      return;
    }
    if (bits & Btn.Ex) {
      InputService.endTick();
      this.openEquip();
      return;
    }
    if (InputService.pauseOnly()) {
      InputService.endTick();
      this.openPauseMenu();
      return;
    }
    InputService.endTick();
  }

  private openEquip(): void {
    this.scene.launch('Equip', { returnTo: 'WorldMap' });
    this.scene.bringToTop('Equip');
    this.scene.bringToTop('Iris');
    this.scene.pause();
  }

  onOptionsClosed(): void {
    this.refreshNodes();
  }

  private openPauseMenu(): void {
    if (this.modal) return;
    const items: MenuItem[] = [
      { kind: 'button', label: () => t('resume'), onSelect: () => this.closeModal() },
      {
        kind: 'button',
        label: () => t('equip'),
        onSelect: () => {
          this.closeModal();
          this.openEquip();
        },
      },
      {
        kind: 'button',
        label: () => t('options'),
        onSelect: () => {
          this.closeModal();
          this.scene.launch('Options', { returnTo: 'WorldMap' });
          this.scene.bringToTop('Options');
          this.scene.bringToTop('Iris');
          this.scene.pause();
        },
      },
      { kind: 'button', label: () => t('exitMenu'), onSelect: () => this.saveAndGo('MainMenu', {}, []) },
    ];
    const g = this.add.graphics().setScrollFactor(0).setDepth(7000);
    drawPanel(g, 660, 260, 600, 520);
    const title = this.add.text(960, 330, t('paused'), titleStyle(60)).setOrigin(0.5).setScrollFactor(0).setDepth(7001);
    this.modal = new Menu(this, 960, 440, items, { width: 480, rowH: 76, fontSize: 34 });
    this.modal.container.setScrollFactor(0).setDepth(7002);
    this.modal.onBack = () => this.closeModal();
    this.modalObjs = [g, title];
  }
}
