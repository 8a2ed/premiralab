import crypto from 'node:crypto';
import { db, now } from '../db.js';
import type { SiteSettings } from '../types.js';

function getPaymobSettings() {
  const siteRow = db.prepare("SELECT value FROM settings WHERE key='site'").get() as { value: string } | undefined;
  const site: any = siteRow ? JSON.parse(siteRow.value) : {};
  return {
    enabled: Boolean(site.paymob_enabled),
    apiKey: site.paymob_api_key || '',
    publicKey: site.paymob_public_key || '',
    secretKey: site.paymob_secret_key || '',
    integrationCard: site.paymob_integration_id_card || '',
    integrationWallet: site.paymob_integration_id_wallet || '',
    integrationFawry: site.paymob_integration_id_fawry || '',
    iframeId: site.paymob_iframe_id || '',
    hmacSecret: site.paymob_hmac_secret || '',
    currency: site.paymob_currency || 'EGP',
    testMode: Boolean(site.paymob_test_mode),
  };
}

function normalizeEgyptPhone(phone: string): { e164: string; local: string } {
  let cleaned = String(phone || '').replace(/\D/g, '');
  if (cleaned.startsWith('0020')) cleaned = cleaned.slice(4);
  else if (cleaned.startsWith('20')) cleaned = cleaned.slice(2);
  else if (cleaned.startsWith('0')) cleaned = cleaned.slice(1);

  const local = '0' + cleaned;
  const e164 = '+20' + cleaned;
  return { e164, local };
}

/**
 * Paymob Unified Payment Initiation
 * Supports: Cards (Visa/Mastercard/Meeza), Mobile Wallets (Vodafone Cash, etc.), Fawry
 */
export async function createPaymobPayment({
  orderNo,
  amount,
  clientName,
  clientEmail,
  clientPhone,
  method = 'card', // 'card' | 'wallet' | 'fawry'
}: {
  orderNo: string;
  amount: number;
  clientName: string;
  clientEmail?: string;
  clientPhone: string;
  method?: 'card' | 'wallet' | 'fawry';
}) {
  const settings = getPaymobSettings();
  if (!settings.apiKey && !settings.secretKey) {
    throw new Error('إعدادات بوابة Paymob غير مكتملة في لوحة التحكم');
  }

  // Paymob accepts amount in cents (multiply by 100 for EGP)
  const amountCents = Math.round(amount * 100);

  // Step 1: Authentication Token
  const authRes = await fetch('https://accept.paymob.com/api/auth/tokens', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: settings.apiKey || settings.secretKey }),
  });
  if (!authRes.ok) {
    const err = await authRes.text();
    throw new Error(`فشل الاتصال ببوابة Paymob: ${err}`);
  }
  const authData = await authRes.json();
  const token = authData.token;

  // Step 2: Order Registration
  const orderRes = await fetch('https://accept.paymob.com/api/ecommerce/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      auth_token: token,
      delivery_needed: 'false',
      amount_cents: String(amountCents),
      currency: settings.currency,
      merchant_order_id: `${orderNo}-${Date.now()}`,
      items: [
        {
          name: `طلب مشروع ${orderNo}`,
          amount_cents: String(amountCents),
          description: `دفعة مشروع ${orderNo}`,
          quantity: '1',
        },
      ],
    }),
  });
  if (!orderRes.ok) {
    const err = await orderRes.text();
    throw new Error(`فشل تسجيل الطلب في Paymob: ${err}`);
  }
  const paymobOrder = await orderRes.json();

  // Split name and format phone
  const nameParts = clientName.trim().split(' ');
  const firstName = nameParts[0] || 'Client';
  const lastName = nameParts.slice(1).join(' ') || 'Customer';
  const { e164: formattedPhone, local: localPhone } = normalizeEgyptPhone(clientPhone);

  // Select appropriate integration ID
  let integrationId = settings.integrationCard;
  if (method === 'wallet' && settings.integrationWallet) {
    integrationId = settings.integrationWallet;
  } else if (method === 'fawry' && settings.integrationFawry) {
    integrationId = settings.integrationFawry;
  }

  if (!integrationId) {
    integrationId = settings.integrationCard || settings.integrationWallet || settings.integrationFawry;
  }

  // Step 3: Payment Key Request
  const keyRes = await fetch('https://accept.paymob.com/api/acceptance/payment_keys', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      auth_token: token,
      amount_cents: String(amountCents),
      expiration: 3600,
      order_id: paymobOrder.id,
      billing_data: {
        apartment: 'NA',
        email: clientEmail || 'client@premiralab.com',
        floor: 'NA',
        first_name: firstName,
        street: 'NA',
        building: 'NA',
        phone_number: formattedPhone,
        shipping_method: 'PKG',
        postal_code: 'NA',
        city: 'Cairo',
        country: 'EG',
        last_name: lastName,
        state: 'Cairo',
      },
      currency: settings.currency,
      integration_id: Number(integrationId),
      lock_order_when_paid: 'true',
    }),
  });

  if (!keyRes.ok) {
    const err = await keyRes.text();
    throw new Error(`فشل إنشاء مفتاح الدفع: ${err}`);
  }
  const keyData = await keyRes.json();
  const paymentKey = keyData.token;

  // Step 4: Construct Return URLs based on method
  let paymentUrl = '';
  let redirectionUrl = '';
  let fawryCode = '';

  if (method === 'wallet') {
    // Paymob Mobile Wallet URL Pay Request
    const walletRes = await fetch('https://accept.paymob.com/api/acceptance/payments/pay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: {
          identifier: localPhone,
          subtype: 'WALLET',
        },
        payment_token: paymentKey,
      }),
    });
    const walletData = await walletRes.json();
    console.log('[paymob-wallet] Response:', JSON.stringify(walletData));
    redirectionUrl = walletData.redirect_url || walletData.iframe_redirection_url || '';
    if (!redirectionUrl && walletData.data?.message) {
      throw new Error(`بوابة المحافظ: ${walletData.data.message}`);
    }
    paymentUrl = redirectionUrl || `https://accept.paymob.com/api/acceptance/iframes/${settings.iframeId}?payment_token=${paymentKey}`;
  } else if (method === 'fawry') {
    // Fawry Reference Code Generation
    const fawryRes = await fetch('https://accept.paymob.com/api/acceptance/payments/pay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: {
          identifier: 'AGGREGATOR',
          subtype: 'AGGREGATOR',
        },
        payment_token: paymentKey,
      }),
    });
    const fawryData = await fawryRes.json();
    fawryCode = fawryData.data?.bill_reference || fawryData.bill_reference || '';
    paymentUrl = `https://accept.paymob.com/api/acceptance/iframes/${settings.iframeId}?payment_token=${paymentKey}`;
  } else {
    // Standard Card / iFrame
    paymentUrl = settings.iframeId 
      ? `https://accept.paymob.com/api/acceptance/iframes/${settings.iframeId}?payment_token=${paymentKey}`
      : `https://accept.paymob.com/standalone?payment_token=${paymentKey}`;
  }

  return {
    paymentKey,
    paymentUrl,
    redirectionUrl,
    fawryCode,
    paymobOrderId: paymobOrder.id,
  };
}

/**
 * Verify Paymob HMAC SHA512 Signature from Webhook
 */
export function verifyPaymobHMAC(payload: any, hmacSecret?: string): boolean {
  const secret = hmacSecret || getPaymobSettings().hmacSecret;
  if (!secret) {
    console.warn('[paymob] HMAC secret not configured — accepting webhook without verification (configure paymob_hmac_secret to secure)');
    return true; // No secret configured yet — allow but warn
  }

  try {
    const receivedHmac = payload?.hmac || payload?.query?.hmac;
    if (!receivedHmac) {
      console.warn('[paymob] HMAC secret is configured but no HMAC attached to webhook request — REJECTING');
      return false; // Secret configured but no HMAC provided = reject
    }

    const source = payload.obj || payload;

    const getVal = (key: string) => {
      switch (key) {
        case 'amount_cents': return source.amount_cents ?? '';
        case 'created_at': return source.created_at ?? '';
        case 'currency': return source.currency ?? '';
        case 'error_occured': return source.error_occured ?? '';
        case 'has_parent_transaction': return source.has_parent_transaction ?? '';
        case 'id': return source.id ?? '';
        case 'integration_id': return source.integration_id ?? '';
        case 'is_3d_secure': return source.is_3d_secure ?? '';
        case 'is_auth': return source.is_auth ?? '';
        case 'is_capture': return source.is_capture ?? '';
        case 'is_refunded': return source.is_refunded ?? '';
        case 'is_standalone_payment': return source.is_standalone_payment ?? '';
        case 'is_voided': return source.is_voided ?? '';
        case 'order': return typeof source.order === 'object' ? source.order?.id ?? '' : source.order ?? '';
        case 'owner': return source.owner ?? '';
        case 'pending': return source.pending ?? '';
        case 'source_data_pan': return source.source_data?.pan ?? source.source_data_pan ?? '';
        case 'source_data_sub_type': return source.source_data?.sub_type ?? source.source_data_sub_type ?? '';
        case 'source_data_type': return source.source_data?.type ?? source.source_data_type ?? '';
        case 'success': return source.success ?? '';
        default: return source[key] ?? '';
      }
    };

    // Keys required by Paymob in precise alphabetical order
    const keys = [
      'amount_cents',
      'created_at',
      'currency',
      'error_occured',
      'has_parent_transaction',
      'id',
      'integration_id',
      'is_3d_secure',
      'is_auth',
      'is_capture',
      'is_refunded',
      'is_standalone_payment',
      'is_voided',
      'order',
      'owner',
      'pending',
      'source_data_pan',
      'source_data_sub_type',
      'source_data_type',
      'success',
    ];

    let concatenated = '';
    for (const key of keys) {
      concatenated += String(getVal(key));
    }

    const calculatedHmac = crypto
      .createHmac('sha512', secret)
      .update(concatenated)
      .digest('hex');

    return calculatedHmac.toLowerCase() === String(receivedHmac).toLowerCase();
  } catch (err) {
    console.error('[paymob] HMAC verification error:', err);
    return true;
  }
}
