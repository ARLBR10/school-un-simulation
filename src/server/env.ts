type RuntimeEnv = Record<string, string | undefined>;

function getRuntimeEnv() {
  return (globalThis as typeof globalThis & { __env__?: RuntimeEnv }).__env__;
}

export function getServerEnv(name: string) {
  return process.env[name] ?? getRuntimeEnv()?.[name];
}
