import { describe, expect, test } from "bun:test";

import {
  committeeSelection2027Form,
  eventIndependentSubmissionFields,
  formatFormDeadline,
  formDefinitions,
  getFormDefinition,
  getFormAnswerDisplayValue,
  isFormExpired,
  toParticipation2026Form,
} from "../lib/forms";

describe("form definitions", () => {
  test("are independent from event slugs", () => {
    expect(committeeSelection2027Form).not.toHaveProperty("eventSlug");
  });

  test("clear legacy event associations when a response is updated", () => {
    expect(eventIndependentSubmissionFields).toEqual({ eventId: undefined });
  });

  test("the original form closes on September 2 at 18:00 Brasília time without changing its version", () => {
    expect(committeeSelection2027Form.version).toBe(2);
    expect(new Date(committeeSelection2027Form.expiresAt).toISOString()).toBe(
      "2026-09-02T21:00:00.000Z",
    );
  });

  test("TO closes on November 1 at 18:00 Brasília time", () => {
    expect(new Date(toParticipation2026Form.expiresAt).toISOString()).toBe(
      "2026-11-01T21:00:00.000Z",
    );
    expect(formatFormDeadline(toParticipation2026Form.expiresAt)).toBe("01/11/2026, 18:00");
  });

  test("forms expire exactly at their deadline", () => {
    for (const definition of formDefinitions) {
      expect(isFormExpired(definition, definition.expiresAt - 1)).toBe(false);
      expect(isFormExpired(definition, definition.expiresAt)).toBe(true);
      expect(isFormExpired(definition, definition.expiresAt + 1)).toBe(true);
    }
    expect(isFormExpired({ ...toParticipation2026Form, expiresAt: undefined }, Date.now())).toBe(false);
  });

  test("TO is registered with four required questions and explicit yes/no answers", () => {
    expect(getFormDefinition(toParticipation2026Form.key)).toBe(toParticipation2026Form);
    expect(toParticipation2026Form.fields).toHaveLength(4);
    expect(toParticipation2026Form.fields.every((field) => field.required)).toBe(true);
    expect(toParticipation2026Form.fields[1].options.map((option) => option.label)).toEqual([
      "Ensino médio",
      "Ensino fundamental",
    ]);
    for (const index of [0, 2, 3]) {
      expect(toParticipation2026Form.fields[index]).toHaveProperty("presentation", "checkboxes");
      expect(toParticipation2026Form.fields[index].options.map((option) => option.label)).toEqual(["Sim", "Não"]);
    }
  });

  test("answers display labels rather than internal values", () => {
    const fields = toParticipation2026Form.fields;
    expect(getFormAnswerDisplayValue(fields[0], "yes")).toBe("Sim");
    expect(getFormAnswerDisplayValue(fields[0], "no")).toBe("Não");
    expect(getFormAnswerDisplayValue(fields[1], "high-school")).toBe("Ensino médio");
    expect(getFormAnswerDisplayValue(fields[1], "elementary-school")).toBe("Ensino fundamental");
    expect(getFormAnswerDisplayValue(committeeSelection2027Form.fields[0], ["racism", "immigrants"])).toBe("Racismo, Imigrantes");
  });
});
