export type FormAnswerValue = string | number | boolean | string[];

export type FormOption = {
  label: string;
  value: string;
  description?: string;
};

type BaseFormField = {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  required?: boolean;
};

export type FormField =
  | (BaseFormField & { type: "text" | "textarea" | "number" | "boolean" })
  | (BaseFormField & { type: "option"; options: FormOption[] })
  | (BaseFormField & {
      type: "multipleOptions" | "multipleOptionsWithCustom";
      options: FormOption[];
      minSelections?: number;
      maxSelections?: number;
    });

export type FormDefinition = {
  key: string;
  version: number;
  title: string;
  description?: string;
  imageUrl?: string;
  eventSlug: string;
  submitLabel?: string;
  successTitle?: string;
  successDescription?: string;
  fields: FormField[];
};

export const committeeSelection2027Form = {
  key: "committee-selection-2027",
  version: 2,
  title: "Ajude a escolher os temas de 2027",
  description:
    "Escolha os temas que você gostaria de ver na próxima edição da simulação.",
  eventSlug: "school-onu-2027",
  submitLabel: "Enviar sugestões",
  successTitle: "Sugestões registradas",
  successDescription:
    "Obrigado por contribuir com a construção da Simulação da ONU de 2027. Você pode voltar e atualizar suas respostas enquanto o formulário estiver disponível.",
  fields: [
    {
      id: "topicPreferences",
      name: "Quais temas você gostaria de ver em 2027?",
      description: "Selecione de 1 a 3 opções.",
      type: "multipleOptions",
      required: true,
      minSelections: 1,
      maxSelections: 3,
      options: [
        {
          value: "arms-policy",
          label: "Política armamentista",
          description:
            "Refere-se a como os países decidem produzir, adquirir, controlar e utilizar armas, impactando tanto a segurança global quanto o surgimento ou a prevenção de conflitos entre nações.",
        },
        {
          value: "sanitation-education",
          label: "Saneamento e educação",
          description:
            "Tratam do acesso universal a serviços de higiene, água potável e ensino de qualidade, impactando diretamente a saúde pública, a igualdade de oportunidades e o desenvolvimento socioeconômico global.",
        },
        {
          value: "technological-future",
          label: "Futuro tecnológico",
          description:
            "Refere-se ao avanço acelerado da inteligência artificial, da automação e da biotecnologia, influenciando as relações econômicas e sociais, o mercado de trabalho e a necessidade de regulamentação inclusiva.",
        },
        {
          value: "terrorism-international-conflicts",
          label: "Terrorismo e conflitos internacionais",
          description:
            "Envolvem o uso da violência e disputas entre países ou grupos, gerando instabilidade global e ameaçando a segurança internacional.",
        },
        {
          value: "climate-emergencies",
          label: "Emergências climáticas",
          description:
            "Dizem respeito ao aumento das temperaturas globais e à frequência de eventos extremos, exigindo cooperação internacional para conter danos ambientais, proteger a biodiversidade e mitigar impactos socioeconômicos.",
        },
        {
          value: "separatist-movements-nationalism",
          label: "Movimentos separatistas e nacionalismo",
          description:
            "O nacionalismo une um povo em torno de um país, enquanto o separatismo busca criar um novo país a partir de parte de um já existente, com base em diferenças culturais, políticas e históricas.",
        },
        {
          value: "police-violence-militias",
          label: "Violência policial e milícias",
          description:
            "Envolvem o uso abusivo da força por agentes de segurança e a atuação de grupos ilegais que controlam territórios e afetam a segurança da população.",
        },
        {
          value: "racism",
          label: "Racismo",
          description:
            "Refere-se a práticas socioestruturais e preconceitos baseados em raça e etnia, afetando a igualdade de direitos, o acesso a oportunidades e a preservação do respeito e da dignidade humana.",
        },
        {
          value: "immigrants",
          label: "Imigrantes",
          description:
            "O tema trata do deslocamento de pessoas entre países em busca de segurança ou oportunidades, impactando as dinâmicas demográficas, o desenvolvimento econômico e a garantia dos direitos humanos.",
        },
        {
          value: "human-rights-humanitarian-crisis",
          label: "Acesso aos direitos humanos: crise humanitária",
          description:
            "Uma crise humanitária ocorre quando uma guerra, um terremoto ou uma doença deixa muitas pessoas sem comida, água e segurança; os direitos humanos existem justamente para que ninguém passe por isso sem ajuda.",
        },
        {
          value: "data-sovereignty-disinformation-democracies",
          label:
            "Soberania de dados, desinformação e a proteção das democracias",
          description:
            "Dizem respeito ao controle sobre as informações digitais e ao combate a narrativas falsas, influenciando a integridade das instituições políticas, a privacidade dos cidadãos e a estabilidade democrática.",
        },
        {
          value: "multilateralism-international-law",
          label:
            "Crise no multilateralismo e cumprimento de leis internacionais",
          description:
            "O multilateralismo ocorre quando os países estabelecem regras para resolver problemas em conjunto. Esse sistema vive uma crise porque muitos preferem agir sozinhos, deixando essas regras apenas no papel.",
        },
      ],
    },
  ],
} satisfies FormDefinition;

export const formDefinitions = [committeeSelection2027Form] as const;

export function getFormDefinition(key: string): FormDefinition | undefined {
  return formDefinitions.find((definition) => definition.key === key);
}

export function getFormField(
  definition: FormDefinition,
  fieldId: string,
): FormField | undefined {
  return definition.fields.find((field) => field.id === fieldId);
}

export function getFormOptionLabel(field: FormField, value: string) {
  if (!("options" in field)) return value;
  return field.options.find((option) => option.value === value)?.label ?? value;
}
