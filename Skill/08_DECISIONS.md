# 08_DECISIONS.md

## Objetivo deste arquivo
Este arquivo registra decisões importantes do projeto, principalmente aquelas que impactam arquitetura, padrões, fluxos, tecnologia, regras operacionais, estratégia de implementação e direcionamento técnico ou funcional.

Ele deve ser usado para documentar:
- decisões técnicas importantes
- decisões arquiteturais
- escolhas entre alternativas
- padrões definidos para o projeto
- restrições assumidas conscientemente
- caminhos descartados com justificativa
- definições relevantes que não devem ser rediscutidas sem motivo

Este arquivo existe para:
- preservar o contexto das escolhas feitas
- evitar retrabalho
- impedir reabertura desnecessária de decisões já tomadas
- dar continuidade inteligente ao projeto
- ajudar agentes e desenvolvedores a entenderem o motivo das escolhas
- reduzir decisões contraditórias ao longo do tempo

---

## Como este arquivo deve ser usado
Sempre que uma decisão importante for tomada, este arquivo deve ser atualizado.

Uma decisão deve ser registrada quando houver valor real em preservar:
- o que foi decidido
- por que foi decidido
- quais alternativas existiam
- qual impacto essa decisão traz

Nem toda pequena escolha precisa entrar aqui.

Este arquivo deve conter apenas decisões relevantes e duradouras o suficiente para influenciar o projeto no futuro.

---

## Papel do agente
Aja como um engenheiro de software sênior com disciplina de documentação técnica e continuidade de projeto.

Sua tarefa é registrar decisões relevantes de forma clara, curta, objetiva e útil, para que o projeto mantenha coerência ao longo do tempo.

Você deve evitar:
- decisões vagas
- registros longos demais
- registros óbvios demais
- decisões irrelevantes
- duplicação de contexto
- registro de algo que na prática não foi decidido

---

## Regras gerais obrigatórias

### 1. Registrar apenas decisões relevantes
Registrar apenas escolhas que realmente influenciam o projeto.

Exemplos do que normalmente deve ser registrado:
- escolha de stack
- escolha de banco
- escolha de padrão arquitetural
- definição de estratégia de autenticação
- definição de estratégia de estado
- definição de convenções importantes
- decisão de preservar ou não determinado comportamento
- decisão de não implementar algo
- decisão de adiar algo conscientemente
- escolha entre duas abordagens com impacto real

Exemplos do que normalmente não precisa ser registrado:
- ajustes pequenos de implementação
- decisões locais sem impacto duradouro
- detalhes triviais de código
- escolhas temporárias sem relevância futura

---

### 2. Toda decisão deve ter motivo claro
Não basta dizer o que foi escolhido.

Também deve ficar claro:
- por que foi escolhido
- qual problema essa escolha resolve
- por que outras opções não foram priorizadas

---

### 3. Decisão registrada deve ser tratada como vigente
Uma vez registrada, a decisão deve ser respeitada pelo agente e pelos desenvolvedores, até que uma nova decisão a substitua formalmente.

Não ignorar decisão existente por conveniência momentânea.

---

### 4. Decisões substituídas não devem ser apagadas
Se uma decisão antiga deixar de valer, ela não deve ser simplesmente removida.

Deve ser mantida no histórico, deixando claro:
- que foi substituída
- por qual nova decisão
- e por quê

Isso preserva continuidade e rastreabilidade.

---

### 5. Registrar alternativas quando fizer sentido
Quando houver escolha entre caminhos relevantes, registrar brevemente:
- alternativa escolhida
- alternativas consideradas
- motivo da escolha

Não precisa virar texto longo.
Precisa apenas preservar o raciocínio útil.

---

### 6. Não usar este arquivo como changelog
Este arquivo não é para registrar tudo que foi alterado.

Ele é para registrar decisões.

Mudança executada pertence ao `07_CHANGELOG.md`.

---

### 7. Não usar este arquivo como backlog
Pendências, riscos, limitações abertas e coisas ainda não resolvidas não pertencem aqui por padrão.

Esses pontos pertencem ao `09_PENDING_ISSUES.md`, salvo quando houver uma decisão formal sobre eles.

---

### 8. Decisões devem ser escritas com clareza e firmeza
Evitar textos vagos como:
- “talvez”
- “acho melhor”
- “por enquanto meio que”
- “fizemos assim porque sim”

A decisão deve ser objetiva e compreensível.

---

### 9. Registrar decisões funcionais e visuais relevantes também
Este arquivo não é só para arquitetura.

Também pode registrar:
- decisões de UX importantes
- definições de fluxo
- regras de operação relevantes
- limites intencionais de escopo
- comportamento que deve ser preservado

---

### 10. Evitar excesso de detalhe
O objetivo é preservar a decisão, não escrever um ensaio.

Registrar o suficiente para manter contexto útil.

---

## O que o agente nunca deve fazer
Nunca faça nenhum dos itens abaixo:

- ignorar decisão já registrada
- registrar decisão irrelevante
- tratar mudança executada como decisão
- apagar histórico de decisão antiga
- sobrescrever decisão sem registrar a nova
- escrever decisão vaga ou ambígua
- usar este arquivo para listar tarefas
- usar este arquivo para registrar bugs pendentes
- transformar este arquivo em debate longo
- inventar uma decisão que não foi realmente tomada

---

## O que pertence aqui e o que não pertence

### Pertence aqui
- escolhas importantes
- direções definidas
- padrões oficialmente adotados
- alternativas descartadas com motivo
- decisões técnicas, funcionais ou visuais relevantes
- definições que devem orientar o projeto no futuro

### Não pertence aqui
- alteração já executada sem valor de decisão  
  → usar `07_CHANGELOG.md`

- bug pendente, limitação ou risco aberto  
  → usar `09_PENDING_ISSUES.md`

- regra permanente ampla do projeto  
  → usar o arquivo de contexto correspondente, e registrar aqui apenas a decisão que originou a regra quando fizer sentido

---

## Formato padrão de registro
Cada decisão deve seguir este formato:

### [AAAA-MM-DD] - [TÍTULO CURTO DA DECISÃO]

**Decisão:**  
[Descrever objetivamente o que foi decidido]

**Contexto:**  
[Descrever o problema, dúvida ou cenário que exigiu a decisão]

**Alternativas consideradas:**  
[Opcional: listar alternativas relevantes]

**Motivo da escolha:**  
[Descrever por que essa decisão foi tomada]

**Impacto:**  
[Descrever impacto técnico, funcional, visual ou operacional]

**Status:**  
[Vigente | Substituída]

**Substitui:**  
[Opcional]

**Substituída por:**  
[Opcional]

**Observações:**  
[Opcional]

---

## Regra de escrita
Ao escrever uma decisão:
- ser claro
- ser breve
- ser específico
- registrar só o que importa
- deixar explícito o motivo
- facilitar leitura futura

Cada decisão deve ser fácil de entender mesmo fora do contexto imediato da conversa em que surgiu.

---

## Quando atualizar este arquivo
Atualize este arquivo sempre que houver uma decisão relevante e duradoura no projeto.

Não atualizar este arquivo para:
- mudanças pequenas de implementação
- tarefas executadas sem valor de decisão
- hipóteses não confirmadas
- ideias ainda não decididas

---

## Regra final
Este arquivo deve preservar a memória do “por que decidimos assim”.

Sem isso, o projeto perde coerência com o tempo, decisões antigas são repetidamente reabertas e o contexto se dissolve.

---

# REGISTROS DE DECISÕES

### [AAAA-MM-DD] - [TÍTULO CURTO DA DECISÃO]

**Decisão:**  
[Preencher]

**Contexto:**  
[Preencher]

**Alternativas consideradas:**  
[Opcional]

**Motivo da escolha:**  
[Preencher]

**Impacto:**  
[Preencher]

**Status:**  
[Vigente | Substituída]

**Substitui:**  
[Opcional]

**Substituída por:**  
[Opcional]

**Observações:**  
[Opcional]

---

### [AAAA-MM-DD] - [TÍTULO CURTO DA DECISÃO]

**Decisão:**  
[Preencher]

**Contexto:**  
[Preencher]

**Alternativas consideradas:**  
[Opcional]

**Motivo da escolha:**  
[Preencher]

**Impacto:**  
[Preencher]

**Status:**  
[Vigente | Substituída]

**Substitui:**  
[Opcional]

**Substituída por:**  
[Opcional]

**Observações:**  
[Opcional]