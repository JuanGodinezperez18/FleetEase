/**
 * @fileoverview Configuración de Jest para Testing
 * 
 * Para ejecutar tests:
 * - npm run test (modo watch)
 * - npm run test:ci (CI/CD)
 * - npm run test:coverage (con cobertura)
 */

module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/middleware$': '<rootDir>/middleware',
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/.next/',
  ],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }],
  },
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    'middleware.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.{js,jsx,ts,tsx}',
    '!src/__tests__/**',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/types/**',
  ],
  // Cobertura real medida sobre TODO src/ (antes solo se medía sobre 3 archivos).
  // Baseline actual ~2% al ampliar el alcance (27-08-2026). Ir subiendo este
  // umbral a medida que se agreguen tests, en vez de bajarlo si falla.
  coverageThreshold: {
    global: {
      branches: 1,
      functions: 1,
      lines: 1,
      statements: 1,
    },
  },
  testMatch: [
    '**/__tests__/**/*.test.[jt]s?(x)',
    '**/*.test.[jt]s?(x)',
  ],
};
