import type { Metadata } from "next";

import {
  LegalDocument,
  type LegalSection,
} from "@/components/legal/LegalDocument";

const updatedAt = "18 de maio de 2026";

const sections: LegalSection[] = [
  {
    title: "Aceitação dos termos",
    paragraphs: [
      "Ao acessar ou usar a plataforma da Simulação da ONU, você declara que leu, compreendeu e concorda com estes Termos de Serviço. Se você não concordar, não use a plataforma.",
      "A plataforma é mantida pelo responsável pelo projeto e usada para apoiar a organização, operação e acompanhamento de um evento escolar interno.",
    ],
  },
  {
    title: "Finalidade da plataforma",
    paragraphs: [
      "O sistema existe para gerenciar atividades relacionadas à simulação, incluindo contas de usuários, membros autorizados, comitês, notícias, documentos, presenças, notas e outras informações operacionais do evento.",
      "O uso deve permanecer vinculado à finalidade educacional, organizacional e administrativa da Simulação da ONU.",
    ],
  },
  {
    title: "Quem pode usar",
    paragraphs: [
      "O acesso é destinado a participantes, equipe, professores, coordenação e pessoas autorizadas pela organização do evento escolar interno.",
      "A criação de conta não garante acesso a áreas restritas. Contas sem vínculo autorizado podem ter acesso limitado ou bloqueado até validação pela organização.",
    ],
  },
  {
    title: "Responsabilidades do usuário",
    paragraphs: [
      "Você é responsável por manter seus dados de acesso em segurança e por usar a plataforma de forma compatível com as regras do evento e da instituição escolar.",
    ],
    items: [
      "Não compartilhe sua senha ou sessão com outras pessoas.",
      "Não tente acessar dados, páginas ou funções para as quais você não tem autorização.",
      "Não publique, envie ou registre informações falsas, ofensivas, discriminatórias, ilegais ou incompatíveis com o ambiente escolar.",
      "Informe a organização caso identifique erro, acesso indevido ou incidente de segurança.",
    ],
  },
  {
    title: "Dados e registros inseridos",
    paragraphs: [
      "Informações inseridas na plataforma podem ser usadas pela organização para conduzir o evento, validar participação, acompanhar presença, lançar notas, publicar comunicados e manter registros administrativos.",
      "A organização pode corrigir, remover ou restringir conteúdos e registros quando necessário para segurança, integridade do evento, cumprimento das regras internas ou atendimento a solicitações legítimas.",
    ],
  },
  {
    title: "Disponibilidade e alterações",
    paragraphs: [
      "A plataforma é oferecida conforme disponível. Podem ocorrer interrupções, manutenção, falhas técnicas ou alterações de funcionalidades sem aviso prévio, especialmente por se tratar de um projeto operacional de apoio ao evento.",
      "Estes termos podem ser atualizados para refletir mudanças no projeto, no evento ou em requisitos legais. A versão publicada nesta página substitui versões anteriores.",
    ],
  },
  {
    title: "Privacidade e monitoramento técnico",
    paragraphs: [
      "O uso da plataforma envolve tratamento de dados pessoais e registros técnicos, incluindo dados analíticos usados apenas para diagnóstico, segurança, auditoria e melhoria operacional.",
      "Para detalhes sobre categorias de dados, finalidades, direitos dos titulares e retenção, consulte a Política de Privacidade.",
    ],
  },
  {
    title: "Contato",
    paragraphs: [
      "Dúvidas sobre acesso, correções, privacidade ou uso da plataforma devem ser encaminhadas ao responsável pelo projeto ou à coordenação do evento pelos canais oficiais definidos pela organização.",
    ],
  },
];

export const metadata: Metadata = {
  title: "Termos de Serviço — Simulação da ONU",
  description:
    "Termos de uso da plataforma da Simulação da ONU para participantes e organização.",
};

export default function TermsPage() {
  return (
    <LegalDocument
      title="Termos de Serviço"
      description="Condições de acesso e uso da plataforma da Simulação da ONU."
      updatedAt={updatedAt}
      sections={sections}
      relatedLink={{ href: "/privacy", label: "a Política de Privacidade" }}
    />
  );
}
