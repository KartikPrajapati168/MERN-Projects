// backend/reset-password.js
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

const TARGET_EMAIL = 'manisha86@gmail.com';
const NEW_PASSWORD = 'manisha123';   // ya jo bhi rakhna ho

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const user = await User.findOne({ email: TARGET_EMAIL });
    if (!user) {
      console.log('❌ User not found:', TARGET_EMAIL);
      process.exit(1);
    }

    console.log('Found user:', user.email);
    console.log('Old hash starts with:', user.password.slice(0, 15));

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(NEW_PASSWORD, salt);

    // Bypass pre-save hook — direct update
    await User.updateOne(
      { _id: user._id },
      { $set: { password: hash } }
    );

    console.log('✅ Password reset done!');
    console.log('📧 Email:', TARGET_EMAIL);
    console.log('🔑 New Password:', NEW_PASSWORD);
    console.log('🔐 New hash starts with:', hash.slice(0, 15));

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
})();