# Decisões técnicas (1 linha cada)

Formato: **Decisão** — justificativa. As decisões estruturais também estão resumidas em `Skill/08_DECISIONS.md`.

## Ambiente inspecionado (2026-09-23)
- SO: Windows 11 Pro 10.0.26200, AMD64; GPU Intel Iris Xe; projeto em pasta sincronizada pelo OneDrive.
- Node.js 24.20.0, npm 11.19.0 (sem pnpm); Git 2.55; Python 3.12 (sem pip funcional pela rede corporativa).
- Sem ffmpeg; sharp 0.35 e @resvg/resvg-js 2.6 funcionam (binários pré-compilados do npm).
- Playwright 1.63 com Chromium, Firefox e WebKit instalados; há display, mas os testes rodam headless.
- WebGL headless: Chromium usa SwiftShader (software, ~3 FPS) por padrão; com `--enable-gpu --use-angle=d3d11 --ignore-gpu-blocklist` usa a Iris Xe real. Medições de FPS são registradas separadamente para os dois modos.
- Firefox do Playwright falha com "configuração lado a lado" quando executado de `%LOCALAPPDATA%\ms-playwright`; a mesma build copiada para `%LOCALAPPDATA%\faisca-pw-firefox-1543` funciona (configurado em `playwright.config.ts`).

## Stack
- **Phaser 4.2.1** (estável mais recente no npm) — filtros de câmera nativos (`camera.filters`) substituem os pipelines do v3; filtro de filme próprio via `BaseFilterShader` + `Filters.Controller` (API confirmada em `node_modules/phaser/types` e `docs/Phaser 4 Shader Guide`).
- **TypeScript 6.0** (não 7) — typescript-eslint 8.70 só suporta TS < 6.1.
- **Vite 8 (Rolldown)** — code splitting com `codeSplitting.groups` (Phaser em chunk próprio, cache longo).
- **Validação própria (`src/core/validate.ts`) em vez de zod** — zod 4 usa `new Function` (JIT), incompatível com CSP sem `unsafe-eval`.
- **tsx** como dev-dependency — scripts em `/tools` importam o núcleo TS com resolução estilo bundler (imports sem extensão), que o Node puro não resolve.
- **Sem enums/parameter properties** (`erasableSyntaxOnly`) — mantém o código executável por type-stripping.

## Arquitetura
- Núcleo (`src/core`) puro, sem Phaser/DOM (regra de ESLint impede) — determinismo e testes em Node.
- Loop fixo 60 Hz com acumulador limitado a 250 ms e interpolação por `alpha` no render.
- Input com acumulação de bordas (`InputFrame.feed/latch`) — nenhum toque se perde durante hit stop.
- Pools pré-alocados de projéteis/perigos/eventos no núcleo e de sprites na renderização.
- Perigos (`Hazard`) numa classe genérica com lógica por tipo; ataques são timelines de ações em dados.
- Estados proibidos do jogador bloqueados por tabela `ALLOWED`.
- Vitória prevalece sobre morte no mesmo tick: o dano ao chefe é processado antes do dano aos jogadores e o nocaute limpa projéteis e torna os jogadores invulneráveis.
- Parry prevalece sobre dano do mesmo objeto ciano (checado antes do dano no mesmo tick).
- Cair no fosso sempre custa 1 de vida (a Cartola de Sorte absorve), mesmo durante invencibilidade pós-dano; super-invencibilidade protege.

## Arte e áudio
- Arte 100% procedural em SVG (resvg 2x → sharp Lanczos 1x) com boil por semente; PNG com paleta indexada é o formato principal quando menor que WebP (arte chapada), com JSON alternativo em PNG puro.
- Chefes rasterizados a 80% e ampliados no jogo — orçamento de textura por ilha (~60 MB por chefe → ≤ 256 MB por ilha).
- Cenários grandes renderizados em meia resolução e esticados (fundos suaves, baixo contraste).
- Áudio do Phaser desativado (`noAudio`): o AudioService cria o AudioContext apenas dentro de um gesto do usuário — evita o aviso de autoplay do Chrome no console.
- Sem ffmpeg: SFX e amostras de instrumentos em WAV 22 kHz mono (suporte universal); músicas são sequenciadas em tempo real a partir de amostras (arquivo pequeno, camadas por fase sincronizadas e relógio musical via `audioContext.currentTime`). O loader aceita OGG/M4A caso trilhas de compositor sejam adicionadas.
- Gamepad não conta como "ativação de usuário" nos navegadores: com só controle, o título orienta a clicar/teclar para ativar o som.

## Testes e ambiente
- E2E rodam contra a build `e2e` (produção + ferramentas de debug) servida pelo mesmo servidor de preview com os cabeçalhos de `_headers`, validando CSP em todos os testes.
- Mensagens "GL Driver Message … GPU stall due to ReadPixels" do Chromium headless são diagnóstico do driver (o jogo não usa readPixels) e são filtradas nos testes.
