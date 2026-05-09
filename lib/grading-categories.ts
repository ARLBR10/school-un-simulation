export type GradingMemberType =
  | "delegate"
  | "logistics"
  | "press"
  | "clerk"
  | "teacher"
  | "admin";

export type GradingEntryKind = "grade" | "deduction";

export type GradingCategoryDefinition = {
  value: string;
  label: string;
  memberTypes: GradingMemberType[];
  maxAmount: number;
  day?: 1 | 2;
};

export const gradeCategories: GradingCategoryDefinition[] = [
  {
    value: "position_paper",
    label: "Documento de Posição Oficial",
    memberTypes: ["delegate"],
    maxAmount: 0.7,
    day: 1,
  },
  {
    value: "resolution_paragraph_creation",
    label: "Criação de parágrafos para resolução",
    memberTypes: ["delegate"],
    maxAmount: 0.5,
    day: 1,
  },
  {
    value: "economic_bloc_dialogue",
    label: "Diálogo entre blocos econômicos",
    memberTypes: ["delegate"],
    maxAmount: 0.3,
    day: 1,
  },
  {
    value: "argumentation",
    label: "Argumentação",
    memberTypes: ["delegate"],
    maxAmount: 1,
    day: 2,
  },
];

export const deductionCategories: GradingCategoryDefinition[] = [
  {
    value: "disrespect_table_logistics_press",
    label: "Desrespeitos aos membros da mesa, logística ou imprensa",
    memberTypes: ["delegate"],
    maxAmount: 0.3,
  },
  {
    value: "disrespect_delegate",
    label: "Desrespeito a outro delegado",
    memberTypes: ["delegate"],
    maxAmount: 0.3,
  },
  {
    value: "improper_clothing",
    label: "Roupa indevida",
    memberTypes: ["delegate"],
    maxAmount: 0.3,
  },
  {
    value: "sleeping_during_simulation",
    label: "Dormir durante a simulação",
    memberTypes: ["delegate"],
    maxAmount: 0.5,
  },
  {
    value: "late_arrival",
    label: "Chegar atrasado",
    memberTypes: ["delegate"],
    maxAmount: 0.1,
  },
  {
    value: "unexcused_absence",
    label: "Falta não justificada",
    memberTypes: ["delegate"],
    maxAmount: 0.5,
  },
  {
    value: "unauthorized_room_exit",
    label: "Sair da sala sem autorização",
    memberTypes: ["delegate"],
    maxAmount: 0.2,
  },
  {
    value: "unauthorized_seat_change",
    label: "Mudar de lugar sem autorização",
    memberTypes: ["delegate"],
    maxAmount: 0.2,
  },
];

export function getCategoriesForKind(kind: GradingEntryKind) {
  return kind === "grade" ? gradeCategories : deductionCategories;
}

export function getCategoryDefinition(
  kind: GradingEntryKind,
  category: string,
) {
  return getCategoriesForKind(kind).find(
    (currentCategory) => currentCategory.value === category,
  );
}

export function getAllowedCategoriesForMemberType(
  kind: GradingEntryKind,
  memberType: GradingMemberType | undefined,
) {
  if (!memberType) {
    return [];
  }

  return getCategoriesForKind(kind).filter((category) =>
    category.memberTypes.includes(memberType),
  );
}
