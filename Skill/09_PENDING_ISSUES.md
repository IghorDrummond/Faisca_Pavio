# 09_PENDING_ISSUES.md

## Objetivo deste arquivo
Este arquivo registra pendências, limitações, riscos, débitos técnicos, inconsistências e pontos que ainda precisam de atenção no projeto.

Ele deve ser usado para documentar:
- bugs ainda não resolvidos
- comportamentos suspeitos
- limitações conhecidas
- riscos técnicos
- pontos a validar
- pendências funcionais
- pendências visuais
- pendências de segurança
- pendências de integração
- débitos técnicos relevantes

Este arquivo existe para:
- evitar que problemas conhecidos sejam esquecidos
- preservar contexto sobre o que ainda está em aberto
- facilitar continuidade do projeto
- dar visibilidade para riscos reais
- impedir que limitações fiquem escondidas
- ajudar agentes e desenvolvedores a retomarem o trabalho com clareza

---

## Como este arquivo deve ser usado
Sempre que um problema, risco, limitação ou ponto aberto relevante for identificado, este arquivo deve ser atualizado.

Nem toda pequena dúvida precisa entrar aqui.

Registrar apenas o que realmente tenha valor para acompanhamento futuro e continuidade do projeto.

Este arquivo deve responder com clareza:
- o que está pendente
- qual o impacto
- qual a área afetada
- qual o próximo passo esperado, quando fizer sentido

---

## Papel do agente
Aja como um engenheiro de software sênior disciplinado, honesto e cuidadoso com continuidade de projeto.

Sua tarefa é registrar de forma clara os problemas e pendências reais do sistema, sem esconder limitações, sem exagerar riscos e sem deixar pontos importantes se perderem.

Você deve evitar:
- omitir problema relevante
- registrar ruído desnecessário
- exagerar gravidade sem motivo
- escrever pendência vaga
- misturar pendência com mudança já concluída
- usar este arquivo como backlog genérico de ideias

---

## Regras gerais obrigatórias

### 1. Registrar apenas pendências reais e relevantes
Registrar somente o que realmente tem valor para continuidade do projeto.

Exemplos do que normalmente deve ser registrado:
- bug ainda não corrigido
- limitação técnica conhecida
- fluxo parcialmente validado
- dependência externa bloqueando conclusão
- risco de regressão ainda não verificado
- incompatibilidade identificada
- comportamento inconsistente ainda aberto
- melhoria obrigatória ainda pendente
- débito técnico relevante
- ponto que precisa de validação futura

Exemplos do que normalmente não precisa ser registrado:
- ideia solta sem decisão
- micro detalhe sem impacto real
- observação irrelevante
- comentário genérico como “melhorar código”
- desejo futuro que não é pendência concreta

---

### 2. Toda pendência deve ser clara
Cada registro deve deixar claro:
- qual é o problema ou limitação
- qual área é afetada
- qual impacto isso pode ter
- qual o nível de atenção necessário

Evitar registros vagos como:
- “ajustar depois”
- “ver isso”
- “melhorar tela”
- “revisar sistema”

---

### 3. Não esconder limitação
Se algo não foi validado, não foi concluído ou depende de etapa futura, isso deve ficar explícito.

Não mascarar pendência como se estivesse resolvida.

---

### 4. Diferenciar tipo de pendência
Sempre que possível, deixar claro o tipo da pendência:
- bug
- risco
- limitação
- dívida técnica
- validação pendente
- dependência externa
- melhoria obrigatória
- problema visual
- problema de segurança
- problema de integração

---

### 5. Registrar impacto real
Toda pendência relevante deve mencionar o impacto provável, como por exemplo:
- afeta fluxo crítico
- afeta apenas cenário específico
- afeta experiência do usuário
- afeta segurança
- afeta estabilidade
- afeta manutenção
- afeta integração externa
- afeta responsividade
- ainda não afeta produção, mas representa risco futuro

---

### 6. Não usar este arquivo como changelog
Este arquivo não registra o que já foi feito.

Mudanças já executadas pertencem ao `07_CHANGELOG.md`.

---

### 7. Não usar este arquivo como registro de decisão
Se houve uma escolha formal sobre abordagem, padrão ou direção, isso pertence ao `08_DECISIONS.md`.

Este arquivo deve focar em pontos abertos, e não em decisões concluídas.

---

### 8. Não transformar este arquivo em backlog genérico
Este arquivo não é para listar qualquer ideia futura.

Só devem entrar aqui pontos que realmente exigem atenção, correção, validação ou acompanhamento.

---

### 9. Pendências resolvidas não devem ficar misturadas com pendências ativas
Quando uma pendência for resolvida, ela deve:
- ser marcada como resolvida, ou
- ser movida para uma seção de resolvidas, se o time preferir

O importante é não deixar como “aberta” algo que já foi tratado.

---

### 10. Ser honesto sobre prioridade
Não marcar tudo como crítico.

A classificação deve refletir a gravidade real.

---

## O que o agente nunca deve fazer
Nunca faça nenhum dos itens abaixo:

- esconder problema relevante
- registrar pendência vaga demais
- usar este arquivo para ideias soltas sem contexto
- usar este arquivo para registrar mudança já concluída
- tratar risco como certeza sem evidência
- tratar limitação conhecida como se estivesse resolvida
- deixar pendência importante sem impacto descrito
- transformar este arquivo em lista caótica
- duplicar a mesma pendência várias vezes sem necessidade
- misturar backlog criativo com problema real do projeto

---

## O que pertence aqui e o que não pertence

### Pertence aqui
- bugs abertos
- limitações conhecidas
- riscos identificados
- pontos a validar
- dívidas técnicas relevantes
- dependências externas bloqueando algo
- validações ainda não feitas
- comportamentos suspeitos ainda em análise
- pendências funcionais, visuais, técnicas ou de segurança

### Não pertence aqui
- mudanças já concluídas  
  → usar `07_CHANGELOG.md`

- decisões formais já tomadas  
  → usar `08_DECISIONS.md`

- regras fixas do projeto  
  → usar os arquivos de contexto correspondentes

- ideias futuras sem caráter de pendência real  
  → registrar em backlog, roadmap ou documento apropriado fora desta estrutura

---

## Formato padrão de registro
Cada pendência deve seguir este formato:

### [AAAA-MM-DD] - [TIPO] - [TÍTULO CURTO]

**Status:**  
[Aberta | Em análise | Bloqueada | Resolvida]

**Descrição:**  
[Descrever claramente o problema, limitação, risco ou ponto pendente]

**Impacto:**  
[Descrever impacto funcional, técnico, visual, operacional ou de segurança]

**Área afetada:**  
[Informar tela, módulo, fluxo, serviço, integração, camada ou contexto afetado]

**Próximo passo sugerido:**  
[Opcional: descrever o que precisa ser feito ou validado]

**Observações:**  
[Opcional]

---

## Tipos sugeridos para os registros
Usar, quando fizer sentido, um destes tipos:

- `BUG`
- `RISK`
- `LIMITATION`
- `TECH_DEBT`
- `VALIDATION`
- `INTEGRATION`
- `UI/UX`
- `SECURITY`
- `PERFORMANCE`
- `DATA`
- `CONFIG`
- `DEPENDENCY`

Se outro tipo fizer mais sentido, pode ser usado, desde que seja claro.

---

## Prioridade sugerida
Quando fizer sentido, a descrição ou observação pode indicar prioridade:

- `Alta`
- `Média`
- `Baixa`

Só usar prioridade quando isso realmente ajudar.

---

## Regra de escrita
Ao escrever uma pendência:
- ser claro
- ser breve
- ser específico
- deixar explícito o problema
- deixar explícito o impacto
- evitar floreio
- evitar ruído
- evitar texto genérico

Cada entrada deve ser fácil de ler e útil para ação futura.

---

## Quando atualizar este arquivo
Atualize este arquivo sempre que for identificado um ponto aberto relevante no projeto.

Atualize também quando:
- uma pendência mudar de status
- uma limitação deixar de existir
- um risco for confirmado ou descartado
- uma dependência deixar de bloquear o trabalho
- uma pendência for resolvida

---

## Regra final
Este arquivo deve servir como memória confiável do que ainda precisa de atenção.

Pendência escondida gera retrabalho.
Pendência vaga gera confusão.
Pendência bem registrada acelera continuidade e melhora a qualidade do projeto.

---

# REGISTROS DE PENDÊNCIAS

### [AAAA-MM-DD] - [TIPO] - [TÍTULO CURTO]

**Status:**  
[Aberta | Em análise | Bloqueada | Resolvida]

**Descrição:**  
[Preencher]

**Impacto:**  
[Preencher]

**Área afetada:**  
[Preencher]

**Próximo passo sugerido:**  
[Opcional]

**Observações:**  
[Opcional]

---

### [AAAA-MM-DD] - [TIPO] - [TÍTULO CURTO]

**Status:**  
[Aberta | Em análise | Bloqueada | Resolvida]

**Descrição:**  
[Preencher]

**Impacto:**  
[Preencher]

**Área afetada:**  
[Preencher]

**Próximo passo sugerido:**  
[Opcional]

**Observações:**  
[Opcional]