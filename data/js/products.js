document.addEventListener('DOMContentLoaded', function() {
    let products = [];
    let categories = new Set();
    const productsContainer = document.getElementById('products-container');
    const categoryFilter = document.getElementById('category-filter');
    const priceSort = document.getElementById('price-sort');
    const modal = document.getElementById('product-details-modal');
    const closeBtn = modal.querySelector('.close-btn');

    // Fetch products from localStorage and JSON file
    async function fetchProducts() {
        try {
            // First try to get products from localStorage
            const storedProducts = JSON.parse(localStorage.getItem('products')) || [];
            
            // Then try to fetch default products from JSON file
            const response = await fetch('data/products.json');
            const defaultProducts = await response.json();
            
            // Combine both sources, with localStorage taking precedence
            products = [...defaultProducts, ...storedProducts];
            
            // Remove duplicates based on ID
            products = Array.from(new Map(products.map(item => [item.id, item])).values());
            
            populateCategories();
            displayProducts(products);
        } catch (error) {
            console.error('Error loading products:', error);
            // If JSON fetch fails, still use localStorage products
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

    // Display products
    function displayProducts(productsToShow) {
        productsContainer.innerHTML = '';
        productsToShow.forEach(product => {
            const productCard = document.createElement('div');
            productCard.className = 'product-card';
            productCard.innerHTML = `
                <img src="${product.image}" alt="${product.name}" class="product-image">
                <div class="product-details">
                    <h3 class="product-name">${product.name}</h3>
                    <p class="product-category">${product.category}</p>
                    <p class="product-price">$${product.price.toFixed(2)}</p>
                </div>
            `;
            productCard.addEventListener('click', () => showProductDetails(product));
            productsContainer.appendChild(productCard);
        });
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
                
                // Show mini cart and notification
                window.cartManager.showMiniCart();
                showNotification(`${productName} added to cart!`, 'success');
                modal.style.display = 'none';
            }
        } else {
            showNotification('Product is out of stock!', 'error');
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
