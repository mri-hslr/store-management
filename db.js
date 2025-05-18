const mongoose =require("mongoose");
const userschema= new mongoose.Schema({
    username:String,
    password:String
})
  const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 0 },
    category: { type: String },
    description: { type: String },
    dateAdded: { type: Date, default: Date.now },
    threshold: { type: Number, default: 10 } // New field for low stock alert
  });
  
  const Product = mongoose.model('Product', productSchema);
  const user=mongoose.model('user',userschema)
  module.exports = { Product ,user};
    