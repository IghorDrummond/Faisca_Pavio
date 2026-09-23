import Phaser from 'phaser';
import { setLang } from '../../i18n';
import { ErrorContext, setBootProgress, showFatal } from '../../platform/shell';
import { Params } from '../../platform/urlParams';
import { GameState } from '../../services/gameState';
import { Logger } from '../../services/logger';
import { SettingsService } from '../../services/settings';
import { AssetPackLoader } from '../assets';
import { bootDone } from '../GameApp';
import { Router } from '../router';
import { ensureFilmFilterNode } from '../fx/FilmFilter';

/** Boot: pacote core (personagens, efeitos, UI, sons) + serviços, depois título ou rota de debug. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    setBootProgress(0.45, 'Carregando o elenco…');
    AssetPackLoader.queue(this, 'core');
    this.load.on(Phaser.Loader.Events.PROGRESS, (v: number) => setBootProgress(0.45 + v * 0.5));
    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, (f: Phaser.Loader.File) => Logger.error('Boot', `falha ao carregar ${f.key}`));
  }

  create(): void {
    if (this.load.totalFailed > 0) {
      showFatal('Não foi possível baixar os arquivos do jogo. Verifique sua conexão e tente recarregar.', 'core pack load failed');
      return;
    }
    AssetPackLoader.finalize(this, 'core');
    ensureFilmFilterNode(this);
    setLang(Params.lang === 'en' ? 'en' : SettingsService.get('lang'));
    this.scene.launch('Iris');
    const iris = this.scene.get('Iris');
    void GameState.init().then((mode) => {
      ErrorContext.storage = mode;
      setBootProgress(1, 'Pronto!');
      bootDone();
      iris.events.once(Phaser.Scenes.Events.CREATE, () => undefined);
      this.route();
    });
  }

  private route(): void {
    if (__DEBUG__ && (Params.boss || Params.stage || Params.scene || Params.benchmark)) {
      void import('../debug/debugRoutes').then((m) => m.debugRoute(this));
      return;
    }
    Router.go(this, 'Title', {}, []);
  }
}
