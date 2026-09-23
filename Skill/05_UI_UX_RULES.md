# 05_UI_UX_RULES.md

## Objetivo deste arquivo
Este arquivo define as regras de interface, experiência do usuário e qualidade visual do projeto.

Ele deve ser usado como referência principal para garantir que qualquer tela, componente, fluxo ou interação:
- seja clara e fácil de usar
- tenha boa aparência visual
- mantenha consistência com o restante do sistema
- seja responsiva
- preserve boa usabilidade em diferentes tamanhos de tela
- reduza fricção, confusão e esforço desnecessário do usuário

Este arquivo existe para impedir que agentes de IA ou desenvolvedores:
- criem interfaces confusas, feias ou desorganizadas
- façam telas visualmente quebradas ou pouco responsivas
- alterem o visual sem necessidade
- priorizem implementação técnica e esqueçam a experiência real de uso
- construam fluxos difíceis, cansativos ou pouco intuitivos
- entreguem sistemas que funcionam, mas são ruins de usar

---

## Como este arquivo deve ser usado
Antes de criar, alterar, remover ou refatorar qualquer tela, componente visual, fluxo de navegação, formulário, tabela, dashboard, modal, filtro, listagem, menu ou interação do sistema, este arquivo deve ser lido.

Toda decisão visual e de experiência deve respeitar os princípios descritos aqui.

Se houver conflito entre o código atual e as regras deste arquivo:
- não assumir automaticamente que a interface atual está correta
- não mudar o visual por impulso
- avaliar impacto em usabilidade, consistência e responsividade
- registrar pendência em `09_PENDING_ISSUES.md`, se necessário
- registrar decisão em `08_DECISIONS.md`, se necessário

---

## Papel do agente
Aja como um especialista sênior em UI e UX, com foco em produto digital real, clareza visual, usabilidade, consistência, acessibilidade prática e responsividade.

Sua tarefa é garantir que o sistema seja:
- bonito
- moderno
- limpo
- claro
- intuitivo
- agradável de usar
- consistente
- responsivo
- funcional para usuários reais

Você deve evitar:
- interfaces poluídas
- excesso de informação sem hierarquia
- botões e ações confusas
- fluxos cansativos
- desalinhamento visual
- telas quebradas em resoluções diferentes
- mudanças visuais desnecessárias
- experiências que priorizam estética e sacrificam usabilidade

---

## Regras gerais obrigatórias

### 1. A experiência do usuário é prioridade
Toda interface deve ser pensada para ser fácil de entender e fácil de usar.

O usuário deve conseguir:
- identificar rapidamente o que está vendo
- entender o que pode fazer
- localizar ações importantes
- receber feedback claro do sistema
- concluir tarefas com o menor atrito possível

---

### 2. O sistema deve ser visualmente bonito e bem construído
A interface deve transmitir sensação de qualidade, organização e profissionalismo.

Priorizar:
- boa hierarquia visual
- bom espaçamento
- alinhamento consistente
- proporção adequada
- uso visual equilibrado
- clareza na composição
- aparência moderna e limpa

Não criar interfaces com aparência improvisada, apertada, desorganizada ou visualmente cansativa.

---

### 3. Responsividade é obrigatória
Toda tela e componente deve ser pensado para funcionar bem em diferentes resoluções e tamanhos de tela.

A interface deve permanecer utilizável, organizada e clara em contextos como:
- desktop
- notebook
- tablet
- mobile
- telas grandes
- resoluções intermediárias
- contextos específicos do projeto, quando aplicável

Responsividade não é apenas “não quebrar layout”.
Também inclui preservar:
- legibilidade
- hierarquia visual
- navegabilidade
- usabilidade
- tamanho adequado de áreas clicáveis
- distribuição correta de conteúdo

---

### 4. Clareza acima de excesso visual
A interface deve ser bonita sem ser confusa.

Evitar:
- excesso de elementos decorativos
- blocos visuais sem função
- informações demais competindo entre si
- excesso de cores sem critério
- muitos destaques visuais ao mesmo tempo
- layouts que chamam atenção para tudo e não priorizam nada

---

### 5. Hierarquia visual deve ser evidente
O usuário deve perceber com facilidade:
- o que é mais importante
- o que é secundário
- onde começa a leitura
- quais ações têm prioridade
- quais dados são críticos
- quais elementos são apenas apoio

Títulos, subtítulos, blocos, botões, tabelas, filtros, alertas e conteúdos devem seguir uma hierarquia coerente.

---

### 6. Fluxos devem ser simples e intuitivos
O sistema deve reduzir esforço mental.

Evitar:
- etapas desnecessárias
- cliques demais
- ações escondidas sem motivo
- nomenclaturas confusas
- formulários excessivamente cansativos
- navegação pouco previsível
- comportamento inconsistente entre telas

Sempre que possível:
- simplificar sem perder a regra de negócio
- agrupar o que faz sentido junto
- destacar a ação principal
- reduzir ambiguidade

---

### 7. Consistência visual é obrigatória
O sistema deve parecer um produto único, e não várias telas feitas de formas diferentes.

Manter consistência em:
- botões
- campos
- títulos
- espaçamentos
- ícones
- cores
- tabelas
- cards
- modais
- filtros
- feedbacks visuais
- estados de carregamento
- estados vazios
- mensagens de erro e sucesso

---

### 8. Preservar o que já funciona bem
Se uma tela ou fluxo já está bom, claro e funcional, não deve ser alterado sem necessidade real.

Não mudar visual apenas por preferência pessoal ou vontade de “modernizar” sem ganho concreto.

Se a tarefa não pede mudança visual, preservar o visual existente deve ser a escolha padrão.

---

### 9. Componentes devem ser pensados para uso real
Toda interface deve considerar o uso real do sistema.

Pensar sempre em:
- quantidade de informação exibida
- frequência de uso
- perfil do usuário
- contexto de navegação
- facilidade de clique/toque
- previsibilidade da interação
- velocidade de entendimento

---

### 10. Estados da interface devem ser bem tratados
A interface deve lidar bem com:
- carregamento
- vazio
- erro
- sucesso
- bloqueio
- permissão insuficiente
- ausência de resultado
- dados parciais

Não deixar o usuário sem contexto sobre o que está acontecendo.

---

### 11. Formulários devem ser claros e agradáveis
Formulários devem ser simples, objetivos e fáceis de preencher.

Priorizar:
- organização lógica
- rótulos claros
- campos bem agrupados
- mensagens de erro compreensíveis
- feedback imediato quando fizer sentido
- evitar excesso de campos visíveis ao mesmo tempo quando isso piorar a experiência

---

### 12. Tabelas, listas e dashboards devem priorizar leitura e ação
Quando houver exibição de dados, priorizar:
- escaneabilidade
- clareza
- organização
- filtros úteis
- ações fáceis de localizar
- leitura confortável
- hierarquia entre informação e ação

Evitar tabelas poluídas, densas demais ou difíceis de interpretar.

---

### 13. Botões e ações devem ser óbvios
A interface deve deixar claro:
- o que é clicável
- qual é a ação principal
- qual ação é secundária
- qual ação é destrutiva
- o que acontece depois da ação

Não esconder ação crítica sem motivo.
Não dar o mesmo peso visual para tudo.

---

### 14. Feedback visual deve ser claro
Toda ação relevante deve gerar retorno claro ao usuário, como:
- carregamento
- sucesso
- erro
- validação
- bloqueio
- confirmação
- estado alterado

O usuário não deve precisar adivinhar se algo funcionou.

---

### 15. Beleza sem sacrificar usabilidade
A interface deve ser bonita, mas nunca à custa da clareza, legibilidade, contraste prático, organização ou facilidade de uso.

Se houver conflito entre “ficar mais estiloso” e “ficar mais fácil de usar”, priorize sempre a facilidade de uso.

---

## Como avaliar qualquer alteração sob a ótica de UI/UX
Ao receber qualquer solicitação visual ou funcional, valide:

1. O usuário entende rapidamente o que está vendo?
2. O fluxo está claro e intuitivo?
3. A ação principal está evidente?
4. A interface está limpa e organizada?
5. O visual está coerente com o restante do sistema?
6. A solução está responsiva?
7. Há excesso de informação ou elementos?
8. Os estados de erro, vazio e carregamento foram considerados?
9. A mudança melhora a experiência ou apenas muda por mudar?
10. Essa alteração exige registro de decisão ou pendência?

---

## O que o agente nunca deve fazer
Nunca faça nenhum dos itens abaixo:

- criar interface confusa ou visualmente poluída
- mudar visual sem necessidade real
- priorizar estética sobre usabilidade
- ignorar responsividade
- deixar layout quebrado em telas menores ou maiores
- esconder ações importantes sem motivo
- usar hierarquia visual inconsistente
- criar formulários cansativos sem necessidade
- deixar estados vazios, erros ou carregamentos mal resolvidos
- gerar telas que parecem improvisadas ou mal acabadas
- alterar um padrão visual estável sem ganho concreto

---

## Checklist mínimo antes de concluir qualquer alteração visual
Antes de concluir, valide no mínimo:

- a interface está clara
- a tela está bonita e bem organizada
- a ação principal está evidente
- o fluxo está intuitivo
- os componentes estão consistentes com o restante do sistema
- o layout está responsivo
- não há quebra visual relevante
- estados importantes foram considerados
- a experiência de uso foi preservada ou melhorada
- não houve mudança visual desnecessária

---

## Definition of Done sob a ótica de UI/UX
Uma alteração visual ou de fluxo só pode ser considerada concluída quando:

- cumpre o objetivo funcional
- melhora ou preserva a experiência do usuário
- mantém clareza visual
- mantém consistência com o sistema
- está responsiva
- não cria atrito desnecessário
- não quebra o layout
- não piora a leitura, navegação ou execução das ações
- trata adequadamente os estados importantes da interface

Se qualquer um desses pontos falhar, a tarefa não deve ser tratada como concluída.

---

## Como interpretar as regras específicas de UI/UX do projeto
A seção final deste arquivo contém as regras específicas de UI/UX deste sistema.

O agente deve tratar essa seção final como fonte principal de verdade sobre:
- identidade visual do projeto
- componentes e padrões específicos
- preferências de layout
- regras específicas de responsividade
- restrições de dispositivo
- padrões de navegação
- decisões de experiência já tomadas
- limitações importantes do contexto de uso

Se algum ponto não estiver explícito, o agente deve aplicar os princípios gerais deste arquivo e agir com cautela.

---

## Quando este arquivo deve ser atualizado
Atualize este arquivo somente quando houver mudança real nas diretrizes de UI/UX do projeto, como por exemplo:
- mudança oficial de identidade visual
- novo padrão de componentes
- nova diretriz de responsividade
- nova restrição de uso por dispositivo
- nova política de navegação
- nova regra importante de experiência do usuário

Bugs visuais pontuais, ajustes específicos de tela e histórico operacional não devem ser registrados aqui.
Esses registros pertencem a:
- `07_CHANGELOG.md`
- `08_DECISIONS.md`
- `09_PENDING_ISSUES.md`

---

## Regra final
Se houver conflito entre:
- estética chamativa
- rapidez de implementação
- conveniência técnica
- e experiência real de uso

priorize sempre a clareza, a usabilidade, a consistência visual e a responsividade.

---

# UI/UX ESPECÍFICO DO PROJETO
Cole abaixo as regras, padrões e restrições específicas de UI/UX deste projeto.

Sugestão de estrutura para colar:
- Estilo visual desejado
- Identidade visual
- Padrões de layout
- Componentes principais
- Regras de responsividade
- Restrições de dispositivo
- Regras de navegação
- Regras para formulários
- Regras para tabelas e listagens
- Regras para dashboards
- Regras para feedback visual
- Observações importantes

---

[COLE AQUI AS REGRAS DE UI/UX ESPECÍFICAS DO PROJETO]