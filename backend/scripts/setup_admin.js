const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const users = mongoose.connection.collection('users');
  
  const email = 'admin@jtsmeet.com';
  const rawPassword = 'Admin@12345';
  const hashedPassword = await bcrypt.hash(rawPassword, 12);
  
  const existing = await users.findOne({ email });
  if (!existing) {
    await users.insertOne({
      fullName: 'System Administrator',
      email,
      password: hashedPassword,
      isEmailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    console.log('SUCCESS: Admin created ->', email, '/', rawPassword);
  } else {
    await users.updateOne(
      { email },
      { $set: { password: hashedPassword, isEmailVerified: true, fullName: 'System Administrator' } }
    );
    console.log('SUCCESS: Admin updated ->', email, '/', rawPassword);
  }
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
