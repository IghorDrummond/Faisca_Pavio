import type { SimEvent } from '../core/events';
import { AudioService } from '../services/audio';

const SHOOT_SFX: Record<string, string> = {
  reta: 'shoot_reta',
  leque: 'shoot_leque',
  teleguiada: 'shoot_teleguiada',
  rojao: 'shoot_rojao',
  plane: 'shoot_plane',
  bomb: 'bomb_drop',
};

let lastShot = 0;
let lastHit = 0;

/** Converte eventos da simulação em sons (prioridade 3 = dano e avisos, nunca cortados). */
export function playEventSound(e: SimEvent, now: number): void {
  const pan = e.x ? (e.x - 960) / 1400 : 0;
  switch (e.type) {
    case 'shoot': {
      if (now - lastShot < 0.05) return;
      lastShot = now;
      const k = e.str === 'rojao' && e.b === 0 ? 'shoot_weak' : (SHOOT_SFX[e.str] ?? 'shoot_reta');
      AudioService.play(k, { volume: e.str === 'rojao' ? 0.9 : 0.35, pan, priority: 0 });
      break;
    }
    case 'hitBoss':
      if (now - lastHit < 0.06) return;
      lastHit = now;
      AudioService.play('hit', { volume: 0.4, pan, priority: 0 });
      break;
    case 'explosion':
      AudioService.play('explosion', { volume: 0.7, pan, priority: 1 });
      break;
    case 'playerHurt':
      AudioService.play('hurt', { volume: 0.9, priority: 3 });
      break;
    case 'playerDie':
      AudioService.play('death', { volume: 0.9, priority: 3 });
      break;
    case 'playerRevive':
      AudioService.play('revive', { priority: 3 });
      break;
    case 'parry':
      AudioService.play('parry', { volume: 1, priority: 3, pitchVar: 0.02 });
      break;
    case 'parryFail':
      AudioService.play('parry_whiff', { volume: 0.35, priority: 0 });
      break;
    case 'jump':
      AudioService.play('jump', { volume: 0.35, priority: 0 });
      break;
    case 'land':
      AudioService.play('land', { volume: 0.3, priority: 0 });
      break;
    case 'dash':
      AudioService.play('dash', { volume: 0.5, priority: 1 });
      break;
    case 'ex':
      AudioService.play('ex', { volume: 0.8, priority: 2 });
      break;
    case 'super':
      AudioService.play('super_start', { volume: 0.9, priority: 3 });
      if (e.str === 'chamaMestra') AudioService.play('beam', { volume: 0.6, priority: 2, pitchVar: 0 });
      break;
    case 'meterCard':
      AudioService.play('meter_card', { volume: 0.5, priority: 1 });
      break;
    case 'swapWeapon':
      AudioService.play('swap', { volume: 0.5, priority: 0 });
      break;
    case 'bossPhase':
      AudioService.play('phase', { volume: 0.8, priority: 3 });
      break;
    case 'bossKnockout':
      AudioService.play('knockout_bell', { volume: 1, priority: 3, pitchVar: 0 });
      break;
    case 'warn':
      AudioService.play(e.str || 'warn', { volume: 0.7, priority: 3, pitchVar: 0.02 });
      break;
    case 'sound':
      AudioService.play(e.str, { volume: 0.6, pan, priority: 1 });
      break;
    case 'projDie':
      if (e.b === 2) return; // parry já tocou
      break;
    case 'enemyDie':
      AudioService.play('enemy_die', { volume: 0.6, pan, priority: 1 });
      break;
    case 'coin':
      AudioService.play('coin', { volume: 0.8, priority: 2 });
      break;
    case 'fell':
      AudioService.play('death', { volume: 0.5, priority: 3, rate: 1.4 });
      break;
    case 'luckyBlock':
      AudioService.play('lucky', { volume: 0.8, priority: 3 });
      break;
    case 'music':
      if (e.str === 'skip') AudioService.play('record_skip', { volume: 0.8, priority: 3, pitchVar: 0 });
      break;
    default:
      break;
  }
}
