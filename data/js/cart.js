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