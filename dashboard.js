// State Management
const dashboardState = {
    orders: [],
    products: [],
    categories: [],
    activeTab: 'orders',
    loading: false,
    initialized: false,
    customers: []
};

// Initialize Dashboard
document.addEventListener('DOMContentLoaded', () => {
    // Remove any existing event listeners
    const productForm = document.getElementById('product-form');
    if (productForm) {
        const newForm = productForm.cloneNode(true);
        productForm.parentNode.replaceChild(newForm, productForm);
        
        // Add single event listener for product form
        newForm.addEventListener('submit', handleProductSubmit);
    }

    initializeDashboard();
    setupEventListeners();
    updateDateTime();
    initializeCategories();
    setupCategoryEventListeners();
    setupTabEventListeners();
    setupImagePreview();
    setupCategoryModal();
});

async function initializeDashboard() {
    dashboardState.loading = true;
    try {
        await Promise.all([
            loadOrders(),
            loadProducts(),
            loadCategories()
        ]);
        updateDashboardStats();
        dashboardState.initialized = true;
    } catch (error) {
        showNotification('Failed to initialize dashboard', 'error');
        console.error('Dashboard initialization error:', error);
    } finally {
        dashboardState.loading = false;
    }
}

// Event Listeners Setup
function setupEventListeners() {
    // Add this near the top of setupEventListeners
    const clearProductsBtn = document.getElementById('clear-products-btn');
    if (clearProductsBtn) {
        clearProductsBtn.addEventListener('click', clearAllProducts);
    }

    // Remove old event listeners first
    const oldAddButton = document.getElementById('add-product-btn');
    const newAddButton = oldAddButton.cloneNode(true);
    oldAddButton.parentNode.replaceChild(newAddButton, oldAddButton);
    
    // Add new event listener for add product button
    newAddButton.addEventListener('click', () => {
        resetProductForm();
        const modal = document.getElementById('product-modal');
        modal.querySelector('.modal-header h3').textContent = 'Add New Product';
        showModal('product-modal');
    });

    // Remove old form listener and add new one
    const oldForm = document.getElementById('product-form');
    const newForm = oldForm.cloneNode(true);
    oldForm.parentNode.replaceChild(newForm, oldForm);
    newForm.addEventListener('submit', handleProductSubmit);

    // Tab Controls
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // Search and Filters
    document.getElementById('order-search').addEventListener('input', filterOrders);
    document.getElementById('product-search').addEventListener('input', filterProducts);
    document.getElementById('order-status-filter').addEventListener('change', filterOrders);
    document.getElementById('category-filter').addEventListener('change', filterProducts);
    document.getElementById('customer-search').addEventListener('input', filterCustomers);
    document.getElementById('customer-filter').addEventListener('change', filterCustomers);

    // Action Buttons
    document.getElementById('add-product-btn').addEventListener('click', () => {
        resetProductForm();
        showModal('product-modal');
    });
    document.getElementById('add-category-btn').addEventListener('click', () => showModal('category-modal'));
    document.getElementById('logout-btn').addEventListener('click', handleLogout);

    // Add clear products button handler
    document.getElementById('clear-products-btn')?.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear all products? This action cannot be undone!')) {
            clearAllProducts();
        }
    });
}

// Enhanced Tab Switching Function
function switchTab(tabId) {
    // Update state
    dashboardState.activeTab = tabId;
    
    // Get all tabs and panels
    const tabs = document.querySelectorAll('.tab-btn');
    const panels = document.querySelectorAll('.tab-panel');
    
    // Deactivate all tabs and panels
    tabs.forEach(tab => {
        tab.classList.remove('active');
        tab.setAttribute('aria-selected', 'false');
    });
    
    panels.forEach(panel => {
        panel.classList.remove('active');
        panel.setAttribute('aria-hidden', 'true');
    });
    
    // Activate selected tab and panel
    const selectedTab = document.querySelector(`[data-tab="${tabId}"]`);
    const selectedPanel = document.getElementById(`${tabId}-tab`);
    
    if (selectedTab && selectedPanel) {
        selectedTab.classList.add('active');
        selectedTab.setAttribute('aria-selected', 'true');
        selectedPanel.classList.add('active');
        selectedPanel.setAttribute('aria-hidden', 'false');
        
        // Scroll tab into view on mobile
        if (window.innerWidth <= 768) {
            selectedTab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
        
        // Refresh content based on tab
        if (tabId === 'orders') refreshOrders();
        if (tabId === 'products') refreshProducts();
        if (tabId === 'categories') refreshCategories();
    }
}

// Data Loading Functions
async function loadOrders() {
    try {
        const orders = JSON.parse(localStorage.getItem('orders') || '[]');
        dashboardState.orders = orders;
        refreshOrders();
        return true;
    } catch (error) {
        console.error('Error loading orders:', error);
        return false;
    }
}

async function loadProducts() {
    try {
        const products = JSON.parse(localStorage.getItem('products') || '[]');
        dashboardState.products = products;
        refreshProducts();
        return true;
    } catch (error) {
        console.error('Error loading products:', error);
        return false;
    }
}

async function loadCategories() {
    try {
        const categories = JSON.parse(localStorage.getItem('categories') || '[]');
        dashboardState.categories = categories;
        refreshCategories();
        populateCategoryFilters();
        return true;
    } catch (error) {
        console.error('Error loading categories:', error);
        return false;
    }
}

async function loadCustomers() {
    try {
        const orders = JSON.parse(localStorage.getItem('orders') || '[]');
        const customers = new Map();
        
        orders.forEach(order => {
            if (order.customerDetails) {
                const customer = order.customerDetails;
                const customerId = customer.email || customer.phone;
                
                if (!customerId) return;

                if (!customers.has(customerId)) {
                    customers.set(customerId, {
                        id: customerId,
                        firstName: customer.firstName || '',
                        lastName: customer.lastName || '',
                        email: customer.email || 'N/A',
                        phone: customer.phone || 'N/A',
                        address: customer.address || {},
                        orders: [],
                        totalSpent: 0,
                        lastOrder: null
                    });
                }
                
                const customerData = customers.get(customerId);
                customerData.orders.push(order);
                customerData.totalSpent += calculateOrderTotal(order);
                
                // Update last order date
                const orderDate = new Date(order.date);
                if (!customerData.lastOrder || orderDate > new Date(customerData.lastOrder)) {
                    customerData.lastOrder = order.date;
                }
            }
        });
        
        dashboardState.customers = Array.from(customers.values());
        refreshCustomers();
        return true;
    } catch (error) {
        console.error('Error loading customers:', error);
        showNotification('Error loading customer data', 'error');
        return false;
    }
}

// UI Update Functions
// Updated updateDashboardStats function
function updateDashboardStats() {
    // Calculate orders
    const totalOrders = dashboardState.orders.length;

    // Improved revenue calculation
    const totalRevenue = dashboardState.orders.reduce((sum, order) => {
        // Calculate order total from items
        const orderTotal = order.items.reduce((itemSum, item) => {
            const price = parseFloat(item.price) || 0;
            const quantity = parseInt(item.quantity) || 1;
            return itemSum + (price * quantity);
        }, 0);
        
        return sum + orderTotal;
    }, 0);

    const totalProducts = dashboardState.products.length;

    // Format currency with EGP
    const formattedRevenue = new Intl.NumberFormat('en-EG', {
        style: 'currency',
        currency: 'EGP',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(totalRevenue);

    // Update DOM
    document.getElementById('total-orders').textContent = totalOrders;
    document.getElementById('total-revenue').textContent = formattedRevenue;
    document.getElementById('total-products').textContent = totalProducts;

    // Add revenue trend indicator
    addRevenueTrend(totalRevenue);
}

// Add revenue trend indicator
function addRevenueTrend(currentRevenue) {
    const previousRevenue = parseFloat(localStorage.getItem('previousRevenue') || '0');
    const revenueElement = document.getElementById('total-revenue');
    
    // Calculate percentage change
    const percentChange = previousRevenue === 0 ? 0 : 
        ((currentRevenue - previousRevenue) / previousRevenue) * 100;
    
    // Create trend indicator
    const trend = document.createElement('span');
    trend.className = 'revenue-trend';
    
    if (percentChange > 0) {
        trend.innerHTML = `<i class="fas fa-arrow-up"></i> ${percentChange.toFixed(1)}%`;
        trend.classList.add('trend-up');
    } else if (percentChange < 0) {
        trend.innerHTML = `<i class="fas fa-arrow-down"></i> ${Math.abs(percentChange).toFixed(1)}%`;
        trend.classList.add('trend-down');
    } else {
        trend.innerHTML = `<i class="fas fa-minus"></i> 0%`;
        trend.classList.add('trend-neutral');
    }
    
    // Update previous revenue for next comparison
    localStorage.setItem('previousRevenue', currentRevenue.toString());
    
    // Add trend to revenue display
    if (revenueElement.querySelector('.revenue-trend')) {
        revenueElement.querySelector('.revenue-trend').remove();
    }
    revenueElement.appendChild(trend);
}

function updateDateTime() {
    const updateTime = () => {
        const now = new Date();
        document.getElementById('current-date').textContent = now.toLocaleDateString();
        document.getElementById('current-time').textContent = now.toLocaleTimeString();
    };
    
    updateTime();
    setInterval(updateTime, 1000);
}

// Table Population Functions
function refreshOrders() {
    const tbody = document.querySelector('#orders-table tbody');
    tbody.innerHTML = '';

    dashboardState.orders.forEach(order => {
        const row = createOrderRow(order);
        tbody.appendChild(row);
    });
}

function refreshProducts() {
    const tbody = document.querySelector('#products-table tbody');
    if (!tbody) return;

    try {
        tbody.innerHTML = '';
        
        if (dashboardState.products.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="no-data">
                        <p>No products available</p>
                    </td>
                </tr>`;
            return;
        }

        // Create Map of unique products
        const uniqueProducts = new Map(
            dashboardState.products.map(product => [product.id, product])
        );

        // Convert Map back to array and render each product
        Array.from(uniqueProducts.values()).forEach(product => {
            const row = createProductRow(product);
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Error refreshing products:', error);
        showNotification('Error refreshing products', 'error');
    }
}

function refreshCategories() {
    const grid = document.getElementById('categories-grid');
    if (!grid) return;

    grid.innerHTML = '';
    
    dashboardState.categories.forEach(category => {
        const card = document.createElement('div');
        card.className = 'category-card';
        card.innerHTML = `
            <div class="category-header">
                <i class="${category.icon || 'fas fa-folder'}"></i>
                <h3>${category.name}</h3>
            </div>
            <p class="category-description">${category.description || 'No description available.'}</p>
            <div class="category-stats">
                <span class="product-count">
                    <i class="fas fa-box"></i>
                    ${category.productCount || 0} products
                </span>
            </div>
            <div class="category-actions">
                <button onclick="editCategory('${category.id}')" class="edit">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button onclick="deleteCategory('${category.id}')" class="delete">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        `;
        grid.appendChild(card);
    });
}

function refreshCustomers() {
    const tbody = document.querySelector('#customers-table tbody');
    if (!tbody) return;

    tbody.innerHTML = '';
    
    if (!dashboardState.customers.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="no-data">No customers found</td>
            </tr>`;
        return;
    }

    dashboardState.customers.forEach(customer => {
        const row = createCustomerRow(customer);
        tbody.appendChild(row);
    });
}

// Filter Functions
function filterOrders(event) {
    const searchTerm = document.getElementById('order-search').value.toLowerCase();
    const statusFilter = document.getElementById('order-status-filter').value.toLowerCase();
    
    const filteredOrders = dashboardState.orders.filter(order => {
        const matchesSearch = order.id.toLowerCase().includes(searchTerm) ||
                            order.customer.toLowerCase().includes(searchTerm);
        const matchesStatus = !statusFilter || order.status.toLowerCase() === statusFilter;
        return matchesSearch && matchesStatus;
    });

    renderFilteredOrders(filteredOrders);
}

function filterProducts(event) {
    const searchTerm = document.getElementById('product-search').value.toLowerCase();
    const categoryFilter = document.getElementById('category-filter').value.toLowerCase();
    
    const filteredProducts = dashboardState.products.filter(product => {
        const matchesSearch = product.name.toLowerCase().includes(searchTerm);
        const matchesCategory = !categoryFilter || product.category.toLowerCase() === categoryFilter;
        return matchesSearch && matchesCategory;
    });

    renderFilteredProducts(filteredProducts);
}

// Utility Functions
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 3000);
}

function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    // If it's the product modal, ensure categories are populated
    if (modalId === 'product-modal') {
        populateCategoryFilters();
    }

    modal.style.display = 'block';
    modal.classList.add('fade-in');
    document.body.style.overflow = 'hidden';
}

function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.remove('fade-in');
    document.body.style.overflow = '';
    setTimeout(() => {
        modal.style.display = 'none';
        const form = modal.querySelector('form');
        if (form) {
            form.reset();
            delete form.dataset.editId;
            Array.from(form.elements).forEach(el => el.disabled = false);
        }
    }, 300);
}

function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('adminToken');
        window.location.href = 'login.html';
    }
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        dashboardState,
        initializeDashboard,
        updateDashboardStats,
        filterOrders,
        filterProducts
    };
}

// Add these functions
function renderFilteredOrders(orders) {
    const tbody = document.querySelector('#orders-table tbody');
    tbody.innerHTML = '';

    orders.forEach(order => {
        const row = createOrderRow(order);
        tbody.appendChild(row);
    });
}

function renderFilteredProducts(products) {
    const tbody = document.querySelector('#products-table tbody');
    tbody.innerHTML = '';

    products.forEach(product => {
        const row = createProductRow(product);
        tbody.appendChild(row);
    });
}

function populateCategoryFilters() {
    const categorySelect = document.getElementById('category-filter');
    const productCategorySelect = document.getElementById('productCategory');
    
    if (!categorySelect || !productCategorySelect) return;

    // Get categories from state
    const categories = dashboardState.categories;
    
    // Clear existing options except the first one
    while (categorySelect.options.length > 1) categorySelect.remove(1);
    while (productCategorySelect.options.length > 1) productCategorySelect.remove(1);
    
    // Add categories to both selects
    categories.forEach(category => {
        // Add to filter dropdown
        const filterOption = new Option(category.name, category.id);
        categorySelect.add(filterOption);
        
        // Add to product form dropdown
        const productOption = new Option(category.name, category.id);
        productOption.dataset.icon = category.icon;
        productCategorySelect.add(productOption);
    });

    // Set up category change handler
    setupCategorySelectHandlers();
}

function setupCategorySelectHandlers() {
    const productCategory = document.getElementById('productCategory');
    const iconPreview = document.querySelector('.category-icon-preview');
    
    if (!productCategory || !iconPreview) return;

    productCategory.addEventListener('change', (e) => {
        const selectedOption = e.target.options[e.target.selectedIndex];
        const wrapper = e.target.closest('.category-select-wrapper');
        
        if (e.target.value) {
            wrapper.classList.add('has-value');
            const category = dashboardState.categories.find(c => c.id === e.target.value);
            if (category) {
                iconPreview.className = category.icon + ' category-icon-preview';
            }
        } else {
            wrapper.classList.remove('has-value');
            iconPreview.className = 'fas fa-folder category-icon-preview';
        }
    });

    productCategory.addEventListener('focus', (e) => {
        e.target.closest('.category-select-wrapper').classList.add('focused');
    });

    productCategory.addEventListener('blur', (e) => {
        e.target.closest('.category-select-wrapper').classList.remove('focused');
    });
}

// Modal Handlers
document.querySelectorAll('.close-btn').forEach(btn => {
    btn.addEventListener('click', e => {
        const modal = e.target.closest('.modal');
        hideModal(modal.id);
    });
});

document.getElementById('product-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const editId = form.dataset.editId;

    try {
        // Validate required fields
        if (!formData.get('productName').trim()) throw new Error('Product name is required');
        if (!formData.get('productCategory')) throw new Error('Category is required');
        if (!formData.get('productPrice') || parseFloat(formData.get('productPrice')) <= 0) 
            throw new Error('Valid price is required');
        if (!formData.get('productStock') || parseInt(formData.get('productStock')) < 0) 
            throw new Error('Valid stock quantity is required');

        // Create product object
        const productData = {
            id: editId || `PROD_${Date.now()}`,
            name: formData.get('productName').trim(),
            category: formData.get('productCategory'),
            description: formData.get('productDescription').trim() || '',
            price: parseFloat(formData.get('productPrice')),
            stock: parseInt(formData.get('productStock')),
            rating: 0,
            reviews: [],
            featured: false,
            dateAdded: new Date().toISOString(),
            specifications: {
                category: formData.get('productCategory'),
                availability: parseInt(formData.get('productStock')) > 0 ? 'In Stock' : 'Out of Stock'
            }
        };

        // Handle image upload
        const imageFile = formData.get('productImage');
        if (imageFile?.size > 0) {
            productData.image = await processImage(imageFile);
        } else if (editId) {
            const existingProduct = dashboardState.products.find(p => p.id === editId);
            productData.image = existingProduct?.image;
        } else {
            throw new Error('Product image is required');
        }

        // Get existing products
        let products = JSON.parse(localStorage.getItem('products') || '[]');
        
        // Create Map to ensure unique products by ID
        const productsMap = new Map(products.map(p => [p.id, p]));
        
        if (editId) {
            // Update existing product
            productsMap.set(editId, productData);
        } else {
            // Add new product if it doesn't exist
            if (!productsMap.has(productData.id)) {
                productsMap.set(productData.id, productData);
            }
        }
        
        // Convert Map back to array
        products = Array.from(productsMap.values());

        // Save to localStorage
        localStorage.setItem('products', JSON.stringify(products));
        
        // Update dashboard state
        dashboardState.products = products;
        
        refreshProducts();
        hideModal('product-modal');
        showNotification('Product added successfully');
        form.reset();
    } catch (error) {
        showNotification('Error adding product', 'error');
        console.error('Error:', error);
    }
});

async function processImage(file) {
    return new Promise((resolve, reject) => {
        if (!file) reject('No file provided');
        
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = e => reject(e);
        reader.readAsDataURL(file);
    });
}

function createOrderRow(order) {
    const total = calculateOrderTotal(order);
    const formattedTotal = formatCurrency(total);
    
    const row = document.createElement('tr');
    row.innerHTML = `
        <td>${order.id}</td>
        <td>${order.customer}</td>
        <td>${formatDate(order.date)}</td>
        <td class="total-column">${formattedTotal}</td>
        <td>
            <span class="status-badge status-${order.status.toLowerCase()}">
                ${order.status}
            </span>
        </td>
        <td>
            <div class="action-btns">
                <button onclick="viewOrder('${order.id}')" class="action-btn view">
                    <i class="fas fa-eye"></i> View
                </button>
                <button onclick="updateOrderStatus('${order.id}', '${getNextStatus(order.status)}')" 
                        class="action-btn edit">
                    <i class="fas fa-sync-alt"></i> Update
                </button>
                <button onclick="deleteOrder('${order.id}')" class="action-btn delete">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        </td>
    `;
    return row;
}

function createProductRow(product) {
    const row = document.createElement('tr');
    row.innerHTML = `
        <td>
            <div class="product-cell">
                <img src="${product.image}" alt="${product.name}">
                <span>${product.name}</span>
            </div>
        </td>
        <td>${product.category}</td>
        <td>${product.price.toLocaleString()} EGP</td>
        <td>${product.stock}</td>
        <td><span class="status-badge status-${product.stock > 0 ? 'completed' : 'cancelled'}">
            ${product.stock > 0 ? 'In Stock' : 'Out of Stock'}
        </span></td>
        <td>
            <div class="action-btns">
                <button onclick="viewProduct('${product.id}')" class="action-btn view">
                    <i class="fas fa-eye"></i> View
                </button>
                <button onclick="editProduct('${product.id}')" class="action-btn edit">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button onclick="deleteProduct('${product.id}')" class="action-btn delete">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        </td>
    `;
    return row;
}

function createCustomerRow(customer) {
    const row = document.createElement('tr');
    row.innerHTML = `
        <td>
            <div class="customer-info">
                <span class="customer-name">${customer.firstName} ${customer.lastName}</span>
                <span class="customer-location">${customer.address?.city || 'N/A'}</span>
            </div>
        </td>
        <td>${customer.email}</td>
        <td>${customer.phone}</td>
        <td>${customer.orders.length}</td>
        <td>${formatCurrency(customer.totalSpent)}</td>
        <td>
            <div class="action-btns">
                <button onclick="viewCustomerDetails('${customer.id}')" class="action-btn view">
                    <i class="fas fa-eye"></i> View
                </button>
                <button onclick="viewCustomerOrders('${customer.id}')" class="action-btn">
                    <i class="fas fa-shopping-cart"></i> Orders
                </button>
            </div>
        </td>
    `;
    return row;
}

// Action Handlers
async function viewProduct(productId) {
    const product = dashboardState.products.find(p => p.id === productId);
    if (!product) return;
    
    const modal = document.getElementById('product-modal');
    modal.querySelector('.modal-header h3').textContent = 'View Product';
    const form = document.getElementById('product-form');
    
    // Populate form
    form.productName.value = product.name;
    form.productCategory.value = product.category;
    form.productCategory.dispatchEvent(new Event('change'));
    form.productPrice.value = product.price;
    form.productStock.value = product.stock;
    
    // Disable fields for view mode
    Array.from(form.elements).forEach(el => el.disabled = true);
    
    showModal('product-modal');
}

async function editProduct(productId) {
    const product = dashboardState.products.find(p => p.id === productId);
    if (!product) return;
    
    const form = document.getElementById('product-form');
    form.dataset.editId = productId;
    
    // Populate form
    form.productName.value = product.name;
    form.productCategory.value = product.category;
    form.productCategory.dispatchEvent(new Event('change'));
    form.productPrice.value = product.price;
    form.productStock.value = product.stock;
    
    // Enable fields for edit mode
    Array.from(form.elements).forEach(el => el.disabled = false);
    
    showModal('product-modal');
}

async function deleteProduct(productId) {
    if (!confirm('Are you sure you want to delete this product?')) return;
    
    try {
        const updatedProducts = dashboardState.products.filter(p => p.id !== productId);
        dashboardState.products = updatedProducts;
        localStorage.setItem('products', JSON.stringify(updatedProducts));
        refreshProducts();
        showNotification('Product deleted successfully', 'success');
    } catch (error) {
        console.error('Error deleting product:', error);
        showNotification('Failed to delete product', 'error');
    }
}

// Enhanced Form Handler
document.getElementById('product-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    const editId = this.dataset.editId;
    const formData = new FormData(this);
    
    try {
        const productData = {
            id: editId || `prod_${Date.now()}`,
            name: formData.get('productName'),
            category: formData.get('productCategory'),
            price: parseFloat(formData.get('productPrice')),
            stock: parseInt(formData.get('productStock'))
        };

        // Handle image upload
        const imageFile = formData.get('productImage');
        if (imageFile?.size > 0) {
            productData.image = await processImage(imageFile);
        } else if (editId) {
            // Keep existing image for edit mode
            const existingProduct = dashboardState.products.find(p => p.id === editId);
            productData.image = existingProduct.image;
        }

        if (editId) {
            // Update existing product
            dashboardState.products = dashboardState.products.map(p => 
                p.id === editId ? {...p, ...productData} : p
            );
        } else {
            // Add new product
            dashboardState.products.push(productData);
        }

        localStorage.setItem('products', JSON.stringify(dashboardState.products));
        refreshProducts();
        hideModal('product-modal');
        showNotification(`Product ${editId ? 'updated' : 'added'} successfully`, 'success');
        this.reset();
        delete this.dataset.editId;
    } catch (error) {
        console.error('Error saving product:', error);
        showNotification('Error saving product', 'error');
    }
});

// Add these category management functions
function initializeCategories() {
    const defaultCategories = [
        { id: 'cat_1', name: 'Mountain Bikes', icon: 'fas fa-mountain', productCount: 0, description: 'Off-road bikes for rough terrain' },
        { id: 'cat_2', name: 'Road Bikes', icon: 'fas fa-road', productCount: 0, description: 'Lightweight bikes for paved surfaces' },
        { id: 'cat_3', name: 'BMX Bikes', icon: 'fas fa-bicycle', productCount: 0, description: 'Bikes for tricks and racing' },
        { id: 'cat_4', name: 'Electric Bikes', icon: 'fas fa-bolt', productCount: 0, description: 'Power-assisted bicycles' },
        { id: 'cat_5', name: 'Hybrid Bikes', icon: 'fas fa-sync', productCount: 0, description: 'Multi-purpose bikes' },
        { id: 'cat_6', name: 'Kids Bikes', icon: 'fas fa-child', productCount: 0, description: 'Bikes for children' },
        { id: 'cat_7', name: 'Racing Bikes', icon: 'fas fa-flag-checkered', productCount: 0, description: 'Competition racing bicycles' },
        { id: 'cat_8', name: 'Accessories', icon: 'fas fa-cog', productCount: 0, description: 'Bike accessories and gear' }
    ];

    // Initialize categories in state and localStorage if not exists
    if (!localStorage.getItem('categories')) {
        localStorage.setItem('categories', JSON.stringify(defaultCategories));
        dashboardState.categories = defaultCategories;
    } else {
        dashboardState.categories = JSON.parse(localStorage.getItem('categories'));
    }

    // Populate category filters
    populateCategoryFilters();
}

// Add to setupEventListeners function
function setupCategoryEventListeners() {
    const categoryForm = document.getElementById('category-form');
    const iconInput = document.getElementById('categoryIcon');
    const iconPreview = document.querySelector('.icon-preview');

    categoryForm.addEventListener('submit', handleCategorySubmit);
    iconInput.addEventListener('input', updateIconPreview);
}

async function handleCategorySubmit(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const editId = form.dataset.editId;

    try {
        const categoryData = {
            id: editId || `cat_${Date.now()}`,
            name: formData.get('categoryName'),
            icon: formData.get('categoryIcon') || 'fas fa-folder',
            description: formData.get('categoryDescription'),
            productCount: 0
        };

        if (editId) {
            // Update existing category
            dashboardState.categories = dashboardState.categories.map(c => 
                c.id === editId ? categoryData : c
            );
        } else {
            // Add new category
            dashboardState.categories.push(categoryData);
        }

        // Save to localStorage
        localStorage.setItem('categories', JSON.stringify(dashboardState.categories));
        
        // Refresh UI
        refreshCategories();
        populateCategoryFilters();
        hideModal('category-modal');
        showNotification(`Category ${editId ? 'updated' : 'added'} successfully`);
        form.reset();
        delete form.dataset.editId;
    } catch (error) {
        console.error('Error saving category:', error);
        showNotification('Error saving category', 'error');
    }
}

function updateIconPreview(e) {
    const iconClass = e.target.value;
    const preview = document.querySelector('.icon-preview');
    preview.innerHTML = iconClass ? `<i class="${iconClass}"></i>` : '';
}

async function deleteCategory(categoryId) {
    if (!confirm('Are you sure you want to delete this category?')) return;

    try {
        const updatedCategories = dashboardState.categories.filter(c => c.id !== categoryId);
        dashboardState.categories = updatedCategories;
        localStorage.setItem('categories', JSON.stringify(updatedCategories));
        
        refreshCategories();
        showNotification('Category deleted successfully');
    } catch (error) {
        console.error('Error deleting category:', error);
        showNotification('Error deleting category', 'error');
    }
}

function editCategory(categoryId) {
    const category = dashboardState.categories.find(c => c.id === categoryId);
    if (!category) return;

    const form = document.getElementById('category-form');
    form.dataset.editId = categoryId;
    
    form.categoryName.value = category.name;
    form.categoryIcon.value = category.icon;
    form.categoryDescription.value = category.description || '';
    
    updateIconPreview({ target: { value: category.icon } });
    showModal('category-modal');
}

// Add these order management functions
async function viewOrder(orderId) {
    const order = dashboardState.orders.find(o => o.id === orderId);
    if (!order) {
        showNotification('Order not found', 'error');
        return;
    }

    const orderTotal = calculateOrderTotal(order);
    // ...existing viewOrder code...
    
    // Update the total in the table footer without tax
    const tableFooter = `
        <tfoot>
            <tr class="total-row">
                <td colspan="3" style="text-align: right;"><strong>Total:</strong></td>
                <td><strong>${formatCurrency(orderTotal)}</strong></td>
            </tr>
        </tfoot>
    `;

    const modal = document.getElementById('order-modal');
    const orderDetails = modal.querySelector('.order-details');

    orderDetails.innerHTML = `
        <div class="order-content">
            <div class="order-header">
                <div class="order-title">
                    <h4>Order #${order.id}</h4>
                    <div class="order-meta">
                        <span class="order-date">${formatDate(order.date)}</span>
                        <span class="status-badge status-${order.status.toLowerCase()}">${order.status}</span>
            </div>
            <div class="info-section">
                <h4>Order Details</h4>
                <p><strong>Order ID:</strong> ${order.id}</p>
                <p><strong>Date:</strong> ${new Date(order.date).toLocaleString()}</p>
                <p><strong>Status:</strong> 
                    <select class="status-select" onchange="updateOrderStatus('${order.id}', this.value)">
                        <option value="Pending" ${order.status === 'Pending' ? 'selected' : ''}>Pending</option>
                        <option value="Processing" ${order.status === 'Processing' ? 'selected' : ''}>Processing</option>
                        <option value="Completed" ${order.status === 'Completed' ? 'selected' : ''}>Completed</option>
                        <option value="Cancelled" ${order.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
                    </select>
                </p>
            </div>
        </div>

            <div class="customer-section">
                <div class="section-title">Customer Information</div>
                <div class="customer-info-grid">
                    <div class="info-block personal-info">
                        <h5>Personal Details</h5>
                        <div class="info-content">
                            <div class="info-row">
                                <span class="info-label">Name:</span>
                                <span class="info-value">${order.customerDetails?.firstName} ${order.customerDetails?.lastName}</span>
                                </div>
                            <div class="info-row">
                                <span class="info-label">Email:</span>
                                <span class="info-value">${order.customerDetails?.email || 'N/A'}</span>
        </div>
                            <div class="info-row">
                                <span class="info-label">Phone:</span>
                                <span class="info-value">${order.customerDetails?.phone || 'N/A'}</span>
            </div>
                        </div>
                    </div>
                    
                    <div class="info-block shipping-info">
                        <h5>Shipping Address</h5>
                        <div class="info-content">
                            <div class="address-details">
                                ${formatDetailedAddress(order.customerDetails?.address)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="order-items-section">
                <!-- ...rest of existing order items HTML... -->
            </div>
        </div>
    `;

    showModal('order-modal');
}

function formatAddress(address) {
    if (!address) return 'N/A';
    return `${address.street}, ${address.city}, ${address.state}, ${address.country} ${address.postalCode}`;
}

async function updateOrderStatus(orderId, newStatus) {
    try {
        const order = dashboardState.orders.find(o => o.id === orderId);
        if (!order) throw new Error('Order not found');

        order.status = newStatus;
        localStorage.setItem('orders', JSON.stringify(dashboardState.orders));
        
        refreshOrders();
        showNotification('Order status updated successfully');
    } catch (error) {
        console.error('Error updating order status:', error);
        showNotification('Failed to update order status', 'error');
    }
}

async function deleteOrder(orderId) {
    if (!confirm('Are you sure you want to delete this order?')) return;
    
    try {
        dashboardState.orders = dashboardState.orders.filter(o => o.id !== orderId);
        localStorage.setItem('orders', JSON.stringify(dashboardState.orders));
        
        refreshOrders();
        updateDashboardStats();
        showNotification('Order deleted successfully');
    } catch (error) {
        console.error('Error deleting order:', error);
        showNotification('Failed to delete order', 'error');
    }
}

function getNextStatus(currentStatus) {
    const statusFlow = {
        'Pending': 'Processing',
        'Processing': 'Completed',
        'Completed': 'Completed',
        'Cancelled': 'Cancelled'
    };
    return statusFlow[currentStatus] || 'Pending';
}

// Add to setupEventListeners function
function setupTabEventListeners() {
    const tabControls = document.querySelector('.tab-controls');
    const tabs = tabControls.querySelectorAll('.tab-btn');
    
    // Add keyboard navigation
    tabs.forEach((tab, index) => {
        tab.addEventListener('keydown', (e) => {
            let targetTab = null;
            
            switch(e.key) {
                case 'ArrowLeft':
                    targetTab = index > 0 ? tabs[index - 1] : tabs[tabs.length - 1];
                    break;
                case 'ArrowRight':
                    targetTab = index < tabs.length - 1 ? tabs[index + 1] : tabs[0];
                    break;
            }
            
            if (targetTab) {
                e.preventDefault();
                targetTab.click();
                targetTab.focus();
            }
        });
    });
}

// Update the order total calculation
function calculateOrderTotal(order) {
    if (!order.items || !Array.isArray(order.items)) return 0;
    
    return order.items.reduce((total, item) => {
        const price = parseFloat(item.price) || 0;
        const quantity = parseInt(item.quantity) || 1;
        return total + (price * quantity);
    }, 0);
}

// Add utility functions for formatting
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-EG', {
        style: 'currency',
        currency: 'EGP',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleString('en-EG', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Update updateDashboardStats to use new calculation
function updateDashboardStats() {
    const totalOrders = dashboardState.orders.length;
    const totalRevenue = dashboardState.orders.reduce((sum, order) => {
        const orderTotal = calculateOrderTotal(order);
        return sum + orderTotal; // Removed tax multiplication
    }, 0);
    const totalProducts = dashboardState.products.length;

    document.getElementById('total-orders').textContent = totalOrders;
    document.getElementById('total-revenue').textContent = formatCurrency(totalRevenue);
    document.getElementById('total-products').textContent = totalProducts;

    // Add revenue trend indicator
    addRevenueTrend(totalRevenue);
}

// Add new utility function for detailed address formatting
function formatDetailedAddress(address) {
    if (!address) return '<div class="no-address">No address provided</div>';
    
    return `
        <div class="address-row"><span class="address-label">Street:</span> ${address.street}</div>
        <div class="address-row"><span class="address-label">City:</span> ${address.city}</div>
        <div class="address-row"><span class="address-label">State:</span> ${address.state}</div>
        <div class="address-row"><span class="address-label">Country:</span> ${address.country}</div>
        <div class="address-row"><span class="address-label">Postal Code:</span> ${address.postalCode}</div>
    `;
}

// Add these customer management functions
async function viewCustomerDetails(customerId) {
    const customer = dashboardState.customers.find(c => c.id === customerId);
    if (!customer) {
        showNotification('Customer not found', 'error');
        return;
    }

    const modal = document.getElementById('order-modal');
    const modalContent = modal.querySelector('.modal-content');
    
    modalContent.innerHTML = `
        <div class="modal-header">
            <h3>Customer Details</h3>
            <button class="close-btn">&times;</button>
        </div>
        <div class="customer-details">
            <div class="customer-info-grid">
                <div class="info-block">
                    <h5>Personal Information</h5>
                    <div class="info-content">
                        <div class="info-row">
                            <span class="info-label">Name:</span>
                            <span class="info-value">${customer.firstName} ${customer.lastName}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Email:</span>
                            <span class="info-value">${customer.email}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Phone:</span>
                            <span class="info-value">${customer.phone}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Last Order:</span>
                            <span class="info-value">${customer.lastOrder ? formatDate(customer.lastOrder) : 'N/A'}</span>
                        </div>
                    </div>
                </div>
                <div class="info-block">
                    <h5>Order History</h5>
                    <div class="info-content">
                        <div class="info-row">
                            <span class="info-label">Total Orders:</span>
                            <span class="info-value">${customer.orders.length}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Total Spent:</span>
                            <span class="info-value">${formatCurrency(customer.totalSpent)}</span>
                        </div>
                    </div>
                </div>
                <div class="info-block">
                    <h5>Shipping Address</h5>
                    <div class="info-content">
                        ${formatDetailedAddress(customer.address)}
                    </div>
                </div>
            </div>
            <div class="recent-orders">
                <h5>Recent Orders</h5>
                <table class="orders-table">
                    <thead>
                        <tr>
                            <th>Order ID</th>
                            <th>Date</th>
                            <th>Status</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${customer.orders.slice(0, 5).map(order => `
                            <tr>
                                <td>${order.id}</td>
                                <td>${formatDate(order.date)}</td>
                                <td><span class="status-badge status-${order.status.toLowerCase()}">${order.status}</span></td>
                                <td>${formatCurrency(calculateOrderTotal(order))}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;

    showModal('order-modal');
}

// Add this new function
function populateProductCategories() {
    const productCategorySelect = document.getElementById('productCategory');
    if (!productCategorySelect) return;

    // Clear existing options except the first one
    while (productCategorySelect.options.length > 1) {
        productCategorySelect.remove(1);
    }

    // Add categories from state
    dashboardState.categories.forEach(category => {
        const option = new Option(category.name, category.id);
        productCategorySelect.add(option);
    });
}

// Add this new function to update category product counts
function updateCategoryProductCount() {
    // Reset all category counts
    dashboardState.categories = dashboardState.categories.map(category => ({
        ...category,
        productCount: 0
    }));

    // Count products in each category
    dashboardState.products.forEach(product => {
        const category = dashboardState.categories.find(c => c.id === product.categoryId);
        if (category) {
            category.productCount++;
        }
    });

    // Update categories in localStorage
    localStorage.setItem('categories', JSON.stringify(dashboardState.categories));
}

// ...existing code...

document.getElementById('product-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const editId = form.dataset.editId;

    try {
        const productData = {
            id: editId || `PROD_${Date.now()}`,
            name: formData.get('productName'),
            category: formData.get('productCategory'),
            description: formData.get('productDescription'),
            price: parseFloat(formData.get('productPrice')),
            stock: parseInt(formData.get('productStock')),
            rating: 0,
            reviews: [],
            featured: false,
            dateAdded: new Date().toISOString(),
            specifications: {
                category: formData.get('productCategory'),
                availability: parseInt(formData.get('productStock')) > 0 ? 'In Stock' : 'Out of Stock'
            }
        };

        // Handle image upload
        const imageFile = formData.get('productImage');
        if (imageFile?.size > 0) {
            productData.image = await processImage(imageFile);
        } else if (editId) {
            const existingProduct = dashboardState.products.find(p => p.id === editId);
            productData.image = existingProduct.image;
        } else {
            throw new Error('Please select a product image');
        }

        // Get existing products
        let products = JSON.parse(localStorage.getItem('products') || '[]');
        
        // Create Map to ensure unique products by ID
        const productsMap = new Map(products.map(p => [p.id, p]));
        
        if (editId) {
            // Update existing product
            productsMap.set(editId, productData);
        } else {
            // Add new product if it doesn't exist
            if (!productsMap.has(productData.id)) {
                productsMap.set(productData.id, productData);
            }
        }
        
        // Convert Map back to array
        products = Array.from(productsMap.values());

        // Save to localStorage
        localStorage.setItem('products', JSON.stringify(products));

        // Dispatch storage event
        window.dispatchEvent(new StorageEvent('storage', {
            key: 'products',
            newValue: JSON.stringify(dashboardState.products),
            storageArea: localStorage
        }));
        
        // Update dashboard state
        dashboardState.products = products;

        refreshProducts();
        updateDashboardStats();
        hideModal('product-modal');
        
        showNotification(`Product ${editId ? 'updated' : 'added'} successfully`);
        form.reset();
        delete form.dataset.editId;
    } catch (error) {
        console.error('Error saving product:', error);
        showNotification(error.message || 'Error saving product', 'error');
    }
});

// ...existing code...

function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.setAttribute('data-category', product.category.toLowerCase());
    card.setAttribute('data-price', product.price);

    card.innerHTML = `
        <div class="product-image">
            <img src="${product.image}" alt="${product.name}" loading="lazy">
            ${product.stock <= 0 ? '<span class="stock-badge out">Out of Stock</span>' : ''}
        </div>
        <div class="product-info">
            <h3>${product.name}</h3>
            <p class="category">${product.category}</p>
            <p class="price">${formatCurrency(product.price)}</p>
            <p class="stock">Stock: ${product.stock}</p>
            <div class="action-btns">
                <button onclick="viewProduct('${product.id}')" class="action-btn view">
                    <i class="fas fa-eye"></i> View
                </button>
                <button onclick="editProduct('${product.id}')" class="action-btn edit">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button onclick="deleteProduct('${product.id}')" class="action-btn delete">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        </div>
    `;

    return card;
}

// ...existing code...

function resetProductForm() {
    const form = document.getElementById('product-form');
    if (!form) return;

    form.reset();
    delete form.dataset.editId;
    
    const preview = document.querySelector('.image-preview');
    if (preview) preview.innerHTML = '';
    
    Array.from(form.elements).forEach(el => {
        el.disabled = false;
        el.classList.remove('error');
    });

    // Clear any previous error messages
    document.querySelectorAll('.error-message').forEach(el => el.remove());
}

// Add this function
function clearAllProducts() {
    if (!confirm('Are you sure you want to clear all products? This action cannot be undone!')) {
        return;
    }

    try {
        // Create backup
        const backup = {
            date: new Date().toISOString(),
            products: dashboardState.products
        };
        localStorage.setItem('productsBackup', JSON.stringify(backup));

        // Clear products
        dashboardState.products = [];
        localStorage.setItem('products', '[]');

        // Reset category counts
        dashboardState.categories = dashboardState.categories.map(category => ({
            ...category,
            productCount: 0
        }));
        localStorage.setItem('categories', JSON.stringify(dashboardState.categories));

        // Update UI
        refreshProducts();
        refreshCategories();
        updateDashboardStats();
        
        showNotification('All products have been cleared successfully', 'success');
    } catch (error) {
        console.error('Error clearing products:', error);
        showNotification('Failed to clear products', 'error');
    }
}

// Remove all duplicate event listeners and keep only one product form handler
// Replace all existing product form event listeners with this single one
document.getElementById('product-form')?.removeEventListener('submit', handleProductSubmit);
document.getElementById('product-form')?.addEventListener('submit', handleProductSubmit);

async function handleProductSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const editId = form.dataset.editId;

    try {
        // Validate form data
        if (!formData.get('productName').trim()) throw new Error('Product name is required');
        if (!formData.get('productCategory')) throw new Error('Category is required');
        if (!formData.get('productPrice') || parseFloat(formData.get('productPrice')) <= 0) 
            throw new Error('Valid price is required');
        if (!formData.get('productStock') || parseInt(formData.get('productStock')) < 0) 
            throw new Error('Valid stock quantity is required');

        const productData = {
            id: editId || `PROD_${Date.now()}`,
            name: formData.get('productName').trim(),
            category: formData.get('productCategory'),
            description: formData.get('productDescription').trim() || '',
            price: parseFloat(formData.get('productPrice')),
            stock: parseInt(formData.get('productStock')),
            rating: 0,
            reviews: [],
            featured: false,
            dateAdded: new Date().toISOString()
        };

        // Handle image upload
        const imageFile = formData.get('productImage');
        if (imageFile?.size > 0) {
            productData.image = await processImage(imageFile);
        } else if (editId) {
            const existingProduct = dashboardState.products.find(p => p.id === editId);
            productData.image = existingProduct?.image;
        } else {
            throw new Error('Product image is required');
        }

        // Update products array without duplicates
        if (editId) {
            // Update existing product
            dashboardState.products = dashboardState.products.map(p => 
                p.id === editId ? productData : p
            );
        } else {
            // Add new product
            dashboardState.products.push(productData);
        }

        // Save to localStorage
        localStorage.setItem('products', JSON.stringify(dashboardState.products));

        // Dispatch storage event
        window.dispatchEvent(new StorageEvent('storage', {
            key: 'products',
            newValue: JSON.stringify(dashboardState.products),
            storageArea: localStorage
        }));

        // Refresh UI
        refreshProducts();
        updateDashboardStats();
        hideModal('product-modal');
        
        // Show success message
        showNotification(`Product successfully ${editId ? 'updated' : 'added'}!`, 'success');

        // Reset form
        form.reset();
        delete form.dataset.editId;
        document.querySelector('.image-preview').innerHTML = '';

    } catch (error) {
        console.error('Error saving product:', error);
        showNotification(error.message, 'error');
    }
}

// Add this function to handle category population and selection
function setupProductCategorySelect() {
    const productCategory = document.getElementById('productCategory');
    if (!productCategory) return;

    // Set up category change handler
    productCategory.addEventListener('change', (e) => {
        if (e.target.value) {
            e.target.classList.add('selected');
        } else {
            e.target.classList.remove('selected');
        }
    });

    // Add validation
    productCategory.addEventListener('invalid', (e) => {
        if (e.target.validity.valueMissing) {
            e.target.setCustomValidity('Please select a product category');
        }
    });

    productCategory.addEventListener('change', (e) => {
        e.target.setCustomValidity('');
    });
}

// Update the existing showModal function
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    // If it's the product modal, ensure categories are set up
    if (modalId === 'product-modal') {
        setupProductCategorySelect();
    }

    modal.style.display = 'block';
    modal.classList.add('fade-in');
    document.body.style.overflow = 'hidden';
}

// ...existing code...

function populateCategoryFilters() {
    const categorySelect = document.getElementById('category-filter');
    const productCategorySelect = document.getElementById('productCategory');
    
    if (!productCategorySelect || !categorySelect) return;

    // Get categories from state
    const categories = dashboardState.categories;
    
    // Clear existing options
    while (categorySelect.options.length > 1) categorySelect.remove(1);
    while (productCategorySelect.options.length > 1) productCategorySelect.remove(1);
    
    // Add categories to both selects
    categories.forEach(category => {
        // Add to filter dropdown
        const filterOption = new Option(category.name, category.name);
        categorySelect.add(filterOption);
        
        // Add to product form dropdown with the same value as display text
        const productOption = new Option(category.name, category.name);
        productCategorySelect.add(productOption);
    });
}

// Update the initializeCategories function
function initializeCategories() {
    const defaultCategories = [
        { id: 'cat_1', name: 'Mountain Bikes', icon: 'fas fa-mountain', productCount: 0, description: 'Off-road bikes for rough terrain' },
        { id: 'cat_2', name: 'Road Bikes', icon: 'fas fa-road', productCount: 0, description: 'Lightweight bikes for paved surfaces' },
        { id: 'cat_3', name: 'BMX Bikes', icon: 'fas fa-bicycle', productCount: 0, description: 'Bikes for tricks and racing' },
        { id: 'cat_4', name: 'Electric Bikes', icon: 'fas fa-bolt', productCount: 0, description: 'Power-assisted bicycles' },
        { id: 'cat_5', name: 'Hybrid Bikes', icon: 'fas fa-sync', productCount: 0, description: 'Multi-purpose bikes' },
        { id: 'cat_6', name: 'Kids Bikes', icon: 'fas fa-child', productCount: 0, description: 'Bikes for children' },
        { id: 'cat_7', name: 'Racing Bikes', icon: 'fas fa-flag-checkered', productCount: 0, description: 'Competition racing bicycles' },
        { id: 'cat_8', name: 'Accessories', icon: 'fas fa-cog', productCount: 0, description: 'Bike accessories and gear' }
    ];

    // Initialize categories if not exists
    if (!localStorage.getItem('categories')) {
        localStorage.setItem('categories', JSON.stringify(defaultCategories));
    }
    
    // Update dashboard state
    dashboardState.categories = JSON.parse(localStorage.getItem('categories'));
    
    // Update category counts
    updateCategoryProductCount();
    
    // Populate filters
    populateCategoryFilters();
}

function updateCategoryProductCount() {
    // Reset counts
    const categoryCounts = new Map(dashboardState.categories.map(c => [c.name, 0]));
    
    // Count products in each category
    dashboardState.products.forEach(product => {
        if (product.category && categoryCounts.has(product.category)) {
            categoryCounts.set(product.category, categoryCounts.get(product.category) + 1);
        }
    });
    
    // Update category counts in state
    dashboardState.categories = dashboardState.categories.map(category => ({
        ...category,
        productCount: categoryCounts.get(category.name) || 0
    }));
    
    // Save updated categories
    localStorage.setItem('categories', JSON.stringify(dashboardState.categories));
}

// Update the category submission handler
async function handleCategorySubmit(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const editId = form.dataset.editId;

    try {
        const categoryData = {
            id: editId || `cat_${Date.now()}`,
            name: formData.get('categoryName'),
            icon: formData.get('categoryIcon') || 'fas fa-folder',
            description: formData.get('categoryDescription'),
            productCount: 0
        };

        if (editId) {
            // Update existing category
            dashboardState.categories = dashboardState.categories.map(c => 
                c.id === editId ? categoryData : c
            );
        } else {
            // Add new category
            dashboardState.categories.push(categoryData);
        }

        // Save to localStorage
        localStorage.setItem('categories', JSON.stringify(dashboardState.categories));
        
        // Refresh UI
        refreshCategories();
        populateCategoryFilters();
        hideModal('category-modal');
        showNotification(`Category ${editId ? 'updated' : 'added'} successfully`);
        form.reset();
        delete form.dataset.editId;
    } catch (error) {
        console.error('Error saving category:', error);
        showNotification('Error saving category', 'error');
    }
}

// ...existing code...

// Enhanced Button Manager
const ButtonManager = {
    setupButtons() {
        // Action buttons setup
        document.querySelectorAll('.action-btn').forEach(btn => {
            this.setupActionButton(btn);
        });

        // Primary buttons setup
        document.querySelectorAll('.primary-btn').forEach(btn => {
            this.setupPrimaryButton(btn);
        });

        // Danger buttons setup
        document.querySelectorAll('.danger-btn').forEach(btn => {
            this.setupDangerButton(btn);
        });
    },

    setupActionButton(btn) {
        btn.addEventListener('click', (e) => {
            // Add ripple effect
            this.addRippleEffect(e);
            
            // Add loading state if button has data-action
            if (btn.dataset.action) {
                this.handleActionClick(btn);
            }
        });
    },

    setupPrimaryButton(btn) {
        const originalText = btn.innerHTML;
        
        btn.addEventListener('click', async (e) => {
            if (btn.disabled || btn.classList.contains('loading')) return;
            
            try {
                btn.classList.add('loading');
                btn.disabled = true;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
                
                // Wait for any async operation
                if (btn.onclick) {
                    await btn.onclick(e);
                }
            } finally {
                setTimeout(() => {
                    btn.classList.remove('loading');
                    btn.disabled = false;
                    btn.innerHTML = originalText;
                }, 500);
            }
        });
    },

    setupDangerButton(btn) {
        btn.addEventListener('click', (e) => {
            const confirmMessage = btn.dataset.confirm || 'Are you sure you want to perform this action?';
            
            if (!confirm(confirmMessage)) {
                e.preventDefault();
                e.stopPropagation();
                return false;
            }
            
            this.addRippleEffect(e);
            btn.classList.add('loading');
        });
    },

    addRippleEffect(e) {
        const btn = e.currentTarget;
        const ripple = document.createElement('span');
        ripple.className = 'ripple';
        
        const rect = btn.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        ripple.style.width = ripple.style.height = `${size}px`;
        
        const x = e.clientX - rect.left - size/2;
        const y = e.clientY - rect.top - size/2;
        
        ripple.style.left = `${x}px`;
        ripple.style.top = `${y}px`;
        
        btn.appendChild(ripple);
        setTimeout(() => ripple.remove(), 600);
    },

    async handleActionClick(btn) {
        const action = btn.dataset.action;
        const originalText = btn.innerHTML;
        
        try {
            btn.classList.add('loading');
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            
            switch(action) {
                case 'save':
                    await handleSave();
                    break;
                case 'delete':
                    await handleDelete();
                    break;
                // Add more actions as needed
            }
        } catch (error) {
            showNotification(error.message, 'error');
        } finally {
            submitBtn.classList.remove('loading');
        }
    }
};

// Update button click handlers
function attachButtonHandlers() {
    // Clear products button
    const clearProductsBtn = document.getElementById('clear-products-btn');
    if (clearProductsBtn) {
        clearProductsBtn.dataset.confirm = 'Are you sure you want to clear all products? This action cannot be undone!';
        ButtonManager.setupDangerButton(clearProductsBtn);
    }

    // Add product button
    const addProductBtn = document.getElementById('add-product-btn');
    if (addProductBtn) {
        ButtonManager.setupPrimaryButton(addProductBtn);
    }

    // Action buttons in tables
    document.querySelectorAll('.action-btns button').forEach(btn => {
        ButtonManager.setupActionButton(btn);
    });
}

// Call this after any dynamic content update
function refreshButtons() {
    ButtonManager.setupButtons();
}

// ...rest of existing code...

function setupCategoryModal() {
    const modal = document.getElementById('category-modal');
    const form = document.getElementById('category-form');
    const addCategoryBtn = document.getElementById('add-category-btn');
    const closeBtn = modal.querySelector('.close-btn');
    const cancelBtn = modal.querySelector('[data-action="cancel"]');

    // Add Category button handler
    addCategoryBtn.addEventListener('click', () => {
        resetCategoryForm();
        showModal('category-modal');
    });

    // Close modal handlers
    closeBtn.addEventListener('click', () => hideModal('category-modal'));
    cancelBtn.addEventListener('click', () => hideModal('category-modal'));

    // Form submission handler
    form.addEventListener('submit', handleCategorySubmit);

    // Icon preview handler
    const iconInput = form.querySelector('#categoryIcon');
    iconInput.addEventListener('input', updateIconPreview);
}

async function handleCategorySubmit(e) {
    e.preventDefault();
    const form = e.target;
    const submitBtn = form.querySelector('[type="submit"]');
    
    try {
        submitBtn.classList.add('loading');
        submitBtn.disabled = true;

        const formData = new FormData(form);
        const categoryData = {
            id: form.dataset.editId || `cat_${Date.now()}`,
            name: formData.get('categoryName').trim(),
            icon: formData.get('categoryIcon').trim() || 'fas fa-folder',
            description: formData.get('categoryDescription').trim(),
            productCount: 0
        };

        // Validate category data
        if (!categoryData.name || categoryData.name.length < 3) {
            throw new Error('Category name must be at least 3 characters');
        }

        if (categoryData.name.length > 50) {
            throw new Error('Category name must be less than 50 characters');
        }

        // Check for duplicate names
        const isDuplicate = dashboardState.categories.some(cat => 
            cat.name.toLowerCase() === categoryData.name.toLowerCase() &&
            cat.id !== categoryData.id
        );

        if (isDuplicate) {
            throw new Error('A category with this name already exists');
        }

        // Save category
        if (form.dataset.editId) {
            // Update existing category
            dashboardState.categories = dashboardState.categories.map(cat =>
                cat.id === form.dataset.editId ? categoryData : cat
            );
        } else {
            // Add new category
            dashboardState.categories.push(categoryData);
        }

        // Save to localStorage
        localStorage.setItem('categories', JSON.stringify(dashboardState.categories));

        // Update UI
        refreshCategories();
        populateCategoryFilters();
        hideModal('category-modal');
        showNotification(`Category ${form.dataset.editId ? 'updated' : 'added'} successfully`);
        
        // Reset form
        resetCategoryForm();

    } catch (error) {
        showNotification(error.message, 'error');
    } finally {
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
    }
}

function resetCategoryForm() {
    const form = document.getElementById('category-form');
    form.reset();
    delete form.dataset.editId;
    
    // Reset icon preview
    const iconPreview = form.querySelector('.icon-preview');
    if (iconPreview) {
        iconPreview.innerHTML = '';
    }
    
    // Reset validation states
    Array.from(form.elements).forEach(el => {
        el.classList.remove('error');
        el.disabled = false;
    });
}

function updateIconPreview(e) {
    const iconClass = e.target.value.trim();
    const preview = document.querySelector('.icon-preview');
    
    if (iconClass) {
        preview.innerHTML = `<i class="${iconClass}"></i>`;
    } else {
        preview.innerHTML = '<i class="fas fa-folder"></i>';
    }
}

// Add this to your initialization code
document.addEventListener('DOMContentLoaded', () => {
    // ...existing initialization code...
    setupCategoryModal();
});

// ...existing code...
