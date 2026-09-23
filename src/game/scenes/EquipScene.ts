import Phaser from 'phaser';
import type { CharmId, SuperId, WeaponId } from '../../core/types';
import type { SaveData } from '../../core/save';
import { t } from '../../i18n';
import { InputService } from '../../platform/input';
import { GameState } from '../../services/gameState';
import { CSS, drawPanel, style, titleStyle } from '../../ui/theme';
import { Menu } from '../../ui/Menu';

/** Equipamento: 2 armas, 1 super, 1 amuleto (só itens possuídos). */
export class EquipScene extends Phaser.Scene {
  private menu!: Menu;
  private returnTo = 'WorldMap';
  private icons: Phaser.GameObjects.Image[] = [];

  constructor() {
    super('Equip');
  }

  init(d: { returnTo: string }): void {
    this.returnTo = d.returnTo;
  }

  create(): void {
    this.add.rectangle(960, 540, 1920, 1080, 0x0d0906, 0.7);
    const g = this.add.graphics();
    drawPanel(g, 360, 120, 1200, 840);
    this.add.text(960, 190, t('equip'), titleStyle(64)).setOrigin(0.5);
    const s = () => GameState.save!;
    const set = (fn: (e: SaveData['equip']) => void): void => {
      GameState.update((sv) => {
        const equip = { ...sv.equip, weapons: [...sv.equip.weapons] as [WeaponId, WeaponId] };
        fn(equip);
        return { ...sv, equip };
      });
      this.drawIcons();
    };
    this.menu = new Menu(
      this,
      960,
      300,
      [
        {
          kind: 'choice',
          label: () => t('equipWeapon1'),
          options: () => s().owned.weapons.map((w) => ({ value: w, label: t(`w_${w}` as never) })),
          get: () => s().equip.weapons[0],
          set: (v) => set((e) => (e.weapons[0] = v as WeaponId)),
          hint: () => t(`wd_${s().equip.weapons[0]}` as never),
        },
        {
          kind: 'choice',
          label: () => t('equipWeapon2'),
          options: () => s().owned.weapons.map((w) => ({ value: w, label: t(`w_${w}` as never) })),
          get: () => s().equip.weapons[1],
          set: (v) => set((e) => (e.weapons[1] = v as WeaponId)),
          hint: () => t(`wd_${s().equip.weapons[1]}` as never),
        },
        {
          kind: 'choice',
          label: () => t('equipSuper'),
          options: () => (s().owned.supers.length ? s().owned.supers : (['chamaMestra'] as SuperId[])).map((x) => ({ value: x, label: t(`s_${x}` as never) })),
          get: () => s().equip.superId,
          set: (v) => set((e) => (e.superId = v as SuperId)),
          hint: () => t(`sd_${s().equip.superId}` as never),
        },
        {
          kind: 'choice',
          label: () => t('equipCharm'),
          options: () => [{ value: '', label: t('none') }, ...s().owned.charms.map((c) => ({ value: c, label: t(`c_${c}` as never) }))],
          get: () => s().equip.charm ?? '',
          set: (v) => set((e) => (e.charm = v ? (v as CharmId) : null)),
          hint: () => (s().equip.charm ? t(`cd_${s().equip.charm!}` as never) : ''),
        },
        { kind: 'button', label: () => t('back'), onSelect: () => this.close() },
      ],
      { width: 1000, rowH: 84, fontSize: 36, hintY: 760 },
    );
    this.menu.onBack = () => this.close();
    this.drawIcons();
  }

  private drawIcons(): void {
    for (const i of this.icons) i.destroy();
    this.icons = [];
    const e = GameState.save!.equip;
    const keys = [`icon_w_${e.weapons[0]}`, `icon_w_${e.weapons[1]}`, `icon_s_${e.superId}`, e.charm ? `icon_c_${e.charm}` : ''];
    keys.forEach((k, i) => {
      if (k && this.textures.get('ui').has(k)) this.icons.push(this.add.image(560 + i * 270, 870, 'ui', k).setScale(0.7));
    });
    this.add.text(960, 950, '', style(20, CSS.dim));
  }

  private close(): void {
    void GameState.persist();
    this.scene.stop();
    this.scene.resume(this.returnTo);
  }

  override update(): void {
    InputService.poll();
    this.menu.update();
    InputService.endTick();
  }
}
