export type FormAnswerValue = string | number | boolean | string[];

export type FormOption = {
  label: string;
  value: string;
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
        { value: "arms-policy", label: "Política armamentista" },
        { value: "sanitation-education", label: "Saneamento e educação" },
        { value: "technological-future", label: "Futuro tecnológico" },
        {
          value: "terrorism-international-conflicts",
          label: "Terrorismo e conflitos internacionais",
        },
        { value: "climate-emergencies", label: "Emergências climáticas" },
        {
          value: "separatist-movements-nationalism",
          label: "Movimentos separatistas e nacionalismo",
        },
        {
          value: "police-violence-militias",
          label: "Violência policial: milícia",
        },
        { value: "racism", label: "Racismo" },
        { value: "immigrants", label: "Imigrantes" },
        {
          value: "human-rights-humanitarian-crisis",
          label: "Acesso aos direitos humanos: crise humanitária",
        },
        {
          value: "data-sovereignty-disinformation-democracies",
          label:
            "Soberania de dados, desinformação e a proteção das democracias",
        },
        {
          value: "multilateralism-international-law",
          label:
            "Crise no multilateralismo e cumprimento de leis internacionais",
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
