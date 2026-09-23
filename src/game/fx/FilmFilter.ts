import Phaser from 'phaser';

/**
 * Pós-processamento de filme antigo (um único passe, mediump, sem loops):
 * granulado animado, arranhões verticais, poeira, vinheta, dessaturação com curva amarelada,
 * flicker, tremor de quadro, modo P&B e correção para daltonismo (matriz 3x3).
 */
const FRAG = `
#pragma phaserTemplate(shaderName)
precision mediump float;
uniform sampler2D uMainSampler;
uniform vec2 uResolution;
uniform float uTime;
uniform float uGrain;
uniform float uScratch;
uniform float uVignette;
uniform float uDesat;
uniform float uFlicker;
uniform vec2 uJitter;
uniform float uBW;
uniform float uSeed;
uniform mat3 uColor;
varying vec2 outTexCoord;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

void main() {
  vec2 uv = outTexCoord + uJitter / uResolution;
  vec4 src = texture2D(uMainSampler, uv);
  vec3 c = src.rgb;

  // correção de cor (daltonismo / identidade)
  c = clamp(uColor * c, 0.0, 1.0);

  // dessaturação com curva amarelada (sépia leve)
  float l = dot(c, vec3(0.299, 0.587, 0.114));
  vec3 sepia = vec3(l * 1.07, l * 0.98, l * 0.82);
  c = mix(c, mix(vec3(l), sepia, 0.75), uDesat);
  c = mix(c, vec3(l * 1.02, l, l * 0.94), uBW);

  // flicker global (quase imperceptível)
  c *= 1.0 + uFlicker;

  // granulado animado
  float g = hash(floor(outTexCoord * uResolution * 0.5) + vec2(uSeed * 17.0, uSeed * 31.0)) - 0.5;
  c += g * uGrain * 0.16;

  // arranhões verticais: 2 faixas finas que mudam de posição periodicamente
  float sx1 = fract(sin(floor(uTime * 3.0) * 12.9898 + 1.0) * 43758.5453);
  float sx2 = fract(sin(floor(uTime * 2.3) * 78.233 + 7.0) * 12345.678);
  float px = outTexCoord.x * uResolution.x;
  float line1 = 1.0 - smoothstep(0.0, 1.4, abs(px - sx1 * uResolution.x));
  float line2 = 1.0 - smoothstep(0.0, 1.0, abs(px - sx2 * uResolution.x));
  float vis1 = step(0.55, fract(sx1 * 7.31 + uTime * 0.2));
  float vis2 = step(0.7, fract(sx2 * 3.17));
  c = mix(c, c * 0.55, (line1 * vis1 + line2 * vis2 * 0.8) * uScratch);

  // poeira: pontinhos escuros raros
  float d = hash(floor(outTexCoord * uResolution / 6.0) + vec2(floor(uTime * 12.0)));
  c *= 1.0 - step(0.9993, d) * uScratch * 0.8;

  // vinheta suave
  vec2 q = outTexCoord - 0.5;
  float v = smoothstep(0.85, 0.25, length(q * vec2(1.0, 1.15)));
  c *= mix(1.0, v, uVignette);

  gl_FragColor = vec4(c, src.a);
}
`;

export class FilmFilterNode extends Phaser.Renderer.WebGL.RenderNodes.BaseFilterShader {
  constructor(manager: Phaser.Renderer.WebGL.RenderNodes.RenderNodeManager) {
    super('FilmFilter', manager, undefined, FRAG);
  }

  override setupUniforms(controller: Phaser.Filters.Controller, drawingContext: Phaser.Renderer.WebGL.DrawingContext): void {
    const c = controller as FilmFilter;
    const pm = this.programManager;
    pm.setUniform('uResolution', [drawingContext.width, drawingContext.height]);
    pm.setUniform('uTime', c.time);
    pm.setUniform('uGrain', c.grain);
    pm.setUniform('uScratch', c.scratches);
    pm.setUniform('uVignette', c.vignette);
    pm.setUniform('uDesat', c.desaturate);
    pm.setUniform('uFlicker', c.flickerValue);
    pm.setUniform('uJitter', [c.jitterX, c.jitterY]);
    pm.setUniform('uBW', c.blackWhite ? 1 : 0);
    pm.setUniform('uSeed', c.seed);
    pm.setUniform('uColor', c.colorMatrix);
  }
}

/** Matrizes de correção (daltonização simplificada, espaço RGB linear aproximado). Coluna-maior para GLSL. */
export const COLOR_MATRICES: Record<'none' | 'protan' | 'deutan' | 'tritan', number[]> = {
  none: [1, 0, 0, 0, 1, 0, 0, 0, 1],
  // realça contraste vermelho/verde deslocando informação para o azul/luminância
  protan: [0.8, 0.26, 0.2, 0.2, 0.74, 0.1, 0.0, 0.0, 0.7],
  deutan: [0.75, 0.3, 0.25, 0.25, 0.7, 0.05, 0.0, 0.0, 0.7],
  tritan: [0.95, 0.0, 0.05, 0.05, 0.8, 0.3, 0.0, 0.2, 0.65],
};

export class FilmFilter extends Phaser.Filters.Controller {
  time = 0;
  grain = 0.5;
  scratches = 0.5;
  vignette = 0.6;
  desaturate = 0.35;
  flicker = true;
  flickerValue = 0;
  jitter = true;
  jitterX = 0;
  jitterY = 0;
  blackWhite = false;
  seed = 0;
  colorMatrix: number[] = COLOR_MATRICES.none;
  private frameCounter = 0;

  constructor(camera: Phaser.Cameras.Scene2D.Camera) {
    super(camera, 'FilmFilter');
  }

  /** Avança a animação do filme. Chamado uma vez por quadro de render. */
  tick(dtMs: number): void {
    this.time += dtMs / 1000;
    this.frameCounter++;
    // o granulado muda a 24 fps, como película
    if (this.frameCounter % 2 === 0) this.seed = (this.seed + 0.6180339) % 1;
    this.flickerValue = this.flicker ? (Math.sin(this.time * 37) * 0.5 + Math.sin(this.time * 13.7) * 0.5) * 0.012 : 0;
    if (this.jitter && this.frameCounter % 5 === 0) {
      this.jitterY = Math.random() < 0.25 ? (Math.random() < 0.5 ? -1.5 : 1.5) : 0;
      this.jitterX = 0;
    } else if (!this.jitter) {
      this.jitterX = this.jitterY = 0;
    }
  }
}

export function ensureFilmFilterNode(scene: Phaser.Scene): boolean {
  const r = scene.renderer as Phaser.Renderer.WebGL.WebGLRenderer;
  if (!r || !('renderNodes' in r)) return false;
  if (!r.renderNodes.hasNode('FilmFilter')) {
    r.renderNodes.addNodeConstructor('FilmFilter', FilmFilterNode);
  }
  return true;
}
