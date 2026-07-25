import { MutableRefObject } from 'react';

export const hasProofTransactions = (transactions: readonly unknown[]) =>
  transactions.length > 0;

export type ProofPresentationProps = {
  onPresentationDefinitionLoaded: () => void;
  proofAccepted: MutableRefObject<boolean>;
  trustReady: boolean;
};
