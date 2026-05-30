# Statement from the developer of this project

## 2026
Well... The Model of the United Nations (aka: Simulação da ONU) has come to an end. It was an amazing 3 days where I finally felt connected with ALL my school colleagues from Logistics, Media, Clerks, Sector Chiefs, and the Secretary-General.

At the beginning of this project [(aka 3 months ago)](https://github.com/ARLBR10/school-un-simulation/commit/4a2ee47f8969665856b59451fa00ea53f289170c), I was lost, and UI development was a mess [(freaking GitHub Copilot ending Claude Opus access)](https://github.com/orgs/community/discussions/189268). Still, I learned how to overcome a lot of challenges and discovered the beauty of shadcn/ui components, [TanStack Start](https://github.com/ARLBR10/school-un-simulation/pull/1), [Nitro deployments](https://nitro.build/deploy), [browser notifications](https://github.com/ARLBR10/school-un-simulation/commit/9ebe05d3d2e1d085538ff35a4d2302176d91589d), Convex [Workpool](https://www.convex.dev/components/workpool) and [Workflow](https://www.convex.dev/components/workflow), and so much more. Without this project, I would not have pushed myself to work with all of that.

On the first day, I fixed a lot of bugs that the platform had, and I also realized how many limitations were built into the project at the concept level. The grading system, for example, [with its first initial public form](https://github.com/ARLBR10/school-un-simulation/commit/b0b02f3e7cdbf33aa0982553f2420af446777271), sucked a LOT in terms of usability and required a little bit of head-smashing to get it into a [more usable state](https://github.com/ARLBR10/school-un-simulation/commit/824ffdd63c0aa4c462207abd967ab33a3eb84cf1).

Some of my problems with user experience also came from not steering AI in the right direction.

There were also problems on the member registry side. In my head, I would never need to [add classes to the members schema](https://github.com/ARLBR10/school-un-simulation/commit/f689cd73b41d1fe375402fcd5016509548e58161), but after needing it for [the presence list](https://github.com/ARLBR10/school-un-simulation/commit/0c62d22e92f0c22963a1a17bd5a3dfa01a30f78f), I realized that there were a lot of flaws baked into the project.

Even though this whole project, and the event itself, had a lot of flaws, I think some people realized that with a little bit of will and code, a lot of problems can be fixed before they even reach the production line. I also wanna thank all of the amazing people, such as the Logistics Chief **REDACTED**, for allowing me to grow and develop this amazing project with the help of AI. A lot of love from people all around me came because of this.

I hope I will become the Chief of Logistics in 2027, and with a bit of code, I can turn today's headaches into tomorrow's happiness with automatic things such as:

- Automatic designation system for delegates
- Spotlight designator, with easy access for clerks to handle justifications and other needs.
- Automatic banner creator for news
- More equal grading parameters across the committees, reducing inequality across different checkers [(maybe they finally allow my AI Document Analysis workflow?)](./convex/documents.ts#documentAnalysisWorkflow)
- Less scattered data. I never got access to who every single member was, so the attendance system was a mess and required manual intervention.
- Automatic Nameplate generators.

<details>
<summary>Tradução em português</summary>

## 2026

Bem... A Simulação da ONU chegou ao fim. Foram 3 dias incríveis em que eu finalmente me senti conectado com TODOS os meus colegas da escola, incluindo Logística, Mídia, Mesarios, Chefes de Setor e o Secretário-Geral.

No início deste projeto [(ou seja, 3 meses atrás)](https://github.com/ARLBR10/school-un-simulation/commit/4a2ee47f8969665856b59451fa00ea53f289170c), eu estava perdido, e o desenvolvimento da interface estava uma bagunça [(maldito GitHub Copilot acabando com o acesso ao Claude Opus)](https://github.com/orgs/community/discussions/189268). Ainda assim, aprendi a superar muitos desafios e descobri a beleza dos componentes shadcn/ui, do [TanStack Start](https://github.com/ARLBR10/school-un-simulation/pull/1), dos [deployments com Nitro](https://nitro.build/deploy), das [notificações do navegador](https://github.com/ARLBR10/school-un-simulation/commit/9ebe05d3d2e1d085538ff35a4d2302176d91589d), do Convex [Workpool](https://www.convex.dev/components/workpool), do [Workflow](https://www.convex.dev/components/workflow), e de muito mais. Sem este projeto, eu não teria me forçado a trabalhar com tudo isso.

No primeiro dia, corrigi muitos bugs que a plataforma tinha, e também percebi quantas limitações estavam embutidas no projeto desde o nível conceitual. O sistema de avaliação, por exemplo, [com seu primeiro formulário público inicial](https://github.com/ARLBR10/school-un-simulation/commit/b0b02f3e7cdbf33aa0982553f2420af446777271), era MUITO ruim em termos de usabilidade e exigiu um pouco de dor de cabeça para chegar a um [estado mais utilizável](https://github.com/ARLBR10/school-un-simulation/commit/824ffdd63c0aa4c462207abd967ab33a3eb84cf1).

Alguns dos meus problemas com experiência do usuário também vieram de não guiar a IA na direção certa.

Também havia problemas no lado do cadastro de membros. Na minha cabeça, eu nunca precisaria [adicionar turmas ao schema de membros](https://github.com/ARLBR10/school-un-simulation/commit/f689cd73b41d1fe375402fcd5016509548e58161), mas depois de precisar disso para [a lista de presença](https://github.com/ARLBR10/school-un-simulation/commit/0c62d22e92f0c22963a1a17bd5a3dfa01a30f78f), percebi que havia muitas falhas embutidas no projeto.

Mesmo que este projeto inteiro, e o próprio evento, tenham tido muitas falhas, acho que algumas pessoas perceberam que, com um pouco de vontade e código, muitos problemas podem ser resolvidos antes mesmo de chegarem à linha de produção. Também quero agradecer a todas as pessoas incríveis, como o Chefe de Logística **REDACTED**, por me permitirem crescer e desenvolver este projeto incrível com a ajuda de IA. Muito carinho das pessoas ao meu redor veio por causa disso.

Espero me tornar o Chefe de Logística em 2027 e, com um pouco de código, transformar as dores de cabeça de hoje na felicidade de amanhã com automações como:

- Sistema automático de designação de delegados
- Designador de destaques, com acesso fácil para que a mesa lide com justificativas e outras necessidades.
- Criador automático de banners para notícias
- Parâmetros de avaliação mais iguais entre os comitês, reduzindo desigualdades entre diferentes avaliadores [(talvez finalmente deixem meu workflow de Análise de Documentos com IA?)](./convex/documents.ts#documentAnalysisWorkflow)
- Dados menos espalhados. Eu nunca tive acesso a quem eram todos os membros, então o sistema de presença ficou uma bagunça e exigiu intervenção manual.
- Geradores automáticos de placas de identificação.

</details>
