document.addEventListener('DOMContentLoaded', () => {
    clearOldData();
    loadCategories();
    refreshProducts();
});

function clearOldData() {
    try {
        const lastClearDate = localStorage.getItem('lastDataClear');
        const currentDate = new Date().toISOString();
        
        // Only clear if it's a new day
        if (!lastClearDate || isNewDay(lastClearDate)) {
            // Create backup
            const backup = {
                date: currentDate,
                products: localStorage.getItem('products'),
                categories: localStorage.getItem('categories')
            };
            
            localStorage.setItem('dataBackup', JSON.stringify(backup));
            
            // Initialize with empty arrays instead of removing
            if (!localStorage.getItem('products')) {
                localStorage.setItem('products', JSON.stringify([]));
            }
            if (!localStorage.getItem('categories')) {
                localStorage.setItem('categories', JSON.stringify([]));
            }
            
            localStorage.setItem('lastDataClear', currentDate);
            console.log('Dashboard data initialized successfully');
        }
        
        refreshProducts();
    } catch (error) {
        console.error('Error managing dashboard data:', error);
        showNotification('Error managing data. Please refresh the page.', 'error');
    }
}

function isNewDay(lastClearDate) {
    const last = new Date(lastClearDate);
    const now = new Date();
    
    return last.getDate() !== now.getDate() ||
           last.getMonth() !== now.getMonth() ||
           last.getFullYear() !== now.getFullYear();
}

function loadCategories() {
    const categories = JSON.parse(localStorage.getItem('categories') || '[]');
    const categoryFilter = document.getElementById('category-filter');
    
    // Clear existing options
    categoryFilter.innerHTML = '<option value="all">All Categories</option>';
    
    categories.forEach(category => {
        // Add to filter dropdown
        categoryFilter.innerHTML += `<option value="${category.name.toLowerCase()}">${category.name}</option>`;
    });
}

function refreshProducts() {
    const container = document.getElementById('products-container');
    if (!container) return;

    try {
        const products = JSON.parse(localStorage.getItem('products') || '[]');
        container.innerHTML = '';
        
        if (!products || products.length === 0) {
            container.innerHTML = `
                <div class="no-products">
                    <p>No products available at the moment.</p>
                </div>`;
            return;
        }

        const uniqueProducts = Array.from(
            new Map(products.map(product => [product.id, product])).values()
        );

        uniqueProducts.forEach(product => createProductCard(product));
    } catch (error) {
        console.error('Error refreshing products:', error);
        container.innerHTML = '<div class="error">Error loading products</div>';
        showNotification('Error loading products. Please refresh the page.', 'error');
    }
}

// Update image paths to use relative paths
function createProductCard(product) {
    const container = document.getElementById('products-container');
    const card = document.createElement('div');
    card.className = 'product-card';
    card.setAttribute('data-category', product.category.toLowerCase());
    card.setAttribute('data-price', product.price);

    card.innerHTML = `
        <div class="product-image">
            <img src="./${product.image}" alt="${product.name}" loading="lazy">
            ${product.stock <= 0 ? '<span class="out-of-stock">Out of Stock</span>' : ''}
        </div>
        <div class="product-info">
            <h3>${product.name}</h3>
            <p class="product-category">${product.category}</p>
            <div class="product-price">${formatCurrency(product.price)}</div>
        </div>
        <div class="product-actions">
            <button onclick="viewProductDetails('${product.id}')" class="view-details-btn">
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
    `;

    container.appendChild(card);
    return card;
}

function filterProducts() {
    const category = document.getElementById('category-filter').value;
    const products = document.querySelectorAll('.product-card');
    
    products.forEach(product => {
        if (category === 'all' || product.dataset.category === category) {
            product.style.display = 'block';
        } else {
            product.style.display = 'none';
        }
    });
}

function sortProducts() {
    const sortBy = document.getElementById('price-sort').value;
    const container = document.getElementById('products-container');
    const products = Array.from(container.getElementsByClassName('product-card'));
    
    products.sort((a, b) => {
        const priceA = parseFloat(a.dataset.price);
        const priceB = parseFloat(b.dataset.price);
        
        if (sortBy === 'low-to-high') return priceA - priceB;
        if (sortBy === 'high-to-low') return priceB - priceA;
        return 0;
    });
    
    products.forEach(product => container.appendChild(product));
}

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 3000);
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-EG', {
        style: 'currency',
        currency: 'EGP',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
}

function viewProductDetails(productId) {
    const products = JSON.parse(localStorage.getItem('products') || '[]');
    const product = products.find(p => p.id === productId);
    
    if (!product) {
        showNotification('Product not found', 'error');
        return;
    }

    const modal = document.getElementById('product-details-modal');
    const imageGallery = document.querySelector('.product-image-gallery');
    
    // Create image gallery HTML
    const images = [product.image];
    imageGallery.innerHTML = `
        <div class="main-image">
            <img src="${product.image}" alt="${product.name}">
        </div>
        <div class="thumbnail-gallery">
            ${images.map((img, index) => `
                <div class="thumbnail ${index === 0 ? 'active' : ''}" onclick="changeMainImage(this, '${img}')">
                    <img src="${img}" alt="${product.name} view ${index + 1}">
                </div>
            `).join('')}
        </div>
    `;

    // Populate other modal content
    document.getElementById('modal-product-name').textContent = product.name;
    document.getElementById('modal-product-category').textContent = product.category;
    document.getElementById('modal-product-description').textContent = product.description;
    document.getElementById('modal-product-price').textContent = formatCurrency(product.price);
    document.getElementById('modal-product-stock').textContent = 
        product.stock > 0 ? `In Stock (${product.stock})` : 'Out of Stock';

    // Configure Add to Cart button
    const addToCartBtn = document.getElementById('modal-add-to-cart');
    if (product.stock > 0) {
        addToCartBtn.disabled = false;
        addToCartBtn.onclick = () => addToCart(product.id);
        addToCartBtn.innerHTML = '<i class="fas fa-cart-plus"></i> Add to Cart';
    } else {
        addToCartBtn.disabled = true;
        addToCartBtn.innerHTML = '<i class="fas fa-times"></i> Out of Stock';
    }

    // Show modal
    modal.style.display = 'block';
}

function changeMainImage(thumbnail, imageUrl) {
    // Update main image
    const mainImage = document.querySelector('.main-image img');
    mainImage.src = imageUrl;
    
    // Update thumbnail active state
    document.querySelectorAll('.thumbnail').forEach(thumb => {
        thumb.classList.remove('active');
    });
    thumbnail.classList.add('active');
}

// Add event listeners for modal close
document.addEventListener('DOMContentLoaded', () => {
    // Close button handler
    document.querySelector('.close').addEventListener('click', () => {
        document.getElementById('product-details-modal').style.display = 'none';
    });

    // Click outside modal to close
    window.addEventListener('click', (e) => {
        const modal = document.getElementById('product-details-modal');
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
});

// Update processImage function to handle relative paths
async function processImage(file) {
    return new Promise((resolve, reject) => {
        if (!file) reject('No file provided');
        
        const reader = new FileReader();
        reader.onload = e => {
            // Store images in a subdirectory
            const imagePath = `images/${file.name}`;
            resolve(imagePath);
        };
        reader.onerror = e => reject(e);
        reader.readAsDataURL(file);
    });
}