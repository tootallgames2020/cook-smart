import {API_BASE_URL} from '../config/api';
import {getAuthToken} from '../utils/auth';

export interface ShoppingListItem {
  id: string;
  userId: string;
  ingredient: string;
  quantity: string;
  unit: string;
  category: string;
  isCompleted: boolean;
  recipeId?: string;
  dateCreated: string;
  dateUpdated: string;
}

export interface AddShoppingListItemRequest {
  ingredient: string;
  quantity: string;
  unit: string;
  category?: string;
  recipeId?: string;
}

/**
 * Service for managing the user's shopping list
 * Handles CRUD operations for shopping list items and bulk operations
 */
class ShoppingListService {
  /**
   * Get all shopping list items for the current user
   * Returns items sorted by category and completion status
   * 
   * @returns Promise<ShoppingListItem[]> - Array of shopping list items
   * @throws Error if API request fails
   * 
   * @example
   * ```typescript
   * const items = await shoppingListService.getShoppingList();
   * const pending = items.filter(item => !item.isCompleted);
   * console.log(`You have ${pending.length} items to buy`);
   * ```
   */
  async getShoppingList(): Promise<ShoppingListItem[]> {
    try {
      const token = await getAuthToken();

      const response = await fetch(`${API_BASE_URL}/api/v1/shopping-list`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch shopping list');
      }

      return data.items || [];
    } catch (error) {
      console.error('Error fetching shopping list:', error);
      throw error;
    }
  }

  /**
   * Add a single item to the shopping list
   * 
   * @param item - The item to add
   * @param item.ingredient - Name of the ingredient
   * @param item.quantity - Amount needed
   * @param item.unit - Unit of measurement
   * @param item.category - Category for organization (optional)
   * @param item.recipeId - Associated recipe ID (optional)
   * @returns Promise<ShoppingListItem> - The created shopping list item
   * @throws Error if API request fails
   * 
   * @example
   * ```typescript
   * const item = await shoppingListService.addItem({
   *   ingredient: 'Milk',
   *   quantity: '1',
   *   unit: 'gallon',
   *   category: 'Dairy'
   * });
   * console.log('Added:', item.ingredient);
   * ```
   */
  async addItem(item: AddShoppingListItemRequest): Promise<ShoppingListItem> {
    try {
      const token = await getAuthToken();

      const response = await fetch(`${API_BASE_URL}/api/v1/shopping-list`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(item),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add item');
      }

      return data.item;
    } catch (error) {
      console.error('Error adding shopping list item:', error);
      throw error;
    }
  }

  /**
   * Add multiple items to the shopping list in a single request
   * More efficient than adding items one by one
   * 
   * @param items - Array of items to add
   * @returns Promise<ShoppingListItem[]> - Array of created shopping list items
   * @throws Error if API request fails
   * 
   * @example
   * ```typescript
   * const items = await shoppingListService.addItems([
   *   { ingredient: 'Eggs', quantity: '12', unit: 'count', category: 'Dairy' },
   *   { ingredient: 'Bread', quantity: '1', unit: 'loaf', category: 'Bakery' },
   *   { ingredient: 'Apples', quantity: '6', unit: 'count', category: 'Produce' }
   * ]);
   * console.log(`Added ${items.length} items`);
   * ```
   */
  async addItems(
    items: AddShoppingListItemRequest[],
  ): Promise<ShoppingListItem[]> {
    try {
      const token = await getAuthToken();

      const response = await fetch(
        `${API_BASE_URL}/api/v1/shopping-list/bulk`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({items}),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add items');
      }

      return data.items || [];
    } catch (error) {
      console.error('Error adding shopping list items:', error);
      throw error;
    }
  }

  /**
   * Update an existing shopping list item
   * Can modify quantity, unit, category, or ingredient name
   * 
   * @param itemId - The unique identifier of the item to update
   * @param updates - Partial item object with fields to update
   * @returns Promise<ShoppingListItem> - The updated shopping list item
   * @throws Error if API request fails
   * 
   * @example
   * ```typescript
   * const updated = await shoppingListService.updateItem('item-123', {
   *   quantity: '2',
   *   unit: 'pounds'
   * });
   * console.log('Updated:', updated.ingredient);
   * ```
   */
  async updateItem(
    itemId: string,
    updates: Partial<AddShoppingListItemRequest>,
  ): Promise<ShoppingListItem> {
    try {
      const token = await getAuthToken();

      const response = await fetch(
        `${API_BASE_URL}/api/v1/shopping-list/${itemId}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updates),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update item');
      }

      return data.item;
    } catch (error) {
      console.error('Error updating shopping list item:', error);
      throw error;
    }
  }

  /**
   * Toggle the completion status of a shopping list item
   * Marks item as completed if pending, or pending if completed
   * 
   * @param itemId - The unique identifier of the item to toggle
   * @returns Promise<ShoppingListItem> - The updated shopping list item
   * @throws Error if API request fails or item not found
   * 
   * @example
   * ```typescript
   * const item = await shoppingListService.toggleCompleted('item-123');
   * console.log(`Item is now ${item.isCompleted ? 'completed' : 'pending'}`);
   * ```
   */
  async toggleCompleted(itemId: string): Promise<ShoppingListItem> {
    try {
      if (!itemId) {
        throw new Error('Item ID is required');
      }

      const token = await getAuthToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(
        `${API_BASE_URL}/api/v1/shopping-list/${itemId}/toggle`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        console.error('Toggle failed:', response.status, data);
        throw new Error(data.error || 'Failed to toggle item');
      }

      if (!data.item) {
        console.error('No item in response:', data);
        throw new Error('Item not found in response');
      }

      return data.item;
    } catch (error) {
      console.error('Error toggling shopping list item:', error);
      throw error;
    }
  }

  /**
   * Delete a single item from the shopping list
   * 
   * @param itemId - The unique identifier of the item to delete
   * @returns Promise<void>
   * @throws Error if API request fails
   * 
   * @example
   * ```typescript
   * await shoppingListService.deleteItem('item-123');
   * console.log('Item deleted');
   * ```
   */
  async deleteItem(itemId: string): Promise<void> {
    try {
      const token = await getAuthToken();

      const response = await fetch(
        `${API_BASE_URL}/api/v1/shopping-list/${itemId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete item');
      }
    } catch (error) {
      console.error('Error deleting shopping list item:', error);
      throw error;
    }
  }

  /**
   * Remove all completed items from the shopping list
   * Useful for cleaning up after a shopping trip
   * 
   * @returns Promise<void>
   * @throws Error if API request fails
   * 
   * @example
   * ```typescript
   * await shoppingListService.clearCompleted();
   * console.log('All completed items removed');
   * ```
   */
  async clearCompleted(): Promise<void> {
    try {
      const token = await getAuthToken();
      const url = `${API_BASE_URL}/api/v1/shopping-list/clear-completed`;
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        console.error('Clear completed failed:', data);
        throw new Error(data.error || 'Failed to clear completed items');
      }

      const data = await response.json().catch(() => ({}));
    } catch (error) {
      console.error('Error clearing completed items:', error);
      throw error;
    }
  }

  /**
   * Delete all items from the shopping list
   * Removes both completed and pending items
   * 
   * @returns Promise<void>
   * @throws Error if API request fails
   * 
   * @example
   * ```typescript
   * await shoppingListService.deleteAll();
   * console.log('Shopping list cleared');
   * ```
   */
  async deleteAll(): Promise<void> {
    try {
      const token = await getAuthToken();

      const response = await fetch(
        `${API_BASE_URL}/api/v1/shopping-list/all/items`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete all items');
      }
    } catch (error) {
      console.error('Error deleting all items:', error);
      throw error;
    }
  }
  /**
   * Add all ingredients from a recipe to the shopping list
   * Automatically parses ingredient strings to extract quantities and units
   * 
   * @param recipeId - The unique identifier of the recipe
   * @param ingredients - Array of ingredient strings from the recipe
   * @param _servings - Number of servings (currently unused, default: 1)
   * @returns Promise<ShoppingListItem[]> - Array of created shopping list items
   * @throws Error if API request fails
   * 
   * @example
   * ```typescript
   * const items = await shoppingListService.addRecipeToShoppingList(
   *   12345,
   *   [
   *     '2 cups flour',
   *     '1 tablespoon olive oil',
   *     '3 eggs'
   *   ],
   *   4
   * );
   * console.log(`Added ${items.length} ingredients to shopping list`);
   * ```
   */
  async addRecipeToShoppingList(
    recipeId: number,
    ingredients: string[],
    _servings: number = 1,
  ): Promise<ShoppingListItem[]> {
    try {
      const items: AddShoppingListItemRequest[] = ingredients.map(ing => {
        // Parse ingredient string (e.g., "2 cups flour" or "1 tablespoon olive oil")
        const parts = ing.trim().split(' ');
        let quantity = '1';
        let unit = '';
        let ingredient = ing;

        if (parts.length >= 2) {
          // Try to extract quantity and unit
          const firstPart = parts[0];
          if (!isNaN(Number(firstPart)) || firstPart.match(/^\d+\/\d+$/)) {
            quantity = firstPart;
            unit = parts[1] || '';
            ingredient = parts.slice(2).join(' ') || parts.slice(1).join(' ');
          }
        }

        return {
          ingredient: ingredient || ing,
          quantity: quantity,
          unit: unit,
          category: 'Uncategorized',
          recipeId: recipeId.toString(),
        };
      });

      return await this.addItems(items);
    } catch (error) {
      console.error('Error adding recipe to shopping list:', error);
      throw error;
    }
  }
}

export const shoppingListService = new ShoppingListService();
