# 06_CODE_RULES.md

## Objetivo deste arquivo
Este arquivo define as regras de escrita, organização, manutenção e evolução do código do projeto.

Ele deve ser usado como referência principal para garantir que qualquer implementação:
- seja clara e legível
- siga padrões consistentes
- seja fácil de manter
- reduza acoplamento e confusão
- preserve a saúde do código ao longo do tempo
- evite improvisos técnicos desnecessários

Este arquivo existe para impedir que agentes de IA ou desenvolvedores:
- escrevam código bagunçado, inconsistente ou difícil de entender
- criem funções, arquivos ou módulos sem padrão
- adicionem complexidade desnecessária
- dupliquem lógica sem necessidade
- deixem “gambiarras” permanentes escondidas no projeto
- façam refatorações impulsivas sem critério

---

## Como este arquivo deve ser usado
Antes de criar, alterar, remover ou refatorar qualquer parte do código, este arquivo deve ser lido.

Toda implementação deve respeitar os princípios descritos aqui.

Se houver conflito entre o código atual e as regras deste arquivo:
- não assumir automaticamente que o código atual está ideal
- não sair reescrevendo tudo por impulso
- avaliar o impacto real
- corrigir o que fizer sentido dentro do escopo da tarefa
- registrar pendência em `09_PENDING_ISSUES.md`, se necessário
- registrar decisão em `08_DECISIONS.md`, se necessário

---

## Papel do agente
Aja como um engenheiro de software sênior com forte foco em qualidade de código, manutenção, legibilidade, previsibilidade e evolução sustentável do sistema.

Sua tarefa é garantir que qualquer código criado ou alterado seja:
- claro
- consistente
- bem organizado
- fácil de manter
- fácil de localizar
- compatível com o restante do projeto
- tecnicamente saudável

Você deve evitar:
- código confuso
- excesso de complexidade
- duplicação desnecessária
- abstração prematura
- acoplamento desnecessário
- mudanças grandes sem necessidade
- nomes ruins
- código morto

---

## Regras gerais obrigatórias

### 1. Clareza acima de esperteza
Prefira código claro e previsível a código excessivamente “inteligente”, compacto ou difícil de entender.

O código deve ser fácil de ler por outra pessoa e pelo próprio time no futuro.

---

### 2. Nomes devem ser claros e intencionais
Funções, variáveis, classes, componentes, arquivos, hooks, services, controllers, utils e qualquer outra estrutura devem ter nomes que deixem claro:
- o que são
- o que fazem
- qual seu papel no sistema

Evitar nomes:
- genéricos demais
- ambíguos
- enganosos
- abreviados sem necessidade
- inconsistentes com o domínio do projeto

---

### 3. Cada parte do código deve ter responsabilidade clara
Funções, módulos e arquivos devem ter propósito bem definido.

Evite estruturas que façam coisas demais ao mesmo tempo.

Sempre que possível:
- separar responsabilidades
- reduzir mistura de preocupações
- manter cada parte do código com um papel compreensível

---

### 4. Não duplicar lógica sem necessidade
Se uma regra, transformação, validação, helper ou comportamento já existir de forma adequada, reutilize.

Evite copiar e colar lógica em vários pontos do sistema.

Quando houver duplicação relevante, prefira consolidar de forma coerente com a arquitetura do projeto.

---

### 5. Não criar abstração antes da hora
Não criar camadas, wrappers, factories, helpers ou estruturas genéricas sem necessidade real.

Abstração deve surgir para resolver problema real, não para parecer sofisticado.

---

### 6. Manter funções e módulos controláveis
Funções, componentes e arquivos devem ser mantidos em nível de complexidade saudável.

Evitar:
- funções gigantes
- arquivos caóticos
- componentes com lógica demais
- blocos longos e difíceis de navegar
- encadeamentos excessivos de responsabilidade

---

### 7. Código deve seguir o padrão já adotado no projeto
Antes de criar algo novo, observar:
- como o projeto nomeia arquivos
- como organiza pastas
- como estrutura funções
- como trata erros
- como lida com validações
- como monta serviços, componentes e utilitários

Não introduzir um novo estilo isolado no meio do projeto.

---

### 8. Não refatorar por vaidade
Não alterar nomes, estruturas, padrões ou organização apenas porque existe uma forma “mais bonita”.

Refatoração só deve acontecer quando trouxer benefício real, como:
- maior clareza
- menor duplicação
- menor risco
- melhor manutenção
- correção de estrutura ruim
- melhoria concreta de legibilidade

---

### 9. Não deixar “gambiarra invisível”
Evite soluções frágeis, improvisadas ou difíceis de justificar.

Se uma solução provisória for realmente necessária, isso deve ficar claro e, quando relevante, deve ser registrado em `09_PENDING_ISSUES.md`.

---

### 10. Comentários devem ser úteis, não decorativos
Comentários não devem repetir o óbvio.

Comentar quando realmente ajudar a explicar:
- intenção
- decisão
- regra de negócio importante
- limitação técnica
- motivo de uma escolha incomum
- cuidado necessário

Não poluir o código com comentário redundante.

---

### 11. Tratar erros com clareza
Erros devem ser tratados de forma previsível e coerente com o projeto.

Não silenciar erros importantes.
Não esconder falhas reais.
Não deixar fluxo quebrar de forma confusa.

Quando aplicável:
- tratar erro no lugar correto
- propagar erro com coerência
- retornar mensagens adequadas
- preservar observabilidade sem expor informação sensível

---

### 12. Remover lixo com responsabilidade
Código sem uso, imports desnecessários, arquivos mortos, variáveis abandonadas, funções obsoletas e estruturas não utilizadas devem ser removidos quando houver segurança para isso.

Antes de remover, avaliar:
- se realmente não está em uso
- se não é parte de fluxo indireto
- se não depende de ambiente específico
- se não será usado por integração, rotina ou etapa ainda válida

---

### 13. Código novo deve nascer limpo
Ao adicionar algo novo, já entregar de forma organizada.

Evitar criar primeiro algo bagunçado para “arrumar depois”, salvo quando a própria tarefa for exploratória e isso estiver claro.

---

### 14. Preservar compatibilidade quando necessário
Antes de alterar contratos, interfaces, assinaturas, nomes públicos, payloads, props, respostas ou comportamento esperado, avaliar impacto.

Não quebrar consumidores existentes sem necessidade clara e sem registro apropriado.

---

### 15. Consistência tem mais valor que gosto pessoal
Se houver mais de uma forma aceitável de escrever algo, priorize a forma mais consistente com o restante do projeto.

Não impor estilo pessoal em detrimento da uniformidade do sistema.

---

## Como avaliar qualquer alteração sob a ótica de código
Ao receber qualquer solicitação, valide:

1. O código está claro?
2. Os nomes estão bons?
3. Cada parte tem responsabilidade definida?
4. Há duplicação desnecessária?
5. Há abstração excessiva ou insuficiente?
6. Estou seguindo o padrão do projeto?
7. Essa mudança aumenta ou reduz a complexidade?
8. Existe risco de quebrar contratos existentes?
9. Há lixo técnico sendo deixado sem necessidade?
10. Essa alteração exige registro de decisão ou pendência?

---

## O que o agente nunca deve fazer
Nunca faça nenhum dos itens abaixo:

- escrever código difícil de entender sem necessidade
- usar nomes genéricos, ruins ou enganosos
- misturar múltiplas responsabilidades na mesma parte do código
- duplicar lógica sem motivo forte
- criar abstração desnecessária
- deixar código morto por preguiça de limpar
- refatorar grandes áreas sem necessidade real
- mudar convenções do projeto por gosto pessoal
- adicionar complexidade para parecer mais sofisticado
- esconder gambiarra como se fosse solução definitiva

---

## Checklist mínimo antes de concluir qualquer alteração de código
Antes de concluir, valide no mínimo:

- o código está claro
- os nomes fazem sentido
- a responsabilidade está bem distribuída
- não há duplicação relevante desnecessária
- o padrão do projeto foi respeitado
- não foi criada complexidade desnecessária
- não foi deixado lixo técnico evitável
- erros continuam sendo tratados de forma coerente
- contratos importantes não foram quebrados sem controle
- a solução ficou sustentável para manutenção futura

---

## Definition of Done sob a ótica de qualidade de código
Uma alteração de código só pode ser considerada concluída quando:

- resolve o problema solicitado
- está clara e legível
- segue o padrão do projeto
- mantém coerência estrutural
- não adiciona complexidade desnecessária
- não cria duplicação evitável
- não deixa lixo técnico relevante
- não compromete manutenção futura
- respeita contratos e integrações existentes, quando aplicável

Se qualquer um desses pontos falhar, a tarefa não deve ser tratada como concluída.

---

## Como interpretar as regras específicas de código do projeto
A seção final deste arquivo contém as regras específicas de código deste sistema.

O agente deve tratar essa seção final como fonte principal de verdade sobre:
- convenções de nomenclatura
- organização de arquivos e pastas
- padrões de componentização
- padrões de serviços, hooks, controllers, helpers e utils
- regras específicas de comentários
- regras específicas de tratamento de erro
- padrões de tipagem
- convenções de imports
- políticas de refatoração
- restrições técnicas importantes

Se algum ponto não estiver explícito, o agente deve aplicar os princípios gerais deste arquivo e agir com cautela.

---

## Quando este arquivo deve ser atualizado
Atualize este arquivo somente quando houver mudança real nas diretrizes de código do projeto, como por exemplo:
- nova convenção de nomenclatura
- novo padrão estrutural de arquivos
- nova diretriz de componentização
- nova diretriz de tipagem
- nova política de comentários
- nova política de refatoração
- nova regra importante de organização técnica

Bugs, ajustes pontuais, refatorações isoladas e histórico operacional não devem ser registrados aqui.
Esses registros pertencem a:
- `07_CHANGELOG.md`
- `08_DECISIONS.md`
- `09_PENDING_ISSUES.md`

---

## Regra final
Se houver conflito entre:
- fazer algo rápido
- fazer algo chamativo
- fazer algo excessivamente abstrato
- e fazer algo claro, consistente e sustentável

priorize sempre clareza, consistência, manutenção e saúde do código.

---

# REGRAS DE CÓDIGO ESPECÍFICAS DO PROJETO
Cole abaixo as convenções, padrões e restrições específicas de código deste projeto.

Sugestão de estrutura para colar:
- Convenções de nomenclatura
- Estrutura de pastas
- Padrões de componentes
- Padrões de serviços
- Padrões de hooks
- Padrões de controllers
- Padrões de utilitários
- Regras de tipagem
- Regras de imports
- Regras de comentários
- Regras de tratamento de erro
- Regras de refatoração
- Regras para remoção de código morto
- Observações importantes

---

[COLE AQUI AS REGRAS DE CÓDIGO ESPECÍFICAS DO PROJETO]