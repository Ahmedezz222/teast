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

        // Initialize products from localStorage or empty array
        const storedProducts = JSON.parse(localStorage.getItem('products')) || [];
        const store = {
            products: storedProducts
        };

        productForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const formData = new FormData(productForm);
            
            // Create file reader for image
            const imageFile = formData.get('image');
            const reader = new FileReader();
            
            reader.onload = function(e) {
                const newProduct = {
                    id: Date.now(),
                    name: formData.get('productName'),
                    price: parseFloat(formData.get('price')),
                    category: formData.get('category'),
                    description: formData.get('description'),
                    image: e.target.result, // Base64 image
                    stock: parseInt(formData.get('stock')) || 10 // Default stock value
                };
                
                store.products.push(newProduct);
                localStorage.setItem('products', JSON.stringify(store.products));
                renderProducts();
                productForm.reset();
            };

            if (imageFile) {
                reader.readAsDataURL(imageFile);
            } else {
                // Use default image if none provided
                const newProduct = {
                    id: Date.now(),
                    name: formData.get('productName'),
                    price: parseFloat(formData.get('price')),
                    category: formData.get('category'),
                    description: formData.get('description'),
                    image: 'data/css/img/default-product.jpg',
                    stock: parseInt(formData.get('stock')) || 10
                };
                
                store.products.push(newProduct);
                localStorage.setItem('products', JSON.stringify(store.products));
                renderProducts();
                productForm.reset();
            }
        });

        // Add stock update functionality
        function updateProductStock(productId, newStock) {
            const products = JSON.parse(localStorage.getItem('products')) || [];
            const productIndex = products.findIndex(p => p.id === productId);
            
            if (productIndex !== -1) {
                products[productIndex].stock = parseInt(newStock);
                localStorage.setItem('products', JSON.stringify(products));
                renderProducts();
            }
        }

        function renderProducts() {
            renderTable(store.products, '.products-table tbody', product => `
                <tr>
                    <td>${product.name}</td>
                    <td>£${product.price.toFixed(2)}</td>
                    <td>${product.category}</td>
                    <td>
                        <button class="action-btn edit" data-id="${product.id}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete" data-id="${product.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `);
            attachProductListeners();
        }

        // Update delete handler to sync with localStorage
        function attachProductListeners() {
            document.querySelectorAll('.products-table .delete').forEach(btn => {
                btn.addEventListener('click', function() {
                    const id = parseInt(this.dataset.id);
                    store.products = store.products.filter(p => p.id !== id);
                    localStorage.setItem('products', JSON.stringify(store.products));
                    renderProducts();
                });
            });

            document.querySelectorAll('.products-table .edit').forEach(btn => {
                btn.addEventListener('click', function() {
                    const id = parseInt(this.dataset.id);
                    const product = store.products.find(p => p.id === id);
                    if (product) {
                        // TODO: Implement edit form
                        console.log('Editing product:', product);
                    }
                });
            });
        }

        renderProducts();
    }

    // Orders Management
    function initializeOrders() {
        renderTable(store.orders, '.orders-table tbody', order => `
            <tr>
                <td>#${order.id}</td>
                <td>${order.customer}</td>
                <td>${order.date}</td>
                <td>$${order.total.toFixed(2)}</td>
                <td><span class="status status-${order.status}">${order.status}</span></td>
                <td>
                    <button class="action-btn edit"><i class="fas fa-edit"></i></button>
                    <button class="action-btn delete"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `);
    }

    // Users Management
    function initializeUsers() {
        renderTable(store.users, '.users-table tbody', user => `
            <tr>
                <td>#${user.id}</td>
                <td>${user.name}</td>
                <td>${user.email}</td>
                <td>${user.role}</td>
                <td>
                    <button class="action-btn edit"><i class="fas fa-edit"></i></button>
                    <button class="action-btn delete"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `);
    }

    // Settings Management
    function initializeSettings() {
        const settingsForm = document.getElementById('settingsForm');
        if (!settingsForm) return;

        settingsForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const formData = new FormData(settingsForm);
            const settings = Object.fromEntries(formData);
            // TODO: Implement settings update
            console.log('Saving settings:', settings);
            alert('Settings saved successfully!');
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
