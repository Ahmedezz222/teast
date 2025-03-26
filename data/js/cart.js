class CartManager {
    constructor() {
        this.cart = JSON.parse(localStorage.getItem('cart')) || [];
        this.updateCartDisplay();
    }

    addToCart(product, quantity = 1) {
        if (!product || !product.id) {
            console.error('Invalid product data');
            return false;
        }

        const existingItem = this.cart.find(item => item.id === product.id);
        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            // Ensure product has all required properties
            this.cart.push({
                id: product.id,
                name: product.name || 'Unknown Product',
                price: parseFloat(product.price) || 0,
                image: product.image || 'default-image.jpg',
                quantity: Math.max(1, parseInt(quantity) || 1)
            });
        }
        
        this.saveCart();
        this.updateCartDisplay();
        this.showMiniCart();
        return true;
    }

    removeFromCart(productId) {
        if (!productId) return;
        
        const item = this.cart.find(item => item.id === productId);
        if (!item) return;

        const confirmDelete = confirm(`Are you sure you want to remove "${item.name}" from cart?`);
        if (confirmDelete) {
            // Remove item from cart array
            this.cart = this.cart.filter(item => item.id !== productId);
            
            // Remove item row from DOM with animation
            const itemRow = document.querySelector(`tr[data-product-id="${productId}"]`);
            if (itemRow) {
                itemRow.classList.add('removing');
                setTimeout(() => {
                    itemRow.remove();
                    this.saveCart();
                    this.updateCartDisplay();
                    showOrderNotification(`"${item.name}" removed from cart`, 'success');
                }, 300);
            } else {
                this.saveCart();
                this.updateCartDisplay();
            }

            // Show empty cart message if last item
            if (this.cart.length === 0) {
                const cartContent = document.getElementById('cart-content');
                const cartHasItems = document.querySelector('.cart-has-items');
                const cartEmpty = document.querySelector('.cart-empty');
                
                if (cartHasItems) cartHasItems.style.display = 'none';
                if (cartEmpty) cartEmpty.style.display = 'block';
            }
        }
    }

    updateQuantity(productId, newQuantity) {
        if (!productId) return;

        // Validate quantity
        newQuantity = parseInt(newQuantity);
        if (isNaN(newQuantity) || newQuantity < 1) {
            newQuantity = 1;
        } else if (newQuantity > 99) {
            newQuantity = 99;
        }

        const item = this.cart.find(item => item.id === productId);
        if (item) {
            const oldQuantity = item.quantity;
            item.quantity = newQuantity;
            
            // Update the input field value if it exists
            const quantityInput = document.querySelector(`input[data-product-id="${productId}"]`);
            if (quantityInput) {
                quantityInput.value = newQuantity;
            }
            
            this.saveCart();
            this.updateCartDisplay();
            
            // Show notification only if quantity actually changed
            if (oldQuantity !== newQuantity) {
                showOrderNotification('Cart quantity updated', 'success');
            }
        }
    }

    getTotal() {
        return this.cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    }

    saveCart() {
        localStorage.setItem('cart', JSON.stringify(this.cart));
        localStorage.setItem('cartCount', this.cart.reduce((total, item) => total + item.quantity, 0));
    }

    updateCartDisplay() {
        const cartCount = document.getElementById('cart-count');
        if (cartCount) {
            cartCount.textContent = this.cart.reduce((total, item) => total + item.quantity, 0);
        }
        this.renderCartItems();
    }

    clearCart() {
        this.cart = [];
        this.saveCart();
        this.updateCartDisplay();
    }

    showMiniCart() {
        // Create mini cart preview if it doesn't exist
        let miniCart = document.getElementById('mini-cart-preview');
        if (!miniCart) {
            miniCart = document.createElement('div');
            miniCart.id = 'mini-cart-preview';
            miniCart.className = 'mini-cart-preview';
            document.body.appendChild(miniCart);
        }

        // Update mini cart content
        miniCart.innerHTML = `
            <div class="mini-cart-header">
                <h3>Cart Updated</h3>
                <span class="close-mini-cart">&times;</span>
            </div>
            <div class="mini-cart-items">
                ${this.cart.map(item => `
                    <div class="mini-cart-item">
                        <img src="${item.image}" alt="${item.name}">
                        <div class="mini-cart-item-details">
                            <h4>${item.name}</h4>
                            <p>Quantity: ${item.quantity}</p>
                            <p>£${(item.price * item.quantity).toFixed(2)}</p>
                        </div>
                    </div>
                `).join('')}
            </div>
            <div class="mini-cart-footer">
                <p>Total: £${this.getTotal().toFixed(2)}</p>
                <a href="bikeyardcart.html" class="view-cart-btn">View Cart</a>
            </div>
        `;

        // Show mini cart
        miniCart.classList.add('show');

        // Add close button functionality
        miniCart.querySelector('.close-mini-cart').onclick = () => {
            miniCart.classList.remove('show');
        };

        // Auto hide after 5 seconds
        setTimeout(() => {
            miniCart.classList.remove('show');
        }, 5000);

        // Auto navigate to cart page after short delay
        if (window.location.pathname.includes('products.html')) {
            setTimeout(() => {
                window.location.href = 'bikeyardcart.html';
            }, 1000);
        }
    }

    renderCartItems() {
        const cartItemsContainer = document.getElementById('cart-items');
        const cartContent = document.getElementById('cart-content');
        const cartHasItems = document.querySelector('.cart-has-items');
        const orderSubtotal = document.getElementById('order-subtotal');
        
        if (!cartItemsContainer) return;

        if (this.cart.length === 0) {
            if (cartContent) {
                cartContent.innerHTML = `
                    <div class="empty-cart-message">
                        <i class="fas fa-shopping-cart"></i>
                        <p>Your cart is empty</p>
                        <a href="products.html" class="btn-primary">Continue Shopping</a>
                    </div>
                `;
            }
            cartHasItems?.classList.add('hidden');
            return;
        }

        cartItemsContainer.innerHTML = this.cart.map(item => `
            <tr class="cart-row" data-product-id="${item.id}">
                <td data-label="Product">
                    <div class="cart-item">
                        <img src="${item.image}" alt="${item.name}" class="product-image">
                        <div class="item-details">
                            <h4>${item.name}</h4>
                            <p class="item-price">£${Number(item.price).toFixed(2)}</p>
                        </div>
                    </div>
                </td>
                <td data-label="Quantity">
                    <div class="quantity-controls">
                        <button type="button" class="quantity-btn minus" 
                            onclick="cartManager.updateQuantity('${item.id}', ${item.quantity - 1})">
                            <i class="fas fa-minus"></i>
                        </button>
                        <input type="number" 
                            class="quantity-input" 
                            value="${item.quantity}" 
                            min="1" 
                            max="99"
                            data-product-id="${item.id}"
                            onchange="cartManager.updateQuantity('${item.id}', this.value)"
                            onclick="this.select()"
                        >
                        <button type="button" class="quantity-btn plus" 
                            onclick="cartManager.updateQuantity('${item.id}', ${item.quantity + 1})">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                </td>
                <td data-label="Action">
                    <button type="button" 
                            class="remove-btn" 
                            onclick="cartManager.removeFromCart('${item.id}')"
                            title="Remove ${item.name} from cart">
                        <i class="fas fa-trash-alt"></i>
                        <span class="remove-text">Remove</span>
                    </button>
                </td>
                <td data-label="Price" class="price-cell">£${Number(item.price).toFixed(2)}</td>
                <td data-label="Total" class="total-cell">£${(Number(item.price) * item.quantity).toFixed(2)}</td>
            </tr>
        `).join('');

        cartHasItems?.classList.remove('hidden');
        
        if (orderSubtotal) {
            orderSubtotal.textContent = `$${this.getTotal().toFixed(2)}`;
        }

        // Update cart count in header
        const cartCount = document.getElementById('cart-count');
        if (cartCount) {
            cartCount.textContent = this.cart.reduce((total, item) => total + item.quantity, 0);
        }
    }
}

window.cartManager = new CartManager();

function showOrderNotification(message, type = 'success') {
    // Remove existing notifications
    const existing = document.querySelector('.order-notification');
    if (existing) {
        existing.remove();
    }

    // Create new notification
    const notification = document.createElement('div');
    notification.className = `order-notification ${type}`;
    notification.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
        <span>${message}</span>
    `;

    document.body.appendChild(notification);
    
    // Trigger animation
    setTimeout(() => notification.classList.add('show'), 10);

    // Remove notification after delay
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

document.getElementById('orderForm').addEventListener('submit', function(event) {
    event.preventDefault();
    
    // Get the order details
    const cartItems = document.getElementById('cart-items');
    if (!cartItems || cartItems.children.length === 0) {
        alert('Your cart is empty!');
        return;
    }

    // Show loading state
    const submitBtn = event.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Processing...';

    // Format cart items
    const items = Array.from(cartItems.getElementsByTagName('tr'))
        .map(row => {
            const cells = row.getElementsByTagName('td');
            return {
                product: cells[0].textContent.trim(),
                quantity: parseInt(cells[1].textContent.trim()),
                price: cells[3].textContent.trim(),
                total: cells[4].textContent.trim()
            };
        });

    // Create order object
    const order = {
        id: 'ORD' + Date.now(),
        date: new Date().toISOString(),
        customer: document.getElementById('name').value,
        email: document.getElementById('email').value,
        phone: document.getElementById('phone').value,
        address: document.getElementById('address').value,
        payment: document.getElementById('payment').value,
        notes: document.getElementById('notes').value || 'No notes provided',
        items: items,
        total: document.getElementById('order-subtotal').textContent,
        status: 'pending'
    };

    // Save order to localStorage
    try {
        const orders = JSON.parse(localStorage.getItem('orders') || '[]');
        orders.push(order);
        localStorage.setItem('orders', JSON.stringify(orders));

        const templateParams = {
            order_id: order.id,
            date: new Date().toLocaleDateString(),
            name: document.getElementById('name').value,
            email: document.getElementById('email').value,
            phone: document.getElementById('phone').value,
            address: document.getElementById('address').value,
            payment: document.getElementById('payment').value,
            notes: document.getElementById('notes').value || 'No notes provided',
            order_items: items.map(item => `${item.product} x${item.quantity} (${item.price}) = ${item.total}`).join('\n'),
            total: document.getElementById('order-subtotal').textContent,
            to_name: document.getElementById('name').value,
            to_email: document.getElementById('email').value,
            from_name: 'Bike Yard Shop',
            shop_email: 'bikeyard.egy@gmail.com' // Replace with your shop's email
        };


        emailjs.send(
            'service_qnsvf0k', // Replace with your EmailJS service ID
            'template_gsefiem', // Replace with your EmailJS template ID
            templateParams
        )
        .then(function() {
            showOrderNotification('Order placed successfully! We will contact you soon.', 'success');
            
            // Clear cart
            localStorage.removeItem('cart');
            cartItems.innerHTML = '';
            document.getElementById('cart-count').textContent = '0';
            document.getElementById('order-subtotal').textContent = '0 EGP';
            
            // Reset form
            event.target.reset();
            
            // Update UI
            document.querySelector('.cart-has-items').style.display = 'none';
            document.querySelector('.cart-empty').style.display = 'block';
            
            // Reset button
            submitBtn.disabled = false;
            submitBtn.textContent = 'Confirm Order';
        })
        .catch(function(error) {
            console.error('Failed to send order:', error);
            showOrderNotification('Failed to place order. Please try again.', 'error');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Confirm Order';
        });

        alert('Order placed successfully! Your order ID is: ' + order.id);
    } catch (error) {
        console.error('Error saving order:', error);
        alert('Failed to place order. Please try again.');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Confirm Order';
    }
});

// Add CSS styles for mini cart
const styles = `
    .mini-cart-preview {
        position: fixed;
        top: 20px;
        right: -400px;
        width: 350px;
        background: white;
        box-shadow: 0 0 10px rgba(0,0,0,0.1);
        border-radius: 8px;
        z-index: 1000;
        transition: right 0.3s ease;
    }
    
    .mini-cart-preview.show {
        right: 20px;
    }
    
    .mini-cart-header {
        padding: 15px;
        border-bottom: 1px solid #eee;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    
    .mini-cart-items {
        max-height: 300px;
        overflow-y: auto;
        padding: 15px;
    }
    
    .mini-cart-item {
        display: flex;
        gap: 10px;
        margin-bottom: 10px;
        padding-bottom: 10px;
        border-bottom: 1px solid #eee;
    }
    
    .mini-cart-item img {
        width: 60px;
        height: 60px;
        object-fit: cover;
        border-radius: 4px;
    }
    
    .mini-cart-footer {
        padding: 15px;
        border-top: 1px solid #eee;
    }
    
    .view-cart-btn {
        display: block;
        text-align: center;
        background: #2c3e50;
        color: white;
        padding: 10px;
        border-radius: 4px;
        text-decoration: none;
        margin-top: 10px;
    }
`;

// Add these styles to your existing styles
const additionalStyles = `
    .cart-row {
        transition: all 0.3s ease;
    }
    
    .cart-row.removing {
        opacity: 0;
        transform: translateX(-20px);
    }

    .remove-btn {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        background: #dc3545;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .remove-btn:hover {
        background: #c82333;
        transform: scale(1.05);
    }

    .remove-btn i {
        font-size: 16px;
    }

    .remove-text {
        display: inline-block;
        @media (max-width: 768px) {
            display: none;
        }
    }
`;

// Add the new styles to the document
const styleSheet = document.createElement('style');
styleSheet.textContent = styles + additionalStyles;
document.head.appendChild(styleSheet);


