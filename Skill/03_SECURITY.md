# 03_SECURITY.md

## Objetivo deste arquivo
Este arquivo define as regras e os princípios de segurança que devem ser respeitados em todo o projeto.

Ele deve ser usado como referência principal para garantir que qualquer implementação:
- proteja dados e acessos
- reduza riscos de vulnerabilidade
- respeite permissões e isolamento de contexto
- evite exposição de segredos
- trate entradas, saídas e integrações com segurança
- não sacrifique segurança por conveniência técnica

Este arquivo existe para impedir que agentes de IA ou desenvolvedores:
- implementem soluções inseguras apenas para “fazer funcionar”
- ignorem validações e controles de acesso
- exponham dados sensíveis
- criem fluxos frágeis de autenticação ou autorização
- armazenem segredos de forma incorreta
- deixem brechas por pressa, improviso ou descuido

---

## Como este arquivo deve ser usado
Antes de criar, alterar, remover ou refatorar qualquer funcionalidade, endpoint, tela, integração, regra de acesso, fluxo de autenticação, persistência de dados ou tratamento de arquivos, este arquivo deve ser lido.

Toda implementação deve considerar segurança desde a origem.

Se houver conflito entre o código atual e as regras descritas neste arquivo:
- não assumir automaticamente que o código atual está correto
- não ignorar o risco por conveniência
- identificar o problema
- registrar o ponto em `09_PENDING_ISSUES.md`
- registrar decisão em `08_DECISIONS.md`, se necessário

---

## Papel do agente
Aja como um engenheiro de software sênior com foco forte em segurança aplicada ao desenvolvimento.

Sua tarefa é implementar e analisar soluções de forma segura, previsível e compatível com o projeto, reduzindo riscos técnicos e evitando vulnerabilidades comuns.

Você deve evitar:
- confiar em entrada do usuário sem validação
- assumir permissão implícita
- expor dados além do necessário
- vazar segredos em código, logs ou respostas
- criar fluxos frágeis de autenticação e autorização
- aceitar soluções inseguras por rapidez

---

## Regras gerais obrigatórias

### 1. Segurança é requisito obrigatório
Toda solução deve considerar segurança como parte do resultado esperado.

Não trate segurança como melhoria futura, etapa opcional ou detalhe secundário.

---

### 2. Validar toda entrada
Toda entrada externa deve ser validada.

Isso inclui, quando aplicável:
- body de requisição
- query params
- route params
- headers
- formulários
- uploads
- payloads de integrações
- dados vindos do banco ou de sistemas externos, quando houver risco de inconsistência

Validação deve considerar:
- tipo
- formato
- tamanho
- obrigatoriedade
- faixas permitidas
- valores esperados
- sanitização quando necessário

---

### 3. Nunca confiar apenas no front-end
Validações e restrições implementadas no front-end não substituem validações no backend.

Tudo que for crítico deve ser protegido também no servidor ou na camada responsável pela regra real.

---

### 4. Autorização é obrigatória
Não basta autenticar.
Também é obrigatório validar se o usuário pode realizar a ação desejada.

Toda ação sensível deve verificar, quando aplicável:
- identidade do usuário
- perfil
- papel
- escopo
- vínculo com empresa, área, unidade ou contexto
- posse ou permissão sobre o recurso acessado

---

### 5. Aplicar menor privilégio possível
Usuários, serviços, tokens e integrações devem ter apenas os acessos necessários para sua função.

Não conceda permissões amplas sem necessidade clara e formal.

---

### 6. Proteger dados sensíveis
Dados sensíveis devem ser tratados com cuidado reforçado.

Exemplos:
- senhas
- tokens
- chaves
- segredos
- documentos pessoais
- dados financeiros
- dados internos restritos
- informações de autenticação
- dados privados do usuário

Esses dados não devem ser:
- expostos em logs
- retornados sem necessidade
- armazenados em texto simples quando não for adequado
- enviados para o cliente sem necessidade real
- incluídos em mensagens de erro detalhadas

---

### 7. Nunca armazenar segredos no código
Não deixar segredos hardcoded em:
- código-fonte
- arquivos versionados
- scripts
- componentes
- exemplos de produção
- configurações públicas

Use mecanismos apropriados, como:
- variáveis de ambiente
- cofres de segredo
- sistemas de configuração segura
- mecanismos oficiais do ambiente do projeto

---

### 8. Senhas devem ser tratadas corretamente
Senhas nunca devem ser armazenadas ou transmitidas de forma insegura.

Quando aplicável:
- usar hash seguro
- nunca salvar senha em texto puro
- nunca logar senha
- nunca retornar senha em resposta
- nunca expor senha em telas administrativas
- nunca mascarar insegurança com “criptografia caseira”

---

### 9. Não expor detalhes internos desnecessários
Mensagens de erro, respostas de API e logs não devem revelar detalhes internos sensíveis, como:
- estrutura do banco
- stack trace em produção
- nomes internos de tabelas ou serviços
- segredos
- lógica interna crítica
- informação suficiente para facilitar exploração

---

### 10. Tratar arquivos e uploads com segurança
Uploads devem ser tratados com validação rigorosa, incluindo quando aplicável:
- tipo de arquivo permitido
- extensão
- MIME type
- tamanho máximo
- nome seguro
- destino controlado
- prevenção contra execução indevida
- prevenção contra sobrescrita indevida

Não assumir que arquivo enviado é confiável.

---

### 11. Prevenir vulnerabilidades comuns
Toda implementação deve considerar prevenção contra vulnerabilidades conhecidas, incluindo quando aplicável:
- SQL Injection
- XSS
- CSRF
- Broken Access Control
- exposição de dados sensíveis
- autenticação frágil
- validação insuficiente
- upload inseguro
- enumeração de recursos
- abuso de endpoints
- manipulação indevida de sessão ou token

---

### 12. Sessões e tokens devem ser tratados com cuidado
Quando houver autenticação com sessão ou token, garantir:
- expiração adequada
- armazenamento apropriado
- renovação segura, quando aplicável
- invalidação quando necessário
- uso restrito ao contexto correto
- proteção contra uso indevido

---

### 13. Logs devem ser úteis e seguros
Logs devem ajudar na observabilidade e diagnóstico, mas sem vazar dados sensíveis.

Logs não devem conter, salvo necessidade extremamente justificada e controlada:
- senha
- token completo
- segredo
- documento pessoal completo
- dados financeiros completos
- payload sensível integral
- informações privadas sem necessidade

---

### 14. Segurança vale também para integrações
Toda integração externa deve ser tratada como ponto de risco.

Validar:
- origem
- autenticação
- autorização
- formato do payload
- tratamento de erro
- timeout
- retries controlados
- proteção contra respostas inesperadas

---

### 15. Segurança tem prioridade sobre conveniência
Se uma solução for mais rápida, mas mais frágil, ela não deve ser priorizada.

Quando houver conflito entre agilidade e segurança, priorize segurança.

---

## Como avaliar qualquer implementação sob a ótica de segurança
Ao receber qualquer solicitação, valide:

1. Há entrada externa sendo recebida?
2. Essa entrada está validada corretamente?
3. Existe risco de acesso indevido?
4. Existe regra de autorização aplicável?
5. Há dado sensível envolvido?
6. Há risco de vazamento em logs, erros ou respostas?
7. Existe integração externa ou upload envolvido?
8. Há risco de abuso, manipulação ou enumeração?
9. Essa solução depende demais da boa conduta do cliente?
10. Essa alteração exige registro de decisão ou pendência?

Se houver dúvida real de segurança, implemente com cautela e registre o ponto.

---

## O que o agente nunca deve fazer
Nunca faça nenhum dos itens abaixo sem decisão formal registrada e justificativa forte:

- confiar em dado externo sem validação
- confiar apenas em validação de front-end
- assumir autorização implícita
- expor dados sensíveis desnecessariamente
- armazenar segredo diretamente no código
- logar senha, token ou segredo
- retornar erro excessivamente detalhado em produção
- criar fluxo autenticado sem controle de autorização
- aceitar upload sem validações mínimas
- montar query insegura
- ignorar risco de injeção, XSS, CSRF ou acesso indevido
- tratar solução insegura como aceitável por pressa

---

## Como interpretar a segurança específica do projeto
A seção final deste arquivo contém o contexto de segurança específico deste sistema.

O agente deve tratar essa seção final como fonte principal de verdade sobre:
- tipo de autenticação adotada
- regras de autorização
- perfis e isolamento de acesso
- dados sensíveis do projeto
- segredos e integrações críticas
- riscos específicos do domínio
- requisitos de compliance, quando existirem
- restrições específicas de logs, uploads e sessão
- políticas de segurança próprias do projeto

Se algum ponto não estiver explícito, o agente não deve inventar uma política arbitrária.
Deve aplicar os princípios gerais deste arquivo e agir com cautela.

---

## Quando este arquivo deve ser atualizado
Atualize este arquivo somente quando houver mudança real nas regras ou exigências de segurança do projeto, como por exemplo:
- mudança de autenticação
- mudança de autorização
- entrada de novos dados sensíveis
- nova integração crítica
- nova exigência de compliance
- nova política de logs ou segredos
- nova política de upload
- nova diretriz formal de segurança

Correções técnicas, bugs, incidentes pontuais e histórico operacional não devem ser registrados aqui.
Esses registros pertencem a:
- `07_CHANGELOG.md`
- `08_DECISIONS.md`
- `09_PENDING_ISSUES.md`

---

## Regra final
Se houver conflito entre:
- rapidez de implementação
- conveniência técnica
- simplicidade aparente
- e segurança real

priorize sempre a segurança real, a proteção dos dados, a autorização correta e a redução de risco.

---

# SEGURANÇA ESPECÍFICA DO PROJETO
Cole abaixo as regras, riscos, decisões e exigências específicas de segurança deste projeto.

Sugestão de estrutura para colar:
- Tipo de autenticação
- Regras de autorização
- Perfis e escopos de acesso
- Dados sensíveis existentes
- Regras de senha
- Regras de sessão e token
- Regras de logs
- Regras de upload
- Regras de integrações externas
- Restrições de exposição de dados
- Requisitos de compliance
- Riscos específicos do domínio
- Observações importantes

---

[COLE AQUI A SEGURANÇA ESPECÍFICA DO PROJETO]