import Phaser from 'phaser';
import { type SaveData, exportSaveText, importSaveText, progressPercent } from '../../core/save';
import { ALL_BOSSES, STAGES } from '../../core/progression';
import type { DifficultyId } from '../../core/types';
import { GAME_TITLE, t } from '../../i18n';
import { InputService } from '../../platform/input';
import { requestPersistence } from '../../platform/storage';
import { AudioService } from '../../services/audio';
import { GameState } from '../../services/gameState';
import { Logger } from '../../services/logger';
import { CSS, drawPanel, style, titleStyle } from '../../ui/theme';
import { Menu, type MenuItem } from '../../ui/Menu';
import { Router } from '../router';
import { SONGS } from '../../data/music';

type View = 'main' | 'slots' | 'slot' | 'difficulty' | 'confirm1' | 'confirm2';

function fmtTime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${m} min`;
}

/** Menu principal: Começar (3 slots), Opções, Créditos, Privacidade e Licenças. */
export class MainMenuScene extends Phaser.Scene {
  private menu: Menu | null = null;
  private view: View = 'main';
  private slots: (SaveData | null)[] = [null, null, null];
  private slotIdx = 0;
  private panel!: Phaser.GameObjects.Graphics;
  private heading!: Phaser.GameObjects.Text;
  private notice!: Phaser.GameObjects.Text;
  private busy = false;

  constructor() {
    super('MainMenu');
  }

  create(): void {
    this.add.rectangle(960, 540, 1920, 1080, 0x2a1210);
    const g = this.add.graphics();
    for (let i = 0; i < 16; i++) {
      g.fillStyle(i % 2 ? 0x5e1b15 : 0x4f1611, 1);
      g.fillRect(i * 120, 0, 120, 1080);
    }
    this.add.text(960, 110, GAME_TITLE, titleStyle(96)).setOrigin(0.5);
    this.panel = this.add.graphics();
    drawPanel(this.panel, 460, 210, 1000, 760);
    this.heading = this.add.text(960, 270, '', style(40, CSS.ink)).setOrigin(0.5);
    this.notice = this.add.text(960, 1020, '', style(22, CSS.paper, { stroke: CSS.ink, strokeThickness: 4, align: 'center', wordWrap: { width: 1700 } })).setOrigin(0.5);
    if (GameState.mode === 'memory') this.notice.setText(t('storageMemory'));
    else this.notice.setText(t('storageWarn'));
    const song = SONGS.title;
    if (song && AudioService.sequencer.currentSong !== 'title') AudioService.playSong(song, 0);
    this.show('main');
    void GameState.listSlots().then((s) => (this.slots = s));
    Router.reveal(this);
  }

  private setMenu(items: MenuItem[], onBack: (() => void) | null, y = 380, hintY?: number): void {
    this.menu?.destroy();
    this.menu = new Menu(this, 960, y, items, { width: 820, rowH: 78, fontSize: 38, ...(hintY !== undefined ? { hintY } : {}) });
    this.menu.onBack = onBack;
  }

  private show(v: View): void {
    this.view = v;
    switch (v) {
      case 'main':
        this.heading.setText('');
        this.setMenu(
          [
            { kind: 'button', label: () => t('start'), onSelect: () => this.show('slots') },
            { kind: 'button', label: () => t('options'), onSelect: () => this.openOptions() },
            { kind: 'button', label: () => t('credits'), onSelect: () => Router.go(this, 'Credits', { fromMenu: true }, ['final']) },
            { kind: 'button', label: () => t('privacy'), onSelect: () => window.open('/privacidade.html', '_blank', 'noopener') },
          ],
          () => Router.go(this, 'Title'),
          420,
        );
        break;
      case 'slots':
        this.heading.setText(t('start'));
        this.setMenu(
          [0, 1, 2].map((i) => ({
            kind: 'button' as const,
            label: () => this.slotLabel(i),
            onSelect: () => {
              this.slotIdx = i;
              this.show('slot');
            },
          })),
          () => this.show('main'),
          400,
        );
        break;
      case 'slot': {
        const s = this.slots[this.slotIdx];
        this.heading.setText(t('slot', { n: this.slotIdx + 1 }));
        const items: MenuItem[] = [];
        if (s) {
          items.push({ kind: 'button', label: () => t('continue'), onSelect: () => void this.play(this.slotIdx) });
          items.push({ kind: 'button', label: () => t('exportSave'), onSelect: () => this.exportSlot(s) });
          items.push({ kind: 'button', label: () => t('deleteSlot'), onSelect: () => this.show('confirm1') });
        } else {
          items.push({ kind: 'button', label: () => t('newGame'), onSelect: () => this.show('difficulty') });
        }
        items.push({ kind: 'button', label: () => t('importSave'), onSelect: () => this.importSlot() });
        items.push({ kind: 'button', label: () => t('back'), onSelect: () => this.show('slots') });
        this.setMenu(items, () => this.show('slots'), 380);
        break;
      }
      case 'difficulty': {
        this.heading.setText(t('chooseDifficulty'));
        const mk = (d: DifficultyId): MenuItem => ({ kind: 'button', label: () => t(`diff_${d}` as never), onSelect: () => void this.newGame(d), hint: () => t(`diffDesc_${d}` as never) });
        this.setMenu([mk('simples'), mk('normal')], () => this.show('slot'), 420, 640);
        this.menu!.index = 1;
        this.menu!.refresh();
        break;
      }
      case 'confirm1':
      case 'confirm2':
        this.heading.setText(v === 'confirm1' ? t('deleteConfirm1') : t('deleteConfirm2'));
        this.setMenu(
          [
            { kind: 'button', label: () => t('no'), onSelect: () => this.show('slot') },
            { kind: 'button', label: () => t('yes'), onSelect: () => (v === 'confirm1' ? this.show('confirm2') : void this.deleteSlot()) },
          ],
          () => this.show('slot'),
          460,
        );
        break;
    }
  }

  private slotLabel(i: number): string {
    const s = this.slots[i];
    if (!s) return t('slotEmpty', { n: i + 1 });
    const pct = progressPercent(s, ALL_BOSSES.concat('maestro'), STAGES);
    return `${t('slot', { n: i + 1 })} · ${t(`diff_${s.difficulty}` as never)} · ${t('slotInfo', { pct, coins: s.coins, time: fmtTime(s.playTime) })}`;
  }

  private async newGame(d: DifficultyId): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    await GameState.newGame(this.slotIdx, d);
    void requestPersistence().then((ok) => ok && Logger.info('Menu', t('storagePersist')));
    AudioService.stopMusic(0.4);
    // novo save começa no tutorial
    Router.go(this, 'Battle', { kind: 'stage', id: 'tutorial', difficulty: d, coop: false, seed: Date.now() % 100000, from: 'map', loadout: GameState.save!.equip }, ['ilha1']);
  }

  private async play(i: number): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    const r = await GameState.loadSlot(i);
    if (!r.ok) {
      this.busy = false;
      this.notice.setText(t('importFail', { why: 'save corrompido e sem backup válido' }));
      return;
    }
    if (r.recovered) this.notice.setText('Save recuperado a partir do backup.');
    AudioService.stopMusic(0.4);
    if (!GameState.save!.stages.tutorial?.done) {
      Router.go(this, 'Battle', { kind: 'stage', id: 'tutorial', difficulty: GameState.save!.difficulty, coop: false, seed: 1, from: 'map', loadout: GameState.save!.equip }, ['ilha1']);
    } else Router.go(this, 'WorldMap', {}, ['map']);
  }

  private async deleteSlot(): Promise<void> {
    await GameState.store.remove(this.slotIdx);
    this.slots = await GameState.listSlots();
    this.show('slots');
  }

  private exportSlot(s: SaveData): void {
    const blob = new Blob([exportSaveText(s)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `faisca-e-pavio-espetaculo-${s.slot + 1}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  private importSlot(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.onchange = () => {
      const f = input.files?.[0];
      if (!f) return;
      if (f.size > 256 * 1024) {
        this.notice.setText(t('importFail', { why: 'arquivo grande demais' }));
        return;
      }
      void f.text().then(async (text) => {
        try {
          const s = importSaveText(text, this.slotIdx);
          await GameState.store.write(s);
          this.slots = await GameState.listSlots();
          this.notice.setText(t('importOk'));
          this.show('slot');
        } catch (e) {
          this.notice.setText(t('importFail', { why: e instanceof Error ? e.message : String(e) }));
        }
      });
    };
    input.click();
  }

  /** Para testes E2E: importação a partir de texto (mesma validação). */
  async importFromText(text: string, slot: number): Promise<boolean> {
    try {
      const s = importSaveText(text, slot);
      await GameState.store.write(s);
      this.slots = await GameState.listSlots();
      return true;
    } catch {
      return false;
    }
  }

  private openOptions(): void {
    if (this.menu) this.menu.enabled = false;
    this.scene.launch('Options', { returnTo: 'MainMenu' });
    this.scene.bringToTop('Options');
    this.scene.bringToTop('Iris');
    this.scene.pause();
  }

  onOptionsClosed(): void {
    if (this.menu) {
      this.menu.enabled = true;
      this.menu.refresh();
    }
  }

  override update(): void {
    InputService.poll();
    this.menu?.update();
    InputService.endTick();
    if (this.view === 'slots') this.menu?.refresh();
  }
}
