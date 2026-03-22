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
    'src/lib/utils.ts',
    'src/lib/validators.ts',
    'middleware.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60,
    },
  },
  testMatch: [
    '**/__tests__/**/*.test.[jt]s?(x)',
    '**/*.test.[jt]s?(x)',
  ],
};
