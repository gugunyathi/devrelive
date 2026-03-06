/**
 * Builder Code Attribution (ERC-8021)
 * https://docs.base.org/base-chain/builder-codes/app-developers
 *
 * Set NEXT_PUBLIC_BUILDER_CODE in your environment variables.
 * Get your code from: base.dev → Settings → Builder Codes
 */
import { Attribution } from 'ox/erc8021';

export const BUILDER_CODE = process.env.NEXT_PUBLIC_BUILDER_CODE ?? '';

/**
 * The dataSuffix to append to all outgoing transactions.
 * Undefined when NEXT_PUBLIC_BUILDER_CODE is not set (e.g. local dev without the env var).
 */
export const DATA_SUFFIX: `0x${string}` | undefined = BUILDER_CODE
  ? Attribution.toDataSuffix({ codes: [BUILDER_CODE] })
  : undefined;
