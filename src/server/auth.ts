import { convexBetterAuthReactStart } from "@convex-dev/better-auth/react-start";
import type {
  FunctionReference,
  FunctionReturnType,
  OptionalRestArgs,
} from "convex/server";

import { getServerEnv } from "@/src/server/env";

type AuthHelpers = ReturnType<typeof convexBetterAuthReactStart>;

let authHelpers: AuthHelpers | null = null;

function validateAuthEnv() {
  const convexUrl = getServerEnv("VITE_CONVEX_URL");
  const convexSiteUrl = getServerEnv("VITE_CONVEX_SITE_URL");

  if (!convexUrl || !convexSiteUrl) {
    const missingEnvVars = [
      ["VITE_CONVEX_URL", convexUrl],
      ["VITE_CONVEX_SITE_URL", convexSiteUrl],
    ]
      .filter(([, value]) => !value)
      .map(([name]) => name);

    throw new Error(
      `Missing required auth environment variables: ${missingEnvVars.join(", ")}`,
    );
  }

  return {
    convexUrl,
    convexSiteUrl,
  };
}

function getAuthHelpers() {
  if (authHelpers) {
    return authHelpers;
  }

  const { convexUrl, convexSiteUrl } = validateAuthEnv();

  authHelpers = convexBetterAuthReactStart({
    convexUrl,
    convexSiteUrl,
  });

  return authHelpers;
}

export function handler(request: Request) {
  return getAuthHelpers().handler(request);
}

export function getToken() {
  return getAuthHelpers().getToken();
}

export function fetchAuthQuery<Query extends FunctionReference<"query">>(
  query: Query,
  ...args: OptionalRestArgs<Query>
): Promise<FunctionReturnType<Query>> {
  return getAuthHelpers().fetchAuthQuery(query, ...args);
}

export function fetchAuthMutation<
  Mutation extends FunctionReference<"mutation">,
>(
  mutation: Mutation,
  ...args: OptionalRestArgs<Mutation>
): Promise<FunctionReturnType<Mutation>> {
  return getAuthHelpers().fetchAuthMutation(mutation, ...args);
}

export function fetchAuthAction<Action extends FunctionReference<"action">>(
  action: Action,
  ...args: OptionalRestArgs<Action>
): Promise<FunctionReturnType<Action>> {
  return getAuthHelpers().fetchAuthAction(action, ...args);
}
