import {
  VeranaTrustRole,
  VeranaTrustVerdict,
} from '@procivis/react-native-one-core';

import {
  isVeranaTrustActionReady,
  isVeranaTrustPositive,
  isVeranaTrustTerminal,
  safeHttpUrl,
  veranaRoleTranslationKey,
  veranaVerdictTranslationKey,
} from './verana-trust';

describe('Verana trust verdicts', () => {
  test.each(Object.values(VeranaTrustVerdict))(
    'only TRUSTED_AUTHORIZED is positive: %s',
    (verdict) => {
      expect(isVeranaTrustPositive(verdict)).toBe(
        verdict === VeranaTrustVerdict.TRUSTED_AUTHORIZED,
      );
    },
  );

  it('does not treat a missing summary as terminal', () => {
    expect(isVeranaTrustTerminal(undefined)).toBe(false);
    expect(isVeranaTrustTerminal({} as never)).toBe(true);
  });

  it.each(Object.values(VeranaTrustVerdict))(
    'enables real review actions for every terminal verdict: %s',
    (verdict) => {
      const summary = { verdict } as never;
      expect(isVeranaTrustActionReady(summary)).toBe(true);
      expect(isVeranaTrustActionReady(summary, false)).toBe(false);
    },
  );

  it('keeps real review actions disabled before a terminal summary', () => {
    expect(isVeranaTrustActionReady(undefined)).toBe(false);
  });

  it('preserves native action policy when trust ecosystems are disabled', () => {
    expect(isVeranaTrustActionReady(undefined, true, false)).toBe(true);
    expect(isVeranaTrustActionReady(undefined, false, false)).toBe(false);
  });

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
