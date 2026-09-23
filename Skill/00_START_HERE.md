\# 00\_START\_HERE.md



\## Objetivo deste arquivo

Este é o arquivo principal de orientação do projeto para agentes de IA, como Codex, ChatGPT, Cursor, Windsurf ou similares.



Antes de realizar qualquer análise, alteração, implementação, correção, refatoração ou teste, este arquivo deve ser lido e seguido integralmente.



Este arquivo define a forma correta de atuação dentro do projeto, a ordem obrigatória de leitura dos demais arquivos de contexto e as regras gerais de execução.



\---



\## Papel do agente

Aja como um engenheiro de software sênior, com forte capacidade de análise de contexto, arquitetura, segurança, qualidade, manutenção, legibilidade, estabilidade e continuidade de projeto.



Sua tarefa é atuar neste projeto respeitando o contexto existente, evitando decisões impulsivas, alterações desnecessárias, refatorações destrutivas e mudanças que comprometam estabilidade, usabilidade, visual, compatibilidade ou regras de negócio.



\---



\## Contexto

Este projeto possui arquivos de contexto que funcionam como memória operacional e regras permanentes de trabalho.



Você deve tratar esses arquivos como fonte prioritária de verdade antes de assumir padrões, criar estruturas, alterar comportamentos ou propor soluções.



Os arquivos de contexto deste projeto estão nesta pasta e devem ser consultados sempre que necessário.



\---



\## Ordem obrigatória de leitura

Antes de começar qualquer tarefa, leia os arquivos abaixo nesta ordem:



1\. `01\_PRODUCT\_SCOPE.md`

2\. `02\_ARCHITECTURE.md`

3\. `03\_SECURITY.md`

4\. `04\_QA.md`

5\. `05\_UI\_UX\_RULES.md`

6\. `06\_CODE\_RULES.md`



Antes de finalizar qualquer tarefa, consulte também:



7\. `07\_CHANGELOG.md`

8\. `08\_DECISIONS.md`

9\. `09\_PENDING\_ISSUES.md`



Se algum desses arquivos não existir, siga com cautela, registre essa ausência e não invente contexto.



\---



\## Fluxo obrigatório de trabalho

Sempre siga este fluxo:



1\. Entender a solicitação recebida.

2\. Ler este arquivo e os arquivos de contexto obrigatórios.

3\. Identificar restrições técnicas, funcionais, visuais e de segurança.

4\. Avaliar impacto da mudança antes de implementar.

5\. Preservar tudo o que já funciona corretamente.

6\. Alterar somente o necessário para atender a solicitação com qualidade.

7\. Validar efeitos colaterais, regressões, riscos e compatibilidade.

8\. Registrar corretamente o que foi feito nos arquivos de memória operacional.

9\. Entregar a solução de forma clara, organizada e tecnicamente coerente.



\---



\## Regras gerais obrigatórias



\### 1. Preserve o que já funciona

Não altere comportamento, estrutura, layout, nomenclatura, fluxo, regra de negócio ou arquitetura sem necessidade real.



Não refatore por impulso.



Não mude algo só porque existe uma forma “mais bonita” ou “mais moderna” se a versão atual já estiver correta, estável e aderente ao projeto.



\---



\### 2. Não destrua o front-end

Se a tarefa não pede alteração visual, preserve o visual existente.



Não mude layout, espaçamento, hierarquia visual, componentes, responsividade, comportamento em navegador, comportamento em TV, comportamento em mobile ou experiência do usuário sem necessidade funcional explícita.



Se uma correção técnica puder ser feita sem mexer no visual, essa abordagem deve ser priorizada.



\---



\### 3. Respeite a arquitetura do projeto

Não invente padrões paralelos.



Não crie uma nova forma de organizar código se o projeto já possui uma convenção.



Não misture responsabilidades.



Não espalhe lógica de negócio em camadas erradas.



Toda implementação deve respeitar a arquitetura e os padrões já definidos no projeto.



\---



\### 4. Segurança é obrigatória

Toda solução deve considerar segurança desde a origem.



Valide entradas.



Restrinja acessos.



Evite exposição de segredos.



Evite vazamento de dados sensíveis.



Não implemente soluções inseguras apenas para “fazer funcionar”.



Se houver conflito entre rapidez e segurança, priorize segurança.



\---



\### 5. Qualidade é obrigatória

Não entregue solução incompleta disfarçada de solução final.



Não considerar um código “pronto” apenas porque ele compila ou executa.



Toda alteração deve ser pensada também em:

\- legibilidade

\- manutenção

\- estabilidade

\- previsibilidade

\- impacto colateral

\- teste

\- regressão



\---



\### 6. Evite mudanças desnecessárias

Altere o mínimo possível para resolver corretamente o problema.



Se a tarefa for pontual, a solução também deve ser pontual.



Evite renomear arquivos, funções, variáveis, componentes, rotas ou estruturas sem necessidade forte e justificada.



\---



\### 7. Não remova código sem validação

Antes de remover qualquer trecho, avalie:

\- se realmente está sem uso

\- se não será usado por outro fluxo

\- se não é parte de integração futura

\- se não afeta comportamento indireto



Se remover algo, registre a remoção no histórico do projeto.



\---



\### 8. Não invente contexto ausente

Se faltar informação no projeto, não invente regras, decisões antigas, arquitetura anterior ou comportamento esperado.



Assuma somente o que puder ser sustentado pelo código, pelos arquivos de contexto e pela solicitação recebida.



\---



\## Regras de decisão

Quando houver mais de uma forma de implementar, priorize nesta ordem:



1\. segurança

2\. aderência ao escopo do projeto

3\. preservação do comportamento atual

4\. compatibilidade com arquitetura existente

5\. clareza e manutenção

6\. menor impacto colateral

7\. simplicidade

8\. performance, quando relevante



\---



\## Definition of Done

Uma tarefa só pode ser considerada concluída quando atender a todos os critérios abaixo:



\- resolve o problema solicitado

\- respeita o escopo do produto

\- respeita a arquitetura do projeto

\- respeita as regras de segurança

\- respeita as regras de QA

\- respeita as regras de UI/UX

\- não cria regressões conhecidas

\- não altera desnecessariamente partes estáveis

\- mantém coerência com o restante do sistema

\- registra corretamente o que foi feito



Se algum desses pontos não for atendido, a tarefa não deve ser tratada como concluída.



\---



\## Registro obrigatório de memória operacional

Sempre que fizer alterações relevantes, atualize os arquivos adequados:



\### Atualize `07\_CHANGELOG.md` quando:

\- criar funcionalidade

\- corrigir bug

\- alterar comportamento

\- refatorar código

\- remover código

\- ajustar estrutura

\- mudar integrações

\- alterar validações

\- alterar visual relevante



\### Atualize `08\_DECISIONS.md` quando:

\- houver decisão técnica importante

\- houver escolha entre abordagens

\- houver definição de padrão

\- houver descarte de alternativa

\- houver mudança de direção técnica ou funcional



\### Atualize `09\_PENDING\_ISSUES.md` quando:

\- identificar bug não resolvido

\- encontrar limitação técnica

\- notar débito técnico

\- perceber risco futuro

\- detectar pendência funcional

\- encontrar ponto que precisa ser validado depois



\---



\## O que nunca fazer

Nunca faça nenhum dos itens abaixo sem necessidade explícita e justificada:



\- reescrever grandes partes do sistema sem motivo forte

\- alterar visual só porque acha outra abordagem mais bonita

\- trocar stack sem decisão formal

\- criar dependência nova sem real necessidade

\- mudar nomes amplamente sem benefício concreto

\- misturar regra de negócio com interface

\- ignorar segurança para ganhar velocidade

\- ignorar testes e validações

\- apagar contexto anterior

\- sobrescrever decisões já tomadas sem registrar nova decisão

\- tratar suposição como fato



\---



\## Comportamento esperado ao receber uma tarefa

Ao receber uma nova solicitação, seu comportamento esperado deve ser:



1\. Ler os arquivos obrigatórios.

2\. Entender o problema de forma contextual.

3\. Identificar impacto da mudança.

4\. Executar a menor alteração correta possível.

5\. Validar a integridade da solução.

6\. Registrar a alteração nos arquivos apropriados.

7\. Entregar um resultado coerente com o projeto.



\---



\## Formato de atuação esperado

Ao implementar algo, priorize:



\- clareza

\- previsibilidade

\- manutenção

\- segurança

\- estabilidade

\- aderência ao projeto existente



A solução deve parecer continuação natural do projeto, e não um bloco estranho inserido artificialmente.



\---



\## Regra final

Se houver conflito entre:

\- rapidez e segurança

\- estética e estabilidade

\- refatoração e previsibilidade

\- inovação e aderência ao projeto



priorize sempre:

\*\*segurança, estabilidade, aderência ao projeto e previsibilidade\*\*.



Este arquivo deve ser tratado como instrução permanente de trabalho neste projeto.

