import {
  ScrollViewScreen,
  TrustInfoDetailsScreen,
  useCredentialTrustInformation,
  useProofRequestTrustInformation,
} from '@procivis/one-react-native-components';
import { useNavigation, useRoute } from '@react-navigation/native';
import React, { FC } from 'react';
import { Platform } from 'react-native';

import { HeaderCloseModalButton } from '../../components/navigation/header-buttons';
import { VeranaTrustDossier } from '../../components/trust/verana-trust-dossier';
import { useCurrentLanguage } from '../../hooks/language';
import { translate } from '../../i18n';
import {
  RootNavigationProp,
  RootRouteProp,
} from '../../navigators/root/root-routes';
import { trustInfoDetailsScreenLabels } from '../../utils/trust-info';

// The public source checkout cannot fetch Procivis's private ecosystem-assets submodule.
const countries: { display: Record<string, string>; value: string }[] = [];

const TrustInfoScreen: FC = () => {
  const navigation = useNavigation<RootNavigationProp<'TrustInfo'>>();
  const route = useRoute<RootRouteProp<'TrustInfo'>>();
  const { trustInformation, verana } = route.params;
  const language = useCurrentLanguage();
  const credentialTrust = useCredentialTrustInformation(
    verana?.entityType === 'credential' ? verana.entityId : undefined,
  );
  const proofTrust = useProofRequestTrustInformation(
    verana?.entityType === 'proof' ? verana.entityId : undefined,
  );
  if (verana) {
    const query =
      verana.entityType === 'credential' ? credentialTrust : proofTrust;
    return (
      <ScrollViewScreen
        header={{
          leftItem: (
            <HeaderCloseModalButton
              onPress={navigation.goBack}
              testID="VeranaTrustDossier.header.close"
            />
          ),
          modalHandleVisible: Platform.OS === 'ios',
          static: true,
          title: translate('common.trustInformation'),
        }}
        modalPresentation
        scrollView={{ testID: 'VeranaTrustDossier.scroll' }}
        testID="VeranaTrustDossierScreen"
      >
        <VeranaTrustDossier
          detail={query.data}
          error={query.error}
          fetching={query.isFetching}
          onRetry={() => {
            void query.refetch();
          }}
          summary={verana.summary}
        />
      </ScrollViewScreen>
    );
  }
  if (!trustInformation?.eudiEcosystem) {
    return null;
  }
  return (
    <TrustInfoDetailsScreen
      countries={countries}
      labels={trustInfoDetailsScreenLabels()}
      language={language}
      onClose={navigation.goBack}
      testID={'TrustInfoDetailsScreen'}
      trustInformation={trustInformation}
    />
  );
};

export default TrustInfoScreen;
