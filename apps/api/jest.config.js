module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: ['**/*.ts', '!**/*.spec.ts', '!**/*.module.ts', '!**/main.ts'],
  coverageDirectory: '../coverage',
  coverageThreshold: {
    global: {
      statements: 40,
      branches: 25,
      functions: 25,
      lines: 40,
    },
  },
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@gym-admin/shared$': '<rootDir>/../../../packages/shared/src',
  },
};
