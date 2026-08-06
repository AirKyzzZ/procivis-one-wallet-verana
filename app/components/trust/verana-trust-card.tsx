import { Typography } from '@procivis/one-react-native-components';
import {
  VeranaTrustCredential,
  VeranaTrustFullDetails,
  VeranaTrustRole,
  VeranaTrustSummary,
} from '@procivis/react-native-one-core';
import React, { FC, ReactElement, ReactNode } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path, Rect, Text as SvgText } from 'react-native-svg';

import { translate } from '../../i18n';
import {
  describeVerdict,
  EcsAssetRef,
  findOrganizationCredential,
  findServiceCredential,
  readEcsOrganization,
  readEcsService,
  stripLinks,
} from '../../utils/verana-ecs';
import {
  isVeranaTestnet,
  veranaAuthorizationOutcome,
  VeranaTrustBand,
  veranaTrustBand,
} from '../../utils/verana-trust';

// Fixed English wording (versioned card at playground/public/trust-card): identical in every wallet, so it bypasses i18n on purpose.
const STRINGS = {
  askReason: 'This could not be checked against the registry.',
  checkAgain: 'Check again',
  conditions: 'Conditions of connecting',
  demoNote: 'Demo network - do not share real data',
  intact: 'intact',
  noAgeRestriction: 'No age restriction',
  noDigest: 'no digest',
  resolving: 'Checking the Verana public registry…',
  testnet: 'TESTNET',
  tickQuery: '?',
} as const;

// Fixed v3 palette (playground/public/trust-card): the card must look identical in every wallet.
const palette = {
  bad: '#dc2626',
  badRail: '#dc262666',
  badSoft: '#fef2f2',
  body: '#374151',
  brand: '#7c3aed',
  brandSoft: '#ede9fe',
  card: '#ffffff',
  chip: '#f3f4f6',
  faint: '#9ca3af',
  ink: '#111827',
  line: '#e5e7eb',
  neutralRail: '#9ca3af66',
  ok: '#059669',
  okRail: '#05966966',
  okSoft: '#ecfdf5',
  onTint: '#ffffff',
  sub: '#6b7280',
  warn: '#d97706',
  warnLine: '#fde68a',
  warnSoft: '#fffbeb',
} as const;

const VERDICT_TONE: Record<
  VeranaTrustBand,
  { border: string; color: string; dot: string; label: string }
> = {
  PARTIAL: {
    border: palette.warn,
    color: palette.warn,
    dot: palette.warn,
    label: 'PARTIAL',
  },
  RESOLVING: {
    border: palette.line,
    color: palette.sub,
    dot: palette.faint,
    label: 'CHECKING…',
  },
  TRUSTED: {
    border: palette.ok,
    color: palette.ok,
    dot: palette.ok,
    label: 'TRUSTED',
  },
  UNTRUSTED: {
    border: palette.bad,
    color: palette.bad,
    dot: palette.bad,
    label: 'UNTRUSTED',
  },
  UNVERIFIED: {
    border: palette.line,
    color: palette.sub,
    dot: palette.faint,
    label: 'COULD NOT VERIFY',
  },
};

type IconProps = { color: string; size?: number };

const CheckIcon: FC<IconProps> = ({ color, size = 15 }) => (
  <Svg height={size} viewBox="0 0 24 24" width={size}>
    <Path
      d="m5 12 5 5L20 7"
      fill="none"
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={3}
    />
  </Svg>
);

const CrossIcon: FC<IconProps> = ({ color, size = 15 }) => (
  <Svg height={size} viewBox="0 0 24 24" width={size}>
    <Path
      d="M18 6 6 18M6 6l12 12"
      fill="none"
      stroke={color}
      strokeLinecap="round"
      strokeWidth={3}
    />
  </Svg>
);

const InfoIcon: FC<IconProps> = ({ color, size = 15 }) => (
  <Svg height={size} viewBox="0 0 24 24" width={size}>
    <Circle
      cx={12}
      cy={12}
      fill="none"
      r={9}
      stroke={color}
      strokeWidth={1.8}
    />
    <Path
      d="M12 11v5"
      fill="none"
      stroke={color}
      strokeLinecap="round"
      strokeWidth={1.8}
    />
    <Circle cx={12} cy={7.6} fill={color} r={1.1} />
  </Svg>
);

const LockIcon: FC<IconProps> = ({ color, size = 14 }) => (
  <Svg height={size} viewBox="0 0 24 24" width={size}>
    <Rect
      fill="none"
      height={9}
      rx={2}
      stroke={color}
      strokeWidth={1.8}
      width={14}
      x={5}
      y={11}
    />
    <Path
      d="M8 11V7a4 4 0 0 1 8 0v4"
      fill="none"
      stroke={color}
      strokeLinecap="round"
      strokeWidth={1.8}
    />
  </Svg>
);

const VeranaMark: FC<{ size?: number }> = ({ size = 16 }) => (
  <Svg height={size} viewBox="0 0 64 64" width={size}>
    <Rect fill="#763EF0" height={64} rx={12} width={64} />
    <Path
      d="M46.3 22.8 32 50.4 17.7 22.8l1.9-3.4 2 3.5L32 43.4l10.4-20.5 2 -3.5 1.9 3.4Z"
      fill="#ffffff"
    />
    <Path d="M22.4 15.8 32 34.2l9.3-18.4H22.4Z" fill="#ffffff" />
  </Svg>
);

const EU_STAR_POSITIONS = Array.from({ length: 12 }, (_, index) => {
  const angle = (index * Math.PI) / 6;
  return { cx: 10 + 6 * Math.sin(angle), cy: 10 - 6 * Math.cos(angle) };
});

// Drawn, never emoji: regional-indicator pairs fall back inconsistently across
// Android builds; undrawn countries degrade to the ISO code.
const FLAG_ART: Record<string, ReactElement> = {
  CH: (
    <>
      <Rect fill="#DA291C" height={20} rx={3} width={20} />
      <Path
        d="M8.6 4h2.8v4.6H16v2.8h-4.6V16H8.6v-4.6H4V8.6h4.6z"
        fill="#ffffff"
      />
    </>
  ),
  DE: (
    <>
      <Rect fill="#DD0000" height={20} rx={3} width={20} />
      <Path d="M0 6.7V3a3 3 0 0 1 3-3h14a3 3 0 0 1 3 3v3.7z" fill="#000000" />
      <Path d="M0 13.3h20V17a3 3 0 0 1-3 3H3a3 3 0 0 1-3-3z" fill="#FFCE00" />
    </>
  ),
  ES: (
    <>
      <Rect fill="#F1BF00" height={20} rx={3} width={20} />
      <Path d="M0 5V3a3 3 0 0 1 3-3h14a3 3 0 0 1 3 3v2z" fill="#AA151B" />
      <Path d="M0 15h20v2a3 3 0 0 1-3 3H3a3 3 0 0 1-3-3z" fill="#AA151B" />
    </>
  ),
  EU: (
    <>
      <Rect fill="#003399" height={20} rx={3} width={20} />
      {EU_STAR_POSITIONS.map((star) => (
        <Circle
          cx={star.cx}
          cy={star.cy}
          fill="#FFCC00"
          key={`${star.cx}-${star.cy}`}
          r={1.1}
        />
      ))}
    </>
  ),
  FR: (
    <>
      <Rect fill="#ffffff" height={20} rx={3} width={20} />
      <Path d="M0 3a3 3 0 0 1 3-3h3.7v20H3a3 3 0 0 1-3-3z" fill="#002395" />
      <Path
        d="M13.3 0H17a3 3 0 0 1 3 3v14a3 3 0 0 1-3 3h-3.7z"
        fill="#ED2939"
      />
    </>
  ),
  SE: (
    <>
      <Rect fill="#006AA7" height={20} rx={3} width={20} />
      <Path d="M6 0h4v20H6z" fill="#FECC02" />
      <Path d="M0 8h20v4H0z" fill="#FECC02" />
    </>
  ),
};

const CountryFlag: FC<{ code?: string; size?: number }> = ({
  code,
  size = 16,
}) => {
  if (!code) {
    return null;
  }
  const key = code.toUpperCase();
  const art = FLAG_ART[key];
  if (!art) {
    return (
      <Typography color={palette.sub} preset="xs">
        {key}
      </Typography>
    );
  }
  return (
    <Svg height={size} viewBox="0 0 20 20" width={size}>
      {art}
    </Svg>
  );
};

type StepTone = 'bad' | 'none' | 'ok';

const STEP_TONE_COLOR: Record<StepTone, string> = {
  bad: palette.bad,
  none: palette.faint,
  ok: palette.ok,
};

const STEP_RAIL_COLOR: Record<StepTone, string> = {
  bad: palette.badRail,
  none: palette.neutralRail,
  ok: palette.okRail,
};

const StepTick: FC<{ tone: StepTone }> = ({ tone }) => (
  <View style={[styles.tickCircle, { backgroundColor: STEP_TONE_COLOR[tone] }]}>
    {tone === 'ok' ? (
      <CheckIcon color={palette.onTint} size={15} />
    ) : tone === 'bad' ? (
      <CrossIcon color={palette.onTint} size={15} />
    ) : (
      <Typography color={palette.onTint} preset="s" style={styles.tickQuery}>
        {STRINGS.tickQuery}
      </Typography>
    )}
  </View>
);

const SectionLabel: FC<{ children: string }> = ({ children }) => (
  <Typography caps color={palette.sub} preset="xs" style={styles.sectionLabel}>
    {children}
  </Typography>
);

const LOGO_TINTS = ['#0f9488', '#1d4ed8', '#9a3412', '#3f3f46'] as const;

const initialsOf = (name?: string): string =>
  (name ?? '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('') || '?';

// Stands in for `logoUri`, which no testnet service publishes yet.
const LogoBadge: FC<{ name?: string; verified?: boolean }> = ({
  name,
  verified,
}) => {
  const initials = initialsOf(name);
  const tint = LOGO_TINTS[initials.charCodeAt(0) % LOGO_TINTS.length];
  return (
    <View style={styles.logoContainer}>
      <Svg height={40} viewBox="0 0 40 40" width={40}>
        <Rect fill={tint} height={40} rx={11} width={40} />
        <SvgText
          fill="#ffffff"
          fontSize={initials.length > 1 ? 14 : 17}
          fontWeight="bold"
          textAnchor="middle"
          x={20}
          y={26}
        >
          {initials}
        </SvgText>
      </Svg>
      {verified ? (
        <View style={styles.logoBubble}>
          <CheckIcon color={palette.ok} size={11} />
        </View>
      ) : null}
    </View>
  );
};

const IdentityHeading: FC<{ countryCode?: string; name?: string }> = ({
  countryCode,
  name,
}) => (
  <View style={styles.identityHeadingRow}>
    <Typography color={palette.ink} preset="m/heading" style={styles.shrink}>
      {name ?? 'Not presented'}
    </Typography>
    <CountryFlag code={countryCode} />
  </View>
);

const RegistryChip: FC<{ label: string; value?: string }> = ({
  label,
  value,
}) => {
  if (!value) {
    return null;
  }
  return (
    <View style={styles.registryChip}>
      <Typography
        color={palette.sub}
        preset="xs"
        style={styles.registryChipLabel}
      >
        {label}
      </Typography>
      <Typography color={palette.ink} preset="xs">
        {value}
      </Typography>
    </View>
  );
};

const isHttpUri = (uri: string): boolean => /^https?:\/\//i.test(uri);

const ConditionRow: FC<{ asset?: EcsAssetRef; label: string }> = ({
  asset,
  label,
}) => {
  if (!asset || !isHttpUri(asset.uri)) {
    return null;
  }
  return (
    <Pressable
      accessibilityRole="link"
      onPress={() => void Linking.openURL(asset.uri)}
      style={styles.conditionRow}
    >
      <LockIcon color={palette.brand} size={14} />
      <Typography
        color={palette.brand}
        numberOfLines={1}
        preset="s"
        style={styles.shrink}
      >
        {label}
      </Typography>
      {asset.digest ? (
        <View style={styles.conditionState}>
          <CheckIcon color={palette.ok} size={12} />
          <Typography color={palette.ok} preset="xs">
            {STRINGS.intact}
          </Typography>
        </View>
      ) : (
        <Typography color={palette.sub} preset="xs" style={styles.conditionEnd}>
          {STRINGS.noDigest}
        </Typography>
      )}
    </Pressable>
  );
};

const DidRow: FC<{
  did: string;
  testID: string;
  testnet: boolean;
  tone: string;
}> = ({ did, testID, testnet, tone }) => (
  <View style={styles.didRow}>
    <View style={[styles.didDot, { backgroundColor: tone }]} />
    <Typography
      color={palette.sub}
      ellipsizeMode="middle"
      numberOfLines={1}
      preset="xs/code"
      style={styles.shrink}
    >
      {did}
    </Typography>
    {testnet ? (
      <View style={styles.testnetChip} testID={`${testID}.testnet`}>
        <Typography color={palette.warn} preset="xs" style={styles.testnetText}>
          {STRINGS.testnet}
        </Typography>
      </View>
    ) : null}
    <VeranaMark size={19} />
  </View>
);

const VerdictPill: FC<{
  note?: string;
  noteColor: string;
  testID: string;
  tone: { border: string; color: string; label: string };
}> = ({ note, noteColor, testID, tone }) => (
  <View style={styles.verdictStack}>
    <View style={[styles.verdictRow, { borderColor: tone.border }]}>
      <VeranaMark />
      <Typography
        color={tone.color}
        preset="m/heading"
        style={styles.verdictLabel}
        testID={`${testID}.verdict`}
      >
        {tone.label}
      </Typography>
    </View>
    {note ? (
      <Typography color={noteColor} preset="xs">
        {note}
      </Typography>
    ) : null}
  </View>
);

type ChainStepProps = {
  children: ReactNode;
  isLast?: boolean;
  label: string;
  tone: StepTone;
};

const ChainStep: FC<ChainStepProps> = ({ children, isLast, label, tone }) => (
  <View style={styles.stepRow}>
    <View style={styles.stepRailColumn}>
      <StepTick tone={tone} />
      {!isLast ? (
        <View
          style={[styles.stepRail, { backgroundColor: STEP_RAIL_COLOR[tone] }]}
        />
      ) : null}
    </View>
    <View style={[styles.stepBody, isLast ? styles.stepBodyLast : undefined]}>
      <SectionLabel>{label}</SectionLabel>
      {children}
    </View>
  </View>
);

type AskBlockProps = {
  credential: string;
  granted?: boolean;
  kind: 'offer' | 'request';
  party: string;
  reason: string;
  testID: string;
};

const AskBlock: FC<AskBlockProps> = ({
  credential,
  granted,
  kind,
  party,
  reason,
  testID,
}) => {
  const verb = kind === 'offer' ? 'authorized issuer' : 'authorized verifier';
  const borderColor =
    granted === undefined ? palette.line : granted ? palette.ok : palette.bad;
  const backgroundColor =
    granted === undefined
      ? palette.chip
      : granted
      ? palette.okSoft
      : palette.badSoft;

  return (
    <View
      style={[styles.askContainer, { backgroundColor, borderColor }]}
      testID={testID}
    >
      <SectionLabel>
        {kind === 'offer' ? 'Offers you' : 'Asks you for'}
      </SectionLabel>
      <Typography color={palette.ink} preset="m/heading">
        {credential}
      </Typography>
      <View style={styles.askLine}>
        {granted === undefined ? (
          <InfoIcon color={palette.sub} size={18} />
        ) : granted ? (
          <CheckIcon color={palette.ok} size={18} />
        ) : (
          <CrossIcon color={palette.bad} size={18} />
        )}
        <Typography color={palette.body} preset="s" style={styles.shrink}>
          {granted === undefined
            ? reason
            : `${party} is ${
                granted ? 'an' : 'not an'
              } ${verb} of ${credential}`}
        </Typography>
      </View>
    </View>
  );
};

// The untrusted demo services issue their ECS credentials to themselves; a green tick
// there would be a trust signal the resolver never gave, so self-issued claims are withheld.
const selfIssued = (
  credential: VeranaTrustCredential | undefined,
  did: string,
): boolean =>
  Boolean(credential?.issuedBy && credential.issuedBy.split('#')[0] === did);

type Props = {
  askCredentialName?: string;
  details?: VeranaTrustFullDetails;
  detailsLoading?: boolean;
  onPress: () => void;
  onRetry?: () => void;
  summary: VeranaTrustSummary;
  testID: string;
};

export const VeranaTrustCard: FC<Props> = ({
  askCredentialName,
  details,
  detailsLoading,
  onPress,
  onRetry,
  summary,
  testID,
}) => {
  const band = detailsLoading ? 'RESOLVING' : veranaTrustBand(summary.verdict);
  const tone = VERDICT_TONE[band];
  const testnet = isVeranaTestnet(summary) || details?.production === false;
  const credentials = details?.credentials ?? [];

  const serviceCredential = findServiceCredential(credentials);
  const organizationCredential = findOrganizationCredential(credentials);

  const rowTone = (credential: VeranaTrustCredential | undefined): StepTone => {
    if (band === 'UNVERIFIED') {
      return 'none';
    }
    if (band === 'UNTRUSTED') {
      return 'bad';
    }
    return credential?.result === 'VALID' ? 'ok' : 'bad';
  };
  const serviceTone = rowTone(serviceCredential);
  const organizationTone = rowTone(organizationCredential);

  const service =
    serviceTone === 'ok' ? readEcsService(serviceCredential) : undefined;
  const organization =
    organizationTone === 'ok'
      ? readEcsOrganization(organizationCredential)
      : undefined;

  const withheld = (
    credential: VeranaTrustCredential | undefined,
    stepTone: StepTone,
  ): string | undefined =>
    stepTone === 'none'
      ? 'Not checked.'
      : credential
      ? selfIssued(credential, summary.did)
        ? 'Issued by this service to itself, so nothing independent verifies it.'
        : 'Nothing in the registry vouches for this credential, so its claims are not shown.'
      : undefined;

  const description = stripLinks(service?.description);
  const strippedNote =
    description.removed > 0
      ? `${description.removed} link${
          description.removed > 1 ? 's' : ''
        } removed from this description before display`
      : undefined;
  const ageBadgeLabel = service?.minimumAgeRequired
    ? `${service.minimumAgeRequired}+`
    : undefined;
  const ageLine = service?.minimumAgeRequired
    ? `This service requires you to be at least ${service.minimumAgeRequired} to connect`
    : undefined;
  const hasConditions = Boolean(
    service?.terms || service?.privacy || service?.minimumAgeRequired,
  );
  const note =
    band === 'RESOLVING'
      ? STRINGS.resolving
      : band === 'UNVERIFIED'
      ? 'The Verana resolver could not be reached. This counterparty is neither trusted nor untrusted.'
      : credentials.length > 0
      ? describeVerdict(band, credentials)
      : undefined;

  const outcome = veranaAuthorizationOutcome(summary);
  const askGranted =
    outcome === 'GRANTED' ? true : outcome === 'REFUSED' ? false : undefined;
  const askKind =
    summary.role === VeranaTrustRole.VERIFIER ? 'request' : 'offer';
  const askCredential =
    askCredentialName ??
    summary.schemas.find((schema) => Boolean(schema)) ??
    'this credential';

  return (
    <Pressable
      accessibilityHint={translate('veranaTrust.openDossier')}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, { opacity: pressed ? 0.8 : 1 }]}
      testID={testID}
    >
      <DidRow
        did={summary.did}
        testID={testID}
        testnet={testnet}
        tone={tone.dot}
      />

      {credentials.length > 0 ? (
        <View>
          <ChainStep label="Service" tone={serviceTone}>
            {service ? (
              <View style={styles.identityRow}>
                <LogoBadge
                  name={service.name}
                  verified={Boolean(service.logo?.digest)}
                />
                <View style={styles.textColumn}>
                  <IdentityHeading name={service.name} />
                  {description.text ? (
                    <Typography color={palette.body} preset="s">
                      {description.text}
                    </Typography>
                  ) : null}
                  {strippedNote ? (
                    <Typography color={palette.faint} preset="xs">
                      {strippedNote}
                    </Typography>
                  ) : null}
                </View>
              </View>
            ) : (
              <View style={styles.textColumn}>
                <Typography
                  color={serviceTone === 'none' ? palette.sub : palette.bad}
                  preset="s"
                >
                  {serviceCredential
                    ? 'Service claims not verified'
                    : 'No ECS-Service credential presented'}
                </Typography>
                {withheld(serviceCredential, serviceTone) ? (
                  <Typography color={palette.faint} preset="xs">
                    {withheld(serviceCredential, serviceTone)}
                  </Typography>
                ) : null}
              </View>
            )}
          </ChainStep>

          <ChainStep isLast label="Operated by" tone={organizationTone}>
            {organization ? (
              <View style={styles.identityRow}>
                <LogoBadge
                  name={organization.name}
                  verified={Boolean(organization.logo?.digest)}
                />
                <View style={styles.textColumn}>
                  <IdentityHeading
                    countryCode={organization.countryCode}
                    name={organization.name}
                  />
                  {organization.address ? (
                    <Typography color={palette.body} preset="s">
                      {organization.address}
                    </Typography>
                  ) : null}
                  <View style={styles.chipsRow}>
                    <RegistryChip label="REG" value={organization.registryId} />
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.textColumn}>
                <Typography
                  color={
                    organizationTone === 'none' ? palette.sub : palette.bad
                  }
                  preset="s"
                >
                  {organizationCredential
                    ? 'Operator claims not verified'
                    : 'No ECS-Organization credential presented'}
                </Typography>
                <Typography color={palette.faint} preset="xs">
                  {withheld(organizationCredential, organizationTone) ??
                    'Nothing verifies who operates this service'}
                </Typography>
              </View>
            )}
          </ChainStep>
        </View>
      ) : null}

      <VerdictPill
        note={note}
        noteColor={
          band === 'TRUSTED' || band === 'UNVERIFIED'
            ? palette.sub
            : palette.bad
        }
        testID={testID}
        tone={tone}
      />

      {band === 'UNVERIFIED' && onRetry ? (
        <Pressable
          accessibilityRole="button"
          onPress={onRetry}
          style={styles.retryButton}
          testID={`${testID}.retry`}
        >
          <Typography color={palette.ink} preset="s">
            {STRINGS.checkAgain}
          </Typography>
        </Pressable>
      ) : null}

      <AskBlock
        credential={askCredential}
        granted={askGranted}
        kind={askKind}
        party={service?.name ?? summary.did}
        reason={STRINGS.askReason}
        testID={`${testID}.ask`}
      />

      {hasConditions ? (
        <View style={styles.conditions}>
          <SectionLabel>{STRINGS.conditions}</SectionLabel>
          {ageBadgeLabel ? (
            <View style={styles.ageRow}>
              <View style={styles.ageBadge}>
                <Typography color={palette.warn} preset="s">
                  {ageBadgeLabel}
                </Typography>
              </View>
              <Typography color={palette.body} preset="s" style={styles.shrink}>
                {ageLine}
              </Typography>
            </View>
          ) : (
            <View style={styles.ageRow}>
              <InfoIcon color={palette.sub} size={14} />
              <Typography color={palette.body} preset="s">
                {STRINGS.noAgeRestriction}
              </Typography>
            </View>
          )}
          <ConditionRow asset={service?.terms} label="Terms & conditions" />
          <ConditionRow asset={service?.privacy} label="Privacy policy" />
        </View>
      ) : null}

      {testnet ? (
        <Typography
          color={palette.warn}
          preset="xs"
          testID={`${testID}.demoNote`}
        >
          {STRINGS.demoNote}
        </Typography>
      ) : null}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  ageBadge: {
    borderColor: palette.warnLine,
    borderRadius: 8,
    borderWidth: 1.5,
    paddingHorizontal: 8,
  },
  ageRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  askContainer: {
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 6,
    padding: 14,
  },
  askLine: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  card: {
    backgroundColor: palette.card,
    borderColor: palette.line,
    borderRadius: 16,
    borderWidth: 1,
    gap: 16,
    marginBottom: 16,
    padding: 16,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  conditionEnd: {
    marginLeft: 'auto',
  },
  conditionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  conditionState: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    marginLeft: 'auto',
  },
  conditions: {
    backgroundColor: palette.chip,
    borderRadius: 14,
    gap: 10,
    padding: 14,
  },
  didDot: {
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  didRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  identityHeadingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  identityRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
  },
  logoBubble: {
    alignItems: 'center',
    backgroundColor: palette.card,
    borderRadius: 8,
    bottom: -4,
    height: 16,
    justifyContent: 'center',
    position: 'absolute',
    right: -4,
    width: 16,
  },
  logoContainer: {
    height: 40,
    width: 40,
  },
  registryChip: {
    alignItems: 'center',
    backgroundColor: palette.chip,
    borderRadius: 8,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  registryChipLabel: {
    fontWeight: '700',
    letterSpacing: 0.7,
  },
  retryButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderColor: palette.line,
    borderRadius: 10,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  sectionLabel: {
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  shrink: {
    flexShrink: 1,
  },
  stepBody: {
    flex: 1,
    gap: 4,
    paddingBottom: 14,
  },
  stepBodyLast: {
    paddingBottom: 0,
  },
  stepRail: {
    borderRadius: 1,
    flex: 1,
    minHeight: 16,
    width: 2,
  },
  stepRailColumn: {
    alignItems: 'center',
    width: 28,
  },
  stepRow: {
    flexDirection: 'row',
    gap: 10,
  },
  testnetChip: {
    borderColor: palette.warnLine,
    borderRadius: 6,
    borderWidth: 1.5,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  testnetText: {
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  textColumn: {
    flex: 1,
    gap: 4,
  },
  tickCircle: {
    alignItems: 'center',
    borderRadius: 14,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  tickQuery: {
    fontWeight: '800',
  },
  verdictLabel: {
    letterSpacing: 0.6,
  },
  verdictRow: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 14,
    borderWidth: 2,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  verdictStack: {
    gap: 8,
  },
});
