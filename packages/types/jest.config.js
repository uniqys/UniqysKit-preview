const base = require('../../config-base/jest.config')

module.exports = Object.assign(base, {
  coverageThreshold: {
    // That has branch in only compiled code
    'src/@(optional|either).ts': {
      statements: 90,
      branches: 80,
      functions: 95,
    },
    'src/!(optional|either).ts': {
      statements: 90,
      branches: 85,
      functions: 90,
    }
  }
})
