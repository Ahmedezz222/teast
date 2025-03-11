function trackOrder() {
    const orderNumber = document.getElementById('orderNumber').value.trim();
    const trackingResult = document.getElementById('tracking-result');
    
    if (!orderNumber) {
        showTrackingError('Please enter an order number');
        return;
    }

    // Get orders from localStorage
    const orders = JSON.parse(localStorage.getItem('orders') || '[]');
    const order = orders.find(o => o.id === orderNumber);

    if (!order) {
        showTrackingError('Order not found. Please check your order number and try again.');
        return;
    }

    // Format the tracking result
    const orderDate = new Date(order.date).toLocaleDateString();
    const statusClass = `status-${order.status?.toLowerCase() || 'pending'}`;
    
    trackingResult.innerHTML = `
        <div class="tracking-details">
            <h3>Order #${order.id}</h3>
            <p><strong>Order Date:</strong> ${orderDate}</p>
            <p><strong>Customer:</strong> ${order.customer}</p>
            
            <div class="tracking-status">
                <strong>Status:</strong> 
                <span class="status-badge ${statusClass}">
                    ${order.status || 'Pending'}
                </span>
            </div>

            <div class="order-items">
                <h4>Order Items</h4>
                <ul class="item-list">
                    ${order.items.map(item => `
                        <li>
                            <span>${item.product || item.name} × ${item.quantity}</span>
                            <span>${item.price} EGP</span>
                        </li>
                    `).join('')}
                </ul>
                <p class="total" style="text-align: right; margin-top: 10px;">
                    <strong>Total:</strong> ${order.total}
                </p>
            </div>
        </div>
    `;
    
    trackingResult.style.display = 'block';
}

function showTrackingError(message) {
    const trackingResult = document.getElementById('tracking-result');
    trackingResult.innerHTML = `
        <div class="error-message">
            <i class="fas fa-exclamation-circle"></i>
            ${message}
        </div>
    `;
    trackingResult.style.display = 'block';
}