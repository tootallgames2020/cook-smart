import AsyncStorage from '@react-native-async-storage/async-storage';
import {API_BASE_URL} from '../config/api';

const API_URL = `${API_BASE_URL}/api/v1`;

/**
 * Service for social features and community interactions
 * Handles following, comments, likes, shares, and community feed
 */
class SocialService {
  private async getAuthHeader() {
    const token = await AsyncStorage.getItem('userToken');
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
  }

  /**
   * Follow a user
   * Adds user to your following list
   * 
   * @param userId - ID of user to follow
   * @returns Promise with operation result
   * 
   * @example
   * ```typescript
   * const result = await socialService.followUser(123);
   * console.log('Now following user');
   * ```
   */
  async followUser(userId: number) {
    const response = await fetch(`${API_URL}/social/follow/${userId}`, {
      method: 'POST',
      headers: await this.getAuthHeader(),
    });
    return response.json();
  }

  /**
   * Unfollow a user
   * Removes user from your following list
   * 
   * @param userId - ID of user to unfollow
   * @returns Promise with operation result
   * 
   * @example
   * ```typescript
   * await socialService.unfollowUser(123);
   * console.log('Unfollowed user');
   * ```
   */
  async unfollowUser(userId: number) {
    const response = await fetch(`${API_URL}/social/follow/${userId}`, {
      method: 'DELETE',
      headers: await this.getAuthHeader(),
    });
    return response.json();
  }

  /**
   * Get a user's followers
   * Returns list of users following the specified user
   * 
   * @param userId - ID of user to get followers for
   * @returns Promise with array of follower users
   * 
   * @example
   * ```typescript
   * const followers = await socialService.getFollowers(123);
   * console.log(`${followers.length} followers`);
   * ```
   */
  async getFollowers(userId: number) {
    const response = await fetch(`${API_URL}/social/followers/${userId}`, {
      headers: await this.getAuthHeader(),
    });
    return response.json();
  }

  /**
   * Get users that a user is following
   * Returns list of users the specified user follows
   * 
   * @param userId - ID of user to get following list for
   * @returns Promise with array of followed users
   * 
   * @example
   * ```typescript
   * const following = await socialService.getFollowing(123);
   * console.log(`Following ${following.length} users`);
   * ```
   */
  async getFollowing(userId: number) {
    const response = await fetch(`${API_URL}/social/following/${userId}`, {
      headers: await this.getAuthHeader(),
    });
    return response.json();
  }

  /**
   * Check if you are following a user
   * Returns follow status for the specified user
   * 
   * @param userId - ID of user to check
   * @returns Promise with follow status
   * 
   * @example
   * ```typescript
   * const status = await socialService.isFollowing(123);
   * if (status.isFollowing) {
   *   console.log('You follow this user');
   * }
   * ```
   */
  async isFollowing(userId: number) {
    const response = await fetch(`${API_URL}/social/is-following/${userId}`, {
      headers: await this.getAuthHeader(),
    });
    return response.json();
  }

  /**
   * Add a comment to a recipe
   * Posts a comment or reply to a recipe
   * 
   * @param recipeId - ID of recipe to comment on
   * @param comment - Comment text
   * @param parentId - Optional parent comment ID for replies
   * @returns Promise with created comment
   * 
   * @example
   * ```typescript
   * // Add top-level comment
   * const comment = await socialService.addComment('recipe_123', 'Great recipe!');
   * 
   * // Add reply to comment
   * const reply = await socialService.addComment('recipe_123', 'Thanks!', comment.id);
   * ```
   */
  async addComment(recipeId: string, comment: string, parentId?: number) {
    const response = await fetch(`${API_URL}/social/comments/${recipeId}`, {
      method: 'POST',
      headers: await this.getAuthHeader(),
      body: JSON.stringify({comment, parentId}),
    });
    return response.json();
  }

  /**
   * Get comments for a recipe
   * Returns all comments and replies for a recipe
   * 
   * @param recipeId - ID of recipe to get comments for
   * @returns Promise with array of comments
   * 
   * @example
   * ```typescript
   * const comments = await socialService.getComments('recipe_123');
   * comments.forEach(comment => {
   *   console.log(`${comment.user}: ${comment.text}`);
   * });
   * ```
   */
  async getComments(recipeId: string) {
    const response = await fetch(`${API_URL}/social/comments/${recipeId}`);
    return response.json();
  }

  /**
   * Delete a comment
   * Removes a comment you posted
   * 
   * @param commentId - ID of comment to delete
   * @returns Promise with operation result
   * 
   * @example
   * ```typescript
   * await socialService.deleteComment(456);
   * console.log('Comment deleted');
   * ```
   */
  async deleteComment(commentId: number) {
    const response = await fetch(`${API_URL}/social/comments/${commentId}`, {
      method: 'DELETE',
      headers: await this.getAuthHeader(),
    });
    return response.json();
  }

  /**
   * Like a recipe
   * Adds recipe to your liked recipes
   * 
   * @param recipeId - ID of recipe to like
   * @returns Promise with operation result
   * 
   * @example
   * ```typescript
   * await socialService.likeRecipe('recipe_123');
   * console.log('Recipe liked');
   * ```
   */
  async likeRecipe(recipeId: string) {
    const response = await fetch(`${API_URL}/social/likes/${recipeId}`, {
      method: 'POST',
      headers: await this.getAuthHeader(),
    });
    return response.json();
  }

  /**
   * Unlike a recipe
   * Removes recipe from your liked recipes
   * 
   * @param recipeId - ID of recipe to unlike
   * @returns Promise with operation result
   * 
   * @example
   * ```typescript
   * await socialService.unlikeRecipe('recipe_123');
   * console.log('Recipe unliked');
   * ```
   */
  async unlikeRecipe(recipeId: string) {
    const response = await fetch(`${API_URL}/social/likes/${recipeId}`, {
      method: 'DELETE',
      headers: await this.getAuthHeader(),
    });
    return response.json();
  }

  /**
   * Get like status for a recipe
   * Checks if you have liked a recipe
   * 
   * @param recipeId - ID of recipe to check
   * @returns Promise with like status
   * 
   * @example
   * ```typescript
   * const status = await socialService.getLikeStatus('recipe_123');
   * if (status.isLiked) {
   *   console.log('You like this recipe');
   * }
   * ```
   */
  async getLikeStatus(recipeId: string) {
    const response = await fetch(`${API_URL}/social/likes/${recipeId}`, {
      headers: await this.getAuthHeader(),
    });
    return response.json();
  }

  /**
   * Share a recipe to a platform
   * Records recipe share and returns share URL
   * 
   * @param recipeId - ID of recipe to share
   * @param platform - Platform to share to (e.g., 'facebook', 'twitter', 'whatsapp')
   * @returns Promise with share result
   * 
   * @example
   * ```typescript
   * const result = await socialService.shareRecipe('recipe_123', 'facebook');
   * console.log('Share URL:', result.shareUrl);
   * ```
   */
  async shareRecipe(recipeId: string, platform: string) {
    const response = await fetch(`${API_URL}/social/shares/${recipeId}`, {
      method: 'POST',
      headers: await this.getAuthHeader(),
      body: JSON.stringify({platform}),
    });
    return response.json();
  }

  /**
   * Get community feed
   * Returns recent activity from users you follow
   * 
   * @param limit - Maximum number of items to return (default: 50)
   * @returns Promise with array of feed items
   * 
   * @example
   * ```typescript
   * const feed = await socialService.getCommunityFeed(20);
   * feed.forEach(item => {
   *   console.log(`${item.user} ${item.action} ${item.recipe}`);
   * });
   * ```
   */
  async getCommunityFeed(limit = 50) {
    const response = await fetch(`${API_URL}/social/feed?limit=${limit}`, {
      headers: await this.getAuthHeader(),
    });
    return response.json();
  }

  /**
   * Get trending recipes
   * Returns popular recipes based on community activity
   * 
   * @param limit - Maximum number of recipes to return (default: 20)
   * @returns Promise with array of trending recipes
   * 
   * @example
   * ```typescript
   * const trending = await socialService.getTrendingRecipes(10);
   * trending.recipes.forEach(recipe => {
   *   console.log(`${recipe.title}: ${recipe.likes} likes`);
   * });
   * ```
   */
  async getTrendingRecipes(limit = 20) {
    const response = await fetch(`${API_URL}/trending-recipes?limit=${limit}`);
    const data = await response.json();

    // Map recipe_image to image for consistency
    if (data.recipes) {
      data.recipes = data.recipes.map((recipe: any) => ({
        ...recipe,
        image: recipe.recipe_image || recipe.image_url || recipe.image || '',
        title: recipe.recipe_name || recipe.title || 'Untitled Recipe',
        id: recipe.recipe_id || recipe.id,
      }));
    }

    return data;
  }
}

export default new SocialService();
