# 01_PRODUCT_SCOPE.md

## Objetivo deste arquivo
Este arquivo define o escopo funcional e de negócio do projeto.

Ele deve ser usado como referência principal para entender:
- o que este sistema é
- qual problema ele resolve
- para quem ele existe
- o que ele deve fazer
- o que ele não deve fazer
- quais regras de negócio precisam ser respeitadas
- quais limites funcionais devem orientar qualquer implementação

Este arquivo existe para impedir que agentes de IA ou desenvolvedores:
- inventem funcionalidades
- expandam escopo sem alinhamento
- alterem regras de negócio por conveniência técnica
- implementem soluções desalinhadas com a proposta real do sistema

---

## Como este arquivo deve ser usado
Antes de criar, alterar, remover, refatorar ou corrigir qualquer funcionalidade, este arquivo deve ser lido.

Toda decisão funcional deve respeitar o escopo descrito aqui.

Se houver conflito entre o código atual e o que está descrito neste arquivo:
- não assumir automaticamente que o código está certo
- não assumir automaticamente que este arquivo está errado
- identificar o conflito
- registrar o ponto em `09_PENDING_ISSUES.md`
- registrar decisão em `08_DECISIONS.md`, se necessário

---

## Papel do agente
Aja como um analista de produto e engenheiro de software sênior.

Sua tarefa é interpretar corretamente o objetivo de negócio deste sistema e garantir que qualquer implementação siga o escopo definido, respeite as regras de negócio e preserve a coerência funcional do produto.

Você deve evitar:
- invenção de funcionalidades
- expansão indevida de escopo
- mudanças arbitrárias de comportamento
- simplificações que quebrem regras de negócio
- decisões baseadas apenas em preferência técnica

---

## Regras gerais obrigatórias

### 1. O sistema deve permanecer coerente com sua proposta principal
Não adicione funcionalidades que desviem o produto do seu objetivo central.

### 2. Regras de negócio têm prioridade
Se algo for tecnicamente mais simples, mas quebrar regra de negócio, não deve ser adotado.

### 3. Perfis e permissões devem ser respeitados
Não assuma acesso universal.
Cada perfil deve operar apenas dentro do que faz sentido para o sistema.

### 4. Não expanda escopo por impulso
Nem toda ideia boa deve virar funcionalidade.
Só implemente o que estiver alinhado com o objetivo real do projeto.

### 5. Preserve fluxos já validados
Se um fluxo atual funciona corretamente e atende ao negócio, ele não deve ser alterado sem necessidade real.

### 6. Não trate desejo futuro como requisito atual
Ideias futuras, melhorias desejáveis, backlog e possibilidades não devem ser tratados como escopo confirmado.

---

## Como avaliar qualquer solicitação funcional
Ao receber qualquer solicitação, valide:

1. Isso faz sentido dentro do objetivo do sistema?
2. Isso respeita as regras de negócio?
3. Isso respeita os perfis de usuário?
4. Isso está dentro do escopo atual?
5. Isso afeta algum fluxo principal?
6. Isso exige registro de decisão ou pendência?

Se houver dúvida real sobre escopo, implemente com cautela e registre o ponto.

---

## O que o agente nunca deve fazer
Nunca faça nenhum dos itens abaixo sem decisão formal registrada:

- inventar funcionalidades não definidas
- alterar regras de negócio por conveniência técnica
- assumir permissões não documentadas
- expandir escopo silenciosamente
- simplificar comportamentos que atendem necessidade real
- tratar suposição como requisito confirmado
- confundir backlog futuro com escopo atual

---

## Como interpretar o escopo específico do projeto
A seção final deste arquivo contém o contexto real e específico deste sistema.

O agente deve tratar essa seção final como fonte principal de verdade sobre:
- objetivo do produto
- problema que o sistema resolve
- perfis de usuário
- funcionalidades principais
- fluxos principais
- regras de negócio
- itens dentro do escopo
- itens fora do escopo
- restrições funcionais
- prioridades do produto

Se algum ponto não estiver explícito, o agente não deve inventar.

---

## Quando este arquivo deve ser atualizado
Atualize este arquivo somente quando houver mudança real no escopo funcional do produto, como por exemplo:
- nova funcionalidade principal oficialmente aceita
- remoção de funcionalidade principal
- mudança relevante em perfis de usuário
- nova regra de negócio obrigatória
- alteração clara do objetivo do sistema
- redefinição do que está dentro ou fora do escopo

Correções técnicas, histórico de implementação, bugs e decisões operacionais não devem ser registrados aqui.
Esses registros pertencem a:
- `07_CHANGELOG.md`
- `08_DECISIONS.md`
- `09_PENDING_ISSUES.md`

---

## Regra final
Se houver conflito entre:
- o que parece tecnicamente melhor
- o que é mais rápido de implementar
- o que é visualmente mais bonito
- o que está definido como objetivo e escopo do produto

priorize sempre o objetivo do produto, as regras de negócio e a coerência funcional do sistema.

---

# ESCOPO ESPECÍFICO DO PROJETO
Cole abaixo o escopo real deste projeto, de forma clara e organizada.

Sugestão de estrutura para colar:
- Nome do projeto
- Resumo em uma frase
- Tipo de sistema
- Visão geral do produto
- Problema que resolve
- Objetivo principal
- Objetivos secundários
- Perfis de usuário
- Funcionalidades principais
- Fluxos principais
- Regras de negócio
- Regras de permissão e visibilidade
- Itens dentro do escopo
- Itens fora do escopo
- Prioridades do produto
- Restrições funcionais
- Dependências de negócio
- Estado atual do projeto
- Observações importantes

---

[COLE AQUI O ESCOPO ESPECÍFICO DO PROJETO]