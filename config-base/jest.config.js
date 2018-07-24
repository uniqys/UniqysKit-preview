module.exports = {
  transform: {
    "^.+\\.ts$": "ts-jest"
  },
  testEnvironment: "node",
  testMatch: [
    "<rootDir>/src/**/?(*.)test.(ts|js)"
  ],
  moduleFileExtensions: [
    'ts',
    'js'
  ],
  coverageThreshold: {
    'src/**/*.ts': {
      statements: 90,
      branches: 85,
      functions: 90,
    }
  },
};
