// Product Management
let products = [];
let categories = [];

document.addEventListener('DOMContentLoaded', () => {
    initializeProducts();
    setupEventListeners();
    loadCategories();
});

// Add storage event listener
window.addEventListener('storage', (e) => {
    if (e.key === 'products') {
        products = JSON.parse(e.newValue || '[]');
        renderProducts();
    } else if (e.key === 'categories') {
        categories = JSON.parse(e.newValue || '[]');
        populateCategoryFilter();
    }
});

// Modify initializeProducts to include immediate render
function initializeProducts() {
    try {
        products = JSON.parse(localStorage.getItem('products') || '[]');
        renderProducts();
        
        // Listen for updates from dashboard
        window.addEventListener('productsUpdated', (e) => {
            products = e.detail.products;
            renderProducts();
        });
    } catch (error) {
        console.error('Error loading products:', error);
        showNotification('Error loading products', 'error');
    }
}

// Update loadCategories to handle updates
function loadCategories() {
    try {
        categories = JSON.parse(localStorage.getItem('categories') || '[]');
        
        // Listen for updates from dashboard
        window.addEventListener('categoriesUpdated', (e) => {
            categories = e.detail.categories;
            populateCategoryFilter();
        });

        populateCategoryFilter();
    } catch (error) {
        console.error('Error loading categories:', error);
        showNotification('Error loading categories', 'error');
    }
}

function setupEventListeners() {
    // Close modal when clicking the close button or outside the modal
    const modal = document.getElementById('product-details-modal');
    const closeBtn = modal.querySelector('.close');
    
    closeBtn.onclick = () => hideModal();
    window.onclick = (event) => {
        if (event.target === modal) hideModal();
    }

    // Filter controls
    document.getElementById('category-filter').addEventListener('change', filterProducts);
    document.getElementById('price-sort').addEventListener('change', filterProducts);
}

function renderProducts(productsToRender = products) {
    const container = document.getElementById('products-container');
    container.innerHTML = '';

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
            <img src="${product.image}" alt="${product.name}" loading="lazy">
            ${product.stock <= 0 ? '<span class="stock-badge">Out of Stock</span>' : ''}
        </div>
        <div class="product-info">
            <h3>${product.name}</h3>
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
    
    // Update modal content with all available product details
    document.getElementById('modal-product-image').src = product.image;
    document.getElementById('modal-product-name').textContent = product.name;
    document.getElementById('modal-product-category').textContent = product.category;
    document.getElementById('modal-product-description').textContent = product.description || 'No description available';
    document.getElementById('modal-product-price').textContent = formatCurrency(product.price);
    document.getElementById('modal-product-stock').textContent = 
        product.stock > 0 ? `In Stock (${product.stock})` : 'Out of Stock';

    // Configure add to cart button
    const addToCartBtn = document.getElementById('modal-add-to-cart');
    if (product.stock > 0) {
        addToCartBtn.disabled = false;
        addToCartBtn.innerHTML = '<i class="fas fa-cart-plus"></i> Add to Cart';
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
    const priceSort = document.getElementById('price-sort').value;
    
    let filteredProducts = [...products];
    
    // Apply category filter
    if (categoryFilter !== 'all') {
        filteredProducts = filteredProducts.filter(product => 
            product.categoryId === categoryFilter
        );
    }
    
    // Apply price sort
    switch (priceSort) {
        case 'low-to-high':
        filteredProducts.sort((a, b) => a.price - b.price);
            break;
        case 'high-to-low':
        filteredProducts.sort((a, b) => b.price - a.price);
            break;
    }
    
    renderProducts(filteredProducts);
}

function populateCategoryFilter() {
    const select = document.getElementById('category-filter');

    // Clear existing options except "All Categories"
    while (select.options.length > 1) {
        select.remove(1);
    }

    // Get categories from localStorage
    const categories = JSON.parse(localStorage.getItem('categories') || '[]');

    // Add categories with icons and product counts
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.id;
        option.innerHTML = `<i class="${category.icon}"></i> ${category.name} (${category.productCount})`;
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
// Category initialization
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Load categories from localStorage
        const categories = JSON.parse(localStorage.getItem('categories')) || [];
        const categorySelect = document.getElementById('categorySelect');
        
        // Clear existing options except "All Categories"
        while (categorySelect.options.length > 1) {
            categorySelect.remove(1);
        }
        
        // Populate category select with icons
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            option.dataset.icon = category.icon;
            categorySelect.appendChild(option);
        });

        // Enhanced change event listener
        categorySelect.addEventListener('change', (e) => {
            filterProducts();
            updateSelectIcon(e.target);
        });
        
        // Initial icon update
        updateSelectIcon(categorySelect);
        
    } catch (error) {
        console.error('Error loading categories:', error);
    }
});

function updateSelectIcon(select) {
    const selectedOption = select.options[select.selectedIndex];
    const iconElement = select.parentElement.querySelector('.select-icon');
    
    if (iconElement && selectedOption.dataset.icon) {
        iconElement.className = selectedOption.dataset.icon + ' select-icon';
    }
}

function filterProducts() {
    const selectedCategory = document.getElementById('categorySelect').value;
    const products = JSON.parse(localStorage.getItem('products')) || [];
    const container = document.getElementById('productsContainer');
    
    const filteredProducts = selectedCategory ? 
        products.filter(product => product.categoryId === selectedCategory) :
        products;
        
    // Clear container
    container.innerHTML = '';
    
    // Render filtered products
    filteredProducts.forEach(product => {
        const productCard = createProductCard(product);
        container.appendChild(productCard);
    });
}

function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';
    
    // Get category details
    const categories = JSON.parse(localStorage.getItem('categories')) || [];
    const category = categories.find(c => c.id === product.categoryId);
    
    card.innerHTML = `
        <div class="product-image">
            <img src="${product.image}" alt="${product.name}" loading="lazy">
            ${product.stock <= 0 ? '<span class="out-of-stock">Out of Stock</span>' : ''}
        </div>
        <div class="product-info">
            ${category ? `
                <div class="category-badge" title="${category.description || ''}">
                    <i class="${category.icon}"></i>
                    <span>${category.name}</span>
                </div>
            ` : ''}
            <h3>${product.name}</h3>
            <p class="price">${formatCurrency(product.price)}</p>
            <div class="product-actions">
                <button class="add-to-cart-btn" ${product.stock <= 0 ? 'disabled' : ''}>
                    <i class="fas fa-shopping-cart"></i>
                    ${product.stock > 0 ? 'Add to Cart' : 'Out of Stock'}
                </button>
            </div>
        </div>
    `;
    
    return card;
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-EG', {
        style: 'currency',
        currency: 'EGP'
    }).format(amount);
}