import Phaser from 'phaser';
import { setLang, t } from '../../i18n';
import { InputService, PAD_LABELS, keyLabel } from '../../platform/input';
import { isFullscreen, toggleFullscreen } from '../../platform/lifecycle';
import { AudioService } from '../../services/audio';
import { GameState } from '../../services/gameState';
import { type Action, ACTIONS, type KeyProfile, type PadBindings, SettingsService, type Settings } from '../../services/settings';
import { CSS, drawPanel, style, titleStyle } from '../../ui/theme';
import { Menu, type MenuItem } from '../../ui/Menu';
import { downloadAllForOffline } from '../../platform/pwa';

type Page = 'root' | 'video' | 'audio' | 'controls' | 'access' | 'lang' | 'privacy' | 'keys' | 'pad';

const pct = (v: number): string => `${Math.round(v * 100)}%`;

function toggle<K extends keyof Settings>(label: () => string, key: K, hint?: () => string): MenuItem {
  return { kind: 'toggle', label, get: () => SettingsService.get(key) as boolean, set: (v) => SettingsService.set(key, v as Settings[K]), ...(hint ? { hint } : {}) };
}

function slider<K extends keyof Settings>(label: () => string, key: K, min = 0, max = 1, step = 0.1, format = pct): MenuItem {
  return { kind: 'slider', label, get: () => SettingsService.get(key) as number, set: (v) => SettingsService.set(key, v as Settings[K]), min, max, step, format };
}

/** Configurações: aplicação imediata e persistência local. Reutilizada no menu e na pausa. */
export class OptionsScene extends Phaser.Scene {
  private menu: Menu | null = null;
  private page: Page = 'root';
  private returnTo = 'MainMenu';
  private heading!: Phaser.GameObjects.Text;
  private message!: Phaser.GameObjects.Text;
  private profile: KeyProfile = 'solo';
  private padPlayer = 0;
  private capturingPad: { action: keyof PadBindings } | null = null;
  private capturing = false;

  constructor() {
    super('Options');
  }

  init(d: { returnTo: string }): void {
    this.returnTo = d.returnTo;
    this.page = 'root';
    this.capturing = false;
    this.capturingPad = null;
  }

  create(): void {
    this.add.rectangle(960, 540, 1920, 1080, 0x0d0906, 0.75);
    const g = this.add.graphics();
    drawPanel(g, 310, 60, 1300, 960);
    this.add.text(960, 120, t('options'), titleStyle(64)).setOrigin(0.5);
    this.heading = this.add.text(960, 190, '', style(34)).setOrigin(0.5);
    this.message = this.add.text(960, 985, '', style(24, CSS.accent, { align: 'center', wordWrap: { width: 1200 } })).setOrigin(0.5);
    this.show('root');
  }

  private close(): void {
    this.scene.stop();
    const back = this.scene.get(this.returnTo) as Phaser.Scene & { onOptionsClosed?: () => void };
    this.scene.resume(this.returnTo);
    back.onOptionsClosed?.();
  }

  private setMenu(items: MenuItem[], back: () => void): void {
    this.menu?.destroy();
    this.menu = new Menu(this, 960, 260, items, { width: 1150, rowH: 60, fontSize: 30, maxVisible: 11, hintY: 930 });
    this.menu.onBack = back;
  }

  private show(p: Page): void {
    this.page = p;
    this.message.setText('');
    const root = (): void => this.show('root');
    switch (p) {
      case 'root':
        this.heading.setText('');
        this.setMenu(
          [
            { kind: 'button', label: () => t('optVideo'), onSelect: () => this.show('video') },
            { kind: 'button', label: () => t('optAudio'), onSelect: () => this.show('audio') },
            { kind: 'button', label: () => t('optControls'), onSelect: () => this.show('controls') },
            { kind: 'button', label: () => t('optAccess'), onSelect: () => this.show('access') },
            { kind: 'button', label: () => t('optLang'), onSelect: () => this.show('lang') },
            { kind: 'button', label: () => t('optPrivacy'), onSelect: () => this.show('privacy') },
            { kind: 'button', label: () => t('back'), onSelect: () => this.close() },
          ],
          () => this.close(),
        );
        break;
      case 'video':
        this.heading.setText(t('optVideo'));
        this.setMenu(
          [
            { kind: 'toggle', label: () => t('fullscreen'), get: () => isFullscreen(), set: () => void toggleFullscreen() },
            slider(() => t('renderScale'), 'renderScale', 0.5, 1, 0.05),
            { kind: 'choice', label: () => t('dprCap'), options: () => [1, 1.5, 2].map((v) => ({ value: v, label: `${v}x` })), get: () => SettingsService.get('dprCap'), set: (v) => SettingsService.set('dprCap', Number(v)) },
            {
              kind: 'choice',
              label: () => t('postQuality'),
              options: () => (['low', 'medium', 'high'] as const).map((v) => ({ value: v, label: t(`q_${v}`) })),
              get: () => SettingsService.get('postQuality'),
              set: (v) => SettingsService.set('postQuality', v as Settings['postQuality']),
            },
            slider(() => t('grain'), 'grain'),
            slider(() => t('scratches'), 'scratches'),
            slider(() => t('vignette'), 'vignette'),
            slider(() => t('desaturate'), 'desaturate'),
            toggle(() => t('frameJitter'), 'frameJitter'),
            toggle(() => t('flicker'), 'flicker'),
            toggle(() => t('blackWhite'), 'blackWhite'),
            toggle(() => t('showFps'), 'showFps'),
            { kind: 'button', label: () => t('back'), onSelect: root },
          ],
          root,
        );
        break;
      case 'audio':
        this.heading.setText(t('optAudio'));
        this.setMenu(
          [
            slider(() => t('master'), 'master'),
            slider(() => t('music'), 'music'),
            slider(() => t('sfx'), 'sfx'),
            slider(() => t('voice'), 'voice'),
            slider(() => t('ambient'), 'ambient'),
            toggle(() => t('vinyl'), 'vinyl'),
            { kind: 'button', label: () => t('back'), onSelect: root },
          ],
          root,
        );
        break;
      case 'controls':
        this.heading.setText(t('optControls'));
        this.setMenu(
          [
            { kind: 'button', label: () => `${t('remapKeys')}: ${t(`profile_${this.profile}`)}`, onSelect: () => this.show('keys') },
            {
              kind: 'choice',
              label: () => 'Perfil de teclado para remapear',
              options: () => (['solo', 'split1', 'split2'] as KeyProfile[]).map((v) => ({ value: v, label: t(`profile_${v}`) })),
              get: () => this.profile,
              set: (v) => (this.profile = v as KeyProfile),
            },
            { kind: 'button', label: () => `${t('remapPad')} (P${this.padPlayer + 1})`, onSelect: () => this.show('pad') },
            { kind: 'choice', label: () => 'Jogador do controle a remapear', options: () => [0, 1].map((v) => ({ value: v, label: t('player', { n: v + 1 }) })), get: () => this.padPlayer, set: (v) => (this.padPlayer = Number(v)) },
            ...[0, 1].map(
              (pi): MenuItem => ({
                kind: 'choice',
                label: () => t('assignPad', { n: pi + 1, pad: '' }).replace(/: $/, ''),
                options: () => [{ value: -1, label: t('noPad') }, ...InputService.connectedPads().map((p) => ({ value: p.index, label: `#${p.index + 1} ${p.id.slice(0, 22)}` }))],
                get: () => InputService.slots[pi]?.pad ?? -1,
                set: (v) => InputService.assignPad(pi, Number(v)),
              }),
            ),
            slider(() => t('deadzone'), 'deadzone', 0.05, 0.8, 0.05),
            toggle(() => t('rumble'), 'rumble'),
            toggle(() => t('autoFire', { n: 1 }), 'autoFire1'),
            toggle(() => t('autoFire', { n: 2 }), 'autoFire2'),
            toggle(() => t('toggleLock'), 'toggleLock'),
            toggle(() => t('toggleCrouch'), 'toggleCrouch'),
            { kind: 'button', label: () => t('restoreDefaults'), onSelect: () => SettingsService.resetKeys() },
            { kind: 'button', label: () => t('back'), onSelect: root },
          ],
          root,
        );
        if (InputService.connectedPads().length === 0) this.message.setText(t('pressPad'));
        break;
      case 'keys': {
        const prof = this.profile;
        this.heading.setText(`${t('remapKeys')} — ${t(`profile_${prof}`)}`);
        const items: MenuItem[] = ACTIONS.map((a) => ({
          kind: 'button' as const,
          label: () => `${t(`act_${a}` as never)}: ${SettingsService.get('keys')[prof][a].map(keyLabel).join(' / ')}`,
          onSelect: () => this.captureKey(prof, a),
        }));
        items.push({ kind: 'button', label: () => t('back'), onSelect: () => this.show('controls') });
        this.setMenu(items, () => this.show('controls'));
        break;
      }
      case 'pad': {
        const pl = this.padPlayer;
        this.heading.setText(`${t('remapPad')} — ${t('player', { n: pl + 1 })}`);
        const acts = ['jump', 'shoot', 'dash', 'lock', 'ex', 'swap', 'pause'] as (keyof PadBindings)[];
        const items: MenuItem[] = acts.map((a) => ({
          kind: 'button' as const,
          label: () => `${t(`act_${a}` as never)}: ${(SettingsService.get('pad')[pl]?.[a] ?? []).map((b) => PAD_LABELS[b] ?? `B${b}`).join(' / ')}`,
          onSelect: () => {
            this.capturingPad = { action: a };
            this.message.setText(t('pressButtonFor', { action: t(`act_${a}` as never) }));
          },
        }));
        items.push({ kind: 'button', label: () => t('back'), onSelect: () => this.show('controls') });
        this.setMenu(items, () => this.show('controls'));
        break;
      }
      case 'access':
        this.heading.setText(t('optAccess'));
        this.setMenu(
          [
            slider(() => t('shake'), 'shake'),
            toggle(() => t('reduceFlashes'), 'reduceFlashes'),
            toggle(() => t('projOutline'), 'projOutline'),
            {
              kind: 'choice',
              label: () => t('colorblind'),
              options: () => (['none', 'protan', 'deutan', 'tritan'] as const).map((v) => ({ value: v, label: t(`cb_${v}`) })),
              get: () => SettingsService.get('colorblind'),
              set: (v) => SettingsService.set('colorblind', v as Settings['colorblind']),
            },
            toggle(() => t('parryStar'), 'parryStar'),
            toggle(() => t('bossHpBar'), 'bossHpBar'),
            toggle(() => t('subtitles'), 'subtitles'),
            slider(() => t('textScale'), 'textScale', 0.75, 1.5, 0.05),
            slider(() => t('hudScale'), 'hudScale', 0.75, 1.25, 0.05),
            { kind: 'choice', label: () => t('gameSpeed'), options: () => [0.7, 0.85, 1].map((v) => ({ value: v, label: pct(v) })), get: () => SettingsService.get('gameSpeed'), set: (v) => SettingsService.set('gameSpeed', Number(v)) },
            toggle(() => t('fastTransitions'), 'fastTransitions'),
            { kind: 'button', label: () => t('back'), onSelect: root },
          ],
          root,
        );
        break;
      case 'lang':
        this.heading.setText(t('optLang'));
        this.setMenu(
          [
            {
              kind: 'choice',
              label: () => t('optLang'),
              options: () => [
                { value: 'pt-BR', label: t('lang_pt') },
                { value: 'en', label: t('lang_en') },
              ],
              get: () => SettingsService.get('lang'),
              set: (v) => {
                SettingsService.set('lang', v as Settings['lang']);
                setLang(v as Settings['lang']);
              },
            },
            { kind: 'button', label: () => t('back'), onSelect: root },
          ],
          root,
        );
        break;
      case 'privacy':
        this.heading.setText(t('optPrivacy'));
        this.setMenu(
          [
            toggle(() => t('telemetryOptIn'), 'telemetryOptIn', () => t('telemetryInfo')),
            toggle(() => t('onlineOptIn'), 'onlineOptIn', () => 'Envia apenas tempo e nota por chefe, com identificador aleatório. Desligado por padrão.'),
            {
              kind: 'button',
              label: () => t('deleteTelemetry'),
              onSelect: () => void GameState.store.clearTelemetry().then(() => this.message.setText('Telemetria local apagada.')),
            },
            {
              kind: 'button',
              label: () => t('downloadAll'),
              onSelect: () =>
                void downloadAllForOffline((f) => this.message.setText(t('downloadProgress', { pct: Math.round(f * 100) }))).then((ok) =>
                  this.message.setText(ok ? t('downloadDone') : 'Não foi possível baixar agora (offline ou sem service worker).'),
                ),
            },
            { kind: 'button', label: () => `${t('privacy')} ↗`, onSelect: () => window.open('/privacidade.html', '_blank', 'noopener') },
            { kind: 'button', label: () => t('back'), onSelect: root },
          ],
          root,
        );
        break;
    }
  }

  private captureKey(prof: KeyProfile, action: Action): void {
    this.capturing = true;
    this.message.setText(t('pressKeyFor', { action: t(`act_${action}` as never) }));
    InputService.captureCallback = (code) => {
      this.capturing = false;
      if (code === 'Escape') {
        this.message.setText('');
        return;
      }
      if (InputService.isReserved(code)) {
        this.message.setText(t('keyReserved'));
        AudioService.play('ui_denied', { bus: 'voice' });
        return;
      }
      const keys = structuredClone(SettingsService.get('keys'));
      const map = keys[prof];
      const old = map[action][0];
      // conflito: tecla já usada por outra ação do mesmo perfil → troca
      let conflict: Action | null = null;
      for (const other of ACTIONS) {
        if (other === action) continue;
        if (map[other].includes(code)) {
          conflict = other;
          map[other] = map[other].filter((c) => c !== code);
          if (map[other].length === 0 && old) map[other] = [old];
        }
      }
      map[action] = [code, ...map[action].filter((c) => c !== code)].slice(0, 2);
      SettingsService.set('keys', keys);
      this.message.setText(conflict ? t('keyConflict', { action: t(`act_${conflict}` as never) }) : '');
      AudioService.play('ui_confirm', { bus: 'voice' });
      this.menu?.refresh();
    };
  }

  override update(): void {
    if (this.capturing) return; // aguardando tecla (capturada no keydown)
    InputService.poll();
    if (this.capturingPad) {
      const pads = navigator.getGamepads ? Array.from(navigator.getGamepads()) : [];
      const slot = InputService.slots[this.padPlayer];
      const gp = pads.find((p) => p && (slot && slot.pad >= 0 ? p.index === slot.pad : true));
      if (gp) {
        const idx = gp.buttons.findIndex((b) => b.pressed);
        if (idx >= 0 && idx !== 9) {
          const pad = structuredClone(SettingsService.get('pad'));
          const binds = pad[this.padPlayer as 0 | 1];
          const a = this.capturingPad.action;
          for (const k of Object.keys(binds) as (keyof PadBindings)[]) if (k !== a) binds[k] = binds[k].filter((b) => b !== idx);
          binds[a] = [idx];
          SettingsService.set('pad', pad);
          this.capturingPad = null;
          this.message.setText('');
          this.menu?.refresh();
        }
      }
      InputService.endTick();
      return;
    }
    this.menu?.update();
    InputService.endTick();
  }
}
