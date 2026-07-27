'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import api from '@/lib/api';
import {
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  X,
  Loader,
  Search,
  Filter,
  Layers,
  UtensilsCrossed,
  Tag,
  AlertCircle,
  Upload,
  Image as ImageIcon,
  Download,
  FileDown,
  FileUp,
  FileJson,
  CheckCircle2
} from 'lucide-react';

// ZOD Validation Schemas
const categorySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().optional(),
});

const dishSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().optional(),
  price: z.coerce.number().min(0, 'Price must be positive'),
  taxRate: z.coerce.number().min(0, 'Tax rate must be positive'),
  preparationTime: z.coerce.number().min(1, 'Preparation time must be at least 1 minute'),
  imageUrl: z.string().url('Please enter a valid image URL').or(z.string().length(0)).optional(),
  categoryId: z.string().min(1, 'Please select a category'),
  isAvailable: z.boolean().default(true),
});

type CategorySchema = z.infer<typeof categorySchema>;
type DishSchema = z.infer<typeof dishSchema>;

interface Category {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
}

interface Dish {
  id: string;
  name: string;
  description: string | null;
  price: string;
  taxRate: string;
  isAvailable: boolean;
  preparationTime: number;
  imageUrl: string | null;
  categoryId: string;
  category: { name: string };
}

export default function MenuPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'dishes' | 'categories'>('dishes');

  // Edit / Form Dialog states
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [showDishDialog, setShowDishDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingDish, setEditingDish] = useState<Dish | null>(null);

  // Search & Filters
  const [dishSearch, setDishSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // JSON Import/Export states
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importJsonData, setImportJsonData] = useState<any | null>(null);
  const [importPreviewStats, setImportPreviewStats] = useState<{ categoryCount: number; dishCount: number } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<any | null>(null);

  // Handle Export JSON
  const handleExportJson = () => {
    const exportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      categories: categories.map((c) => ({
        name: c.name,
        description: c.description || '',
        isActive: c.isActive,
      })),
      dishes: dishes.map((d) => ({
        name: d.name,
        description: d.description || '',
        price: Number(d.price),
        taxRate: Number(d.taxRate),
        preparationTime: d.preparationTime,
        imageUrl: d.imageUrl || '',
        isAvailable: d.isAvailable,
        categoryName: d.category?.name || 'General',
      })),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kyra-pos-menu-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Handle File Selection for Import
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFile(file);
    setImportError(null);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const json = JSON.parse(text);
        if (!json || typeof json !== 'object') {
          throw new Error('Invalid JSON file structure');
        }

        let dishesList: any[] = [];
        let categoriesList: any[] = [];

        if (Array.isArray(json)) {
          dishesList = json;
        } else {
          dishesList = Array.isArray(json.dishes) ? json.dishes : [];
          categoriesList = Array.isArray(json.categories) ? json.categories : [];
        }

        if (dishesList.length === 0 && categoriesList.length === 0) {
          throw new Error('No categories or dishes found in JSON file');
        }

        setImportJsonData({ categories: categoriesList, dishes: dishesList });
        setImportPreviewStats({
          categoryCount: categoriesList.length,
          dishCount: dishesList.length,
        });
      } catch (err: any) {
        setImportError(err.message || 'Failed to parse JSON file');
        setImportJsonData(null);
        setImportPreviewStats(null);
      }
    };
    reader.readAsText(file);
  };

  // Execute Bulk Import
  const executeImport = async () => {
    if (!importJsonData) return;
    setIsImporting(true);
    setImportError(null);

    try {
      const res = await api.post('/dishes/bulk-import', importJsonData);
      setImportResult(res.data);
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['dishes'] });
    } catch (err: any) {
      setImportError(err.response?.data?.message || err.message || 'Failed to import menu JSON');
    } finally {
      setIsImporting(false);
    }
  };


  // 1. Fetch Categories and Dishes
  const { data: categories = [], isLoading: loadingCats } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => (await api.get('/categories')).data,
  });

  const { data: dishes = [], isLoading: loadingDishes } = useQuery<Dish[]>({
    queryKey: ['dishes'],
    queryFn: async () => (await api.get('/dishes')).data,
  });

  // 2. Forms Hook configuration
  const {
    register: regCat,
    handleSubmit: handleSubCat,
    reset: resetCat,
    formState: { errors: catErrors },
  } = useForm<CategorySchema>({
    resolver: zodResolver(categorySchema),
  });

  const {
    register: regDish,
    handleSubmit: handleSubDish,
    reset: resetDish,
    setValue: setDishValue,
    watch: watchDish,
    formState: { errors: dishErrors },
  } = useForm<any>({
    resolver: zodResolver(dishSchema),
  });

  const [isUploading, setIsUploading] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setIsUploading(true);
    try {
      const res = await api.post('/dishes/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setDishValue('imageUrl', res.data.url);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  // Initialize Edit state on Forms
  const startEditCategory = (cat: Category) => {
    setEditingCategory(cat);
    resetCat({
      name: cat.name,
      description: cat.description || '',
    });
    setShowCategoryDialog(true);
  };

  const startEditDish = (dish: Dish) => {
    setEditingDish(dish);
    resetDish({
      name: dish.name,
      description: dish.description || '',
      price: Number(dish.price),
      taxRate: Number(dish.taxRate),
      preparationTime: dish.preparationTime,
      imageUrl: dish.imageUrl || '',
      categoryId: dish.categoryId,
      isAvailable: dish.isAvailable,
    });
    setShowDishDialog(true);
  };

  const openAddCategory = () => {
    setEditingCategory(null);
    resetCat({ name: '', description: '' });
    setShowCategoryDialog(true);
  };

  const openAddDish = () => {
    setEditingDish(null);
    resetDish({
      name: '',
      description: '',
      price: 0,
      taxRate: 5,
      preparationTime: 15,
      imageUrl: '',
      categoryId: categories[0]?.id || '',
      isAvailable: true,
    });
    setShowDishDialog(true);
  };

  // 3. Category Mutations
  const catMutation = useMutation({
    mutationFn: async (data: CategorySchema) => {
      if (editingCategory) {
        return (await api.put(`/categories/${editingCategory.id}`, data)).data;
      }
      return (await api.post('/categories', data)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setShowCategoryDialog(false);
      resetCat();
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Operation failed');
    }
  });

  const deleteCatMutation = useMutation({
    mutationFn: async (id: string) => {
      return (await api.delete(`/categories/${id}`)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });

  const toggleCatStatusMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return (await api.put(`/categories/${id}`, { isActive })).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });

  // 4. Dish Mutations
  const dishMutation = useMutation({
    mutationFn: async (data: DishSchema) => {
      if (editingDish) {
        return (await api.put(`/dishes/${editingDish.id}`, data)).data;
      }
      return (await api.post('/dishes', data)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dishes'] });
      setShowDishDialog(false);
      resetDish();
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Operation failed');
    }
  });

  const deleteDishMutation = useMutation({
    mutationFn: async (id: string) => {
      return (await api.delete(`/dishes/${id}`)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dishes'] });
    },
  });

  const toggleDishStatusMutation = useMutation({
    mutationFn: async ({ id, isAvailable }: { id: string; isAvailable: boolean }) => {
      return (await api.put(`/dishes/${id}`, { isAvailable })).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dishes'] });
    },
  });

  // Filters Lists
  const filteredDishes = dishes.filter((dish) => {
    const matchesSearch = dish.name.toLowerCase().includes(dishSearch.toLowerCase());
    const matchesCat = !categoryFilter || dish.categoryId === categoryFilter;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="space-y-6">
      {/* View Header Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-2">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('dishes')}
            className={`pb-2.5 font-semibold text-xs border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'dishes' 
                ? 'border-primary text-primary' 
                : 'border-transparent text-slate-500 hover:text-slate-850'
            }`}
          >
            <UtensilsCrossed className="h-4 w-4" />
            Dishes Menu ({dishes.length})
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`pb-2.5 font-semibold text-xs border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'categories' 
                ? 'border-primary text-primary' 
                : 'border-transparent text-slate-500 hover:text-slate-855'
            }`}
          >
            <Layers className="h-4 w-4" />
            Categories ({categories.length})
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportJson}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/80 font-semibold text-xxs rounded-lg shadow-xxs active-press transition-colors cursor-pointer"
            title="Download full menu as JSON file"
          >
            <FileDown className="h-4 w-4 text-emerald-600" />
            <span>Export JSON</span>
          </button>

          <button
            onClick={() => {
              setImportFile(null);
              setImportJsonData(null);
              setImportPreviewStats(null);
              setImportError(null);
              setImportResult(null);
              setShowImportModal(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/80 font-semibold text-xxs rounded-lg shadow-xxs active-press transition-colors cursor-pointer"
            title="Upload and bulk import menu from JSON file"
          >
            <FileUp className="h-4 w-4 text-blue-600" />
            <span>Import JSON</span>
          </button>

          <button
            onClick={activeTab === 'dishes' ? openAddDish : openAddCategory}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary-hover text-white font-semibold text-xxs rounded-lg shadow-sm active-press transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>{activeTab === 'dishes' ? 'Create Dish' : 'Create Category'}</span>
          </button>
        </div>
      </div>

      {loadingDishes || loadingCats ? (
        <div className="flex h-64 items-center justify-center">
          <Loader className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* TAB 1: DISHES */}
          {activeTab === 'dishes' && (
            <div className="space-y-4">
              {/* Search / Filters Bar */}
              <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xxs">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search dishes..."
                    value={dishSearch}
                    onChange={(e) => setDishSearch(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-emerald-500 focus:bg-white text-slate-850"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-slate-400" />
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:border-emerald-500 text-slate-700"
                  >
                    <option value="">All Categories</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Dishes Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredDishes.map((dish) => (
                  <div key={dish.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col justify-between gap-4">
                    <div className="flex items-start gap-4">
                      {dish.imageUrl ? (
                        <img src={dish.imageUrl} alt={dish.name} className="h-16 w-16 object-cover rounded-lg bg-slate-50 shrink-0" />
                      ) : (
                        <div className="h-16 w-16 bg-slate-50 rounded-lg flex items-center justify-center shrink-0 text-slate-400 font-semibold text-xs">
                          {dish.name.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="space-y-1 min-w-0">
                        <span className="text-xxs font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/50">
                          {dish.category.name}
                        </span>
                        <h4 className="font-semibold text-xs text-slate-800 line-clamp-1 leading-tight">{dish.name}</h4>
                        <p className="text-xxs text-slate-400 line-clamp-2">{dish.description || 'No description provided'}</p>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 pt-3 flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-xxs font-semibold text-slate-400">Price (Tax Excl.)</span>
                        <span className="text-sm font-semibold text-slate-900">₹{Number(dish.price).toFixed(2)}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleDishStatusMutation.mutate({ id: dish.id, isAvailable: !dish.isAvailable })}
                          className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                            dish.isAvailable 
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                              : 'bg-rose-50 border-rose-200 text-rose-800'
                          }`}
                          title={dish.isAvailable ? 'Available - click to disable' : 'Unavailable - click to enable'}
                        >
                          {dish.isAvailable ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                        </button>
                        <button
                          onClick={() => startEditDish(dish)}
                          className="p-1.5 bg-white hover:bg-slate-50 border border-slate-250 rounded-lg text-slate-600 transition-colors cursor-pointer"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Delete "${dish.name}"?`)) {
                              deleteDishMutation.mutate(dish.id);
                            }
                          }}
                          className="p-1.5 bg-white hover:bg-rose-50 border border-destructive/20 rounded-lg text-destructive transition-colors cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: CATEGORIES */}
          {activeTab === 'categories' && (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-150">
                    <th className="px-6 py-3">Category Name</th>
                    <th className="px-6 py-3">Description</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {categories.map((cat) => (
                    <tr key={cat.id} className="hover:bg-slate-50/50 font-medium">
                      <td className="px-6 py-4 font-semibold text-slate-900">{cat.name}</td>
                      <td className="px-6 py-4 text-slate-550 max-w-xs truncate">{cat.description || '-'}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-xxs font-semibold border ${
                          cat.isActive 
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                            : 'bg-rose-50 text-rose-800 border-rose-200'
                        }`}>
                          {cat.isActive ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => toggleCatStatusMutation.mutate({ id: cat.id, isActive: !cat.isActive })}
                            className={`p-1.5 border rounded-lg transition-colors cursor-pointer ${
                              cat.isActive 
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                                : 'bg-rose-50 border-rose-200 text-rose-800'
                            }`}
                          >
                            {cat.isActive ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                          </button>
                          <button
                            onClick={() => startEditCategory(cat)}
                            className="p-1.5 bg-white hover:bg-slate-50 border border-slate-250 rounded-lg text-slate-600 transition-colors cursor-pointer"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Delete "${cat.name}"? It will disable all related dishes.`)) {
                                deleteCatMutation.mutate(cat.id);
                              }
                            }}
                            className="p-1.5 bg-white hover:bg-rose-50 border border-destructive/20 rounded-lg text-destructive transition-colors cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* 1. CREATE/EDIT CATEGORY DIALOG (Sliding side panel instead of popup) */}
      {showCategoryDialog && (
        <>
          {/* Light Backdrop Overlay */}
          <div
            className="fixed inset-0 z-40 bg-slate-900/15 backdrop-blur-xxs"
            onClick={() => setShowCategoryDialog(false)}
          />
          {/* Drawer Container */}
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white border-l border-slate-200 shadow-2xl p-6 flex flex-col space-y-6 animate-slide-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-semibold text-slate-800 text-sm">
                  {editingCategory ? 'Modify Category' : 'Create New Category'}
                </h3>
                <p className="text-xxs text-slate-400 font-medium mt-0.5">Manage menu categories for POS list grouping</p>
              </div>
              <button 
                onClick={() => setShowCategoryDialog(false)} 
                className="text-slate-400 hover:text-slate-650 p-1.5 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <form onSubmit={handleSubCat((data) => catMutation.mutate(data))} className="space-y-5 text-slate-700 flex-1 flex flex-col justify-between">
              <div className="space-y-4">
                <div>
                  <label className="block text-xxs font-semibold text-slate-450 uppercase mb-1">
                    Category Name
                  </label>
                  <input
                    type="text"
                    {...regCat('name')}
                    className="w-full bg-slate-50 border rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:bg-white text-slate-805"
                    placeholder="e.g. Beverages"
                  />
                  {catErrors.name ? <p className="mt-1 text-xs text-rose-600">{catErrors.name.message?.toString()}</p> : null}
                </div>

                <div>
                  <label className="block text-xxs font-semibold text-slate-455 uppercase mb-1">
                    Description (Optional)
                  </label>
                  <textarea
                    {...regCat('description')}
                    className="w-full bg-slate-50 border rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:bg-white h-24"
                    placeholder="e.g. Refreshing shakes and cold brews"
                  />
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <button
                  type="submit"
                  disabled={catMutation.isPending}
                  className="w-full py-2.5 bg-primary hover:bg-primary-hover text-white font-semibold text-xs rounded-lg active-press transition-colors shadow-sm cursor-pointer"
                >
                  {catMutation.isPending ? 'Saving...' : 'Save Category'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
      {/* 2. CREATE/EDIT DISH DIALOG (Sliding side panel instead of popup) */}
      {showDishDialog && (
        <>
          {/* Light Backdrop Overlay */}
          <div
            className="fixed inset-0 z-40 bg-slate-900/15 backdrop-blur-xxs"
            onClick={() => setShowDishDialog(false)}
          />
          {/* Drawer Container */}
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-white border-l border-slate-200 shadow-2xl flex flex-col animate-slide-in">
            <div className="flex items-center justify-between border-b border-slate-100 p-6 shrink-0 bg-white">
              <div>
                <h3 className="font-semibold text-slate-800 text-sm">
                  {editingDish ? 'Modify Dish' : 'Create New Menu Dish'}
                </h3>
                <p className="text-xxs text-slate-400 font-medium mt-0.5">Manage details, pricing, and availability of menu dish</p>
              </div>
              <button 
                onClick={() => setShowDishDialog(false)} 
                className="text-slate-400 hover:text-slate-650 p-1.5 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <form onSubmit={handleSubDish((data) => dishMutation.mutate(data))} className="flex-1 flex flex-col min-h-0 bg-white">
              <div className="flex-1 overflow-y-auto p-6 space-y-5 text-slate-750">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Dish Name
                    </label>
                    <input
                      type="text"
                      {...regDish('name')}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:bg-white text-slate-805 transition-all"
                      placeholder="e.g. Classic Burger"
                    />
                    {dishErrors.name ? <p className="mt-1 text-[10px] text-rose-600 font-medium">{dishErrors.name.message?.toString()}</p> : null}
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Category
                    </label>
                    <select
                      {...regDish('categoryId')}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:bg-white text-slate-805 transition-all"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    {dishErrors.categoryId ? <p className="mt-1 text-[10px] text-rose-600 font-medium">{dishErrors.categoryId.message?.toString()}</p> : null}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Description
                  </label>
                  <textarea
                    {...regDish('description')}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:bg-white h-24 text-slate-805 transition-all resize-none"
                    placeholder="e.g. Grilled beef patty topped with lettuce..."
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Price (₹)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      {...regDish('price')}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:bg-white font-semibold text-slate-850 transition-all"
                    />
                    {dishErrors.price ? <p className="mt-1 text-[10px] text-rose-600 font-medium">{dishErrors.price.message?.toString()}</p> : null}
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      GST/Tax (%)
                    </label>
                    <input
                      type="number"
                      {...regDish('taxRate')}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:bg-white font-semibold text-slate-850 transition-all"
                    />
                    {dishErrors.taxRate ? <p className="mt-1 text-[10px] text-rose-600 font-medium">{dishErrors.taxRate.message?.toString()}</p> : null}
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Prep Time (min)
                    </label>
                    <input
                      type="number"
                      {...regDish('preparationTime')}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:bg-white font-semibold text-slate-850 transition-all"
                    />
                    {dishErrors.preparationTime ? <p className="mt-1 text-[10px] text-rose-600 font-medium">{dishErrors.preparationTime.message?.toString()}</p> : null}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Dish Image
                  </label>
                  <div className="flex items-center gap-4 mt-1.5 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                    {watchDish('imageUrl') ? (
                      <div className="relative group h-16 w-16 bg-slate-100 rounded-lg overflow-hidden border border-slate-200 shrink-0">
                        <img 
                          src={watchDish('imageUrl')} 
                          alt="Preview" 
                          className="h-full w-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => setDishValue('imageUrl', '')}
                          className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-xxs font-semibold cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <div className="h-16 w-16 bg-slate-100 border border-dashed border-slate-300 rounded-lg flex items-center justify-center text-slate-400 shrink-0">
                        <ImageIcon className="h-5 w-5" />
                      </div>
                    )}
                    
                    <div className="flex-1 space-y-1.5">
                      <label 
                        htmlFor="dish-image-file"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-705 font-bold text-[10px] uppercase tracking-wider rounded-lg shadow-xxs transition-all cursor-pointer active-press"
                      >
                        {isUploading ? (
                          <>
                            <Loader className="h-3 w-3 animate-spin text-primary" />
                            <span>Uploading...</span>
                          </>
                        ) : (
                          <>
                            <Upload className="h-3 w-3 text-slate-505" />
                            <span>Upload Image</span>
                          </>
                        )}
                      </label>
                      <p className="text-[10px] text-slate-400 font-medium">Supports JPG, PNG, GIF up to 5MB</p>
                    </div>
                  </div>
                  <input
                    type="file"
                    id="dish-image-file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={isUploading}
                  />
                  <input type="hidden" {...regDish('imageUrl')} />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="isAvailable"
                    {...regDish('isAvailable')}
                    className="h-4 w-4 text-primary border-slate-350 rounded focus:ring-primary cursor-pointer"
                  />
                  <label htmlFor="isAvailable" className="text-xxs font-semibold text-slate-550 cursor-pointer select-none">
                    Dish is Available for Billing
                  </label>
                </div>
              </div>

              {/* Fixed Footer */}
              <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowDishDialog(false)}
                  className="flex-1 py-2.5 text-xs font-semibold text-slate-650 border border-slate-200 rounded-xl hover:bg-slate-100 transition-all cursor-pointer bg-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={dishMutation.isPending}
                  className="flex-1 py-2.5 text-xs font-semibold text-white bg-primary hover:bg-primary-hover rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-50 active-press"
                >
                  {dishMutation.isPending ? 'Saving...' : 'Save Menu Dish'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* DIALOG 3: IMPORT JSON DIALOG */}
      {showImportModal && (
        <>
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 transition-opacity"
            onClick={() => setShowImportModal(false)}
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                  <FileJson className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-850">Import Menu JSON</h3>
                  <p className="text-xxs text-slate-400">Upload menu categories & dishes from JSON file</p>
                </div>
              </div>
              <button
                onClick={() => setShowImportModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto">
              {/* File Selector */}
              <div className="space-y-2">
                <label className="block text-xxs font-bold uppercase tracking-wider text-slate-500">
                  Select Menu JSON File
                </label>
                <div className="flex items-center gap-3">
                  <label
                    htmlFor="menu-json-file"
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-slate-50 hover:bg-slate-100 border border-dashed border-slate-300 rounded-xl cursor-pointer transition-all text-xs font-semibold text-slate-700"
                  >
                    <FileUp className="h-4 w-4 text-blue-600" />
                    <span>{importFile ? importFile.name : 'Choose JSON file...'}</span>
                  </label>
                  <input
                    type="file"
                    id="menu-json-file"
                    accept=".json,application/json"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Errors */}
              {importError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-700 text-xs font-medium">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{importError}</span>
                </div>
              )}

              {/* Success Result */}
              {importResult && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2 text-xs text-emerald-800">
                  <div className="flex items-center gap-2 font-bold text-emerald-900">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>Menu Import Completed Successfully!</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xxs pt-1">
                    <div className="bg-white/80 p-2 rounded-lg border border-emerald-100">
                      Categories Created: <span className="font-bold">{importResult.categoriesCreated || 0}</span>
                    </div>
                    <div className="bg-white/80 p-2 rounded-lg border border-emerald-100">
                      Categories Updated: <span className="font-bold">{importResult.categoriesUpdated || 0}</span>
                    </div>
                    <div className="bg-white/80 p-2 rounded-lg border border-emerald-100">
                      Dishes Created: <span className="font-bold">{importResult.dishesCreated || 0}</span>
                    </div>
                    <div className="bg-white/80 p-2 rounded-lg border border-emerald-100">
                      Dishes Updated: <span className="font-bold">{importResult.dishesUpdated || 0}</span>
                    </div>
                  </div>
                  {importResult.errors && importResult.errors.length > 0 && (
                    <div className="mt-2 text-rose-600 text-xxs space-y-1">
                      <p className="font-bold">Warnings:</p>
                      {importResult.errors.map((e: string, idx: number) => (
                        <p key={idx}>• {e}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Preview Stats */}
              {importPreviewStats && !importResult && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <h4 className="text-xs font-bold text-slate-700">JSON File Summary</h4>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xxs flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Categories</span>
                      <span className="font-bold text-slate-850 bg-slate-100 px-2 py-0.5 rounded">
                        {importPreviewStats.categoryCount}
                      </span>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xxs flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Dishes</span>
                      <span className="font-bold text-slate-850 bg-slate-100 px-2 py-0.5 rounded">
                        {importPreviewStats.dishCount}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex gap-3">
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="flex-1 py-2.5 text-xs font-semibold text-slate-650 border border-slate-200 rounded-xl hover:bg-slate-100 transition-all cursor-pointer bg-white"
              >
                {importResult ? 'Close' : 'Cancel'}
              </button>
              {!importResult && (
                <button
                  type="button"
                  onClick={executeImport}
                  disabled={!importJsonData || isImporting}
                  className="flex-1 py-2.5 text-xs font-semibold text-white bg-primary hover:bg-primary-hover rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 active-press"
                >
                  {isImporting ? (
                    <>
                      <Loader className="h-4 w-4 animate-spin text-white" />
                      <span>Importing...</span>
                    </>
                  ) : (
                    <span>Confirm & Import</span>
                  )}
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
