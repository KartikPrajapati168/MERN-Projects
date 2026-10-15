require('dotenv').config();
const { sendTestEmail } = require('./utils/emailService');

sendTestEmail('test@example.com')
  .then(() => { console.log('✅ Test done'); process.exit(0); })
  .catch((err) => { console.error('❌ Failed:', err.message); process.exit(1); });