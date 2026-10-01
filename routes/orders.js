const router = require('express').Router();
const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Product');
const { auth, adminOnly, wrap } = require('../middleware/auth');

const STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

// Checkout: create an order and reduce stock
router.post('/', auth, wrap(async (req, res) => {
  const { items, address } = req.body;
  if (!Array.isArray(items) || !items.length) return res.status(400).json({ error: 'Cart is empty' });
  if (!address || !String(address).trim()) return res.status(400).json({ error: 'Delivery address is required' });

  const reserved = [];
  const lines = [];
  try {
    for (const it of items) {
      const qty = parseInt(it.qty, 10);
      if (!mongoose.isValidObjectId(it.productId) || !(qty > 0)) throw new Error('Invalid cart item');
      // atomic: only succeeds if enough stock is available
      const p = await Product.findOneAndUpdate(
        { _id: it.productId, stock: { $gte: qty } },
        { $inc: { stock: -qty } },
        { new: true }
      );
      if (!p) throw new Error('Not enough stock for one of the items');
      reserved.push({ id: p._id, qty });
      lines.push({ product: p._id, name: p.name, price: p.price, qty });
    }
  } catch (e) {
    for (const r of reserved) await Product.updateOne({ _id: r.id }, { $inc: { stock: r.qty } }); // undo
    return res.status(400).json({ error: e.message });
  }
  const total = lines.reduce((s, l) => s + l.price * l.qty, 0);
  const order = await Order.create({ user: req.user.id, items: lines, total, address: String(address).trim() });
  res.status(201).json(order);
}));

// My orders (any logged-in user)
router.get('/mine', auth, wrap(async (req, res) => {
  res.json(await Order.find({ user: req.user.id }).sort({ createdAt: -1 }));
}));

// All orders (admin)
router.get('/', auth, adminOnly, wrap(async (req, res) => {
  res.json(await Order.find().populate('user', 'name email').sort({ createdAt: -1 }));
}));

// Update status (admin) - cancelling returns items to stock
router.put('/:id/status', auth, adminOnly, wrap(async (req, res) => {
  const { status } = req.body;
  if (!STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status' });
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (status === 'cancelled' && order.status !== 'cancelled') {
    for (const l of order.items) await Product.updateOne({ _id: l.product }, { $inc: { stock: l.qty } });
  }
  order.status = status;
  await order.save();
  res.json(order);
}));

module.exports = router;
