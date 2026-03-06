/**
 * Attributed Viem Wallet Client
 *
 * Use this factory whenever you need to send transactions so that
 * all outgoing txs automatically carry the DevReLive Builder Code suffix (ERC-8021).
 *
 * Usage:
 *   const client = createAttributedWalletClient(provider);
 *   const hash = await client.sendTransaction({ to: '0x...', value: parseEther('0.01') });
 */
import { createWalletClient, custom } from 'viem';
import { base } from 'viem/chains';
import { DATA_SUFFIX } from './builder-code';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createAttributedWalletClient(provider: any) {
  return createWalletClient({
    chain: base,
    transport: custom(provider),
    dataSuffix: DATA_SUFFIX,
  });
}
