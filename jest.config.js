const nextJest = require('next/jest');

const createJestConfig = nextJest({ dir: './' });

/** @type {import('jest').Config} */
const config = {
  testEnvironment: 'jest-environment-jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  testMatch: [
    '<rootDir>/__tests__/**/*.test.ts',
    '<rootDir>/__tests__/**/*.test.tsx',
  ],
  collectCoverageFrom: [
    'app/lib/**/*.ts',
    'app/api/**/*.ts',
    'app/components/**/*.tsx',
    '!app/**/*.d.ts',
  ],
  transformIgnorePatterns: ['node_modules/(?!(framer-motion)/)'],
};

module.exports = createJestConfig(config);
