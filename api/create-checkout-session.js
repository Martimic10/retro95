module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  try {
    const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
    const STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID || '';
    const APP_BASE_URL = process.env.APP_BASE_URL || `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}`;

    if (!STRIPE_SECRET_KEY) {
      res.status(500).json({ error: 'Missing STRIPE_SECRET_KEY' });
      return;
    }

    if (!STRIPE_PRICE_ID) {
      res.status(500).json({ error: 'Missing STRIPE_PRICE_ID' });
      return;
    }

    const form = new URLSearchParams();
    form.set('mode', 'payment');
    form.set('success_url', `${APP_BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}`);
    form.set('cancel_url', `${APP_BASE_URL}/cancel`);
    form.set('line_items[0][price]', STRIPE_PRICE_ID);
    form.set('line_items[0][quantity]', '1');
    form.set('allow_promotion_codes', 'true');

    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: form.toString()
    });

    const json = await response.json();
    if (!response.ok) {
      const msg = json && json.error && json.error.message ? json.error.message : 'Stripe session creation failed';
      throw new Error(msg);
    }

    if (!json.url) {
      throw new Error('Stripe response missing checkout URL');
    }

    res.status(200).json({ url: json.url });
  } catch (error) {
    res.status(500).json({ error: String(error.message || error) });
  }
};
