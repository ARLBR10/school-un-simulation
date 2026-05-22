import { convexBetterAuthReactStart } from "@convex-dev/better-auth/react-start";

function validateAuthEnv() {
  const convexUrl = process.env.VITE_CONVEX_URL;
  const convexSiteUrl = process.env.VITE_CONVEX_SITE_URL;

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

const { convexUrl, convexSiteUrl } = validateAuthEnv();

export const {
  handler,
  getToken,
  fetchAuthQuery,
  fetchAuthMutation,
  fetchAuthAction,
} = convexBetterAuthReactStart({
  convexUrl,
  convexSiteUrl,
});
