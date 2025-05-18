// Import required modules
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs'); // For password hashing
const  Product  =require ('./db.js');
const user=require('./db.js')

const app = express();
const PORT = 4000;
app.get("/",function(req,res){
  res.json({
    message:"i am really sorry!!!!!!!!!!!!!",
    message1:"really sorry, i meant it.!!!!!!!!!!!!!!!!!",
    message2:"sorry🥺",
    message3:"please forgive me"
  })
})
// Middleware
app.use(express.json());
app.use(cors());

// MongoDB Connection
mongoose.connect('mongodb+srv://hslrsharmasingh:323112rm@cluster0.skwiapv.mongodb.net/storemanagement', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('MongoDB Connected'))
  .catch((err) => console.error('MongoDB Connection Error:', err));


// JWT Secret Key
const JWT_SECRET = 'your_jwt_secret_key';
// API Routes
// User Registration
app.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    user.create({
      username:username,
      password:hashedPassword
    })
    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    res.status(400).json({ error: 'Failed to register user' });
  }
});

// User Login
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await user.findOne({ username });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ userId: user._id, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
  } catch (err) {
    res.status(400).json({ error: 'Failed to log in' });
  }
});

// Middleware to Verify JWT
function authenticate(req, res, next) {
  const token = req.headers.token?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access denied' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}
// Middleware for Admin Only Routes
function adminOnly(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied' });
  }
  next();
}

// Get all products with Pagination and Filtering
app.get('/products', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 10, category, name } = req.query;
    const query = {};
    if (category) query.category = category;
    if (name) query.name = new RegExp(name, 'i');
    const products = await Product.find(query)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    const total = await Product.countDocuments(query);
    res.json({ products, total });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Add a new product
app.post('/products', authenticate, adminOnly, async (req, res) => {
  try {
    const { name, price, quantity, category, description,threshold } = req.body;
    Product.create({
      name:name,
       price:price,
       quantity:quantity,
        category:category, 
        description:description,
        threshold:threshold
    })
    await Product.save();
    res.status(201).json(Product);
  } catch (err) {
    res.status(400).json({ error: 'Failed to add product' });
  }
});

// Update a product
app.put('/products/:id', authenticate, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const updatedProduct = await Product.findByIdAndUpdate(id, updates, { new: true });
    if (!updatedProduct) return res.status(404).json({ error: 'Product not found' });
    res.json(updatedProduct);
  } catch (err) {
    res.status(400).json({ error: 'Failed to update product' });
  }
});

// Delete a product
app.delete('/products/:id', authenticate, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    await Product.findByIdAndDelete(id);
    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(400).json({ error: 'Failed to delete product' });
  }
});
//INVENTORY MANAGEMENT
//low-stock product
app.get('/products/low-stock', authenticate, async (req, res) => {
  try {
    const lowStockProducts = await Product.find({
      $expr: { $lt: ['$quantity', '$threshold'] }
    });
    res.json({ lowStockProducts });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch low-stock products' });
  }
});
//restock product
app.post('/products/:id/restock', authenticate, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { amount } = req.body;
    if (amount <= 0) return res.status(400).json({ error: 'Invalid restock amount' });

    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    product.quantity += amount;
    await product.save();

    res.json({ message: 'Product restocked', product });
  } catch (err) {
    res.status(500).json({ error: 'Failed to restock product' });
  }
});

//update product info
// Update product by ID
app.put('/updateproduct/:id', async function (req, res){
  try {
    const productId = req.params.id;
    const updates = req.body;

    if (updates.price < 0 || updates.quantity < 0 || updates.threshold < 0) {
      return res.status(400).json({ error: "Invalid update values" });
    }
    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      { $set: updates },
      { new: true, runValidators: true }
    );
    if (!updatedProduct) {
      return res.status(404).json({ error: "Product not found" });
    }
    res.json(updatedProduct);
  } catch (error) {
    res.status(500).json({ error: "Failed to update product" });
  }
});
// Inventory summary
router.get('/summary', async (req, res) => {
  try {
    const totalProducts = await Product.countDocuments();

    const lowStockCount = await Product.countDocuments({
      $expr: { $lte: ['$quantity', '$threshold'] }
    });

    const products = await Product.find();
    const totalValue = products.reduce((sum, p) => sum + (p.price * p.quantity), 0);

    res.json({
      totalProducts,
      lowStockCount,
      totalValue
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to get summary" });
  }
});
// Search and filter products
app.get('/search', async (req, res) => {
  try {
    const { name, category, priceMin, priceMax } = req.query;

    // Build filter object
    const filter = {};

    if (name) {
      filter.name = { $regex: name, $options: 'i' }; // case-insensitive partial match
    }

    if (category) {
      filter.category = category;
    }

    if (priceMin || priceMax) {
      filter.price = {};
      if (priceMin) filter.price.$gte = Number(priceMin);
      if (priceMax) filter.price.$lte = Number(priceMax);
    }

    const products = await Product.find(filter);
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: "Search failed" });
  }
});


// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
