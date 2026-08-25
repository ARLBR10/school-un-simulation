import { describe, expect, test } from "bun:test";

import {
  committeeSelection2027Form,
  eventIndependentSubmissionFields,
} from "../lib/forms";

describe("form definitions", () => {
  test("are independent from event slugs", () => {
    expect(committeeSelection2027Form).not.toHaveProperty("eventSlug");
  });

  test("clear legacy event associations when a response is updated", () => {
    expect(eventIndependentSubmissionFields).toEqual({ eventId: undefined });
  });
});
