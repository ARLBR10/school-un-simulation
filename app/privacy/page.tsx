import type { Metadata } from "next";

import {
  LegalDocument,
  type LegalSection,
} from "@/components/legal/LegalDocument";

const updatedAt = "18 de maio de 2026";

const sections: LegalSection[] = [
  {
    title: "Responsável pelo tratamento",
    paragraphs: [
      "Esta Política de Privacidade descreve como o responsável pelo projeto trata dados pessoais na plataforma da Simulação da ONU, em apoio a um evento escolar interno.",
      "Quando a instituição escolar ou a coordenação do evento definir regras próprias de privacidade, essas regras também devem ser observadas em conjunto com esta política.",
    ],
  },
  {
    title: "Dados pessoais tratados",
    paragraphs: [
      "A plataforma pode tratar dados necessários para autenticação, autorização, participação e operação do evento.",
    ],
    items: [
      "Dados de conta, como nome, e-mail, credenciais, identificadores de usuário, sessões e configurações de segurança.",
      "Dados de participação, como vínculo com a simulação, tipo de membro, comitês, funções, presença, notas, documentos e registros administrativos.",
      "Dados técnicos e analíticos, como endereço IP, user-agent, fuso horário, tamanho de tela, navegador, sistema operacional, páginas acessadas, eventos de uso e horários de acesso.",
      "Registros de auditoria e segurança relacionados a autenticação, permissões, ações administrativas e diagnóstico de falhas.",
    ],
  },
  {
    title: "Finalidades do tratamento",
    paragraphs: [
      "Os dados são tratados apenas para finalidades relacionadas ao funcionamento, segurança e administração da plataforma e do evento.",
    ],
    items: [
      "Criar e autenticar contas de usuários.",
      "Controlar permissões e restringir áreas administrativas ou operacionais.",
      "Gerenciar participantes, equipes, comitês, documentos, notícias, presenças e notas.",
      "Diagnosticar erros, investigar incidentes, manter registros de auditoria e proteger a integridade do sistema.",
      "Melhorar a estabilidade, usabilidade e confiabilidade da plataforma durante o evento.",
    ],
  },
  {
    title: "Bases legais e LGPD",
    paragraphs: [
      "O tratamento pode se apoiar em bases legais previstas na Lei Geral de Proteção de Dados (LGPD), conforme o contexto, incluindo execução de atividades relacionadas ao evento, cumprimento de obrigações, legítimo interesse para segurança e prevenção a fraudes, e consentimento quando aplicável.",
      "Quando houver participantes menores de idade, a organização do evento deve avaliar as autorizações e comunicações necessárias junto aos responsáveis legais e à instituição escolar.",
    ],
  },
  {
    title: "Serviços de terceiros",
    paragraphs: [
      "A plataforma pode usar provedores técnicos para autenticação, banco de dados, hospedagem, arquivos, analytics e monitoramento. Esses provedores podem processar dados conforme necessário para prestar seus serviços.",
      "Dados analíticos coletados por ferramentas como PostHog são usados somente para diagnóstico, auditoria, segurança e melhoria operacional, não para publicidade comportamental.",
    ],
  },
  {
    title: "Cookies, sessões e armazenamento local",
    paragraphs: [
      "A plataforma pode usar cookies, tokens, sessões e armazenamento local para manter o usuário autenticado, proteger a conta, preservar preferências e registrar eventos técnicos necessários ao funcionamento do sistema.",
      "Bloquear esses recursos no navegador pode limitar ou impedir o uso da plataforma.",
    ],
  },
  {
    title: "Compartilhamento de dados",
    paragraphs: [
      "Os dados podem ser acessados por pessoas autorizadas da organização do evento conforme suas funções e permissões. Também podem ser compartilhados com provedores técnicos estritamente necessários para operar a plataforma.",
      "A plataforma não vende dados pessoais e não usa dados analíticos para publicidade comportamental.",
    ],
  },
  {
    title: "Retenção e exclusão",
    paragraphs: [
      "Os dados são mantidos pelo tempo necessário para operar o evento, preservar registros administrativos, resolver problemas, cumprir obrigações e manter segurança e auditoria.",
      "Quando os dados deixarem de ser necessários, poderão ser excluídos, anonimizados ou arquivados de acordo com critérios técnicos, administrativos e legais aplicáveis.",
    ],
  },
  {
    title: "Segurança",
    paragraphs: [
      "São adotadas medidas técnicas e organizacionais razoáveis para proteger contas, permissões, registros e dados pessoais contra acessos indevidos, alteração, perda ou divulgação não autorizada.",
      "Nenhum sistema é completamente imune a riscos. Em caso de suspeita de incidente, informe a organização do evento ou o responsável pelo projeto pelos canais oficiais.",
    ],
  },
  {
    title: "Direitos dos titulares",
    paragraphs: [
      "Nos termos da LGPD, titulares podem solicitar informações sobre tratamento de seus dados, correção, atualização, exclusão, anonimização, portabilidade quando aplicável, revisão de decisões e esclarecimentos sobre compartilhamento.",
      "Solicitações devem ser feitas ao responsável pelo projeto ou à coordenação do evento pelos canais oficiais. Algumas solicitações podem depender de validação de identidade e de análise de obrigações administrativas ou legais.",
    ],
  },
  {
    title: "Atualizações desta política",
    paragraphs: [
      "Esta política pode ser atualizada para refletir mudanças na plataforma, no evento, nos provedores técnicos ou em requisitos legais. A versão publicada nesta página substitui versões anteriores.",
    ],
  },
];

export const metadata: Metadata = {
  title: "Política de Privacidade — Simulação da ONU",
  description:
    "Como a plataforma da Simulação da ONU trata dados pessoais e registros técnicos.",
};

export default function PrivacyPage() {
  return (
    <LegalDocument
      title="Política de Privacidade"
      description="Como dados pessoais e registros técnicos são usados para operar a plataforma da Simulação da ONU."
      updatedAt={updatedAt}
      sections={sections}
      relatedLink={{ href: "/terms", label: "os Termos de Serviço" }}
    />
  );
}
