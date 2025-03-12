document.addEventListener('DOMContentLoaded', function() {
    let products = [];
    let categories = new Set();
    const productsContainer = document.getElementById('products-container');
    const categoryFilter = document.getElementById('category-filter');
    const priceSort = document.getElementById('price-sort');
    const modal = document.getElementById('product-details-modal');
    const closeBtn = modal.querySelector('.close-btn');

    // Optimize fetchProducts with caching
    async function fetchProducts() {
        try {
            const cacheKey = 'bikeyard_products_cache';
            const cacheExpiry = 'bikeyard_products_cache_expiry';
            const expiryTime = 3600000; // 1 hour cache

            // Check cache first
            const cachedData = localStorage.getItem(cacheKey);
            const cacheTimestamp = localStorage.getItem(cacheExpiry);
            
            if (cachedData && cacheTimestamp && (Date.now() - parseInt(cacheTimestamp)) < expiryTime) {
                products = JSON.parse(cachedData);
                populateCategories();
                displayProducts(products);
                return;
            }

            // Fetch both database sources
            const [productsResponse, adminResponse] = await Promise.all([
                fetch('./data/json/products.json'),
                fetch('./data/json/admin-db.json')
            ]);

            const productsData = await productsResponse.json();
            const adminData = await adminResponse.json();
            
            // Combine products with admin settings
            products = productsData.products.map(product => ({
                ...product,
                currency: adminData.settings.currency
            }));
            
            // Update cache
            localStorage.setItem(cacheKey, JSON.stringify(products));
            localStorage.setItem(cacheExpiry, Date.now().toString());
            
            populateCategories();
            displayProducts(products);
        } catch (error) {
            console.error('Error loading products:', error);
            products = JSON.parse(localStorage.getItem('products')) || [];
            populateCategories();
            displayProducts(products);
        }
    }

    // Populate category filter
    function populateCategories() {
        products.forEach(product => categories.add(product.category));
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            categoryFilter.appendChild(option);
        });
    }

    // Optimize product display with lazy loading
    function displayProducts(productsToShow) {
        productsContainer.innerHTML = '';
        const fragment = document.createDocumentFragment();
        
        productsToShow.forEach(product => {
            const productCard = document.createElement('div');
            productCard.className = 'product-card';
            productCard.innerHTML = `
                <img src="${product.image}" alt="${product.name}" class="product-image" loading="lazy">
                <div class="product-details">
                    <h3 class="product-name">${product.name}</h3>
                    <p class="product-category">${product.category}</p>
                    <p class="product-price">$${product.price.toFixed(2)}</p>
                </div>
            `;
            productCard.addEventListener('click', () => showProductDetails(product));
            fragment.appendChild(productCard);
        });
        
        productsContainer.appendChild(fragment);
    }

    // Filter products
    window.filterProducts = function() {
        const selectedCategory = categoryFilter.value;
        const filteredProducts = selectedCategory === 'all' 
            ? products 
            : products.filter(product => product.category === selectedCategory);
        displayProducts(filteredProducts);
    }

    // Sort products
    window.sortProducts = function() {
        const sortValue = priceSort.value;
        const sortedProducts = [...products];
        
        switch(sortValue) {
            case 'low-to-high':
                sortedProducts.sort((a, b) => a.price - b.price);
                break;
            case 'high-to-low':
                sortedProducts.sort((a, b) => b.price - a.price);
                break;
            default:
                // Reset to original order
                sortedProducts.sort((a, b) => a.id - b.id);
        }
        
        displayProducts(sortedProducts);
    }

    // Show product details modal
    function showProductDetails(product) {
        document.getElementById('modal-product-image').src = product.image;
        document.getElementById('modal-product-name').textContent = product.name;
        document.getElementById('modal-product-category').textContent = product.category;
        document.getElementById('modal-product-description').textContent = product.description;
        document.getElementById('modal-product-price').textContent = `$${product.price.toFixed(2)}`;
        document.getElementById('modal-product-stock').textContent = 
            `In Stock: ${product.stock > 0 ? product.stock : 'Out of Stock'}`;
        
        modal.style.display = 'block';
    }

    // Add to cart functionality
    document.getElementById('modal-add-to-cart').addEventListener('click', function() {
        const productName = document.getElementById('modal-product-name').textContent;
        const currentProduct = products.find(p => p.name === productName);
        
        if (currentProduct && currentProduct.stock > 0) {
            if (window.cartManager.addToCart(currentProduct)) {
                // Update stock in localStorage
                currentProduct.stock--;
                const allProducts = JSON.parse(localStorage.getItem('products')) || [];
                const productIndex = allProducts.findIndex(p => p.id === currentProduct.id);
                if (productIndex !== -1) {
                    allProducts[productIndex].stock = currentProduct.stock;
                    localStorage.setItem('products', JSON.stringify(allProducts));
                }
                
                // Show success message
                showNotification(`${productName} has been added to your cart!`, 'success');
                
                // Optional: Add view cart button to notification
                const viewCartBtn = document.createElement('button');
                viewCartBtn.textContent = 'View Cart';
                viewCartBtn.onclick = () => window.location.href = 'bikeyardcart.html';
                document.querySelector('.order-notification').appendChild(viewCartBtn);
                
                modal.style.display = 'none';
            }
        } else {
            showNotification('Sorry, this product is out of stock!', 'error');
        }
    });

    // Close modal
    closeBtn.addEventListener('click', () => modal.style.display = 'none');
    window.addEventListener('click', (e) => {
        if (e.target === modal) modal.style.display = 'none';
    });

    // Initialize
    fetchProducts();
});
