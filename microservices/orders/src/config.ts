import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

dotenv.config({
  path: resolve(dirname(fileURLToPath(import.meta.url)), "../.env"),
});

function requireEnv(key: string): string {
  const v = process.env[key];
  if (!v) {
    throw new Error(`${key} is required`);
  }
  return v;
}

export const config = {
  port: Number(process.env.PORT ?? 8080),
  databaseUrl: requireEnv("DATABASE_URL"),
};
