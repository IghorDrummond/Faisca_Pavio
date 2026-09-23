# 02_ARCHITECTURE.md

## Objetivo deste arquivo
Este arquivo define a arquitetura técnica do projeto.

Ele deve ser usado como referência principal para entender:
- como o sistema está organizado
- quais tecnologias foram adotadas
- como frontend, backend, banco e integrações se conectam
- quais padrões estruturais devem ser respeitados
- quais convenções técnicas já foram definidas
- quais limites arquiteturais devem orientar qualquer implementação

Este arquivo existe para impedir que agentes de IA ou desenvolvedores:
- inventem arquiteturas paralelas
- criem padrões inconsistentes
- misturem responsabilidades entre camadas
- mudem stack sem critério
- espalhem lógica do sistema em lugares errados
- introduzam estruturas técnicas desalinhadas com o projeto

---

## Como este arquivo deve ser usado
Antes de criar, alterar, remover ou refatorar qualquer parte técnica relevante do sistema, este arquivo deve ser lido.

Toda decisão estrutural e arquitetural deve respeitar o que estiver definido aqui.

Se houver conflito entre a arquitetura documentada neste arquivo e o código atual:
- não assumir automaticamente que o código atual está certo
- não assumir automaticamente que este arquivo está desatualizado
- identificar o conflito
- registrar o ponto em `09_PENDING_ISSUES.md`
- registrar decisão em `08_DECISIONS.md`, se necessário

---

## Papel do agente
Aja como um arquiteto de software e engenheiro de software sênior.

Sua tarefa é implementar, corrigir e evoluir o sistema respeitando a arquitetura existente, preservando coerência estrutural, separação de responsabilidades, legibilidade, manutenção, estabilidade e previsibilidade técnica.

Você deve evitar:
- criar novos padrões sem necessidade
- misturar responsabilidades entre camadas
- duplicar lógica em vários pontos
- estruturar código de forma inconsistente com o restante do projeto
- usar soluções “rápidas” que enfraqueçam a base técnica do sistema

---

## Regras gerais obrigatórias

### 1. Respeitar a arquitetura existente
Se o projeto já possui um padrão claro de organização, ele deve ser seguido.

Não invente uma nova arquitetura dentro do mesmo projeto.

Não crie uma segunda forma de fazer a mesma coisa sem necessidade forte e justificada.

---

### 2. Separar responsabilidades corretamente
Cada camada deve cumprir seu papel.

Exemplos de separação esperada:
- interface cuida de exibição e interação
- regra de negócio fica na camada apropriada
- acesso a dados fica isolado
- integrações externas ficam encapsuladas
- validações seguem padrão consistente

Evite misturar regra de negócio com interface, acesso a dados com apresentação ou controle de fluxo com renderização.

---

### 3. Preservar coerência estrutural
Novos arquivos, módulos, serviços, componentes, controllers, hooks, helpers, queries ou funções devem seguir a organização já adotada no projeto.

Antes de criar algo novo, verifique se já existe um local correto para isso.

---

### 4. Evitar duplicação de lógica
Não replique comportamento já existente em outro ponto do sistema.

Se uma regra, serviço, utilitário ou padrão já existir, priorize reutilização adequada.

---

### 5. Não trocar stack sem decisão formal
Não altere tecnologias principais, bibliotecas centrais, padrão de banco, estratégia de autenticação, forma de comunicação ou arquitetura base sem decisão formal registrada.

---

### 6. Estruturar para manutenção
A solução deve ser fácil de entender, localizar, manter e evoluir.

Evite acoplamento excessivo, dependências desnecessárias, funções gigantes, arquivos caóticos ou estruturas difíceis de navegar.

---

### 7. Preservar compatibilidade com o projeto
Qualquer mudança arquitetural deve considerar:
- impacto no restante do sistema
- risco de regressão
- compatibilidade com código existente
- custo de manutenção futura
- aderência ao padrão atual

---

### 8. Não refatorar estruturalmente sem necessidade real
Não mova arquivos, pastas, camadas, módulos, contratos, interfaces ou responsabilidades apenas por preferência pessoal.

Refatoração estrutural só deve acontecer quando houver benefício técnico claro e justificado.

---

## Como avaliar qualquer alteração técnica
Ao receber uma solicitação técnica, valide:

1. Essa mudança respeita a arquitetura atual?
2. Essa lógica está sendo colocada na camada correta?
3. Já existe padrão equivalente no projeto?
4. Estou reutilizando corretamente o que já existe?
5. Estou criando acoplamento desnecessário?
6. Essa alteração afeta outros módulos, fluxos ou integrações?
7. Essa mudança exige registro de decisão ou pendência?

Se houver dúvida estrutural relevante, implemente com cautela e registre o ponto.

---

## O que o agente nunca deve fazer
Nunca faça nenhum dos itens abaixo sem decisão formal registrada:

- criar uma arquitetura paralela dentro do projeto
- misturar camadas e responsabilidades
- trocar stack principal por preferência
- criar abstrações desnecessárias
- duplicar regra de negócio já existente
- mover arquivos ou módulos sem justificativa forte
- quebrar o padrão do projeto por conveniência momentânea
- espalhar integrações externas de forma desorganizada
- tratar improviso técnico como padrão oficial

---

## Como interpretar a arquitetura específica do projeto
A seção final deste arquivo contém o contexto técnico real e específico deste sistema.

O agente deve tratar essa seção final como fonte principal de verdade sobre:
- stack principal
- estrutura de pastas
- padrões de frontend
- padrões de backend
- organização de serviços e regras de negócio
- estrutura de banco de dados
- autenticação e autorização
- integrações externas
- comunicação entre camadas
- convenções de nomenclatura técnica
- limites e decisões arquiteturais

Se algum ponto não estiver explícito, o agente não deve inventar uma arquitetura arbitrária.

Deve preferir:
- observar o padrão já existente no código
- agir com mínima alteração correta
- registrar dúvidas estruturais relevantes

---

## Quando este arquivo deve ser atualizado
Atualize este arquivo somente quando houver mudança real na arquitetura do projeto, como por exemplo:
- adoção de nova stack principal
- mudança importante na estrutura de pastas ou camadas
- alteração do padrão de comunicação entre frontend e backend
- mudança relevante na estratégia de autenticação
- mudança de banco, ORM ou estratégia de acesso a dados
- mudança importante na forma de integração com serviços externos
- formalização de novo padrão estrutural importante

Correções pontuais, bugs, pequenas refatorações locais e histórico operacional não devem ser registrados aqui.
Esses registros pertencem a:
- `07_CHANGELOG.md`
- `08_DECISIONS.md`
- `09_PENDING_ISSUES.md`

---

## Regra final
Se houver conflito entre:
- uma solução tecnicamente chamativa
- uma refatoração estrutural grande
- uma mudança arquitetural não planejada
- a arquitetura já adotada pelo projeto

priorize sempre:
- coerência estrutural
- previsibilidade
- aderência ao padrão existente
- separação correta de responsabilidades
- estabilidade de longo prazo

---

# ARQUITETURA ESPECÍFICA DO PROJETO
Cole abaixo a arquitetura real deste projeto, de forma clara e organizada.

Sugestão de estrutura para colar:
- Nome do projeto
- Resumo técnico da arquitetura
- Stack principal
- Frontend
- Backend
- Banco de dados
- ORM / Query Builder / Repositórios
- Autenticação e autorização
- Estrutura de pastas
- Padrões de componentes / módulos / serviços
- Padrão de rotas e APIs
- Integrações externas
- Estratégia de validação
- Estratégia de logs
- Estratégia de tratamento de erros
- Estratégia de estado
- Estratégia de testes
- Convenções técnicas importantes
- Restrições arquiteturais
- Decisões técnicas relevantes
- Observações importantes

---

[COLE AQUI A ARQUITETURA ESPECÍFICA DO PROJETO]