import {
  VeranaTrustFullDetails,
  VeranaTrustRole,
  VeranaTrustSummary,
  VeranaTrustVerdict,
} from '@procivis/react-native-one-core';
import React, { ReactElement, ReactNode } from 'react';

import { VeranaTrustCard } from './verana-trust-card';
import { VeranaTrustDossier } from './verana-trust-dossier';

jest.mock('@procivis/one-react-native-components', () => ({
  ActivityIndicator: 'ActivityIndicator',
  Button: 'Button',
  StatusSuccessIcon: 'StatusSuccessIcon',
  StatusWarningIcon: 'StatusWarningIcon',
  Typography: 'Typography',
  UpIcon: 'UpIcon',
  useAppColorScheme: () => ({
    accent: 'accent',
    success: 'success',
    successText: 'successText',
    text: 'text',
    warning: 'warning',
    white: 'white',
  }),
}));

jest.mock('react-native-svg', () => ({
  Circle: 'Circle',
  Path: 'Path',
  Rect: 'Rect',
  Text: 'SvgText',
}));

jest.mock('../../i18n', () => ({
  translate: (key: string) => key,
}));

jest.mock('react-native', () => ({
  Linking: {
    openURL: (_url: string) => undefined,
  },
  Pressable: 'Pressable',
  StyleSheet: {
    create: <T,>(styles: T) => styles,
    hairlineWidth: 1,
  },
  View: 'View',
}));

type RenderedNode = {
  props: Record<string, unknown>;
  type: string;
};

type SyncComponent = {
  (props: Record<string, unknown>): ReactNode;
  prototype?: { isReactComponent?: boolean };
};

const callComponent = <Props,>(
  component: React.FC<Props>,
  props: Props,
): ReactNode => (component as unknown as (value: Props) => ReactNode)(props);

const renderNodes = (node: ReactNode): RenderedNode[] => {
  if (Array.isArray(node)) {
    return node.flatMap(renderNodes);
  }
  if (!React.isValidElement(node)) {
    return [];
  }
  const element = node as ReactElement<Record<string, unknown>>;
  if (typeof element.type === 'function') {
    const component = element.type as unknown as SyncComponent;
    if (!component.prototype?.isReactComponent) {
      return renderNodes(component(element.props));
    }
  }
  const type = element.type as {
    displayName?: string;
    name?: string;
  };
  return [
    {
      props: element.props,
      type:
        typeof element.type === 'string'
          ? element.type
          : type.displayName ?? type.name ?? String(element.type),
    },
    ...renderNodes(element.props.children as ReactNode),
  ];
};

const summary = (
  verdict: VeranaTrustVerdict,
  schema = 'https://issuer.example/vct/employee',
): VeranaTrustSummary => ({
  authorizations: [],
  did: 'did:example:counterparty',
  resolverUrl: 'https://resolver.testnet.verana.network',
  role: VeranaTrustRole.ISSUER,
  schemas: [schema],
  verdict,
});

const textOf = (nodes: RenderedNode[]): string[] =>
  nodes
    .filter((node) => node.type === 'Typography')
    .map((node) =>
      Array.isArray(node.props.children)
        ? (node.props.children as unknown[]).join('')
        : String(node.props.children),
    );

const details = (
  production = true,
  results: [string, string] = ['VALID', 'VALID'],
): VeranaTrustFullDetails => ({
  credentials: [
    {
      claims: [
        { name: 'name', value: 'Demo Service', valueType: 'string' },
        { name: 'minimumAgeRequired', value: '18', valueType: 'number' },
        {
          name: 'termsAndConditionsUri',
          value: 'https://service.example/terms',
          valueType: 'string',
        },
        {
          name: 'termsAndConditionsDigestSri',
          value: 'sha384-abc',
          valueType: 'string',
        },
      ],
      ecsType: 'ECS-SERVICE',
      issuedBy: 'did:example:registry#key-1',
      permissionChain: [],
      result: results[0],
    },
    {
      claims: [
        { name: 'name', value: 'Demo Organization', valueType: 'string' },
        { name: 'countryCode', value: 'ch', valueType: 'string' },
        { name: 'registryId', value: 'CHE-123.456.789', valueType: 'string' },
      ],
      ecsType: 'ECS-ORG',
      issuedBy: 'did:example:registry#key-1',
      permissionChain: [],
      result: results[1],
    },
  ],
  dereferenceErrors: [],
  did: 'did:example:counterparty',
  failedCredentials: [],
  production,
  resolverUrl: 'https://resolver.testnet.verana.network',
  trustStatus: 'TRUSTED',
});

describe('VeranaTrustCard', () => {
  it('renders the verified chain and grants the ask for TRUSTED_AUTHORIZED', () => {
    const onPress = jest.fn();
    const nodes = renderNodes(
      callComponent(VeranaTrustCard, {
        details: details(),
        onPress,
        summary: summary(VeranaTrustVerdict.TRUSTED_AUTHORIZED),
        testID: 'VeranaTrustCard',
      }),
    );
    const texts = textOf(nodes);
    const card = nodes.find(
      (node) =>
        node.type === 'Pressable' && node.props.testID === 'VeranaTrustCard',
    );
    const verdict = nodes.find(
      (node) => node.props.testID === 'VeranaTrustCard.verdict',
    );

    expect(card?.props.accessibilityRole).toBe('button');
    expect(verdict?.props.children).toBe('TRUSTED');
    expect(texts).toContain('Demo Service');
    expect(texts).toContain('CHE-123.456.789');
    expect(texts).toContain(
      'Both identity credentials verified against the Verana public registry',
    );
    expect(texts).toContain('Terms & conditions');
    expect(
      texts.some((text) =>
        text.includes(
          'Demo Service is an authorized issuer of https://issuer.example/vct/employee',
        ),
      ),
    ).toBe(true);
    expect(
      nodes.some((node) => node.props.testID === 'VeranaTrustCard.testnet'),
    ).toBe(false);

    (card?.props.onPress as () => void)();
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('keeps the trusted identity but refuses the ask for UNAUTHORIZED', () => {
    const nodes = renderNodes(
      callComponent(VeranaTrustCard, {
        onPress: jest.fn(),
        summary: summary(VeranaTrustVerdict.UNAUTHORIZED),
        testID: 'VeranaTrustCard',
      }),
    );
    const verdict = nodes.find(
      (node) => node.props.testID === 'VeranaTrustCard.verdict',
    );

    expect(verdict?.props.children).toBe('TRUSTED');
    expect(
      textOf(nodes).some((text) =>
        text.includes('is not an authorized issuer of'),
      ),
    ).toBe(true);
  });

  it('renders UNAVAILABLE as could-not-determine with a retry affordance', () => {
    const onRetry = jest.fn();
    const nodes = renderNodes(
      callComponent(VeranaTrustCard, {
        onPress: jest.fn(),
        onRetry,
        summary: summary(VeranaTrustVerdict.UNAVAILABLE),
        testID: 'VeranaTrustCard',
      }),
    );
    const verdict = nodes.find(
      (node) => node.props.testID === 'VeranaTrustCard.verdict',
    );
    const retry = nodes.find(
      (node) => node.props.testID === 'VeranaTrustCard.retry',
    );
    const texts = textOf(nodes);

    expect(verdict?.props.children).toBe('COULD NOT VERIFY');
    expect(texts).toContain('This could not be checked against the registry.');
    expect(
      texts.some((text) => text.includes('is not an authorized issuer of')),
    ).toBe(false);

    (retry?.props.onPress as () => void)();
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('shows the resolving state as a verdict rather than a spinner line', () => {
    const nodes = renderNodes(
      callComponent(VeranaTrustCard, {
        detailsLoading: true,
        onPress: jest.fn(),
        summary: summary(VeranaTrustVerdict.TRUSTED_AUTHORIZED),
        testID: 'VeranaTrustCard',
      }),
    );
    const verdict = nodes.find(
      (node) => node.props.testID === 'VeranaTrustCard.verdict',
    );

    expect(verdict?.props.children).toBe('CHECKING…');
    expect(textOf(nodes)).toContain('Checking the Verana public registry…');
  });

  it('marks NON_PRODUCTION as testnet and treats the empty-authorizations ask as could-not-determine', () => {
    const nodes = renderNodes(
      callComponent(VeranaTrustCard, {
        details: details(false),
        onPress: jest.fn(),
        summary: summary(VeranaTrustVerdict.NON_PRODUCTION),
        testID: 'VeranaTrustCard',
      }),
    );
    const texts = textOf(nodes);

    expect(
      nodes.some((node) => node.props.testID === 'VeranaTrustCard.testnet'),
    ).toBe(true);
    expect(texts).toContain('Demo network - do not share real data');
    expect(texts).toContain('This could not be checked against the registry.');
    expect(texts).toContain('Demo Service');
  });
});

describe('VeranaTrustDossier', () => {
  it('keeps the summary visible and exposes retry when full details fail', () => {
    const onRetry = jest.fn();
    const nodes = renderNodes(
      callComponent(VeranaTrustDossier, {
        error: new Error('resolver unavailable'),
        fetching: false,
        onRetry,
        summary: summary(VeranaTrustVerdict.UNAVAILABLE),
      }),
    );
    const retry = nodes.find((node) => node.type === 'Button');

    expect(
      nodes.some(
        (node) =>
          node.type === 'Typography' &&
          node.props.children === 'veranaTrust.summaryUnchanged',
      ),
    ).toBe(true);
    expect(retry?.props.title).toBe('common.retry');

    (retry?.props.onPress as () => void)();
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('opens only validated HTTP links from summary evidence', () => {
    const nodes = renderNodes(
      callComponent(VeranaTrustDossier, {
        error: undefined,
        fetching: false,
        onRetry: jest.fn(),
        summary: summary(
          VeranaTrustVerdict.UNAUTHORIZED,
          'https://issuer.example/vct/employee',
        ),
      }),
    );
    const links = nodes.filter(
      (node) =>
        node.type === 'Pressable' && node.props.accessibilityRole === 'link',
    );

    expect(links).toHaveLength(2);
  });

  it('does not make an unsafe schema interactive', () => {
    const nodes = renderNodes(
      callComponent(VeranaTrustDossier, {
        error: undefined,
        fetching: false,
        onRetry: jest.fn(),
        summary: summary(
          VeranaTrustVerdict.UNKNOWN_SCHEMA,
          'javascript:alert(1)',
        ),
      }),
    );
    const disabled = nodes.find(
      (node) => node.type === 'Pressable' && node.props.disabled === true,
    );

    expect(disabled?.props.accessibilityRole).toBeUndefined();
  });
});
