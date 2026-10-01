// Creates an admin account + sample products.  Run:  npm run seed
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Product = require('../models/Product');

const ADMIN_EMAIL = 'admin@shop.com';
const ADMIN_PASSWORD = 'admin123';

(async () => {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ecommerce');
  if (!(await User.findOne({ email: ADMIN_EMAIL }))) {
    await User.create({ name: 'Admin', email: ADMIN_EMAIL, passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 10), role: 'admin' });
    console.log(`Admin created -> ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  } else console.log('Admin already exists');

  if ((await Product.countDocuments()) === 0) {
    await Product.insertMany([
      { name: 'Wireless Mouse', description: 'Comfortable 2.4GHz wireless mouse', price: 599, stock: 25, category: 'Electronics' },
      { name: 'Mechanical Keyboard', description: 'Blue switch, backlit', price: 2499, stock: 10, category: 'Electronics' },
      { name: 'Notebook (Pack of 5)', description: 'A5 ruled notebooks', price: 249, stock: 60, category: 'Stationery' },
      { name: 'Backpack', description: '30L water-resistant backpack', price: 1299, stock: 15, category: 'Bags' },
      { name: 'Water Bottle', description: 'Steel 1 litre bottle', price: 399, stock: 40, category: 'Home' },
      { name: 'USB-C Cable', description: '1m fast charging cable', price: 199, stock: 100, category: 'Electronics' },
    ]);
    console.log('Sample products added');
  }
  await mongoose.disconnect();
})().catch((e) => { console.error(e.message); process.exit(1); });
