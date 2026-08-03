import {
  VeranaAuthorizationEvidence,
  VeranaTrustRole,
  VeranaTrustSummary,
  VeranaTrustVerdict,
} from '@procivis/react-native-one-core';

import {
  isVeranaTestnet,
  isVeranaTrustActionAllowed,
  safeHttpUrl,
  veranaAuthorizationOutcome,
  veranaRoleTranslationKey,
  veranaTrustBand,
  veranaVerdictTranslationKey,
} from './verana-trust';

const summary = (
  verdict: VeranaTrustVerdict,
  authorizations: Partial<VeranaAuthorizationEvidence>[] = [],
): VeranaTrustSummary =>
  ({
    authorizations,
    did: 'did:example:counterparty',
    resolverUrl: 'https://resolver.testnet.verana.network',
    role: VeranaTrustRole.ISSUER,
    schemas: ['https://issuer.example/vct/employee'],
    verdict,
  } as VeranaTrustSummary);

describe('isVeranaTrustActionAllowed', () => {
  it('blocks while the entity detail is still loading', () => {
    expect(isVeranaTrustActionAllowed(undefined, false)).toBe(false);
    expect(
      isVeranaTrustActionAllowed(
        summary(VeranaTrustVerdict.TRUSTED_AUTHORIZED),
        false,
      ),
    ).toBe(false);
  });

  it('never blocks when there is no Verana evidence at all', () => {
    expect(isVeranaTrustActionAllowed(undefined, true)).toBe(true);
  });

  it('allows only a trusted and authorized counterparty', () => {
    expect(
      isVeranaTrustActionAllowed(
        summary(VeranaTrustVerdict.TRUSTED_AUTHORIZED),
        true,
      ),
    ).toBe(true);
  });

  test.each([
    VeranaTrustVerdict.UNAUTHORIZED,
    VeranaTrustVerdict.MISMATCH,
    VeranaTrustVerdict.UNKNOWN_SCHEMA,
    VeranaTrustVerdict.UNTRUSTED,
    VeranaTrustVerdict.PARTIAL,
    VeranaTrustVerdict.UNAVAILABLE,
  ])('blocks %s', (verdict) => {
    expect(isVeranaTrustActionAllowed(summary(verdict), true)).toBe(false);
  });

  it('keeps NON_PRODUCTION with empty authorizations enabled as could-not-determine', () => {
    expect(
      isVeranaTrustActionAllowed(
        summary(VeranaTrustVerdict.NON_PRODUCTION),
        true,
      ),
    ).toBe(true);
  });

  it('gates NON_PRODUCTION on the real Q2/Q3 result when evidence exists', () => {
    expect(
      isVeranaTrustActionAllowed(
        summary(VeranaTrustVerdict.NON_PRODUCTION, [
          { authorized: true, schema: 'a' },
        ]),
        true,
      ),
    ).toBe(true);
    expect(
      isVeranaTrustActionAllowed(
        summary(VeranaTrustVerdict.NON_PRODUCTION, [
          { authorized: true, schema: 'a' },
          { authorized: false, schema: 'b' },
        ]),
        true,
      ),
    ).toBe(false);
  });
});

describe('veranaAuthorizationOutcome', () => {
  test.each([
    [VeranaTrustVerdict.TRUSTED_AUTHORIZED, 'GRANTED'],
    [VeranaTrustVerdict.UNAUTHORIZED, 'REFUSED'],
    [VeranaTrustVerdict.MISMATCH, 'REFUSED'],
    [VeranaTrustVerdict.UNKNOWN_SCHEMA, 'REFUSED'],
    [VeranaTrustVerdict.UNTRUSTED, 'REFUSED'],
    [VeranaTrustVerdict.PARTIAL, 'REFUSED'],
    [VeranaTrustVerdict.UNAVAILABLE, 'INDETERMINATE'],
    [VeranaTrustVerdict.NON_PRODUCTION, 'INDETERMINATE'],
  ])('%s -> %s', (verdict, outcome) => {
    expect(veranaAuthorizationOutcome(summary(verdict))).toBe(outcome);
  });

  it('reads the Q2/Q3 evidence under NON_PRODUCTION', () => {
    expect(
      veranaAuthorizationOutcome(
        summary(VeranaTrustVerdict.NON_PRODUCTION, [
          { authorized: true, schema: 'a' },
        ]),
      ),
    ).toBe('GRANTED');
    expect(
      veranaAuthorizationOutcome(
        summary(VeranaTrustVerdict.NON_PRODUCTION, [{ schema: 'a' }]),
      ),
    ).toBe('INDETERMINATE');
    expect(
      veranaAuthorizationOutcome(
        summary(VeranaTrustVerdict.NON_PRODUCTION, [
          { authorized: false, schema: 'a' },
        ]),
      ),
    ).toBe('REFUSED');
  });
});

describe('veranaTrustBand', () => {
  test.each([
    [VeranaTrustVerdict.TRUSTED_AUTHORIZED, 'TRUSTED'],
    [VeranaTrustVerdict.NON_PRODUCTION, 'TRUSTED'],
    [VeranaTrustVerdict.UNAUTHORIZED, 'TRUSTED'],
    [VeranaTrustVerdict.MISMATCH, 'TRUSTED'],
    [VeranaTrustVerdict.UNKNOWN_SCHEMA, 'TRUSTED'],
    [VeranaTrustVerdict.PARTIAL, 'PARTIAL'],
    [VeranaTrustVerdict.UNTRUSTED, 'UNTRUSTED'],
    [VeranaTrustVerdict.UNAVAILABLE, 'UNVERIFIED'],
  ])('%s -> %s', (verdict, band) => {
    expect(veranaTrustBand(verdict)).toBe(band);
  });
});

describe('isVeranaTestnet', () => {
  it('marks NON_PRODUCTION and a non-production Q1 as testnet', () => {
    expect(isVeranaTestnet(summary(VeranaTrustVerdict.NON_PRODUCTION))).toBe(
      true,
    );
    const withQ1 = {
      ...summary(VeranaTrustVerdict.TRUSTED_AUTHORIZED),
      q1: { production: false },
    } as VeranaTrustSummary;
    expect(isVeranaTestnet(withQ1)).toBe(true);
    expect(
      isVeranaTestnet(summary(VeranaTrustVerdict.TRUSTED_AUTHORIZED)),
    ).toBe(false);
  });
});

describe('translation keys', () => {
  it('maps every role and verdict to its translation key', () => {
    expect(veranaRoleTranslationKey(VeranaTrustRole.ISSUER)).toBe(
      'veranaTrust.role.ISSUER',
    );
    expect(veranaVerdictTranslationKey(VeranaTrustVerdict.UNAUTHORIZED)).toBe(
      'veranaTrust.verdict.UNAUTHORIZED',
    );
  });
});

describe('safeHttpUrl', () => {
  test.each([
    ['https://resolver.example/path', 'https://resolver.example/path'],
    ['http://resolver.example/path', 'http://resolver.example/path'],
  ])('allows safe HTTP links', (value, expected) => {
    expect(safeHttpUrl(value)).toBe(expected);
  });

  test.each([
    'javascript:alert(1)',
    'did:web:resolver.example',
    'file:///etc/passwd',
    'not a URL',
  ])('rejects unsafe dossier links: %s', (value) => {
    expect(safeHttpUrl(value)).toBeUndefined();
  });
});
