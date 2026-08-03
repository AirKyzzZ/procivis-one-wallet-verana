import {
  ActivityIndicator,
  ScrollViewScreen,
  TrustInfo,
  useBeforeRemove,
  useProofDetail,
  useProofReject,
  useProofRequestTrustInformation,
} from '@procivis/one-react-native-components';
import {
  useIsFocused,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import React, { FunctionComponent, useCallback, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  HeaderCloseModalButton,
  HeaderInfoButton,
} from '../../components/navigation/header-buttons';
import ProofPresentationV2 from '../../components/proof-request/proof-presentation-v2';
import ShareDisclaimer from '../../components/share/share-disclaimer';
import { VeranaTrustCard } from '../../components/trust/verana-trust-card';
import { translate } from '../../i18n';
import { useStores } from '../../models';
import { RootNavigationProp } from '../../navigators/root/root-routes';
import { ShareCredentialRouteProp } from '../../navigators/share-credential/share-credential-routes';
import { trustInfoLabels } from '../../utils/trust-info';
import { isVeranaTrustActionAllowed } from '../../utils/verana-trust';

const ProofRequestScreen: FunctionComponent = () => {
  const rootNavigation = useNavigation<RootNavigationProp>();
  const route = useRoute<ShareCredentialRouteProp<'ProofRequest'>>();
  const {
    walletStore: {
      walletProvider: { featureFlags },
    },
  } = useStores();
  const { mutateAsync: rejectProof } = useProofReject();
  const isFocused = useIsFocused();
  const {
    request: { interactionId, proofId },
  } = route.params;
  const { data: proof, refetch: refetchProof } = useProofDetail(proofId);
  const veranaTrust = proof?.trustInformation?.verana;
  const {
    data: trustInformation,
    isFetching: trustInformationFetching,
    refetch: refetchTrustInformation,
  } = useProofRequestTrustInformation(
    veranaTrust || featureFlags?.trustEcosystemsEnabled ? proofId : undefined,
  );

  // If this is true, we should not attempt to reject in useBeforeRemove
  const proofAccepted = useRef<boolean>(false);

  const [presentationDefinitionLoaded, setPresentationDefinitionLoaded] =
    useState(false);

  const onPresentationDefinitionLoaded = useCallback(() => {
    setPresentationDefinitionLoaded(true);
  }, []);

  const retryVeranaTrust = useCallback(() => {
    void refetchProof();
    void refetchTrustInformation();
  }, [refetchProof, refetchTrustInformation]);

  const trustDetailsPressHandler = useCallback(() => {
    if (veranaTrust) {
      rootNavigation.navigate('TrustInfo', {
        verana: {
          entityId: proofId,
          entityType: 'proof',
          summary: veranaTrust,
        },
      });
      return;
    }
    if (!trustInformation) {
      return;
    }
    rootNavigation.navigate('TrustInfo', {
      trustInformation,
    });
  }, [proofId, rootNavigation, trustInformation, veranaTrust]);

  const infoPressHandler = useCallback(() => {
    rootNavigation.navigate('NerdMode', {
      params: {
        proofId,
      },
      screen: 'ProofNerdMode',
    });
  }, [proofId, rootNavigation]);

  const reject = useCallback(() => {
    if (!isFocused || proofAccepted.current) {
      return;
    }
    rejectProof(interactionId);
  }, [interactionId, isFocused, rejectProof]);

  useBeforeRemove(reject);

  return (
    <ScrollViewScreen
      header={{
        leftItem: (
          <HeaderCloseModalButton testID="ProofRequestSharingScreen.header.close" />
        ),
        rightItem: (
          <HeaderInfoButton
            onPress={infoPressHandler}
            testID="ProofRequestSharingScreen.header.info"
          />
        ),
        static: true,
        title: translate('common.shareCredential'),
      }}
      modalPresentation
      scrollView={{
        testID: 'ProofRequestSharingScreen.scroll',
      }}
      testID="ProofRequestSharingScreen"
    >
      <View style={styles.content} testID="ProofRequestSharingScreen.content">
        {veranaTrust ? (
          <VeranaTrustCard
            details={trustInformation?.verana}
            detailsLoading={trustInformationFetching}
            onPress={trustDetailsPressHandler}
            onRetry={retryVeranaTrust}
            summary={veranaTrust}
            testID="ProofRequestSharingScreen.veranaTrust"
          />
        ) : featureFlags?.trustEcosystemsEnabled ? (
          <TrustInfo
            labels={trustInfoLabels()}
            onPress={trustDetailsPressHandler}
            style={styles.verifier}
            testID="ProofRequestSharingScreen.trustInfo"
            trustInformation={trustInformation?.eudiEcosystem}
          />
        ) : null}
        <>
          <ProofPresentationV2
            onPresentationDefinitionLoaded={onPresentationDefinitionLoaded}
            proofAccepted={proofAccepted}
            trustReady={isVeranaTrustActionAllowed(veranaTrust, Boolean(proof))}
          />
          {!presentationDefinitionLoaded ? (
            <ActivityIndicator
              animate={isFocused}
              testID="ProofRequestSharingScreen.indicator.credentials"
            />
          ) : (
            <ShareDisclaimer
              action={translate('common.share')}
              ppUrl="TODO"
              testID="ProofRequestSharingScreen.disclaimer"
              tosUrl="TODO"
            />
          )}
        </>
      </View>
    </ScrollViewScreen>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  verifier: {
    paddingHorizontal: 0,
    paddingTop: 16,
  },
});

export default ProofRequestScreen;
