import { hasProofTransactions } from './proof-presentation-props';

describe('proof presentation visibility', () => {
  it('does not render a numeric zero for an empty transaction list', () => {
    expect(hasProofTransactions([])).toBe(false);
    expect(hasProofTransactions([{}])).toBe(true);
  });
});
