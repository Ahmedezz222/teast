class CategoryManager {
    static categories = [];
    static observers = new Set();

    static init() {
        this.loadCategories();
        this.setupEventListeners();
    }

    static loadCategories() {
        try {
            const storedCategories = JSON.parse(localStorage.getItem('categories')) || [];
            if (storedCategories.length === 0) {
                const defaultCategories = [
                    { id: 'cat_1', name: 'Mountain Bikes', value: 'mountain-bikes', icon: 'fas fa-mountain', productCount: 0, description: 'Off-road bikes for rough terrain' },
                    { id: 'cat_2', name: 'Road Bikes', value: 'road-bikes', icon: 'fas fa-road', productCount: 0, description: 'High-speed bikes for paved roads' },
                    { id: 'cat_3', name: 'BMX Bikes', value: 'bmx-bikes', icon: 'fas fa-bicycle', productCount: 0, description: 'Stunt and race bikes' },
                    { id: 'cat_4', name: 'Electric Bikes', value: 'electric-bikes', icon: 'fas fa-bolt', productCount: 0, description: 'Power-assisted bicycles' },
                    { id: 'cat_5', name: 'Accessories', value: 'accessories', icon: 'fas fa-cog', productCount: 0, description: 'Bike parts and accessories' }
                ];
                localStorage.setItem('categories', JSON.stringify(defaultCategories));
                this.categories = defaultCategories;
            } else {
                this.categories = storedCategories;
            }
            this.notifyObservers();
        } catch (error) {
            console.error('Error loading categories:', error);
            this.categories = [];
        }
    }

    static validateCategory(categoryData) {
        if (!categoryData.name || categoryData.name.trim().length < 3) {
            throw new Error('Category name must be at least 3 characters long');
        }

        if (!categoryData.icon) {
            throw new Error('Category icon is required');
        }

        if (this.categories.some(cat => 
            cat.name.toLowerCase() === categoryData.name.toLowerCase() &&
            (!categoryData.id || cat.id !== categoryData.id)
        )) {
            throw new Error('Category with this name already exists');
        }

        return true;
    }

    static setupEventListeners() {
        // Listen for storage events for cross-tab synchronization
        window.addEventListener('storage', (e) => {
            if (e.key === 'categories') {
                this.categories = JSON.parse(e.newValue || '[]');
                this.notifyObservers();
            }
        });
    }

    static addCategory(categoryData) {
        try {
            this.validateCategory(categoryData);

            const newCategory = {
                id: `cat_${Date.now()}`,
                productCount: 0,
                value: categoryData.name.toLowerCase().replace(/\s+/g, '-'),
                ...categoryData
            };

            this.categories.push(newCategory);
            this.saveCategories();
            return newCategory;
        } catch (error) {
            throw error;
        }
    }

    static updateCategory(categoryId, updateData) {
        try {
            const index = this.categories.findIndex(cat => cat.id === categoryId);
            if (index === -1) throw new Error('Category not found');

            const updatedCategory = {
                ...this.categories[index],
                ...updateData,
                value: updateData.name ? 
                    updateData.name.toLowerCase().replace(/\s+/g, '-') : 
                    this.categories[index].value
            };

            this.validateCategory(updatedCategory);
            this.categories[index] = updatedCategory;
            this.saveCategories();
            return updatedCategory;
        } catch (error) {
            throw error;
        }
    }

    static deleteCategory(categoryId) {
        try {
            const index = this.categories.findIndex(cat => cat.id === categoryId);
            if (index === -1) throw new Error('Category not found');

            // Check if category has products
            if (this.categories[index].productCount > 0) {
                throw new Error('Cannot delete category with existing products');
            }

            this.categories.splice(index, 1);
            this.saveCategories();
        } catch (error) {
            throw error;
        }
    }

    static saveCategories() {
        localStorage.setItem('categories', JSON.stringify(this.categories));
        this.notifyObservers();
    }

    static updateProductCount(categoryId, change) {
        const category = this.categories.find(cat => cat.id === categoryId);
        if (category) {
            category.productCount = Math.max(0, category.productCount + change);
            this.saveCategories();
        }
    }

    static getAllCategories() {
        return [...this.categories];
    }

    static getCategoryById(categoryId) {
        return this.categories.find(cat => cat.id === categoryId);
    }

    static addObserver(callback) {
        this.observers.add(callback);
    }

    static removeObserver(callback) {
        this.observers.delete(callback);
    }

    static notifyObservers() {
        this.observers.forEach(callback => callback(this.categories));
    }

    static populateCategorySelects() {
        const selects = document.querySelectorAll('select[data-category-select], #productCategory, #category-filter');
        
        selects.forEach(select => {
            const currentValue = select.value;
            
            // Keep the first option if it's a placeholder
            const firstOption = select.options[0];
            select.innerHTML = '';
            if (firstOption && firstOption.disabled) {
                select.appendChild(firstOption);
            }

            // Add categories
            this.categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.id;  // Use category ID as value
                option.textContent = category.name;
                option.dataset.icon = category.icon;
                select.appendChild(option);
            });

            // Restore previous value if valid
            if (currentValue && this.categories.some(cat => cat.id === currentValue)) {
                select.value = currentValue;
            }

            // Trigger change event to update any dependent UI
            select.dispatchEvent(new Event('change'));
        });
    }

    static initializePublicView(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const renderCategories = () => {
            container.innerHTML = this.categories.map(category => `
                <div class="category-card">
                    <i class="${category.icon}"></i>
                    <h3>${category.name}</h3>
                    <p>${category.description || ''}</p>
                    <span class="product-count">${category.productCount} products</span>
                </div>
            `).join('');
        };

        // Initial render
        renderCategories();

        // Add observer for updates
        this.addObserver(renderCategories);
    }
}

// Handle global availability
if (typeof window !== 'undefined') {
    window.CategoryManager = CategoryManager;
}

// Handle module exports
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CategoryManager;
}
