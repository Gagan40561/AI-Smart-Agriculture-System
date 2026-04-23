import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, 
  Search, 
  Filter, 
  MapPin, 
  Tag, 
  Phone, 
  MessageCircle, 
  Plus, 
  Loader2, 
  X, 
  ChevronRight,
  Trash2,
  Calendar,
  Package,
  IndianRupee,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
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
  createdAt: string;
  sellerInfo?: {
    name: string;
    identifier: string;
    location: string;
  };
}

interface MarketplaceProps {
  initialLocation?: string;
}

export const Marketplace: React.FC<MarketplaceProps> = ({ initialLocation }) => {
  const { user } = useAuth();
  const { appData, updateModuleData } = useAppContext();
  const [products, setProducts] = useState<Product[]>([]);
  const [view, setView] = useState<'browse' | 'sell' | 'my-listings'>('browse');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  const categories = ['All', 'Vegetable', 'Fruit', 'Grain', 'Pulses', 'Oilseeds', 'Spices', 'Other'];

  useEffect(() => {
    fetchProducts();
  }, [appData.marketplace.search, appData.marketplace.category, appData.marketplace.location, view]);

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
    if (!window.confirm('Are you sure you want to delete this listing?')) return;
    
    try {
      const response = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authService.getToken()}`
        }
      });
      const data = await response.json();
      if (data.status === 'ok') {
        setProducts(prev => prev.filter(p => p.productId !== id));
      } else {
        console.error('Failed to delete product:', data.error);
      }
    } catch (err) {
      console.error('Failed to delete product:', err);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      {/* Header */}
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
          <SellProduct key="sell" onComplete={() => setView('my-listings')} initialLocation={initialLocation} />
        ) : (
          <motion.div
            key={view}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Search & Filters (Only for browse) */}
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
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
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

            {/* Product Grid */}
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
                {products.map((product) => (
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
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <h3 className="font-bold text-white line-clamp-1">{product.name}</h3>
                        <div className="flex items-center text-[#22C55E] font-bold">
                          <IndianRupee className="w-3.5 h-3.5" />
                          <span>{product.price}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <MapPin className="w-3 h-3" />
                        <span className="line-clamp-1">{product.location}</span>
                      </div>
                      <div className="pt-3 border-t border-dark-border flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-emerald-900/50 flex items-center justify-center text-[10px] font-bold text-emerald-400">
                            {product.sellerName.substring(0, 2).toUpperCase()}
                          </div>
                          <span className="text-xs font-medium text-gray-400 line-clamp-1">{product.sellerName}</span>
                        </div>
                        {view === 'my-listings' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(product.productId);
                            }}
                            className="p-2 text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Product Details Modal */}
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
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
                      <Tag className="w-3 h-3" />
                      {selectedProduct.category}
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
                    <div className="grid grid-cols-2 gap-3">
                      <a
                        href={`tel:${selectedProduct.sellerName}`} // Assuming identifier is phone for now
                        className="flex items-center justify-center gap-2 py-3 bg-black text-white rounded-xl font-bold hover:bg-gray-900 transition-colors border border-dark-border"
                      >
                        <Phone className="w-4 h-4" />
                        Call
                      </a>
                      <a
                        href={`https://wa.me/${selectedProduct.sellerName}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 py-3 bg-[#22C55E] text-white rounded-xl font-bold hover:bg-green-600 transition-colors"
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
    </div>
  );
};

const SellProduct: React.FC<{ onComplete: () => void; initialLocation?: string }> = ({ onComplete, initialLocation }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const [form, setForm] = useState({
    name: '',
    category: 'Vegetable',
    quantity: '',
    price: '',
    location: initialLocation || '',
    description: ''
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e?: React.FormEvent | React.MouseEvent) => {
    console.log("Product Listing triggered");
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    setLoading(true);
    setError(null);

    const formData = new FormData();
    Object.entries(form).forEach(([key, value]) => formData.append(key, value));
    if (imageFile) formData.append('image', imageFile);

    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authService.getToken()}`
        },
        body: formData
      });

      const data = await response.json();
      if (data.status === 'ok') {
        setSubmitted(true);
        onComplete();
      } else {
        setError(data.error || 'Failed to list product');
      }
    } catch (err) {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-2xl mx-auto bg-dark-card p-8 rounded-3xl border border-dark-border shadow-xl"
    >
      <h2 className="text-2xl font-bold text-white mb-6">List Your Produce</h2>
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-300">Product Name</label>
            <input
              type="text"
              placeholder="e.g. Fresh Organic Tomatoes"
              className="w-full px-4 py-3 rounded-xl bg-dark-input border border-dark-border text-white placeholder:text-gray-500 focus:ring-2 focus:ring-emerald-500 outline-none"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-300">Category</label>
            <select
              className="w-full px-4 py-3 rounded-xl bg-dark-input border border-dark-border text-white focus:ring-2 focus:ring-emerald-500 outline-none"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              required
            >
              <option value="Vegetable">Vegetable</option>
              <option value="Fruit">Fruit</option>
              <option value="Grain">Grain</option>
              <option value="Pulses">Pulses</option>
              <option value="Oilseeds">Oilseeds</option>
              <option value="Spices">Spices</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-300">Quantity (e.g. 100kg, 1 Quintal)</label>
            <input
              type="text"
              placeholder="e.g. 50 kg"
              className="w-full px-4 py-3 rounded-xl bg-dark-input border border-dark-border text-white placeholder:text-gray-500 focus:ring-2 focus:ring-emerald-500 outline-none"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-300">Price (per unit)</label>
            <div className="relative">
              <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="number"
                placeholder="0.00"
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-dark-input border border-dark-border text-white placeholder:text-gray-500 focus:ring-2 focus:ring-emerald-500 outline-none"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                required
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-300">Location</label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="e.g. Mandya, Karnataka"
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-dark-input border border-dark-border text-white placeholder:text-gray-500 focus:ring-2 focus:ring-emerald-500 outline-none"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-300">Description</label>
          <div className="relative">
            <textarea
              placeholder="Tell buyers more about your produce (organic, fresh, variety, etc.)"
              rows={3}
              className="w-full px-4 py-3 rounded-xl bg-dark-input border border-dark-border text-white placeholder:text-gray-500 focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-300">Product Image</label>
          <div className="flex items-center gap-4">
            <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-dark-border flex items-center justify-center overflow-hidden bg-dark-input">
              {imagePreview ? (
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <Plus className="w-6 h-6 text-gray-600" />
              )}
            </div>
            <label className="px-4 py-2 bg-dark-input text-gray-300 rounded-xl font-bold cursor-pointer hover:bg-gray-800 transition-colors border border-dark-border">
              Choose Photo
              <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
            </label>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-900/20 border border-red-900/50 rounded-2xl flex items-center gap-2 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        <div className="flex gap-4 pt-4">
          <button
            type="button"
            onClick={onComplete}
            className="flex-1 py-4 bg-dark-input text-gray-300 rounded-2xl font-bold hover:bg-gray-800 transition-colors border border-dark-border"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="flex-[2] py-4 bg-[#22C55E] text-white rounded-2xl font-bold hover:bg-green-600 transition-all shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'List Product Now'}
          </button>
        </div>
      </div>
    </motion.div>
  );
};
