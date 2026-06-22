require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });
require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const axios   = require('axios');
const path    = require('path');
const fs      = require('fs');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: '*' }));
app.use(express.json());

function log(label, data) {
  console.log(`[${new Date().toISOString()}] ${label}:`, JSON.stringify(data, null, 2));
}

async function getMpesaToken() {
  const { MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET, MPESA_ENV } = process.env;
  if (!MPESA_CONSUMER_KEY || !MPESA_CONSUMER_SECRET) throw new Error('M-Pesa credentials not set.');
  const base64 = Buffer.from(`${MPESA_CONSUMER_KEY}:${MPESA_CONSUMER_SECRET}`).toString('base64');
  const base   = MPESA_ENV === 'production' ? 'https://api.safaricom.co.ke' : 'https://sandbox.safaricom.co.ke';
  const res    = await axios.get(`${base}/oauth/v1/generate?grant_type=client_credentials`, { headers: { Authorization: `Basic ${base64}` } });
  return { token: res.data.access_token, base };
}

// Health check — Railway uses this
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    mpesa: {
      configured: !!(process.env.MPESA_CONSUMER_KEY),
      env: process.env.MPESA_ENV || 'sandbox',
      b2c_ready: !!(process.env.MPESA_B2C_INITIATOR),
    },
  });
});

// B2C — send money TO recipient
app.post('/api/mpesa/b2c', async (req, res) => {
  try {
    const { phone, amount, reference, remarks } = req.body;
    if (!phone || !amount) return res.status(400).json({ message: 'phone and amount required.' });

    const { MPESA_B2C_INITIATOR, MPESA_B2C_PASSWORD, MPESA_B2C_SHORTCODE, MPESA_B2C_RESULT_URL, MPESA_B2C_TIMEOUT_URL, BACKEND_URL } = process.env;
    if (!MPESA_B2C_INITIATOR) return res.status(500).json({ message: 'B2C not configured.' });

    const { token, base } = await getMpesaToken();
    const normalPhone     = String(phone).replace(/^\+/, '').replace(/^0/, '254');
    const backendBase     = BACKEND_URL || `https://${req.headers.host}`;

    const payload = {
      InitiatorName:      MPESA_B2C_INITIATOR,
      SecurityCredential: MPESA_B2C_PASSWORD,
      CommandID:          'BusinessPayment',
      Amount:             Math.round(Number(amount)),
      PartyA:             MPESA_B2C_SHORTCODE,
      PartyB:             normalPhone,
      Remarks:            remarks || 'EcoGuard Finance loan disbursement',
      QueueTimeOutURL:    MPESA_B2C_TIMEOUT_URL || `${backendBase}/api/mpesa/b2c/timeout`,
      ResultURL:          MPESA_B2C_RESULT_URL  || `${backendBase}/api/mpesa/b2c/result`,
      Occasion:           reference || `ECO-${Date.now()}`,
    };

    log('B2C →', { phone: normalPhone, amount: payload.Amount });
    const mpesaRes = await axios.post(`${base}/mpesa/b2c/v1/paymentrequest`, payload, { headers: { Authorization: `Bearer ${token}` } });
    log('B2C ←', mpesaRes.data);
    return res.json(mpesaRes.data);
  } catch (err) {
    const msg = err.response?.data?.errorMessage || err.message;
    log('B2C ERROR', { error: msg });
    return res.status(500).json({ message: msg });
  }
});

app.post('/api/mpesa/b2c/result',  (req, res) => { log('B2C Result',  req.body); res.json({ ResultCode: 0, ResultDesc: 'Accepted' }); });
app.post('/api/mpesa/b2c/timeout', (req, res) => { log('B2C Timeout', req.body); res.json({ ResultCode: 0, ResultDesc: 'Accepted' }); });

// Serve React frontend from dist/
const distPath = path.join(__dirname, '../dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get(/^(?!\/api).*/, (req, res) => res.sendFile(path.join(distPath, 'index.html')));
  console.log('✅ Serving frontend from dist/');
} else {
  app.get('/', (req, res) => res.json({ status: 'ok', note: 'No dist/ yet - run npm run build' }));
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n✅ EcoGuard Finance running on port ${PORT}`);
  console.log(`   M-Pesa: ${process.env.MPESA_CONSUMER_KEY ? '✅' : '❌'} | B2C: ${process.env.MPESA_B2C_INITIATOR ? '✅' : '❌'} | Mode: ${process.env.MPESA_ENV || 'sandbox'}\n`);
});
