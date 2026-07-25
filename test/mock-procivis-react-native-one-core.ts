jest.mock('@procivis/react-native-one-core', () => ({
  CacheType: {},
  VeranaTrustRole: {
    ISSUER: 'ISSUER',
    VERIFIER: 'VERIFIER',
  },
  VeranaTrustVerdict: {
    MISMATCH: 'MISMATCH',
    NON_PRODUCTION: 'NON_PRODUCTION',
    PARTIAL: 'PARTIAL',
    TRUSTED_AUTHORIZED: 'TRUSTED_AUTHORIZED',
    UNAUTHORIZED: 'UNAUTHORIZED',
    UNAVAILABLE: 'UNAVAILABLE',
    UNKNOWN_SCHEMA: 'UNKNOWN_SCHEMA',
    UNTRUSTED: 'UNTRUSTED',
  },
}));
