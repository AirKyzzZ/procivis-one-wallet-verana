import {
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
): VeranaTrustSummary =>
  ({
    authorizations: [],
    did: 'did:example:counterparty',
    resolverUrl: 'https://resolver.testnet.verana.network',
    role: VeranaTrustRole.ISSUER,
    schemas: [schema],
    verdict,
  } as VeranaTrustSummary);

describe('VeranaTrustCard', () => {
  it.each([
    [VeranaTrustVerdict.TRUSTED_AUTHORIZED, 'success', 'StatusSuccessIcon'],
    [VeranaTrustVerdict.UNAUTHORIZED, 'warning', 'StatusWarningIcon'],
  ])(
    'renders %s honestly and keeps the dossier clickable',
    (verdict, borderColor, icon) => {
      const onPress = jest.fn();
      const nodes = renderNodes(
        callComponent(VeranaTrustCard, {
          onPress,
          summary: summary(verdict),
          testID: 'VeranaTrustCard',
        }),
      );
      const card = nodes.find((node) => node.type === 'Pressable');
      const style = (
        card?.props.style as (state: { pressed: boolean }) => object[]
      )({ pressed: false });

      expect(card?.props.accessibilityRole).toBe('button');
      expect(style).toContainEqual(expect.objectContaining({ borderColor }));
      expect(nodes.some((node) => node.type === icon)).toBe(true);

      (card?.props.onPress as () => void)();
      expect(onPress).toHaveBeenCalledTimes(1);
    },
  );
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
