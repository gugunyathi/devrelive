/**
 * Attributed Viem Wallet Client + CDP Paymaster
 *
 * createAttributedWalletClient — use this for all transactions; automatically
 * carries the DevReLive Builder Code suffix (ERC-8021) on every outgoing tx.
 *
 * getPaymasterClient — returns a viem paymaster client backed by CDP's RPC,
 * enabling gas sponsorship for ERC-4337 / smart-wallet operations. Pass it
 * as the `paymaster` option to `bundlerClient.sendUserOperation()` / hooks
 * that accept a paymasterService capability.
 *
 * Usage:
 *   const walletClient = createAttributedWalletClient(provider);
 *   const hash = await walletClient.sendTransaction({ to: '0x...', value: parseEther('0.01') });
 *
 *   const paymaster = getPaymasterClient();
 *   // paymaster is a viem PaymasterClient — pass to bundlerClient / wagmi config
 */
import { createWalletClient, custom, http } from 'viem';
import { base } from 'viem/chains';
import { createPaymasterClient } from 'viem/account-abstraction';
import { Attribution } from 'ox/erc8021';
import { BUILDER_CODE } from './builder-code';

/** CDP Paymaster RPC URL — exposed client-side via NEXT_PUBLIC_ prefix */
export const PAYMASTER_URL =
  process.env.NEXT_PUBLIC_CDP_PAYMASTER_URL ?? undefined;

/**
 * Returns a viem PaymasterClient backed by CDP's RPC endpoint.
 * Returns null when NEXT_PUBLIC_CDP_PAYMASTER_URL is not configured.
 */
export function getPaymasterClient() {
  if (!PAYMASTER_URL) return null;
  return createPaymasterClient({
    transport: http(PAYMASTER_URL),
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createAttributedWalletClient(provider: any) {
  // Read user-entered builder code at call time; fall back to env var
  const runtimeCode =
    (typeof window !== 'undefined'
      ? localStorage.getItem('devrelive_builder_code')
      : null) ?? BUILDER_CODE;
  const dataSuffix: `0x${string}` | undefined = runtimeCode
    ? Attribution.toDataSuffix({ codes: [runtimeCode] })
    : undefined;
  return createWalletClient({
    chain: base,
    transport: custom(provider),
    dataSuffix,
  });
}
