import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ChevronRight,
  IndianRupee,
  Loader2,
  MapPin,
  MessageCircle,
  Package,
  Pencil,
  Phone,
  Plus,
  Search,
  ShoppingBag,
  Tag,
  Trash2,
  X
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { authService } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';
import { useAppContext } from '../../context/AppContext';

interface Product {
  productId: string;
  name: string;
  category: string;
  quantity: string;
  price: number;
  location: string;
  description: string;
  image: string | null;
  sellerId: string;
  sellerName: string;
  contactNumber?: string;
  stockQuantity?: number;
  isSoldOut?: boolean;
  createdAt: string;
  updatedAt?: string | null;
  priceUpdatedAt?: string | null;
  sellerInfo?: {
    name: string;
    identifier: string;
    location: string;
  } | null;
}

interface ProductFormValues {
  name: string;
  category: string;
  quantity: string;
  price: string;
  location: string;
  description: string;
  contactNumber: string;
  stockQuantity: string;
}

interface ToastState {
  type: 'success' | 'error';
  message: string;
}

interface MarketplaceProps {
  initialLocation?: string;
}

const categories = ['All', 'Vegetable', 'Fruit', 'Grain', 'Pulses', 'Oilseeds', 'Spices', 'Other'];

const defaultProductForm = (initialLocation = '', contactNumber = ''): ProductFormValues => ({
  name: '',
  category: 'Vegetable',
  quantity: '',
  price: '',
  location: initialLocation,
  description: '',
  contactNumber,
  stockQuantity: '1'
});

const mapProductToForm = (product: Product): ProductFormValues => ({
  name: product.name || '',
  category: product.category || 'Vegetable',
  quantity: product.quantity || '',
  price: String(product.price ?? ''),
  location: product.location || '',
  description: product.description || '',
  contactNumber: product.contactNumber || product.sellerInfo?.identifier || '',
  stockQuantity: String(product.stockQuantity ?? 0)
});

const validateProductForm = (form: ProductFormValues) => {
  if (!form.name.trim()) return 'Product name is required.';
  if (!form.category.trim()) return 'Category is required.';
  if (!form.price.trim()) return 'Price is required.';
  if (Number(form.price) <= 0) return 'Price must be greater than 0.';
  if (!form.quantity.trim()) return 'Quantity is required.';
  if (!form.location.trim()) return 'Location is required.';
  if (!form.contactNumber.trim()) return 'Contact number is required.';
  if (!form.stockQuantity.trim()) return 'Stock quantity is required.';
  if (Number(form.stockQuantity) < 0 || !Number.isFinite(Number(form.stockQuantity))) {
    return 'Stock quantity must be 0 or more.';
  }
  if (!/^[+\d][\d\s-]{7,19}$/.test(form.contactNumber.trim())) {
    return 'Enter a valid contact number.';
  }
  return null;
};

const formatWhatsAppNumber = (value?: string) => (value || '').replace(/\D/g, '');
const isRecentPriceUpdate = (value?: string | null) =>
  !!value && Date.now() - new Date(value).getTime() <= 24 * 60 * 60 * 1000;
const formatTimestamp = (value?: string | null) =>
  value ? new Date(value).toLocaleString() : null;

export const Marketplace: React.FC<MarketplaceProps> = ({ initialLocation }) => {
  const { user } = useAuth();
  const { appData, updateModuleData } = useAppContext();
  const [products, setProducts] = useState<Product[]>([]);
  const [view, setView] = useState<'browse' | 'sell' | 'my-listings'>('browse');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [inventoryPendingId, setInventoryPendingId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    fetchProducts();
  }, [appData.marketplace.search, appData.marketplace.category, appData.marketplace.location, view]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const defaultContactNumber = useMemo(() => {
    if (!user?.identifier) return '';
    return user.type === 'mobile' ? user.identifier : '';
  }, [user?.identifier, user?.type]);

  const showToast = (type: ToastState['type'], message: string) => {
    setToast({ type, message });
  };

  const isOwner = (product: Product | null) => !!(user && product && user.id === product.sellerId);
  const canManageListing = (product: Product | null) => view === 'my-listings' && isOwner(product);

  const fetchProducts = async () => {
    updateModuleData('marketLoading', true);
    updateModuleData('marketError', null);
    try {
      let url = `/api/products?category=${appData.marketplace.category}`;
      if (appData.marketplace.search) url += `&name=${appData.marketplace.search}`;
      if (appData.marketplace.location) url += `&location=${appData.marketplace.location}`;

      if (view === 'my-listings' && user) {
        url = `/api/products/user/${user.id}`;
      }

      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'ok') {
        const productsList = data.products || [];
        setProducts(Array.isArray(productsList) ? productsList : []);
        if (selectedProduct) {
          const updatedSelected = productsList.find((item: Product) => item.productId === selectedProduct.productId) || null;
          setSelectedProduct(updatedSelected);
        }
        if (data.fallback) {
          updateModuleData('marketError', data.message || 'Using fallback marketplace data');
        }
      } else {
        updateModuleData('marketError', data.error || 'Failed to fetch products');
      }
    } catch (err) {
      console.error('Failed to fetch products:', err);
      updateModuleData('marketError', 'Connection error. Please try again.');
    } finally {
      updateModuleData('marketLoading', false);
    }
  };

  const handleDelete = async (id: string) => {
    const listing = products.find((product) => product.productId === id) || null;
    if (!canManageListing(listing)) {
      showToast('error', 'You are not allowed to delete this listing.');
      return;
    }
    if (!window.confirm('Are you sure you want to delete this listing?')) return;

    try {
      const response = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${authService.getToken()}`
        }
      });
      const data = await response.json();
      if (data.status === 'ok') {
        setProducts((prev) => prev.filter((product) => product.productId !== id));
        if (selectedProduct?.productId === id) {
          setSelectedProduct(null);
        }
        showToast('success', 'Listing deleted successfully.');
      } else {
        showToast('error', data.error || 'Failed to delete listing.');
      }
    } catch (err) {
      console.error('Failed to delete product:', err);
      showToast('error', 'Connection error. Please try again.');
    }
  };

  const handleCreateSuccess = (product: Product) => {
    setProducts((prev) => [product, ...prev.filter((item) => item.productId !== product.productId)]);
    showToast('success', 'Listing created successfully.');
    setView('my-listings');
  };

  const handleEditOpen = (product: Product) => {
    if (!canManageListing(product)) return;
    setEditProduct(product);
  };

  const handleEditSave = (updatedProduct: Product) => {
    setProducts((prev) =>
      prev.map((product) => (product.productId === updatedProduct.productId ? updatedProduct : product))
    );
    setSelectedProduct((prev) => (prev?.productId === updatedProduct.productId ? updatedProduct : prev));
    setEditProduct(null);
    setEditingProductId(null);
    showToast('success', 'Listing updated successfully.');
  };

  const handleInventoryAction = async (
    product: Product,
    action: 'decrement' | 'sold-out' | 'reactivate',
    successMessage: string
  ) => {
    if (!canManageListing(product)) {
      showToast('error', 'You are not allowed to update this listing.');
      return;
    }

    setInventoryPendingId(product.productId);
    try {
      const response = await fetch(`/api/products/${product.productId}/inventory`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${authService.getToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action })
      });

      const data = await response.json();
      if (data.status === 'ok' && data.product) {
        setProducts((prev) => prev.map((item) => (item.productId === data.product.productId ? data.product : item)));
        setSelectedProduct((prev) => (prev?.productId === data.product.productId ? data.product : prev));
        setEditProduct((prev) => (prev?.productId === data.product.productId ? data.product : prev));
        showToast('success', successMessage);
      } else {
        showToast('error', data.error || 'Failed to update inventory.');
      }
    } catch (error) {
      console.error('Failed to update inventory:', error);
      showToast('error', 'Connection error. Please try again.');
    } finally {
      setInventoryPendingId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-emerald-500" />
            Farmer Marketplace
          </h1>
          <p className="text-gray-400">Buy and sell fresh farm produce directly.</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <button
            onClick={() => setView('browse')}
            className={`flex-1 md:flex-none px-4 py-2 rounded-xl font-medium transition-all ${
              view === 'browse' ? 'bg-[#22C55E] text-white shadow-lg' : 'bg-dark-input text-gray-300 border border-dark-border hover:bg-gray-800'
            }`}
          >
            Browse
          </button>
          {user && (
            <>
              <button
                onClick={() => setView('my-listings')}
                className={`flex-1 md:flex-none px-4 py-2 rounded-xl font-medium transition-all ${
                  view === 'my-listings' ? 'bg-[#22C55E] text-white shadow-lg' : 'bg-dark-input text-gray-300 border border-dark-border hover:bg-gray-800'
                }`}
              >
                My Listings
              </button>
              <button
                onClick={() => setView('sell')}
                className="flex-1 md:flex-none px-4 py-2 bg-emerald-900/30 text-emerald-400 rounded-xl font-bold hover:bg-emerald-900/50 transition-all flex items-center justify-center gap-2 border border-emerald-800/50"
              >
                <Plus className="w-4 h-4" />
                Sell
              </button>
            </>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {view === 'sell' ? (
          <ProductFormCard
            key="sell"
            mode="create"
            initialLocation={initialLocation}
            defaultContactNumber={defaultContactNumber}
            onCancel={() => setView('my-listings')}
            onSuccess={handleCreateSuccess}
          />
        ) : (
          <motion.div
            key={view}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {view === 'browse' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-dark-card p-4 rounded-2xl border border-dark-border shadow-sm">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search products..."
                    className="w-full pl-10 pr-4 py-2 rounded-xl border border-dark-border focus:ring-2 focus:ring-emerald-500 outline-none bg-dark-input text-white placeholder:text-gray-500"
                    value={appData.marketplace.search}
                    onChange={(e) => updateModuleData('marketplace', { ...appData.marketplace, search: e.target.value })}
                  />
                </div>
                <div className="relative">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <select
                    className="w-full pl-10 pr-4 py-2 rounded-xl border border-dark-border focus:ring-2 focus:ring-emerald-500 outline-none bg-dark-input text-white appearance-none"
                    value={appData.marketplace.category}
                    onChange={(e) => updateModuleData('marketplace', { ...appData.marketplace, category: e.target.value })}
                  >
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Filter by location..."
                    className="w-full pl-10 pr-4 py-2 rounded-xl border border-dark-border focus:ring-2 focus:ring-emerald-500 outline-none bg-dark-input text-white placeholder:text-gray-500"
                    value={appData.marketplace.location}
                    onChange={(e) => updateModuleData('marketplace', { ...appData.marketplace, location: e.target.value })}
                  />
                </div>
              </div>
            )}

            {appData.marketLoading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
              </div>
            ) : appData.marketError ? (
              <div className="text-center py-20 bg-dark-input rounded-3xl border border-dark-border">
                <AlertCircle className="w-16 h-16 text-red-500/20 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Marketplace Error</h3>
                <p className="text-gray-400 mb-6">{appData.marketError}</p>
                <button
                  onClick={() => fetchProducts()}
                  className="px-6 py-2 bg-brand-green text-white rounded-xl font-bold text-sm"
                >
                  Retry
                </button>
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-20 bg-dark-input rounded-3xl border border-dark-border">
                <ShoppingBag className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">No products found</h3>
                <p className="text-gray-400">Try adjusting your filters or search query.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {products.map((product) => {
                  const canManage = canManageListing(product);
                  const showPriceUpdatedBadge = isRecentPriceUpdate(product.priceUpdatedAt);
                  const isEditLoading = editingProductId === product.productId;
                  const isInventoryLoading = inventoryPendingId === product.productId;
                  const isSoldOut = !!product.isSoldOut || (product.stockQuantity ?? 0) === 0;
                  return (
                    <motion.div
                      key={product.productId}
                      layoutId={product.productId}
                      onClick={() => setSelectedProduct(product)}
                      className="bg-dark-card rounded-2xl border border-dark-border overflow-hidden hover:shadow-xl hover:shadow-emerald-900/20 hover:-translate-y-1 transition-all cursor-pointer group"
                    >
                      <div className="aspect-square bg-dark-input relative overflow-hidden">
                        {product.image ? (
                          <img
                            src={product.image}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-12 h-12 text-gray-600" />
                          </div>
                        )}
                        <div className="absolute top-3 right-3 px-3 py-1 bg-black/80 backdrop-blur-sm rounded-full text-xs font-bold text-emerald-400 border border-emerald-800/50">
                          {product.category}
                        </div>
                        {isSoldOut && (
                          <div className="absolute top-3 left-3 px-3 py-1 bg-red-600/90 rounded-full text-xs font-bold text-white shadow-lg">
                            Out of Stock
                          </div>
                        )}
                        {showPriceUpdatedBadge && (
                          <div className={`absolute bottom-3 ${isSoldOut ? 'left-28' : 'left-3'} px-3 py-1 bg-emerald-500/90 rounded-full text-[11px] font-bold text-white shadow-lg`}>
                            Updated Price
                          </div>
                        )}
                      </div>
                      <div className="p-4 space-y-3">
                        <div className="flex justify-between items-start gap-3">
                          <h3 className="font-bold text-white line-clamp-1">{product.name}</h3>
                          <div className="flex items-center text-[#22C55E] font-bold shrink-0">
                            <IndianRupee className="w-3.5 h-3.5" />
                            <span>{product.price}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <MapPin className="w-3 h-3" />
                          <span className="line-clamp-1">{product.location}</span>
                        </div>
                        {product.updatedAt && (
                          <div className="flex items-center gap-2 text-[11px] text-emerald-300/90">
                            <CheckCircle2 className="w-3 h-3" />
                            <span className="line-clamp-1">Last Updated {formatTimestamp(product.updatedAt)}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-[11px] text-gray-400">
                          <Package className="w-3 h-3" />
                          <span>Stock: {product.stockQuantity ?? 0}</span>
                        </div>
                        <div className="pt-3 border-t border-dark-border flex justify-between items-center gap-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-6 h-6 rounded-full bg-emerald-900/50 flex items-center justify-center text-[10px] font-bold text-emerald-400">
                              {product.sellerName.substring(0, 2).toUpperCase()}
                            </div>
                            <span className="text-xs font-medium text-gray-400 line-clamp-1">{product.sellerName}</span>
                          </div>
                          {canManage && (
                            <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleInventoryAction(
                                    product,
                                    isSoldOut ? 'reactivate' : 'sold-out',
                                    isSoldOut ? 'Listing reactivated.' : 'Listing marked as sold out.'
                                  );
                                }}
                                disabled={isInventoryLoading}
                                className="inline-flex items-center gap-1.5 px-2.5 py-2 text-xs font-semibold text-amber-300 border border-amber-700/60 rounded-lg hover:bg-amber-900/20 transition-colors disabled:opacity-60"
                              >
                                {isInventoryLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                                <span>{isSoldOut ? 'Reactivate' : 'Sold Out'}</span>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleInventoryAction(product, 'decrement', 'Stock updated.');
                                }}
                                disabled={isInventoryLoading || isSoldOut}
                                className="inline-flex items-center gap-1.5 px-2.5 py-2 text-xs font-semibold text-sky-300 border border-sky-700/60 rounded-lg hover:bg-sky-900/20 transition-colors disabled:opacity-60"
                              >
                                {isInventoryLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                                <span>-1 Stock</span>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditOpen(product);
                                }}
                                disabled={isEditLoading}
                                className="inline-flex items-center gap-1.5 px-2.5 py-2 text-xs font-semibold text-emerald-400 border border-emerald-700/60 rounded-lg hover:bg-emerald-900/20 transition-colors"
                              >
                                {isEditLoading ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Pencil className="w-3.5 h-3.5" />
                                )}
                                <span className="hidden sm:inline">Edit</span>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(product.productId);
                                }}
                                className="p-2 text-red-400 hover:bg-red-900/20 rounded-lg transition-colors border border-red-900/40"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              layoutId={selectedProduct.productId}
              className="bg-dark-card w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl relative max-h-[90vh] overflow-y-auto border border-dark-border"
            >
              <button
                onClick={() => setSelectedProduct(null)}
                className="absolute top-4 right-4 z-10 p-2 bg-dark-input/80 backdrop-blur-sm rounded-full text-white hover:bg-gray-800 transition-colors shadow-lg"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="grid grid-cols-1 md:grid-cols-2">
                <div className="aspect-square bg-dark-input">
                  {selectedProduct.image ? (
                    <img
                      src={selectedProduct.image}
                      alt={selectedProduct.name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-20 h-20 text-gray-600" />
                    </div>
                  )}
                </div>
                <div className="p-6 space-y-6">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
                        <Tag className="w-3 h-3" />
                        {selectedProduct.category}
                      </div>
                      {canManageListing(selectedProduct) && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              handleInventoryAction(
                                selectedProduct,
                                selectedProduct.isSoldOut || (selectedProduct.stockQuantity ?? 0) === 0 ? 'reactivate' : 'sold-out',
                                selectedProduct.isSoldOut || (selectedProduct.stockQuantity ?? 0) === 0
                                  ? 'Listing reactivated.'
                                  : 'Listing marked as sold out.'
                              )
                            }
                            disabled={inventoryPendingId === selectedProduct.productId}
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-amber-300 border border-amber-700/60 rounded-xl hover:bg-amber-900/20 transition-colors disabled:opacity-60"
                          >
                            {inventoryPendingId === selectedProduct.productId ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                            {selectedProduct.isSoldOut || (selectedProduct.stockQuantity ?? 0) === 0 ? 'Reactivate Listing' : 'Mark Sold Out'}
                          </button>
                          <button
                            onClick={() => handleInventoryAction(selectedProduct, 'decrement', 'Stock updated.')}
                            disabled={inventoryPendingId === selectedProduct.productId || !!selectedProduct.isSoldOut || (selectedProduct.stockQuantity ?? 0) === 0}
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-sky-300 border border-sky-700/60 rounded-xl hover:bg-sky-900/20 transition-colors disabled:opacity-60"
                          >
                            {inventoryPendingId === selectedProduct.productId ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                            -1 Stock
                          </button>
                          <button
                            onClick={() => handleEditOpen(selectedProduct)}
                            disabled={editingProductId === selectedProduct.productId}
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-emerald-400 border border-emerald-700/60 rounded-xl hover:bg-emerald-900/20 transition-colors"
                          >
                            {editingProductId === selectedProduct.productId ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Pencil className="w-4 h-4" />
                            )}
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(selectedProduct.productId)}
                            className="p-2.5 text-red-400 hover:bg-red-900/20 rounded-xl transition-colors border border-red-900/40"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                    <h2 className="text-2xl font-bold text-white">{selectedProduct.name}</h2>
                    <div className="flex items-center text-2xl font-black text-[#22C55E]">
                      <IndianRupee className="w-6 h-6" />
                      <span>{selectedProduct.price}</span>
                      <span className="text-sm font-medium text-gray-500 ml-2">/ {selectedProduct.quantity}</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-3 text-gray-300">
                      <MapPin className="w-5 h-5 text-emerald-500" />
                      <span>{selectedProduct.location}</span>
                    </div>
                    <div className="flex items-center gap-3 text-gray-300">
                      <Calendar className="w-5 h-5 text-emerald-500" />
                      <span>Listed on {new Date(selectedProduct.createdAt).toLocaleDateString()}</span>
                    </div>
                    {selectedProduct.updatedAt && (
                      <div className="flex items-center gap-3 text-gray-300">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        <span>Last Updated {formatTimestamp(selectedProduct.updatedAt)}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-3 text-gray-300">
                      <Package className="w-5 h-5 text-emerald-500" />
                      <span>Stock Available: {selectedProduct.stockQuantity ?? 0}</span>
                    </div>
                    {(selectedProduct.isSoldOut || (selectedProduct.stockQuantity ?? 0) === 0) && (
                      <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-red-900/30 text-red-200 border border-red-800/50 text-sm font-semibold">
                        <AlertCircle className="w-4 h-4" />
                        Out of Stock
                      </div>
                    )}
                    {isRecentPriceUpdate(selectedProduct.priceUpdatedAt) && (
                      <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-900/20 text-emerald-300 border border-emerald-800/50 text-sm font-semibold">
                        <Tag className="w-4 h-4" />
                        Updated Price
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-bold text-white">Description</h4>
                    <p className="text-gray-400 text-sm leading-relaxed">
                      {selectedProduct.description || 'No description provided for this product.'}
                    </p>
                  </div>

                  <div className="pt-6 border-t border-dark-border space-y-4">
                    <h4 className="font-bold text-white">Seller Information</h4>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-900/50 flex items-center justify-center font-bold text-emerald-400">
                        {selectedProduct.sellerName.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-white">{selectedProduct.sellerName}</p>
                        <p className="text-xs text-gray-500">Verified Farmer</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <a
                        href={`tel:${selectedProduct.contactNumber || selectedProduct.sellerInfo?.identifier || ''}`}
                        className={`flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-colors border border-dark-border ${
                          selectedProduct.isSoldOut || (selectedProduct.stockQuantity ?? 0) === 0
                            ? 'bg-gray-900 text-gray-500 cursor-not-allowed pointer-events-none'
                            : 'bg-black text-white hover:bg-gray-900'
                        }`}
                      >
                        <Phone className="w-4 h-4" />
                        Call
                      </a>
                      <a
                        href={`https://wa.me/${formatWhatsAppNumber(selectedProduct.contactNumber || selectedProduct.sellerInfo?.identifier)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-colors ${
                          selectedProduct.isSoldOut || (selectedProduct.stockQuantity ?? 0) === 0
                            ? 'bg-gray-800 text-gray-500 cursor-not-allowed pointer-events-none'
                            : 'bg-[#22C55E] text-white hover:bg-green-600'
                        }`}
                      >
                        <MessageCircle className="w-4 h-4" />
                        WhatsApp
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editProduct && (
          <EditProductModal
            product={editProduct}
            onClose={() => {
              setEditProduct(null);
              setEditingProductId(null);
            }}
            onPendingChange={setEditingProductId}
            onSave={handleEditSave}
            onError={(message) => showToast('error', message)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed bottom-4 right-4 z-[60] max-w-sm w-[calc(100%-2rem)] sm:w-auto"
          >
            <div
              className={`rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur-sm flex items-start gap-3 ${
                toast.type === 'success'
                  ? 'bg-emerald-950/90 border-emerald-800 text-emerald-100'
                  : 'bg-red-950/90 border-red-800 text-red-100'
              }`}
            >
              {toast.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              )}
              <p className="text-sm font-medium">{toast.message}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const EditProductModal: React.FC<{
  product: Product;
  onClose: () => void;
  onPendingChange: (productId: string | null) => void;
  onSave: (product: Product) => void;
  onError: (message: string) => void;
}> = ({ product, onClose, onPendingChange, onSave, onError }) => {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (form: ProductFormValues, imageFile: File | null) => {
    if (!window.confirm('Are you sure you want to update this listing?')) {
      return;
    }
    setLoading(true);
    onPendingChange(product.productId);
    const formData = new FormData();
    Object.entries(form).forEach(([key, value]) => formData.append(key, value));
    if (imageFile) formData.append('image', imageFile);

    try {
      const response = await fetch(`/api/products/${product.productId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${authService.getToken()}`
        },
        body: formData
      });
      const data = await response.json();

      if (data.status === 'ok' && data.product) {
        onSave(data.product);
      } else {
        onError(data.error || 'Failed to update listing.');
      }
    } catch (error) {
      console.error('Failed to update product:', error);
      onError('Connection error. Please try again.');
    } finally {
      setLoading(false);
      onPendingChange(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="w-full max-w-3xl max-h-[92vh] overflow-y-auto"
      >
        <ProductFormCard
          mode="edit"
          product={product}
          loading={loading}
          onCancel={onClose}
          onSubmit={handleSubmit}
        />
      </motion.div>
    </div>
  );
};

const ProductFormCard: React.FC<{
  mode: 'create' | 'edit';
  product?: Product;
  initialLocation?: string;
  defaultContactNumber?: string;
  loading?: boolean;
  onCancel: () => void;
  onSuccess?: (product: Product) => void;
  onSubmit?: (form: ProductFormValues, imageFile: File | null) => Promise<void>;
}> = ({
  mode,
  product,
  initialLocation,
  defaultContactNumber,
  loading: externalLoading,
  onCancel,
  onSuccess,
  onSubmit
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(product?.image || null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [form, setForm] = useState<ProductFormValues>(
    product ? mapProductToForm(product) : defaultProductForm(initialLocation, defaultContactNumber)
  );

  useEffect(() => {
    if (product) {
      setForm(mapProductToForm(product));
      setImagePreview(product.image || null);
      setImageFile(null);
      setError(null);
      return;
    }
    setForm(defaultProductForm(initialLocation, defaultContactNumber));
  }, [product, initialLocation, defaultContactNumber]);

  const isBusy = externalLoading ?? loading;

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (event?: React.FormEvent | React.MouseEvent) => {
    if (isBusy) {
      return;
    }
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    const validationError = validateProductForm(form);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);

    if (mode === 'edit' && onSubmit) {
      await onSubmit(form, imageFile);
      return;
    }

    setLoading(true);
    const formData = new FormData();
    Object.entries(form).forEach(([key, value]) => formData.append(key, value));
    if (imageFile) formData.append('image', imageFile);

    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authService.getToken()}`
        },
        body: formData
      });

      const data = await response.json();
      if (data.status === 'ok' && data.product) {
        setForm(defaultProductForm(initialLocation, defaultContactNumber));
        setImagePreview(null);
        setImageFile(null);
        onSuccess?.(data.product);
      } else {
        setError(data.error || 'Failed to list product');
      }
    } catch (err) {
      console.error('Failed to create product:', err);
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-2xl mx-auto bg-dark-card p-6 md:p-8 rounded-3xl border border-dark-border shadow-xl"
    >
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">{mode === 'edit' ? 'Edit Listing' : 'List Your Produce'}</h2>
          <p className="text-sm text-gray-400 mt-1">
            {mode === 'edit'
              ? 'Update your product details and save changes instantly.'
              : 'Add your product details so buyers can reach you directly.'}
          </p>
        </div>
        {mode === 'edit' && (
          <button
            onClick={onCancel}
            className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-dark-input transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField label="Product Name">
            <input
              type="text"
              placeholder="e.g. Fresh Organic Tomatoes"
              className="w-full px-4 py-3 rounded-xl bg-dark-input border border-dark-border text-white placeholder:text-gray-500 focus:ring-2 focus:ring-emerald-500 outline-none"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </FormField>
          <FormField label="Category">
            <select
              className="w-full px-4 py-3 rounded-xl bg-dark-input border border-dark-border text-white focus:ring-2 focus:ring-emerald-500 outline-none"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              {categories.filter((category) => category !== 'All').map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField label="Price">
            <div className="relative">
              <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-dark-input border border-dark-border text-white placeholder:text-gray-500 focus:ring-2 focus:ring-emerald-500 outline-none"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
              />
            </div>
          </FormField>
          <FormField label="Quantity">
            <input
              type="text"
              placeholder="e.g. 50 kg"
              className="w-full px-4 py-3 rounded-xl bg-dark-input border border-dark-border text-white placeholder:text-gray-500 focus:ring-2 focus:ring-emerald-500 outline-none"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField label="Stock Quantity">
            <input
              type="number"
              min="0"
              step="1"
              placeholder="e.g. 10"
              className="w-full px-4 py-3 rounded-xl bg-dark-input border border-dark-border text-white placeholder:text-gray-500 focus:ring-2 focus:ring-emerald-500 outline-none"
              value={form.stockQuantity}
              onChange={(e) => setForm({ ...form, stockQuantity: e.target.value })}
            />
          </FormField>
          <div className="hidden md:block" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField label="Location">
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="e.g. Mandya, Karnataka"
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-dark-input border border-dark-border text-white placeholder:text-gray-500 focus:ring-2 focus:ring-emerald-500 outline-none"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
              />
            </div>
          </FormField>
          <FormField label="Contact Number">
            <input
              type="tel"
              placeholder="e.g. +91 9876543210"
              className="w-full px-4 py-3 rounded-xl bg-dark-input border border-dark-border text-white placeholder:text-gray-500 focus:ring-2 focus:ring-emerald-500 outline-none"
              value={form.contactNumber}
              onChange={(e) => setForm({ ...form, contactNumber: e.target.value })}
            />
          </FormField>
        </div>

        <FormField label="Description">
          <textarea
            placeholder="Tell buyers more about your produce (organic, fresh, variety, etc.)"
            rows={4}
            className="w-full px-4 py-3 rounded-xl bg-dark-input border border-dark-border text-white placeholder:text-gray-500 focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </FormField>

        <FormField label="Product Image">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-dark-border flex items-center justify-center overflow-hidden bg-dark-input shrink-0">
              {imagePreview ? (
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <Plus className="w-6 h-6 text-gray-600" />
              )}
            </div>
            <div className="space-y-2">
              <label className="inline-flex px-4 py-2 bg-dark-input text-gray-300 rounded-xl font-bold cursor-pointer hover:bg-gray-800 transition-colors border border-dark-border">
                {mode === 'edit' ? 'Replace Photo' : 'Choose Photo'}
                <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
              </label>
              <p className="text-xs text-gray-500">Optional. Upload a new image only if you want to replace the current one.</p>
            </div>
          </div>
        </FormField>

        {error && (
          <div className="p-4 bg-red-900/20 border border-red-900/50 rounded-2xl flex items-center gap-2 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-4 bg-dark-input text-gray-300 rounded-2xl font-bold hover:bg-gray-800 transition-colors border border-dark-border"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isBusy}
            className="flex-[2] py-4 bg-[#22C55E] text-white rounded-2xl font-bold hover:bg-green-600 transition-all shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isBusy ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : mode === 'edit' ? (
              <>
                <Pencil className="w-5 h-5" />
                Save Changes
              </>
            ) : (
              'List Product Now'
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

const FormField: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="space-y-2">
    <label className="text-sm font-bold text-gray-300">{label}</label>
    {children}
  </div>
);
