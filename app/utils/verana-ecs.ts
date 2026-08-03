import {
  VeranaTrustClaim,
  VeranaTrustCredential,
} from '@procivis/react-native-one-core';

export type EcsAssetRef = {
  digest?: string;
  uri: string;
};

export type EcsService = {
  description?: string;
  descriptionFormat: 'text/markdown' | 'text/plain';
  id?: string;
  logo?: EcsAssetRef;
  minimumAgeRequired?: number;
  name?: string;
  privacy?: EcsAssetRef;
  terms?: EcsAssetRef;
  type?: string;
};

export type EcsOrganization = {
  address?: string;
  countryCode?: string;
  id?: string;
  legalJurisdiction?: string;
  lei?: string;
  logo?: EcsAssetRef;
  name?: string;
  organizationKind?: string;
  registryId?: string;
  registryUri?: string;
};

export type EcsVerdict = 'PARTIAL' | 'TRUSTED' | 'UNTRUSTED';

const claim = (
  claims: VeranaTrustClaim[] | undefined,
  key: string,
): VeranaTrustClaim | undefined => claims?.find((entry) => entry.name === key);

const str = (
  claims: VeranaTrustClaim[] | undefined,
  key: string,
): string | undefined => {
  const entry = claim(claims, key);
  return entry?.valueType === 'string' && entry.value.length > 0
    ? entry.value
    : undefined;
};

// The core serializes non-string claim values to JSON text, so numbers arrive as digits in `value` with valueType "number".
const int = (
  claims: VeranaTrustClaim[] | undefined,
  key: string,
): number | undefined => {
  const entry = claim(claims, key);
  if (entry?.valueType !== 'number') {
    return undefined;
  }
  const value = Number(entry.value);
  return Number.isFinite(value) ? value : undefined;
};

// The published schemas are v4 (`<thing>Uri` + `<thing>DigestSri`) but the deployed
// testnet services still issue v3 (`<thing>` + `<thing>Hash`, and no logo digest at
// all). Both shapes have to read until every service is re-issued.
const asset = (
  claims: VeranaTrustClaim[] | undefined,
  v4Uri: string,
  v4Digest: string,
  v3Uri: string,
  v3Digest?: string,
): EcsAssetRef | undefined => {
  const uri = str(claims, v4Uri) ?? str(claims, v3Uri);
  if (!uri) {
    return undefined;
  }
  const digest =
    str(claims, v4Digest) ?? (v3Digest ? str(claims, v3Digest) : undefined);
  return digest ? { digest, uri } : { uri };
};

const isValid = (credential: VeranaTrustCredential | undefined): boolean =>
  credential?.result === 'VALID';

// Claims render as facts only from credentials the resolver verified.
export const readEcsService = (
  credential: VeranaTrustCredential | undefined,
): EcsService | undefined => {
  const claims = credential?.claims;
  if (!claims || !isValid(credential)) {
    return undefined;
  }

  const format = str(claims, 'descriptionFormat');
  return {
    description: str(claims, 'description'),
    descriptionFormat:
      format === 'text/markdown' ? 'text/markdown' : 'text/plain',
    id: str(claims, 'id'),
    logo: asset(claims, 'logoUri', 'logoDigestSri', 'logo'),
    minimumAgeRequired: int(claims, 'minimumAgeRequired'),
    name: str(claims, 'name'),
    privacy: asset(
      claims,
      'privacyPolicyUri',
      'privacyPolicyDigestSri',
      'privacyPolicy',
      'privacyPolicyHash',
    ),
    terms: asset(
      claims,
      'termsAndConditionsUri',
      'termsAndConditionsDigestSri',
      'termsAndConditions',
      'termsAndConditionsHash',
    ),
    type: str(claims, 'type'),
  };
};

export const readEcsOrganization = (
  credential: VeranaTrustCredential | undefined,
): EcsOrganization | undefined => {
  const claims = credential?.claims;
  if (!claims || !isValid(credential)) {
    return undefined;
  }

  return {
    address: str(claims, 'address'),
    countryCode: str(claims, 'countryCode')?.toUpperCase(),
    id: str(claims, 'id'),
    legalJurisdiction: str(claims, 'legalJurisdiction'),
    lei: str(claims, 'lei'),
    logo: asset(claims, 'logoUri', 'logoDigestSri', 'logo'),
    name: str(claims, 'name'),
    organizationKind: str(claims, 'organizationKind'),
    registryId: str(claims, 'registryId'),
    registryUri: str(claims, 'registryUri'),
  };
};

export const findEcsCredential = (
  credentials: VeranaTrustCredential[] | undefined,
  ecsTypes: string[],
): VeranaTrustCredential | undefined =>
  credentials?.find(
    (credential) => credential.ecsType && ecsTypes.includes(credential.ecsType),
  );

export const findServiceCredential = (
  credentials: VeranaTrustCredential[] | undefined,
): VeranaTrustCredential | undefined =>
  findEcsCredential(credentials, ['ECS-SERVICE']);

export const findOrganizationCredential = (
  credentials: VeranaTrustCredential[] | undefined,
): VeranaTrustCredential | undefined =>
  findEcsCredential(credentials, [
    'ECS-ORG',
    'ECS-ORGANIZATION',
    'ECS-PERSONA',
  ]);

export const deriveVerdict = (
  credentials: VeranaTrustCredential[] | undefined,
): EcsVerdict => {
  const service = isValid(findServiceCredential(credentials));
  const organization = isValid(findOrganizationCredential(credentials));

  if (service && organization) {
    return 'TRUSTED';
  }
  if (service || organization) {
    return 'PARTIAL';
  }
  return 'UNTRUSTED';
};

// Wording is fixed by the versioned card at playground/public/trust-card: the same
// evaluation must read identically in every wallet.
export const describeVerdict = (
  verdict: EcsVerdict,
  credentials: VeranaTrustCredential[] | undefined,
): string => {
  if (verdict === 'TRUSTED') {
    return 'Both identity credentials verified against the Verana public registry';
  }
  if (verdict === 'UNTRUSTED') {
    // Structurally valid ECS credentials from an untrusted issuer: name the reason the resolver gave, not "neither verified".
    return isValid(findServiceCredential(credentials)) ||
      isValid(findOrganizationCredential(credentials))
      ? 'The Verana public registry does not vouch for this service.'
      : 'Neither identity credential verified. This counterparty cannot present verifiable trust credentials.';
  }
  return isValid(findServiceCredential(credentials))
    ? 'The service credential verified. Nothing verifies who operates it.'
    : 'The operator credential verified. Nothing verifies the service itself.';
};

const MARKDOWN_LINK = /\[([^\]]*)\]\(([^)]*)\)/g;
const BARE_URL = /\bhttps?:\/\/\S+/gi;

// `descriptionFormat` may be markdown rendered where someone decides whom to trust; a
// link there is phishing served by the trust component itself.
export const stripLinks = (
  description: string | undefined,
): { removed: number; text: string } => {
  if (!description) {
    return { removed: 0, text: '' };
  }

  let removed = 0;
  const withoutMarkdown = description.replace(
    MARKDOWN_LINK,
    (_match, label: string) => {
      removed += 1;
      return label;
    },
  );
  const text = withoutMarkdown.replace(BARE_URL, () => {
    removed += 1;
    return '';
  });

  return { removed, text: text.replace(/\s{2,}/g, ' ').trim() };
};
