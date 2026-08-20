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
  version: 1,
  title: "Ajude a escolher os comitês de 2027",
  description:
    "Compartilhe suas preferências com a nova gestão e ajude a construir a próxima edição da simulação.",
  eventSlug: "school-onu-2027",
  submitLabel: "Enviar sugestões",
  successTitle: "Sugestões registradas",
  successDescription:
    "Obrigado por contribuir com a construção da Simulação da ONU de 2027. Você pode voltar e atualizar suas respostas enquanto o formulário estiver disponível.",
  fields: [
    {
      id: "committeePreferences",
      name: "Que tipos de comitê você gostaria de ver em 2027?",
      description:
        "Selecione quantas opções quiser ou escreva uma sugestão própria.",
      type: "multipleOptionsWithCustom",
      required: true,
      options: [
        { value: "security-council", label: "Conselho de Segurança" },
        { value: "general-assembly", label: "Assembleia Geral" },
        { value: "historical", label: "Comitê histórico" },
        { value: "international-court", label: "Tribunal internacional" },
        { value: "specialized-agency", label: "Agência especializada" },
      ],
    },
    {
      id: "topicSuggestions",
      name: "Quais temas ou crises deveriam ser debatidos?",
      description:
        "Esta pergunta é provisória e poderá ser substituída quando a gestão definir o conteúdo final.",
      type: "textarea",
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
