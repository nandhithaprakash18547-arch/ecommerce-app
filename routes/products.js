const router = require('express').Router();
const Product = require('../models/Product');
const { auth, adminOnly, wrap } = require('../middleware/auth');

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function body(b) {
  const p = {};
  if (b.name !== undefined) p.name = String(b.name).trim();
  if (b.description !== undefined) p.description = String(b.description).trim();
  if (b.price !== undefined) p.price = Number(b.price);
  if (b.stock !== undefined) p.stock = parseInt(b.stock, 10);
  if (b.category !== undefined) p.category = String(b.category).trim() || 'General';
  if (b.image !== undefined) p.image = String(b.image).trim();
  return p;
}
function check(p, requireAll) {
  if (requireAll && !p.name) return 'Product name is required';
  if (p.name === '') return 'Product name cannot be empty';
  if (requireAll && (p.price === undefined || isNaN(p.price) || p.price < 0)) return 'Valid price is required';
  if (p.price !== undefined && (isNaN(p.price) || p.price < 0)) return 'Invalid price';
  if (p.stock !== undefined && (isNaN(p.stock) || p.stock < 0)) return 'Invalid stock';
  return null;
}

// Public: list / search
router.get('/', wrap(async (req, res) => {
  const filter = {};
  if (req.query.search) filter.name = new RegExp(escapeRegex(String(req.query.search)), 'i');
  if (req.query.category) filter.category = String(req.query.category);
  res.json(await Product.find(filter).sort({ createdAt: -1 }));
}));

router.get('/:id', wrap(async (req, res) => {
  const p = await Product.findById(req.params.id);
  if (!p) return res.status(404).json({ error: 'Product not found' });
  res.json(p);
}));

// Admin only: create / update / delete
router.post('/', auth, adminOnly, wrap(async (req, res) => {
  const p = body(req.body);
  const err = check(p, true);
  if (err) return res.status(400).json({ error: err });
  res.status(201).json(await Product.create(p));
}));

router.put('/:id', auth, adminOnly, wrap(async (req, res) => {
  const p = body(req.body);
  const err = check(p, false);
  if (err) return res.status(400).json({ error: err });
  const updated = await Product.findByIdAndUpdate(req.params.id, p, { new: true });
  if (!updated) return res.status(404).json({ error: 'Product not found' });
  res.json(updated);
}));

router.delete('/:id', auth, adminOnly, wrap(async (req, res) => {
  const d = await Product.findByIdAndDelete(req.params.id);
  if (!d) return res.status(404).json({ error: 'Product not found' });
  res.json({ success: true });
}));

module.exports = router;
