/** Logger com níveis, timestamp, origem e buffer circular anexado ao relatório de erro. */
export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
const ORDER: Record<LogLevel, number> = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };

export interface LogEntry {
  t: number;
  level: LogLevel;
  source: string;
  msg: string;
  ctx?: unknown;
}

const RING_SIZE = 200;

class LoggerImpl {
  private ring: LogEntry[] = [];
  private head = 0;
  minConsoleLevel: LogLevel = import.meta.env.PROD ? 'WARN' : 'DEBUG';

  log(level: LogLevel, source: string, msg: string, ctx?: unknown): void {
    const e: LogEntry = { t: Date.now(), level, source, msg, ctx };
    if (this.ring.length < RING_SIZE) this.ring.push(e);
    else {
      this.ring[this.head] = e;
      this.head = (this.head + 1) % RING_SIZE;
    }
    if (ORDER[level] >= ORDER[this.minConsoleLevel]) {
      const line = `[${new Date(e.t).toISOString()}] ${level} ${source}: ${msg}`;
      if (level === 'ERROR') console.error(line, ctx ?? '');
      else if (level === 'WARN') console.warn(line, ctx ?? '');
      else console.info(line, ctx ?? '');
    }
  }

  debug(source: string, msg: string, ctx?: unknown): void {
    this.log('DEBUG', source, msg, ctx);
  }
  info(source: string, msg: string, ctx?: unknown): void {
    this.log('INFO', source, msg, ctx);
  }
  warn(source: string, msg: string, ctx?: unknown): void {
    this.log('WARN', source, msg, ctx);
  }
  error(source: string, msg: string, ctx?: unknown): void {
    this.log('ERROR', source, msg, ctx);
  }

  recent(): LogEntry[] {
    if (this.ring.length < RING_SIZE) return [...this.ring];
    return [...this.ring.slice(this.head), ...this.ring.slice(0, this.head)];
  }
}

export const Logger = new LoggerImpl();
