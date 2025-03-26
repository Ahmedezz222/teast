document.addEventListener('DOMContentLoaded', function() {
    // Mobile Menu Handler
    const menuToggle = document.getElementById('menuToggle');
    const navMenu = document.getElementById('nav-menu');
    const overlay = document.getElementById('overlay');

    function toggleMenu() {
        navMenu.classList.toggle('active');
        overlay.classList.toggle('active');
        menuToggle.innerHTML = navMenu.classList.contains('active') ? 
            '<i class="fas fa-times"></i>' : 
            '<i class="fas fa-bars"></i>';
    }

    menuToggle.addEventListener('click', toggleMenu);
    overlay.addEventListener('click', toggleMenu);

    // Close menu when clicking nav links on mobile
    const navLinks = document.querySelectorAll('.dashboard-nav a');
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                toggleMenu();
            }
        });
    });

    // Navigation Handler
    function initializeNavigation() {
        const navLinks = document.querySelectorAll('.dashboard-nav a');
        const sections = document.querySelectorAll('.dashboard-section');

        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                if (link.getAttribute('href').startsWith('#')) {
                    e.preventDefault();
                    const targetId = link.getAttribute('href').substring(1);
                    
                    navLinks.forEach(l => l.classList.remove('active'));
                    link.classList.add('active');
                    
                    sections.forEach(section => {
                        section.classList.remove('active');
                        if (section.id === targetId) {
                            section.classList.add('active');
                        }
                    });
                }
            });
        });
    }

    // Table Renderers
    function renderTable(data, tableSelector, rowTemplate) {
        const tableBody = document.querySelector(tableSelector);
        if (!tableBody) return;
        
        tableBody.innerHTML = data.map(rowTemplate).join('');
    }

    // Product Management
    function initializeProducts() {
        const productForm = document.getElementById('productForm');
        if (!productForm) return;

        // Initialize global store
        const store = {
            products: JSON.parse(localStorage.getItem('products')) || [],
            orders: JSON.parse(localStorage.getItem('orders')) || [],
            users: JSON.parse(localStorage.getItem('users')) || [],
            settings: JSON.parse(localStorage.getItem('adminSettings')) || {}
        };

        let isEditing = false;
        let editingId = null;

        // Add stock input to product form
        const stockInput = document.createElement('input');
        stockInput.type = 'number';
        stockInput.name = 'stock';
        stockInput.placeholder = 'Stock Quantity';
        stockInput.required = true;
        stockInput.min = '0';
        productForm.insertBefore(stockInput, productForm.querySelector('button'));

        function resetForm() {
            productForm.reset();
            isEditing = false;
            editingId = null;
            productForm.querySelector('button[type="submit"]').textContent = 'Add Product';
        }

        productForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const formData = new FormData(this);
            const imageFile = formData.get('image');

            const processProductUpdate = (imageUrl) => {
                const productData = {
                    name: formData.get('productName'),
                    price: parseFloat(formData.get('price')),
                    category: formData.get('category'),
                    description: formData.get('description'),
                    stock: parseInt(formData.get('stock')) || 10,
                    image: imageUrl
                };

                if (isEditing && editingId) {
                    // Update existing product
                    const index = store.products.findIndex(p => p.id === editingId);
                    if (index !== -1) {
                        store.products[index] = { 
                            ...store.products[index], 
                            ...productData 
                        };
                        showNotification('Product updated successfully', 'success');
                    }
                } else {
                    // Add new product
                    store.products.push({
                        id: Date.now(),
                        ...productData
                    });
                    showNotification('Product added successfully', 'success');
                }

                localStorage.setItem('products', JSON.stringify(store.products));
                resetForm();
                renderProducts();
            };

            if (imageFile && imageFile.size > 0) {
                const reader = new FileReader();
                reader.onload = (e) => processProductUpdate(e.target.result);
                reader.readAsDataURL(imageFile);
            } else {
                const currentImage = isEditing ? 
                    store.products.find(p => p.id === editingId)?.image : 
                    'data/css/img/default-product.jpg';
                processProductUpdate(currentImage);
            }
        });

        function renderProducts() {
            renderTable(store.products, '.products-table tbody', product => `
                <tr>
                    <td>${product.name}</td>
                    <td>£${product.price.toFixed(2)}</td>
                    <td>${product.category}</td>
                    <td>${product.stock || 0}</td>
                    <td>£${(product.price * (product.stock || 0)).toFixed(2)}</td>
                    <td>
                        <button class="action-btn edit" data-id="${product.id}" title="Edit product">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete" data-id="${product.id}" title="Delete product">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `);
            attachProductListeners();
        }

        function attachProductListeners() {
            // Delete handler
            document.querySelectorAll('.products-table .delete').forEach(btn => {
                btn.addEventListener('click', function() {
                    const id = parseInt(this.dataset.id);
                    if (confirm('Are you sure you want to delete this product?')) {
                        store.products = store.products.filter(p => p.id !== id);
                        localStorage.setItem('products', JSON.stringify(store.products));
                        renderProducts();
                        showNotification('Product deleted successfully', 'success');
                    }
                });
            });

            // Edit handler with improved functionality
            document.querySelectorAll('.products-table .edit').forEach(btn => {
                btn.addEventListener('click', function() {
                    const id = parseInt(this.dataset.id);
                    const product = store.products.find(p => p.id === id);
                    if (product) {
                        isEditing = true;
                        editingId = id;
                        
                        // Populate form with all product data
                        Object.keys(product).forEach(key => {
                            const input = productForm.querySelector(`[name="${key}"]`);
                            if (input && key !== 'id' && key !== 'image') {
                                input.value = product[key];
                            }
                        });
                        
                        // Update button and UI
                        const submitBtn = productForm.querySelector('button[type="submit"]');
                        submitBtn.textContent = 'Update Product';
                        submitBtn.classList.add('editing');
                        
                        // Add cancel edit button
                        if (!productForm.querySelector('.cancel-edit')) {
                            const cancelBtn = document.createElement('button');
                            cancelBtn.type = 'button';
                            cancelBtn.className = 'admin-btn cancel-edit';
                            cancelBtn.textContent = 'Cancel Edit';
                            cancelBtn.onclick = resetForm;
                            submitBtn.parentNode.insertBefore(cancelBtn, submitBtn.nextSibling);
                        }
                        
                        productForm.scrollIntoView({ behavior: 'smooth' });
                    }
                });
            });
        }

        function showNotification(message, type = 'success') {
            const notification = document.createElement('div');
            notification.className = `admin-notification ${type}`;
            notification.textContent = message;
            document.body.appendChild(notification);
            
            setTimeout(() => {
                notification.classList.add('show');
                setTimeout(() => {
                    notification.classList.remove('show');
                    setTimeout(() => notification.remove(), 300);
                }, 2000);
            }, 100);
        }

        renderProducts();
    }

    // Orders Management
    function initializeOrders() {
        const store = {
            orders: JSON.parse(localStorage.getItem('orders')) || []
        };

        function renderOrders() {
            renderTable(store.orders, '.orders-table tbody', order => `
                <tr>
                    <td>#${order.id}</td>
                    <td>${order.customer || 'N/A'}</td>
                    <td>${new Date(order.date).toLocaleDateString()}</td>
                    <td>£${parseFloat(order.total).toFixed(2)}</td>
                    <td>
                        <select class="status-select" data-order-id="${order.id}">
                            <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
                            <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>Processing</option>
                            <option value="completed" ${order.status === 'completed' ? 'selected' : ''}>Completed</option>
                            <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                        </select>
                    </td>
                    <td>
                        <button class="action-btn view" data-id="${order.id}" title="View Details">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-btn delete" data-id="${order.id}" title="Delete Order">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `);
            attachOrderListeners();
        }

        function attachOrderListeners() {
            // Status change handler
            document.querySelectorAll('.status-select').forEach(select => {
                select.addEventListener('change', function() {
                    const orderId = this.dataset.orderId;
                    const newStatus = this.value;
                    updateOrderStatus(orderId, newStatus);
                });
            });

            // View order details
            document.querySelectorAll('.orders-table .view').forEach(btn => {
                btn.addEventListener('click', function() {
                    const orderId = this.dataset.id;
                    const order = store.orders.find(o => o.id === orderId);
                    if (order) {
                        showOrderDetails(order);
                    }
                });
            });

            // Delete order
            document.querySelectorAll('.orders-table .delete').forEach(btn => {
                btn.addEventListener('click', function() {
                    const orderId = this.dataset.id;
                    if (confirm('Are you sure you want to delete this order?')) {
                        deleteOrder(orderId);
                    }
                });
            });
        }

        function updateOrderStatus(orderId, newStatus) {
            const orderIndex = store.orders.findIndex(o => o.id === orderId);
            if (orderIndex !== -1) {
                store.orders[orderIndex].status = newStatus;
                localStorage.setItem('orders', JSON.stringify(store.orders));
                showNotification('Order status updated successfully', 'success');
            }
        }

        function deleteOrder(orderId) {
            store.orders = store.orders.filter(o => o.id !== orderId);
            localStorage.setItem('orders', JSON.stringify(store.orders));
            renderOrders();
            showNotification('Order deleted successfully', 'success');
        }

        function showOrderDetails(order) {
            const existingModal = document.querySelector('.order-details-modal');
            if (existingModal) existingModal.remove();

            const modal = document.createElement('div');
            modal.className = 'modal order-details-modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>Order #${order.id}</h2>
                        <span class="status status-${order.status}">${order.status}</span>
                        <span class="close-modal">&times;</span>
                    </div>
                    <div class="modal-body">
                        <div class="order-info-grid">
                            <div class="info-group customer-info">
                                <h3>Customer Details</h3>
                                <table class="details-table">
                                    <tr><td>Name:</td><td>${order.customer || 'N/A'}</td></tr>
                                    <tr><td>Email:</td><td>${order.email || 'N/A'}</td></tr>
                                    <tr><td>Phone:</td><td>${order.phone || 'N/A'}</td></tr>
                                    <tr><td>Address:</td><td>${order.address || 'N/A'}</td></tr>
                                </table>
                            </div>
                            <div class="info-group order-info">
                                <h3>Order Information</h3>
                                <table class="details-table">
                                    <tr><td>Order Date:</td><td>${new Date(order.date).toLocaleString()}</td></tr>
                                    <tr><td>Payment Method:</td><td>${order.payment || 'Cash on Delivery'}</td></tr>
                                    <tr><td>Status:</td><td>${order.status}</td></tr>
                                    <tr><td>Notes:</td><td>${order.notes || 'No notes provided'}</td></tr>
                                </table>
                            </div>
                        </div>
                        <div class="order-items">
                            <h3>Order Items</h3>
                            <div class="table-responsive">
                                <table class="items-table">
                                    <thead>
                                        <tr>
                                            <th>Product</th>
                                            <th>Price/Unit</th>
                                            <th>Quantity</th>
                                            <th>Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${order.items ? order.items.map(item => `
                                            <tr>
                                                <td>
                                                    <div class="product-info">
                                                        <img src="${item.image || 'data/css/img/default-product.jpg'}" alt="${item.name}" class="product-thumbnail">
                                                        <span>${item.name || item.product}</span>
                                                    </div>
                                                </td>
                                                <td>£${parseFloat(item.price).toFixed(2)}</td>
                                                <td>${item.quantity}</td>
                                                <td>£${(parseFloat(item.price) * item.quantity).toFixed(2)}</td>
                                            </tr>
                                        `).join('') : '<tr><td colspan="4">No items found</td></tr>'}
                                    </tbody>
                                    <tfoot>
                                        <tr>
                                            <td colspan="2"></td>
                                            <td><strong>Total Items:</strong> ${
                                                order.items ? order.items.reduce((sum, item) => sum + item.quantity, 0) : 0
                                            }</td>
                                            <td><strong>Total:</strong> £${parseFloat(order.total).toFixed(2)}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="admin-btn print-btn" onclick="printOrderDetails(${order.id})">
                            <i class="fas fa-print"></i> Print Order
                        </button>
                        <button class="admin-btn close-btn">Close</button>
                    </div>
                </div>
            `;

            // Add CSS for new modal styles
            const modalStyles = `
                .order-info-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                    gap: 20px;
                    margin-bottom: 20px;
                }
                .details-table {
                    width: 100%;
                    border-collapse: collapse;
                }
                .details-table td {
                    padding: 8px;
                    border-bottom: 1px solid #eee;
                }
                .details-table td:first-child {
                    font-weight: bold;
                    width: 40%;
                }
                .product-info {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                .product-thumbnail {
                    width: 50px;
                    height: 50px;
                    object-fit: cover;
                    border-radius: 4px;
                }
                .table-responsive {
                    overflow-x: auto;
                    margin: 20px 0;
                }
            `;

            const styleSheet = document.createElement('style');
            styleSheet.textContent = modalStyles;
            document.head.appendChild(styleSheet);

            document.body.appendChild(modal);
            modal.style.display = 'block';

            // Close modal handlers
            const closeButtons = modal.querySelectorAll('.close-modal, .close-btn');
            closeButtons.forEach(btn => {
                btn.onclick = () => {
                    modal.classList.add('fade-out');
                    setTimeout(() => modal.remove(), 300);
                };
            });

            // Close on outside click
            window.onclick = (event) => {
                if (event.target === modal) {
                    modal.classList.add('fade-out');
                    setTimeout(() => modal.remove(), 300);
                }
            };
        }

        // Add print functionality
        window.printOrderDetails = function(orderId) {
            const order = store.orders.find(o => o.id === orderId);
            if (!order) return;

            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
                <html>
                    <head>
                        <title>Order #${order.id}</title>
                        <style>
                            body { font-family: Arial, sans-serif; padding: 20px; }
                            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                            th, td { padding: 10px; border: 1px solid #ddd; text-align: left; }
                            .header { text-align: center; margin-bottom: 30px; }
                        </style>
                    </head>
                    <body>
                        <div class="header">
                            <h1>Order #${order.id}</h1>
                            <p>Date: ${new Date(order.date).toLocaleString()}</p>
                        </div>
                        <div class="customer-info">
                            <h2>Customer Information</h2>
                            <p>Name: ${order.customer}</p>
                            <p>Email: ${order.email}</p>
                            <p>Phone: ${order.phone || 'N/A'}</p>
                            <p>Address: ${order.address}</p>
                        </div>
                        <h2>Order Items</h2>
                        <table>
                            <thead>
                                <tr>
                                    <th>Item</th>
                                    <th>Quantity</th>
                                    <th>Price</th>
                                    <th>Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${order.items.map(item => `
                                    <tr>
                                        <td>${item.product || item.name}</td>
                                        <td>${item.quantity}</td>
                                        <td>£${parseFloat(item.price).toFixed(2)}</td>
                                        <td>£${(parseFloat(item.price) * item.quantity).toFixed(2)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td colspan="3"><strong>Total</strong></td>
                                    <td><strong>£${parseFloat(order.total).toFixed(2)}</strong></td>
                                </tr>
                            </tfoot>
                        </table>
                    </body>
                </html>
            `);
            printWindow.document.close();
            printWindow.print();
        }

        renderOrders();
    }

    // Users Management with improved functionality
    function initializeUsers() {
        const userForm = document.createElement('form');
        userForm.className = 'management-form';
        userForm.innerHTML = `
            <input type="text" name="name" placeholder="User Name" required>
            <input type="email" name="email" placeholder="Email" required>
            <select name="role" required>
                <option value="user">User</option>
                <option value="admin">Admin</option>
            </select>
            <button type="submit" class="admin-btn">Add User</button>
        `;

        document.querySelector('#users').insertBefore(userForm, document.querySelector('.users-table'));

        userForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const formData = new FormData(this);
            const userData = {
                id: Date.now(),
                name: formData.get('name'),
                email: formData.get('email'),
                role: formData.get('role')
            };

            store.users.push(userData);
            localStorage.setItem('users', JSON.stringify(store.users));
            renderUsers();
            this.reset();
            showNotification('User added successfully', 'success');
        });

        renderUsers();
    }

    // Settings Management with save functionality
    function initializeSettings() {
        const settingsForm = document.getElementById('settingsForm');
        if (!settingsForm) return;

        // Load existing settings
        const settings = JSON.parse(localStorage.getItem('adminSettings')) || {
            siteName: 'Bike Yard',
            contactEmail: 'contact@bikeyard.com',
            currency: 'EGP',
            shippingFee: 0
        };

        // Populate form with existing settings
        Object.keys(settings).forEach(key => {
            const input = settingsForm.querySelector(`[name="${key}"]`);
            if (input) input.value = settings[key];
        });

        settingsForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const formData = new FormData(this);
            const newSettings = Object.fromEntries(formData);
            
            // Validate shipping fee
            newSettings.shippingFee = Math.max(0, parseFloat(newSettings.shippingFee) || 0);
            
            localStorage.setItem('adminSettings', JSON.stringify(newSettings));
            showNotification('Settings saved successfully', 'success');
            
            // Update shipping fee across the site
            window.dispatchEvent(new CustomEvent('shippingFeeUpdated', {
                detail: { shippingFee: newSettings.shippingFee }
            }));
        });
    }

    // Add Database Management
    class DatabaseManager {
        constructor() {
            this.syncInterval = 5000; // 5 seconds
            this.initSync();
        }

        async initSync() {
            await this.loadAdminData();
            this.startAutoSync();
        }

        async loadAdminData() {
            try {
                const response = await fetch('./data/admin-db.json');
                const adminData = await response.json();
                localStorage.setItem('adminSettings', JSON.stringify(adminData.settings));
                this.updateDashboardStats(adminData.stats);
            } catch (error) {
                console.error('Error loading admin data:', error);
            }
        }

        startAutoSync() {
            setInterval(() => this.syncData(), this.syncInterval);
        }

        async syncData() {
            try {
                // Sync products
                const products = JSON.parse(localStorage.getItem('products')) || [];
                
                // Sync orders
                const orders = JSON.parse(localStorage.getItem('orders')) || [];
                
                // Update stats
                const stats = {
                    totalOrders: orders.length,
                    totalRevenue: orders.reduce((sum, order) => sum + parseFloat(order.total.replace(/[^0-9.-]+/g,"")), 0),
                    totalUsers: parseInt(localStorage.getItem('totalUsers') || '0'),
                    totalProducts: products.length
                };

                // Update dashboard
                this.updateDashboardStats(stats);
                
                // Save to localStorage
                localStorage.setItem('adminStats', JSON.stringify(stats));
            } catch (error) {
                console.error('Error syncing data:', error);
            }
        }

        updateDashboardStats(stats) {
            const statNumbers = document.querySelectorAll('.stat-number');
            if (statNumbers.length >= 4) {
                statNumbers[0].textContent = stats.totalOrders;
                statNumbers[1].textContent = stats.totalUsers;
                statNumbers[2].textContent = stats.totalProducts;
                statNumbers[3].textContent = `£${stats.totalRevenue.toFixed(2)}`;
            }
        }
    }

    // Initialize database manager
    const dbManager = new DatabaseManager();

    // Initialize all components
    initializeNavigation();
    initializeProducts();
    initializeOrders();
    initializeUsers();
    initializeSettings();
});
