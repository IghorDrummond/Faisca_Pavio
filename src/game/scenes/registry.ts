import { BootScene } from './BootScene';
import { IrisScene } from './IrisScene';
import { LoadingScene } from './LoadingScene';
import { TitleScene } from './TitleScene';
import { MainMenuScene } from './MainMenuScene';
import { OptionsScene } from './OptionsScene';
import { WorldMapScene } from './WorldMapScene';
import { ShopScene } from './ShopScene';
import { EquipScene } from './EquipScene';
import { BattleScene } from './BattleScene';
import { HudScene } from './HudScene';
import { PauseScene } from './PauseScene';
import { DefeatScene } from './DefeatScene';
import { ResultScene } from './ResultScene';
import { CreditsScene } from './CreditsScene';

/** Todas as cenas de produção (a primeira é iniciada automaticamente). Cenas de debug são adicionadas dinamicamente. */
export const SCENES = [
  BootScene,
  IrisScene,
  LoadingScene,
  TitleScene,
  MainMenuScene,
  OptionsScene,
  WorldMapScene,
  ShopScene,
  EquipScene,
  BattleScene,
  HudScene,
  PauseScene,
  DefeatScene,
  ResultScene,
  CreditsScene,
];
