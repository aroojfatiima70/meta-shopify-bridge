const express = require('express');
const crypto = require('crypto');
const fetch = require('node-fetch');

const app = express();
app.use(express.json());

const META_PIXEL_ID = process.env.META_PIXEL_ID;
const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;

app.post('/webhook/shopify-fulfilled', async (req, res) => {
  try {
    const fulfillment = req.body;

    console.log('Received fulfillment webhook:', JSON.stringify(fulfillment));

    const hash = (value) =>
      crypto.createHash('sha256').update(value.trim().toLowerCase()).digest('hex');

    const email = fulfillment.email ? hash(fulfillment.email) : undefined;

    let phone;
    if (fulfillment.destination && fulfillment.destination.phone) {
      // sirf numbers rakhein, +92 ya 0 se start hone wale ko clean karein
      let cleanPhone = fulfillment.destination.phone.replace(/\D/g, '');
      phone = hash(cleanPhone);
    }

    const payload = {
      data: [
        {
          event_name: 'OrderFulfilled',
          event_time: Math.floor(Date.now() / 1000),
          action_source: 'website',
          event_source_url: 'https://thequickshop.pk',
          user_data: {
            em: email ? [email] : undefined,
            ph: phone ? [phone] : undefined,
          },
          custom_data: {
            currency: 'PKR',
            order_id: fulfillment.order_id || fulfillment.id,
          },
        },
      ],
    };

    const response = await fetch(
      `https://graph.facebook.com/v19.0/${META_PIXEL_ID}/events?access_token=${META_ACCESS_TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    );

    const result = await response.json();
    console.log('Meta CAPI response:', JSON.stringify(result));

    res.status(200).send('Event sent to Meta.');
  } catch (error) {
    console.error('Error sending event:', error);
    res.status(500).send('Error');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
