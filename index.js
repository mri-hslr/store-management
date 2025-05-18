// Import required modules
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs'); // For password hashing
const {Product,user}=require("./db");

const app = express();
const PORT = 4000;
app.get("/",(req,res)=>{
  res.sendFile(__dirname+ "/index.html");
})
// Middleware
app.use(express.json());
app.use(cors());

// MongoDB Connection
mongoose.connect('mongodb+srv://hslrsharmasingh:323112rm@cluster0.skwiapv.mongodb.net/bisht', {
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
    const usertstatus=await user.create({
      username:username,
      password:hashedPassword
    })
    if(usertstatus){
      res.sendStatus(200).send("user registered sucessfully")
    }
    else{
      res.status(400).send("user not registered");
    }
  } catch (err) {
    console.log(err);
    res.status(400).json({ error: 'error occured with registration' });
  }
});

// User Login
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const userstatus = await user.findOne({ username });

    if (!userstatus) {
      // User not found
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const match = await bcrypt.compare(password, userstatus.password);

    if (!match) {
      // Password doesn't match
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const token = jwt.sign(
      { userId: userstatus._id, role: userstatus.role },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    return res.status(200).json({ token });  // send token as JSON response
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to log in' });
  }
});


// Middleware to Verify JWT
function authenticate(req, res, next) {
  const token = req.headers.token;
  if (!token) return res.status(401).json({ error: 'Access denied' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userid = decoded.userId;
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
    const products=await Product.find({});
    res.send(products);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Add a new product
app.post('/products', authenticate,  async (req, res) => {
  try {
    const { name, price, quantity, category, description,threshold } = req.body;
    await Product.create({
      name:name,
       price:price,
       quantity:quantity,
        category:category, 
        description:description,
        threshold:threshold
    })
    res.status(201).json({
      message:"product added"
    });
  } catch (err) {
    console.log(err);
    res.status(400).json({ error: 'Failed to add product' });
  }
});

// Update a product
app.put('/products/update', authenticate,  async (req, res) => {
  try {
    const  id  = req.headers.id;
    const updates = req.body;
    console.log(id);
    const found=await Product.find({
      _id:id
    })
    if(found){
      await Product.updateOne(updates);
      res.json({
        message:"product updated succesfully !!"
      })
    }
    else{
      res.json({
      message:"product not found"
      })
    }
  } catch (err) {
    console.log(err);
    res.status(400).json({ error: 'Failed to update product' });
  }
});

// Delete a product
app.delete('/products/delete', authenticate, adminOnly, async (req, res) => {
  try {
    const id = req.headers.id;
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
app.post('/products/restock', authenticate, adminOnly, async (req, res) => {
  try {
    const id = req.headers.id;
    const amount = req.body;
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

// Inventory summary
app.get('/summary', async (req, res) => {
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
