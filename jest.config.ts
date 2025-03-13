module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    testMatch: ['**/__tests__/**/*.test.ts'],
    transform: {
    '^.+\\.tsx?$': [
        'ts-jest',
        {
        tsconfig: 'tsconfig.json',
        },
    ],
    },
    collectCoverage: true,
    coverageDirectory: 'coverage',
    coveragePathIgnorePatterns: [
    '/node_modules/',
    '/__tests__/',
    '/dist/'
    ]
};