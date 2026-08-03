import {
  StatusSuccessIcon,
  StatusWarningIcon,
  Typography,
  UpIcon,
  useAppColorScheme,
} from '@procivis/one-react-native-components';
import {
  VeranaTrustSummary,
  VeranaTrustVerdict,
} from '@procivis/react-native-one-core';
import React, { FC } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { translate } from '../../i18n';
import {
  veranaRoleTranslationKey,
  veranaVerdictTranslationKey,
} from '../../utils/verana-trust';

type Props = {
  onPress: () => void;
  summary: VeranaTrustSummary;
  testID: string;
};

export const VeranaTrustCard: FC<Props> = ({ onPress, summary, testID }) => {
  const colorScheme = useAppColorScheme();
  const positive = summary.verdict === VeranaTrustVerdict.TRUSTED_AUTHORIZED;
  const StatusIcon = positive ? StatusSuccessIcon : StatusWarningIcon;
  return (
    <Pressable
      accessibilityHint={translate('veranaTrust.openDossier')}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colorScheme.white,
          borderColor: positive ? colorScheme.success : colorScheme.warning,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
      testID={testID}
    >
      <View style={styles.heading}>
        <StatusIcon height={28} width={28} />
        <View style={styles.headingText}>
          <Typography color={colorScheme.text} preset="m/heading">
            {translate(veranaRoleTranslationKey(summary.role))}
          </Typography>
          <Typography
            color={positive ? colorScheme.successText : colorScheme.warning}
            preset="s"
            testID={`${testID}.verdict`}
          >
            {translate(veranaVerdictTranslationKey(summary.verdict))}
          </Typography>
        </View>
        <UpIcon
          color={colorScheme.text}
          style={styles.disclosureIcon}
          testID={`${testID}.disclosure`}
        />
      </View>
      <Typography color={colorScheme.text} preset="xs/code" selectable>
        {summary.did || translate('veranaTrust.unavailableDid')}
      </Typography>
      {summary.schemas.map((schema) => (
        <Typography
          color={colorScheme.text}
          key={schema || 'unknown-schema'}
          preset="xs/code"
          selectable
        >
          {schema || translate('veranaTrust.unknownSchema')}
        </Typography>
      ))}
      <Typography color={colorScheme.text} preset="xs">
        {translate('veranaTrust.resolverAttribution')}
      </Typography>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 2,
    gap: 6,
    marginBottom: 16,
    padding: 16,
  },
  disclosureIcon: {
    transform: [{ rotate: '90deg' }],
  },
  heading: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  headingText: {
    flex: 1,
    marginHorizontal: 12,
  },
});
