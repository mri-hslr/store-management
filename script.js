const API_URL = 'http://localhost:4000';

// Fetch products and display
async function fetchProducts() {
  try {
    const response = await fetch(`${API_URL}/products`);
    const products = await response.json();
    const productList = document.getElementById('products');
    productList.innerHTML = '';

    products.forEach(product => {
      const productItem = document.createElement('li');
      productItem.innerHTML = `
        <strong>${product.name}</strong> - $${product.price}, Qty: ${product.quantity}
        <br>Category: ${product.category || 'N/A'} 
        <br>Description: ${product.description || 'No description'}
        <br>
        <button onclick="deleteProduct('${product._id}')">Delete</button>
      `;
      productList.appendChild(productItem);
    });
  } catch (err) {
    console.error('Error fetching products:', err);
  }
}

// Add a new product
document.getElementById('addProductForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const product = {
    name: e.target.name.value,
    price: parseFloat(e.target.price.value),
    quantity: parseInt(e.target.quantity.value),
    category: e.target.category.value,
    description: e.target.description.value,
  };

  try {
    const response = await fetch(`${API_URL}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product),
    });

    if (!response.ok) throw new Error('Failed to add product');

    e.target.reset();
    fetchProducts();
  } catch (err) {
    console.error('Error adding product:', err);
  }
});

// Delete a product
async function deleteProduct(id) {
  try {
    const response = await fetch(`${API_URL}/products/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) throw new Error('Failed to delete product');

    fetchProducts();
  } catch (err) {
    console.error('Error deleting product:', err);
  }
}

// Initial fetch
fetchProducts();
