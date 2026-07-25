import {
  VeranaTrustRole,
  VeranaTrustSummary,
  VeranaTrustVerdict,
} from '@procivis/react-native-one-core';

export const isVeranaTrustTerminal = (
  summary: VeranaTrustSummary | undefined,
): boolean => summary !== undefined;

export const isVeranaTrustActionReady = (
  summary: VeranaTrustSummary | undefined,
  nativeReady = true,
  trustEcosystemsEnabled = true,
): boolean =>
  nativeReady && (!trustEcosystemsEnabled || isVeranaTrustTerminal(summary));

export const isVeranaTrustPositive = (verdict: VeranaTrustVerdict): boolean =>
  verdict === VeranaTrustVerdict.TRUSTED_AUTHORIZED;

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
