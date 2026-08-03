import {
  VeranaTrustRole,
  VeranaTrustSummary,
  VeranaTrustVerdict,
} from '@procivis/react-native-one-core';

export type VeranaAuthorizationOutcome =
  | 'GRANTED'
  | 'INDETERMINATE'
  | 'REFUSED';

export type VeranaTrustBand =
  | 'PARTIAL'
  | 'TRUSTED'
  | 'UNTRUSTED'
  | 'UNVERIFIED';

export const veranaAuthorizationOutcome = (
  summary: VeranaTrustSummary,
): VeranaAuthorizationOutcome => {
  switch (summary.verdict) {
    case VeranaTrustVerdict.TRUSTED_AUTHORIZED:
      return 'GRANTED';
    case VeranaTrustVerdict.NON_PRODUCTION:
      // Pre-core-fix: the current core short-circuits NON_PRODUCTION with empty authorizations, so Q2/Q3 is indeterminate, not refused.
      if (!summary.authorizations.length) {
        return 'INDETERMINATE';
      }
      if (
        summary.authorizations.some(
          (authorization) => authorization.authorized === false,
        )
      ) {
        return 'REFUSED';
      }
      return summary.authorizations.every(
        (authorization) => authorization.authorized === true,
      )
        ? 'GRANTED'
        : 'INDETERMINATE';
    case VeranaTrustVerdict.UNAVAILABLE:
      return 'INDETERMINATE';
    default:
      return 'REFUSED';
  }
};

export const isVeranaTrustActionAllowed = (
  summary: VeranaTrustSummary | undefined,
  detailLoaded: boolean,
): boolean => {
  if (!detailLoaded) {
    return false;
  }
  // No Verana evidence at all (e.g. an x509 counterparty): the wallet's normal flow decides, never this gate.
  if (!summary) {
    return true;
  }
  switch (summary.verdict) {
    case VeranaTrustVerdict.TRUSTED_AUTHORIZED:
      return true;
    case VeranaTrustVerdict.NON_PRODUCTION:
      return veranaAuthorizationOutcome(summary) !== 'REFUSED';
    default:
      return false;
  }
};

export const veranaTrustBand = (
  verdict: VeranaTrustVerdict,
): VeranaTrustBand => {
  switch (verdict) {
    case VeranaTrustVerdict.UNTRUSTED:
      return 'UNTRUSTED';
    case VeranaTrustVerdict.PARTIAL:
      return 'PARTIAL';
    case VeranaTrustVerdict.UNAVAILABLE:
      return 'UNVERIFIED';
    default:
      return 'TRUSTED';
  }
};

export const isVeranaTestnet = (summary: VeranaTrustSummary): boolean =>
  summary.verdict === VeranaTrustVerdict.NON_PRODUCTION ||
  summary.q1?.production === false;

export const veranaVerdictTranslationKey = (verdict: VeranaTrustVerdict) =>
  `veranaTrust.verdict.${verdict}` as const;

export const veranaRoleTranslationKey = (role: VeranaTrustRole) =>
  `veranaTrust.role.${role}` as const;

export const safeHttpUrl = (value: string): string | undefined => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:'
      ? url.toString()
      : undefined;
  } catch {
    return undefined;
  }
};
