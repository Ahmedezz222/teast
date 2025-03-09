// Product Management
let products = [];
let categories = [];

document.addEventListener('DOMContentLoaded', () => {
    initializeProducts();
    setupEventListeners();
    loadCategories();
});

async function initializeProducts() {
    try {
        loadProductsFromLocalStorage();
        setupStorageListener();
    } catch (error) {
        console.error('Error loading products:', error);
        showNotification('Error loading products', 'error');
    }
}

function loadProductsFromLocalStorage() {
    try {
        const storedProducts = localStorage.getItem('products');
        if (!storedProducts) return;
        
        products = JSON.parse(storedProducts);
        renderProducts(products);
        
        console.log('Products loaded:', products.length); // Debug log
    } catch (error) {
        console.error('Error loading products:', error);
        showNotification('Error loading products', 'error');
    }
}

function setupStorageListener() {
    // Listen for storage events from other tabs
    window.addEventListener('storage', (event) => {
        if (event.key === 'products') {
            console.log('Storage event detected'); // Debug log
            loadProductsFromLocalStorage();
        }
    });

    // Also listen for direct changes
    window.addEventListener('productsUpdated', () => {
        loadProductsFromLocalStorage();
    });
}

function loadCategories() {
    try {
        categories = JSON.parse(localStorage.getItem('categories') || '[]');
        populateCategoryFilter();
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

function setupEventListeners() {
    // Close modal when clicking the close button or outside the modal
    const modal = document.getElementById('product-details-modal');
    const closeBtn = modal.querySelector('.close-btn');
    
    closeBtn.onclick = () => hideModal();
    window.onclick = (event) => {
        if (event.target === modal) hideModal();
    }

    // Add ESC key listener
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') hideModal();
    });

    // Filter controls
    document.getElementById('category-filter').addEventListener('change', filterProducts);
    document.getElementById('price-sort').addEventListener('change', sortProducts);
}

function renderProducts(productsToRender = products) {
    const container = document.getElementById('products-container');
    if (!container) return;
    
    container.innerHTML = '';

    if (!productsToRender.length) {
        container.innerHTML = '<p class="no-products">No products available</p>';
        return;
    }

    productsToRender.forEach(product => {
        const card = createProductCard(product);
        container.appendChild(card);
    });
}

function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.innerHTML = `
        <div class="product-image" onclick="showProductDetails('${product.id}')">
            <img src="${product.image || 'placeholder.jpg'}" alt="${product.name}" loading="lazy">
            ${product.stock <= 0 ? '<span class="stock-badge">Out of Stock</span>' : ''}
        </div>
        <div class="product-info">
            <h3>${product.name}</h3>
            <p class="product-category">${product.category}</p>
            <p class="product-price">${formatCurrency(product.price)}</p>
            <div class="product-actions">
                <button onclick="showProductDetails('${product.id}')" class="view-details-btn">
                    <i class="fas fa-eye"></i> View Details
                </button>
                ${product.stock > 0 ? `
                    <button onclick="addToCart('${product.id}')" class="add-to-cart-btn">
                        <i class="fas fa-cart-plus"></i> Add to Cart
                    </button>
                ` : `
                    <button disabled class="add-to-cart-btn disabled">
                        <i class="fas fa-times"></i> Out of Stock
                    </button>
                `}
            </div>
        </div>
    `;
    return card;
}

function showProductDetails(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const modal = document.getElementById('product-details-modal');
    
    // Update modal content
    document.getElementById('modal-product-image').src = product.image;
    document.getElementById('modal-product-name').textContent = product.name;
    document.getElementById('modal-product-category').textContent = product.category;
    document.getElementById('modal-product-description').textContent = product.description;
    document.getElementById('modal-product-price').textContent = formatCurrency(product.price);
    document.getElementById('modal-product-stock').textContent = 
        product.stock > 0 ? `In Stock (${product.stock})` : 'Out of Stock';

    // Configure add to cart button
    const addToCartBtn = document.getElementById('modal-add-to-cart');
    if (product.stock > 0) {
        addToCartBtn.disabled = false;
        addToCartBtn.onclick = () => addToCart(product.id);
    } else {
        addToCartBtn.disabled = true;
        addToCartBtn.innerHTML = '<i class="fas fa-times"></i> Out of Stock';
    }

    // Show modal
    modal.style.display = 'block';
}

function hideModal() {
    const modal = document.getElementById('product-details-modal');
    modal.style.display = 'none';
}

function filterProducts() {
    const categoryFilter = document.getElementById('category-filter').value;
    
    let filteredProducts = [...products];
    
    if (categoryFilter !== 'all') {
        filteredProducts = filteredProducts.filter(product => 
            product.category === categoryFilter
        );
    }
    
    renderProducts(filteredProducts);
}

function sortProducts() {
    const sortValue = document.getElementById('price-sort').value;
    let sortedProducts = [...products];

    switch (sortValue) {
        case 'low-to-high':
            sortedProducts.sort((a, b) => a.price - b.price);
            break;
        case 'high-to-low':
            sortedProducts.sort((a, b) => b.price - a.price);
            break;
        default:
            // Default sorting (by dateAdded or id)
            sortedProducts = [...products];
    }

    renderProducts(sortedProducts);
}

function populateCategoryFilter() {
    const select = document.getElementById('category-filter');
    const uniqueCategories = new Set(products.map(p => p.category));
    
    uniqueCategories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        select.appendChild(option);
    });
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-EG', {
        style: 'currency',
        currency: 'EGP',
        minimumFractionDigits: 2
    }).format(amount);
}

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => notification.remove(), 3000);
}

// Cart Management
function addToCart(productId) {
    try {
        const product = products.find(p => p.id === productId);
        if (!product) throw new Error('Product not found');
        if (product.stock <= 0) throw new Error('Product out of stock');

        // Get existing cart
        let cart = JSON.parse(localStorage.getItem('cart') || '[]');
        
        // Check if product already in cart
        const cartItem = cart.find(item => item.id === productId);
        if (cartItem) {
            if (cartItem.quantity < product.stock) {
                cartItem.quantity++;
            } else {
                throw new Error('Maximum stock reached');
            }
        } else {
            cart.push({
                id: product.id,
                name: product.name,
                price: product.price,
                image: product.image,
                quantity: 1
            });
        }

        // Save updated cart
        localStorage.setItem('cart', JSON.stringify(cart));
        
        // Update cart count
        updateCartCount();
        
        showNotification('Product added to cart');
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

function updateCartCount() {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    document.getElementById('cart-count').textContent = count;
}

// Initialize cart count on page load
updateCartCount();