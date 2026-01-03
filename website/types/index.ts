// User Types
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin' | 'super_admin';
  isActive: boolean;
  isAdmin?: boolean;
  suspended?: boolean;
  createdAt: Date;
  lastLoginAt: Date;
}

// Recipe Types
export interface Recipe {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  ingredients: Ingredient[];
  instructions: string[];
  cookingTime: number;
  servings: number;
  nutritionalInfo: NutritionalInfo;
  author: User;
  isFeatured: boolean;
  isFlagged: boolean;
  status: 'draft' | 'published' | 'archived';
  createdAt: Date;
  updatedAt: Date;
}

export interface Ingredient {
  name: string;
  amount: string;
  unit: string;
}

export interface NutritionalInfo {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

export interface RecipeFilters {
  search?: string;
  category?: string;
  dietaryPreferences?: string[];
  ingredients?: string[];
}

// Blog Types
export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  featuredImage: string;
  author: string;
  categories: string[];
  tags: string[];
  publishedAt: Date;
  isPublished: boolean;
  seoMetadata: SEOMetadata;
}

export interface SEOMetadata {
  title: string;
  description: string;
  keywords: string[];
  ogImage: string;
}

// Admin Types
export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'super_admin';
  permissions: Permission[];
  isActive: boolean;
  createdAt: Date;
  lastLoginAt: Date;
}

export type Permission =
  | 'user_management'
  | 'content_moderation'
  | 'recipe_management'
  | 'analytics_view'
  | 'system_settings'
  | 'admin_management'
  | 'notification_send'
  | 'financial_view'
  | 'support_manage';

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
