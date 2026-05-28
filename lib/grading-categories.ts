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
  graderTypes: GradingMemberType[];
  maxAmount: number;
  day?: 1 | 2;
};

// Delegates receive these entries; clerks grade them, with logistics as backup.
const delegateGraderTypes: GradingMemberType[] = ["clerk", "logistics"];

export const gradeCategories: GradingCategoryDefinition[] = [
  {
    value: "position_paper",
    label: "Documento de Posição Oficial",
    memberTypes: ["delegate"],
    graderTypes: delegateGraderTypes,
    maxAmount: 0.7,
    day: 1,
  },
  {
    value: "resolution_paragraph_creation",
    label: "Criação de parágrafos para resolução",
    memberTypes: ["delegate"],
    graderTypes: delegateGraderTypes,
    maxAmount: 0.5,
    day: 1,
  },
  {
    value: "economic_bloc_dialogue",
    label: "Diálogo entre blocos econômicos",
    memberTypes: ["delegate"],
    graderTypes: delegateGraderTypes,
    maxAmount: 0.3,
    day: 1,
  },
  {
    value: "argumentation",
    label: "Argumentação",
    memberTypes: ["delegate"],
    graderTypes: delegateGraderTypes,
    maxAmount: 1,
    day: 2,
  },
];

export const deductionCategories: GradingCategoryDefinition[] = [
  {
    value: "disrespect_table_logistics_press",
    label: "Desrespeitos aos membros da mesa, logística ou imprensa",
    memberTypes: ["delegate"],
    graderTypes: delegateGraderTypes,
    maxAmount: 0.3,
  },
  {
    value: "disrespect_delegate",
    label: "Desrespeito a outro delegado",
    memberTypes: ["delegate"],
    graderTypes: delegateGraderTypes,
    maxAmount: 0.3,
  },
  {
    value: "improper_clothing",
    label: "Roupa indevida",
    memberTypes: ["delegate"],
    graderTypes: delegateGraderTypes,
    maxAmount: 0.3,
  },
  {
    value: "sleeping_during_simulation",
    label: "Dormir durante a simulação",
    memberTypes: ["delegate"],
    graderTypes: delegateGraderTypes,
    maxAmount: 0.5,
  },
  {
    value: "late_arrival",
    label: "Chegar atrasado",
    memberTypes: ["delegate"],
    graderTypes: delegateGraderTypes,
    maxAmount: 0.1,
  },
  {
    value: "unexcused_absence",
    label: "Falta não justificada",
    memberTypes: ["delegate"],
    graderTypes: delegateGraderTypes,
    maxAmount: 0.5,
  },
  {
    value: "unauthorized_room_exit",
    label: "Sair da sala sem autorização",
    memberTypes: ["delegate"],
    graderTypes: delegateGraderTypes,
    maxAmount: 0.2,
  },
  {
    value: "unauthorized_seat_change",
    label: "Mudar de lugar sem autorização",
    memberTypes: ["delegate"],
    graderTypes: delegateGraderTypes,
    maxAmount: 0.2,
  },
  {
    value: "other",
    label: "Outros",
    memberTypes: ["delegate"],
    graderTypes: delegateGraderTypes,
    maxAmount: 1,
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

export function getAllowedCategoriesForMemberAndGraderType(
  kind: GradingEntryKind,
  memberType: GradingMemberType | undefined,
  graderType: GradingMemberType | undefined,
  isAdmin = false,
) {
  if (!memberType || (!graderType && !isAdmin)) {
    return [];
  }

  return getCategoriesForKind(kind).filter(
    (category) =>
      category.memberTypes.includes(memberType) &&
      (isAdmin || (graderType ? category.graderTypes.includes(graderType) : false)),
  );
}

export function getAllowedMemberTypesForGraderType(
  graderType: GradingMemberType | undefined,
  isAdmin = false,
) {
  if (!graderType && !isAdmin) {
    return [];
  }

  const categories = [...gradeCategories, ...deductionCategories];
  const memberTypes = new Set<GradingMemberType>();

  for (const category of categories) {
    if (isAdmin || (graderType && category.graderTypes.includes(graderType))) {
      for (const memberType of category.memberTypes) {
        memberTypes.add(memberType);
      }
    }
  }

  return [...memberTypes];
}

export function canGraderUseCategory(
  category: GradingCategoryDefinition,
  graderType: GradingMemberType | undefined,
  isAdmin = false,
) {
  return isAdmin || (graderType ? category.graderTypes.includes(graderType) : false);
}
