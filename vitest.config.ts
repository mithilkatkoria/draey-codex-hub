import { defineConfig } from 'vitest/config';

// Release tooling uses node:test and is run separately in CI.
export default defineConfig({ test: { include: ['src/**/*.test.{ts,tsx}'] } });
