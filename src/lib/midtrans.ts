import crypto from 'crypto';

// Midtrans Snap integration (server-side). Uses the REST Snap API directly so
// no extra SDK dependency is required. Configure via env:
//   MIDTRANS_SERVER_KEY      – Server Key from the Midtrans dashboard (required)
//   MIDTRANS_IS_PRODUCTION   – "true" for production, otherwise sandbox
const SERVER_KEY = process.env.MIDTRANS_SERVER_KEY || '';
const IS_PRODUCTION = process.env.MIDTRANS_IS_PRODUCTION === 'true';
const SNAP_BASE = IS_PRODUCTION ? 'https://app.midtrans.com' : 'https://app.sandbox.midtrans.com';

export function isMidtransConfigured(): boolean {
  return Boolean(SERVER_KEY);
}

export interface SnapParams {
  orderId: string;
  grossAmount: number;
  customer: { name?: string; email?: string; phone?: string };
  finishUrl?: string;
}

export interface SnapResult {
  token: string;
  redirect_url: string;
}

export async function createSnapTransaction(p: SnapParams): Promise<SnapResult> {
  if (!SERVER_KEY) throw new Error('MIDTRANS_SERVER_KEY is not configured');

  const [firstName, ...rest] = (p.customer.name || 'Guest').trim().split(/\s+/);
  const body = {
    transaction_details: {
      order_id: p.orderId,
      gross_amount: Math.round(p.grossAmount), // IDR must be an integer
    },
    customer_details: {
      first_name: firstName || 'Guest',
      last_name: rest.join(' ') || undefined,
      email: p.customer.email || undefined,
      phone: p.customer.phone || undefined,
    },
    credit_card: { secure: true },
    callbacks: p.finishUrl ? { finish: p.finishUrl } : undefined,
  };

  const res = await fetch(`${SNAP_BASE}/snap/v1/transactions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: 'Basic ' + Buffer.from(SERVER_KEY + ':').toString('base64'),
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) {
    const msg = Array.isArray(data?.error_messages) ? data.error_messages.join(', ') : res.statusText;
    throw new Error(`Midtrans Snap error: ${msg}`);
  }
  return data as SnapResult;
}

export interface MidtransNotification {
  order_id: string;
  status_code: string;
  gross_amount: string;
  signature_key: string;
  transaction_status: string;
  fraud_status?: string;
  transaction_id?: string;
  payment_type?: string;
}

// Verify the SHA-512 signature Midtrans includes in every notification so we
// only trust genuine callbacks.
export function verifyNotificationSignature(n: MidtransNotification): boolean {
  if (!SERVER_KEY || !n.signature_key) return false;
  const expected = crypto
    .createHash('sha512')
    .update(n.order_id + n.status_code + n.gross_amount + SERVER_KEY)
    .digest('hex');
  return expected === n.signature_key;
}

// Whether a notification represents a successful, captured payment.
export function isPaidStatus(n: MidtransNotification): boolean {
  return n.transaction_status === 'settlement' || (n.transaction_status === 'capture' && n.fraud_status === 'accept');
}
