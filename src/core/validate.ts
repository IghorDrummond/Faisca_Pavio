/**
 * Validadores de schema mínimos e sem dependências (sem eval/new Function → compatível com CSP estrita).
 * Cada validador retorna o valor tipado ou lança ValidationError com o caminho do campo.
 */
export class ValidationError extends Error {
  readonly path: string;
  constructor(path: string, msg: string) {
    super(`${path}: ${msg}`);
    this.path = path;
  }
}

export type Validator<T> = (v: unknown, path: string) => T;

export const V = {
  number(opts: { min?: number; max?: number; int?: boolean } = {}): Validator<number> {
    return (v, path) => {
      if (typeof v !== 'number' || !Number.isFinite(v)) throw new ValidationError(path, 'número esperado');
      if (opts.int && !Number.isInteger(v)) throw new ValidationError(path, 'inteiro esperado');
      if (opts.min !== undefined && v < opts.min) throw new ValidationError(path, `mínimo ${opts.min}`);
      if (opts.max !== undefined && v > opts.max) throw new ValidationError(path, `máximo ${opts.max}`);
      return v;
    };
  },
  string(opts: { max?: number } = {}): Validator<string> {
    return (v, path) => {
      if (typeof v !== 'string') throw new ValidationError(path, 'texto esperado');
      if (opts.max !== undefined && v.length > opts.max) throw new ValidationError(path, `texto longo demais`);
      return v;
    };
  },
  boolean(): Validator<boolean> {
    return (v, path) => {
      if (typeof v !== 'boolean') throw new ValidationError(path, 'booleano esperado');
      return v;
    };
  },
  literal<T extends string>(...values: T[]): Validator<T> {
    return (v, path) => {
      if (typeof v !== 'string' || !values.includes(v as T)) throw new ValidationError(path, `valor inválido`);
      return v as T;
    };
  },
  nullable<T>(inner: Validator<T>): Validator<T | null> {
    return (v, path) => (v === null ? null : inner(v, path));
  },
  optional<T>(inner: Validator<T>, fallback: T): Validator<T> {
    return (v, path) => (v === undefined ? fallback : inner(v, path));
  },
  array<T>(inner: Validator<T>, opts: { max?: number } = {}): Validator<T[]> {
    return (v, path) => {
      if (!Array.isArray(v)) throw new ValidationError(path, 'lista esperada');
      if (opts.max !== undefined && v.length > opts.max) throw new ValidationError(path, 'lista longa demais');
      return v.map((x, i) => inner(x, `${path}[${i}]`));
    };
  },
  record<T>(keys: Validator<string>, inner: Validator<T>, opts: { max?: number } = {}): Validator<Record<string, T>> {
    return (v, path) => {
      if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new ValidationError(path, 'objeto esperado');
      const entries = Object.entries(v as Record<string, unknown>);
      if (opts.max !== undefined && entries.length > opts.max) throw new ValidationError(path, 'objeto grande demais');
      const out: Record<string, T> = Object.create(null) as Record<string, T>;
      for (const [k, x] of entries) {
        if (k === '__proto__' || k === 'constructor' || k === 'prototype') throw new ValidationError(path, 'chave proibida');
        out[keys(k, `${path}.${k}`)] = inner(x, `${path}.${k}`);
      }
      return out;
    };
  },
  object<S extends Record<string, Validator<unknown>>>(shape: S): Validator<{ [K in keyof S]: ReturnType<S[K]> }> {
    return (v, path) => {
      if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new ValidationError(path, 'objeto esperado');
      const src = v as Record<string, unknown>;
      const out: Record<string, unknown> = {};
      for (const k of Object.keys(shape)) {
        out[k] = shape[k]!(src[k], `${path}.${k}`);
      }
      return out as { [K in keyof S]: ReturnType<S[K]> };
    };
  },
};
