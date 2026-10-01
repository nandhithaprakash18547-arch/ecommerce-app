const router = require('express').Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { sign, auth, wrap } = require('../middleware/auth');

const pub = (u) => ({ id: u._id, name: u.name, email: u.email, role: u.role });

router.post('/register', wrap(async (req, res) => {
  const name = (req.body.name || '').trim();
  const email = (req.body.email || '').trim().toLowerCase();
  const password = req.body.password || '';
  if (!name || !email || password.length < 6)
    return res.status(400).json({ error: 'Name, email and password (6+ chars) are required' });
  if (await User.findOne({ email })) return res.status(409).json({ error: 'Email already registered' });
  // role is always "user" here; admins are created with: npm run seed
  const user = await User.create({ name, email, passwordHash: await bcrypt.hash(password, 10) });
  res.status(201).json({ token: sign(user), user: pub(user) });
}));

router.post('/login', wrap(async (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();
  const user = await User.findOne({ email });
  if (!user || !(await bcrypt.compare(req.body.password || '', user.passwordHash)))
    return res.status(401).json({ error: 'Invalid email or password' });
  res.json({ token: sign(user), user: pub(user) });
}));

router.get('/me', auth, wrap(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) return res.status(401).json({ error: 'User not found' });
  res.json({ user: pub(user) });
}));

module.exports = router;
