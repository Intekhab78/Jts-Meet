const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const users = mongoose.connection.collection('users');
  
  const email = process.env.ADMIN_EMAIL || 'admin@jtsmeet.com';
  const rawPassword = process.env.ADMIN_PASSWORD || 'Admin@12345';
  const hashedPassword = await bcrypt.hash(rawPassword, 12);
  
  const existing = await users.findOne({ email });
  if (!existing) {
    await users.insertOne({
      fullName: 'System Administrator',
      email,
      password: hashedPassword,
      emailVerified: true,
      isSuperAdmin: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    console.log('SUCCESS: Admin created ->', email, '/', rawPassword);
  } else {
    await users.updateOne(
      { email },
      { $set: { password: hashedPassword, emailVerified: true, isSuperAdmin: true, fullName: 'System Administrator' } }
    );
    console.log('SUCCESS: Admin updated ->', email, '/', rawPassword);
  }
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
