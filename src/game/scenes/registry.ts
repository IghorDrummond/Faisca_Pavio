import { BootScene } from './BootScene';
import { IrisScene } from './IrisScene';
import { LoadingScene } from './LoadingScene';
import { TitleScene } from './TitleScene';
import { BattleScene } from './BattleScene';
import { HudScene } from './HudScene';
import { PauseScene } from './PauseScene';
import { DefeatScene } from './DefeatScene';
import { ResultScene } from './ResultScene';

/** Todas as cenas (a primeira é iniciada automaticamente). */
export const SCENES = [BootScene, IrisScene, LoadingScene, TitleScene, BattleScene, HudScene, PauseScene, DefeatScene, ResultScene];
