/**
 * Testler saf mantığı (sunucuyla konuşma katmanı ve kitaplık yardımcıları)
 * doğrular; bunlar için React Native çalışma zamanı gerekmediğinden ts-jest
 * yeterlidir. Expo modülleri sahte karşılıklarla değiştirilir.
 */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/src/**/*.test.ts'],
  moduleNameMapper: {
    '^expo-secure-store$': '<rootDir>/src/test/mocks/expo-secure-store.ts',
    '^expo-constants$': '<rootDir>/src/test/mocks/expo-constants.ts',
    '^react-native$': '<rootDir>/src/test/mocks/react-native.ts',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.jest.json' }],
  },
}
