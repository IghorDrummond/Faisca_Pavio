# 07_CHANGELOG.md

## Objetivo deste arquivo
Este arquivo registra, de forma objetiva e rastreável, as mudanças relevantes realizadas no projeto.

Ele deve ser usado para documentar:
- funcionalidades criadas
- bugs corrigidos
- refatorações importantes
- alterações de comportamento
- mudanças visuais relevantes
- remoções de código
- ajustes estruturais
- mudanças em integrações
- alterações em regras técnicas importantes

Este arquivo existe para:
- preservar histórico útil do projeto
- facilitar retomada de contexto
- reduzir perda de memória operacional
- ajudar futuras análises
- permitir rastreabilidade de alterações
- evitar que mudanças importantes fiquem “soltas” ou esquecidas

---

## Como este arquivo deve ser usado
Sempre que uma alteração relevante for realizada, este arquivo deve ser atualizado.

O registro deve ser feito de forma clara, objetiva e útil.

Não registrar mudanças irrelevantes, microajustes triviais ou ruído desnecessário.

O foco deve ser registrar aquilo que realmente ajuda outra pessoa, ou o próprio agente no futuro, a entender:
- o que mudou
- por que mudou
- onde mudou
- qual impacto a mudança pode ter

---

## Papel do agente
Aja como um engenheiro de software disciplinado e organizado.

Sua tarefa é manter este changelog útil, limpo e confiável, registrando apenas mudanças relevantes e com informação suficiente para dar continuidade ao projeto no futuro.

Você deve evitar:
- registros vagos
- registros longos demais
- registros genéricos demais
- excesso de detalhes irrelevantes
- duplicação de registros
- omissão de mudanças importantes

---

## Regras gerais obrigatórias

### 1. Registrar apenas mudanças relevantes
Registrar somente alterações que tenham valor real de histórico.

Exemplos do que normalmente deve ser registrado:
- criação de funcionalidade
- correção de bug
- alteração de fluxo
- mudança de comportamento
- refatoração relevante
- mudança visual relevante
- remoção importante
- mudança de integração
- alteração de validação importante
- ajuste estrutural significativo

Exemplos do que normalmente não precisa ser registrado:
- ajuste mínimo de espaçamento sem impacto real
- correção ortográfica isolada
- micro limpeza sem relevância
- mudança muito pequena sem impacto funcional, técnico ou visual relevante

---

### 2. O registro deve ser objetivo
Cada entrada deve responder com clareza:
- o que foi feito
- por que foi feito
- onde foi feito
- qual impacto isso pode ter

Evitar textos longos, vagos ou cheios de explicações desnecessárias.

---

### 3. O registro deve refletir a realidade
Não registrar algo como concluído se não foi realmente concluído.

Não exagerar impacto.
Não omitir limitação importante.
Não mascarar correção parcial como solução definitiva.

---

### 4. O registro deve ser tecnicamente útil
O changelog não é para marketing interno.
Ele é para continuidade operacional.

Ele deve ajudar alguém a entender:
- o histórico do sistema
- as alterações recentes
- áreas afetadas
- possíveis efeitos colaterais
- contexto de mudança

---

### 5. Evitar duplicação de registros
Não registrar a mesma alteração várias vezes com textos diferentes.

Se uma mudança tiver várias partes relacionadas, agrupá-las de forma coerente em um único registro quando fizer sentido.

---

### 6. Mudanças grandes devem ser descritas de forma organizada
Quando a alteração for mais ampla, registrar de forma estruturada, deixando claro:
- escopo da mudança
- partes afetadas
- objetivo principal
- impacto esperado

---

### 7. Refatorações devem deixar claro que foram refatorações
Quando a mudança for estrutural e não funcional, isso deve ficar explícito.

Exemplo:
- refatoração de organização
- melhoria de legibilidade
- remoção de duplicação
- separação de responsabilidades
- limpeza de código morto

---

### 8. Correções de bug devem citar o problema corrigido
Ao registrar bug corrigido, deixar claro:
- qual problema existia
- qual comportamento foi ajustado
- qual área foi afetada

---

### 9. Alterações visuais relevantes devem ser registradas
Quando houver mudança relevante em UI/UX, registrar:
- o que mudou visualmente
- por que mudou
- qual tela ou fluxo foi impactado
- se houve impacto em responsividade ou usabilidade

---

### 10. Remoções importantes devem ser registradas
Quando código, comportamento, fluxo, módulo ou integração for removido, isso deve ser registrado claramente.

---

## O que o agente nunca deve fazer
Nunca faça nenhum dos itens abaixo:

- deixar de registrar mudança relevante
- registrar alteração irrelevante só para “encher histórico”
- escrever registro vago como “ajustes gerais”
- esconder limitação importante
- registrar como concluído algo que ficou parcial
- duplicar registros desnecessariamente
- transformar o changelog em diário extenso
- usar este arquivo para discutir decisões longas
- usar este arquivo para listar bugs pendentes
- usar este arquivo para registrar regra permanente do projeto

---

## O que pertence aqui e o que não pertence

### Pertence aqui
- mudanças realizadas
- correções aplicadas
- funcionalidades implementadas
- alterações relevantes já executadas
- refatorações concluídas
- mudanças visuais relevantes já feitas

### Não pertence aqui
- decisões arquiteturais detalhadas  
  → usar `08_DECISIONS.md`

- bugs, riscos ou limitações ainda pendentes  
  → usar `09_PENDING_ISSUES.md`

- regras fixas do projeto  
  → usar os arquivos de contexto correspondentes

---

## Formato padrão de registro
Cada registro deve seguir este formato:

### [DATA] - [TIPO] - [TÍTULO CURTO]

**O que foi feito:**  
[Descrever objetivamente a alteração]

**Por que foi feito:**  
[Descrever o motivo]

**Arquivos ou áreas afetadas:**  
[Informar arquivos, módulos, telas, fluxos ou camadas impactadas]

**Impacto esperado:**  
[Descrever impacto funcional, técnico ou visual]

**Observações:**  
[Opcional: limitações, cuidados ou contexto adicional]

---

## Tipos sugeridos para os registros
Usar, quando fizer sentido, um destes tipos:

- `FEATURE`
- `BUGFIX`
- `REFACTOR`
- `UI/UX`
- `SECURITY`
- `PERFORMANCE`
- `INTEGRATION`
- `DATABASE`
- `CLEANUP`
- `TEST`
- `CONFIG`

Se outro tipo fizer mais sentido, pode ser usado, desde que seja claro.

---

## Regra de escrita
Ao escrever um registro:
- ser claro
- ser breve
- ser específico
- evitar floreio
- evitar texto genérico
- evitar excesso de detalhe irrelevante

Cada entrada deve ser fácil de escanear.

---

## Quando atualizar este arquivo
Atualize este arquivo sempre que houver alteração relevante já executada no projeto.

Se a mudança ainda não foi feita, não registrar aqui.

Se a mudança está apenas planejada, isso não pertence aqui.

---

## Regra final
Este arquivo deve servir como memória operacional confiável do que realmente mudou no projeto.

Registrar pouco demais prejudica continuidade.
Registrar coisa demais prejudica leitura.

O equilíbrio correto é registrar o que realmente importa.

---

# REGISTROS DO CHANGELOG

### [AAAA-MM-DD] - [TIPO] - [TÍTULO CURTO]

**O que foi feito:**  
[Preencher]

**Por que foi feito:**  
[Preencher]

**Arquivos ou áreas afetadas:**  
[Preencher]

**Impacto esperado:**  
[Preencher]

**Observações:**  
[Opcional]

---

### [AAAA-MM-DD] - [TIPO] - [TÍTULO CURTO]

**O que foi feito:**  
[Preencher]

**Por que foi feito:**  
[Preencher]

**Arquivos ou áreas afetadas:**  
[Preencher]

**Impacto esperado:**  
[Preencher]

**Observações:**  
[Opcional]