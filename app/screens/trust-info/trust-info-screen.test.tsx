import {
  VeranaTrustRole,
  VeranaTrustSummary,
  VeranaTrustVerdict,
} from '@procivis/react-native-one-core';
import React, { ReactElement } from 'react';

import {
  veranaTrustCredentialKey,
  VeranaTrustDossier,
} from '../../components/trust/verana-trust-dossier';
import TrustInfoScreen from './trust-info-screen';

const mockGoBack = jest.fn();
const mockRefetch = jest.fn();
const mockSummary = {
  authorizations: [],
  did: 'did:example:issuer',
  resolverUrl: 'https://resolver.testnet.verana.network',
  role: VeranaTrustRole.ISSUER,
  schemas: ['https://issuer.example/vct/employee'],
  verdict: VeranaTrustVerdict.UNAUTHORIZED,
} as VeranaTrustSummary;

jest.mock('@procivis/one-react-native-components', () => ({
  ActivityIndicator: 'ActivityIndicator',
  Button: 'Button',
  ScrollViewScreen: 'ScrollViewScreen',
  TrustInfoDetailsScreen: 'TrustInfoDetailsScreen',
  Typography: 'Typography',
  useAppColorScheme: () => ({ text: 'text' }),
  useCredentialTrustInformation: () => ({
    data: undefined,
    error: new Error('full details unavailable'),
    isFetching: false,
    refetch: mockRefetch,
  }),
  useProofRequestTrustInformation: () => ({
    data: undefined,
    error: undefined,
    isFetching: false,
    refetch: jest.fn(),
  }),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack }),
  useRoute: () => ({
    params: {
      verana: {
        entityId: 'credential-id',
        entityType: 'credential',
        summary: mockSummary,
      },
    },
  }),
}));

jest.mock('../../components/navigation/header-buttons', () => ({
  HeaderCloseModalButton: 'HeaderCloseModalButton',
}));

jest.mock('../../hooks/language', () => ({
  useCurrentLanguage: () => 'en',
}));

jest.mock('../../i18n', () => ({
  translate: (key: string) => key,
}));

describe('TrustInfoScreen Verana route', () => {
  it('keeps repeated trust credential ids as distinct React children', () => {
    expect(veranaTrustCredentialKey('did:example:verifier', 0)).not.toBe(
      veranaTrustCredentialKey('did:example:verifier', 1),
    );
  });

  it('owns a scrollable dossier route with close navigation and retry', () => {
    const screen = TrustInfoScreen({}) as ReactElement<{
      children: ReactElement<React.ComponentProps<typeof VeranaTrustDossier>>;
      header: { leftItem: ReactElement<{ onPress: () => void }> };
      scrollView: { testID: string };
      testID: string;
    }>;

    expect(screen.type).toBe('ScrollViewScreen');
    expect(screen.props.testID).toBe('VeranaTrustDossierScreen');
    expect(screen.props.scrollView.testID).toBe('VeranaTrustDossier.scroll');

    screen.props.header.leftItem.props.onPress();
    expect(mockGoBack).toHaveBeenCalledTimes(1);

    screen.props.children.props.onRetry();
    expect(mockRefetch).toHaveBeenCalledTimes(1);
    expect(screen.props.children.props.summary).toBe(mockSummary);
  });
});
