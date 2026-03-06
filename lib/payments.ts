/**
 * Base Pay utilities (ERC-8021)
 * Docs: https://docs.base.org/base-account/accept-payments
 *
 * NEXT_PUBLIC_PAYMENT_ADDRESS — wallet address that receives USDC
 * NEXT_PUBLIC_BASEPAY_TESTNET — set "true" to use Base Sepolia test USDC
 */

export const PAYMENT_ADDRESS =
  process.env.NEXT_PUBLIC_PAYMENT_ADDRESS ?? '';

export const BASEPAY_TESTNET =
  process.env.NEXT_PUBLIC_BASEPAY_TESTNET === 'true';

export interface PaymentResult {
  id: string;
}

/**
 * Trigger a Base Pay popup and return the payment id.
 * Must be called client-side inside a user-gesture handler.
 */
export async function requestPayment(amount: string): Promise<PaymentResult> {
  if (!PAYMENT_ADDRESS) {
    throw new Error('NEXT_PUBLIC_PAYMENT_ADDRESS is not configured.');
  }
  const { pay } = await import('@base-org/account');
  const result = await pay({
    amount,
    to: PAYMENT_ADDRESS,
    testnet: BASEPAY_TESTNET,
  });
  return { id: result.id };
}

/**
 * Server-side: verify a payment has completed.
 * Call from your API route — never trust the client alone.
 */
export async function verifyPayment(id: string): Promise<{ status: string; sender: string; amount: string; recipient: string }> {
  const { getPaymentStatus } = await import('@base-org/account');
  const status = await getPaymentStatus({ id, testnet: BASEPAY_TESTNET });
  return status as { status: string; sender: string; amount: string; recipient: string };
}
