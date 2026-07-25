import {
  ActivityIndicator,
  Button,
  Typography,
  useAppColorScheme,
} from '@procivis/one-react-native-components';
import {
  TrustInformationDetail,
  VeranaTrustFullDetails,
  VeranaTrustSummary,
} from '@procivis/react-native-one-core';
import React, { FC, ReactNode } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { translate } from '../../i18n';
import {
  safeHttpUrl,
  veranaRoleTranslationKey,
  veranaVerdictTranslationKey,
} from '../../utils/verana-trust';

type Props = {
  detail?: TrustInformationDetail;
  error: unknown;
  fetching: boolean;
  onRetry: () => void;
  summary: VeranaTrustSummary;
};

export const veranaTrustCredentialKey = (
  credentialId: string | undefined,
  index: number,
) => `${credentialId ?? 'credential'}-${index}`;

const Section: FC<{ children: ReactNode; title: string }> = ({
  children,
  title,
}) => {
  const colorScheme = useAppColorScheme();
  return (
    <View style={styles.section}>
      <Typography color={colorScheme.text} preset="m/heading">
        {title}
      </Typography>
      {children}
    </View>
  );
};

const Value: FC<{ label: string; value?: string | boolean }> = ({
  label,
  value,
}) => {
  const colorScheme = useAppColorScheme();
  if (value === undefined) {
    return null;
  }
  return (
    <View style={styles.value}>
      <Typography color={colorScheme.text} preset="s">
        {label}
      </Typography>
      <Typography color={colorScheme.text} preset="s/code" selectable>
        {String(value)}
      </Typography>
    </View>
  );
};

const SafeLink: FC<{ label: string; value: string }> = ({ label, value }) => {
  const colorScheme = useAppColorScheme();
  const url = safeHttpUrl(value);
  return (
    <Pressable
      accessibilityRole={url ? 'link' : undefined}
      disabled={!url}
      onPress={() => {
        if (url) {
          void Linking.openURL(url);
        }
      }}
    >
      <Typography
        color={url ? colorScheme.accent : colorScheme.text}
        preset="s"
      >
        {label}
      </Typography>
      <Typography color={colorScheme.text} preset="xs/code" selectable>
        {value}
      </Typography>
    </Pressable>
  );
};

const FullEvidence: FC<{ full: VeranaTrustFullDetails }> = ({ full }) => (
  <>
    <Section title={translate('veranaTrust.q1Full')}>
      <Value label={translate('veranaTrust.did')} value={full.did} />
      <Value
        label={translate('veranaTrust.trustStatus')}
        value={full.trustStatus}
      />
      <Value
        label={translate('veranaTrust.production')}
        value={full.production}
      />
      <Value
        label={translate('veranaTrust.evaluatedAt')}
        value={full.evaluatedAt}
      />
      <Value
        label={translate('veranaTrust.block')}
        value={full.evaluatedAtBlock}
      />
      <Value
        label={translate('veranaTrust.expiresAt')}
        value={full.expiresAt}
      />
    </Section>
    <Section title={translate('veranaTrust.trustCredentials')}>
      {full.credentials.map((credential, index) => (
        <View
          key={veranaTrustCredentialKey(credential.id, index)}
          style={styles.credential}
        >
          <Value label={translate('veranaTrust.id')} value={credential.id} />
          <Value
            label={translate('veranaTrust.credentialType')}
            value={credential.credentialType}
          />
          <Value
            label={translate('veranaTrust.format')}
            value={credential.format}
          />
          <Value
            label={translate('veranaTrust.ecsType')}
            value={credential.ecsType}
          />
          <Value
            label={translate('veranaTrust.issuedBy')}
            value={credential.issuedBy}
          />
          <Value
            label={translate('veranaTrust.presentedBy')}
            value={credential.presentedBy}
          />
          <Value
            label={translate('veranaTrust.result')}
            value={credential.result}
          />
          {credential.claims.map((claim) => (
            <Value
              key={claim.name}
              label={`${claim.name} (${claim.valueType})`}
              value={claim.value}
            />
          ))}
          {credential.permissionChain.map((item, chainIndex) => (
            <Value
              key={`${credential.id ?? index}-chain-${chainIndex}`}
              label={translate('veranaTrust.permissionChain')}
              value={item}
            />
          ))}
        </View>
      ))}
      {full.failedCredentials.map((item, index) => (
        <Value
          key={`failed-${index}`}
          label={translate('veranaTrust.failedCredential')}
          value={item}
        />
      ))}
      {full.dereferenceErrors.map((item, index) => (
        <Value
          key={`dereference-${index}`}
          label={translate('veranaTrust.dereferenceError')}
          value={item}
        />
      ))}
    </Section>
  </>
);

const FullEvidenceError: FC<{ onRetry: () => void }> = ({ onRetry }) => {
  const colorScheme = useAppColorScheme();
  return (
    <Section title={translate('veranaTrust.fullUnavailable')}>
      <Typography color={colorScheme.text} preset="s">
        {translate('veranaTrust.summaryUnchanged')}
      </Typography>
      <Button onPress={onRetry} title={translate('common.retry')} />
    </Section>
  );
};

export const VeranaTrustDossier: FC<Props> = ({
  detail,
  error,
  fetching,
  onRetry,
  summary,
}) => (
  <View style={styles.container} testID="VeranaTrustDossier">
    <Section title={translate('veranaTrust.decision')}>
      <Value
        label={translate('veranaTrust.roleLabel')}
        value={translate(veranaRoleTranslationKey(summary.role))}
      />
      <Value
        label={translate('veranaTrust.verdictLabel')}
        value={translate(veranaVerdictTranslationKey(summary.verdict))}
      />
      <Value label={translate('veranaTrust.did')} value={summary.did} />
      {summary.schemas.map((schema, index) => (
        <SafeLink
          key={schema || String(index)}
          label={translate('veranaTrust.schema')}
          value={schema || translate('veranaTrust.unknownSchema')}
        />
      ))}
      <SafeLink
        label={translate('veranaTrust.resolver')}
        value={summary.resolverUrl}
      />
      <Value label={translate('veranaTrust.failure')} value={summary.failure} />
    </Section>
    <Section title={translate('veranaTrust.q1Summary')}>
      <Value
        label={translate('veranaTrust.responseDid')}
        value={summary.q1?.responseDid}
      />
      <Value
        label={translate('veranaTrust.trustStatus')}
        value={summary.q1?.trustStatus}
      />
      <Value
        label={translate('veranaTrust.production')}
        value={summary.q1?.production}
      />
      <Value
        label={translate('veranaTrust.evaluatedAt')}
        value={summary.q1?.evaluatedAt}
      />
      <Value
        label={translate('veranaTrust.block')}
        value={summary.q1?.evaluatedAtBlock}
      />
      <Value
        label={translate('veranaTrust.expiresAt')}
        value={summary.q1?.expiresAt}
      />
    </Section>
    <Section title={translate('veranaTrust.authorizations')}>
      {summary.authorizations.map((authorization) => (
        <View key={authorization.schema} style={styles.credential}>
          <SafeLink
            label={translate('veranaTrust.schema')}
            value={authorization.schema}
          />
          <Value
            label={translate('veranaTrust.responseDid')}
            value={authorization.responseDid}
          />
          <Value
            label={translate('veranaTrust.responseSchema')}
            value={authorization.responseSchema}
          />
          <Value
            label={translate('veranaTrust.authorized')}
            value={authorization.authorized}
          />
          <Value
            label={translate('veranaTrust.block')}
            value={authorization.evaluatedAtBlock}
          />
          <Value
            label={translate('veranaTrust.permission')}
            value={authorization.permission}
          />
          <Value
            label={translate('veranaTrust.fees')}
            value={authorization.fees}
          />
          <Value
            label={translate('veranaTrust.permissionChain')}
            value={authorization.permissionChain}
          />
        </View>
      ))}
    </Section>
    {fetching && <ActivityIndicator animate />}
    {Boolean(error) && <FullEvidenceError onRetry={onRetry} />}
    {detail?.verana && <FullEvidence full={detail.verana} />}
  </View>
);

const styles = StyleSheet.create({
  container: {
    gap: 20,
    paddingBottom: 32,
    paddingHorizontal: 16,
  },
  credential: {
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 6,
    paddingTop: 10,
  },
  section: {
    gap: 8,
  },
  value: {
    gap: 2,
  },
});
