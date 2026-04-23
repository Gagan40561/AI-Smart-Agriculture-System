import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import multer from 'multer';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import { agricultureService } from './src/services/aiService.ts';

const MARKET_CACHE_TIME = 10 * 60 * 1000;
const MARKET_RESOURCE_ID = '9ef84268-d588-465a-a308-a864a43d0070';

type MarketApiRecord = {
  state: string;
  district: string;
  market: string;
  commodity: string;
  variety: string;
  arrival_date: string;
  min_price: string;
  max_price: string;
  modal_price: string;
};

type MarketApiResponse = {
  records: MarketApiRecord[];
  count?: number;
  source?: 'live' | 'cache' | 'backup';
  fallback?: boolean;
  message?: string;
};

let marketCache = new Map<string, { data: MarketApiResponse; fetchedAt: number }>();

const LOCAL_MARKET_BACKUP: MarketApiRecord[] = [
  {
    state: 'Karnataka',
    district: 'Bangalore',
    market: 'Binny Mill (F&V)',
    commodity: 'Tomato',
    variety: 'Local',
    arrival_date: '2026-04-15',
    min_price: '1100',
    max_price: '1400',
    modal_price: '1250',
  },
  {
    state: 'Punjab',
    district: 'Ludhiana',
    market: 'Ludhiana',
    commodity: 'Wheat',
    variety: 'Kanak',
    arrival_date: '2026-04-15',
    min_price: '2100',
    max_price: '2200',
    modal_price: '2125',
  },
  {
    state: 'Maharashtra',
    district: 'Nashik',
    market: 'Lasalgaon',
    commodity: 'Onion',
    variety: 'Red',
    arrival_date: '2026-04-15',
    min_price: '1700',
    max_price: '1900',
    modal_price: '1800',
  },
  {
    state: 'Uttar Pradesh',
    district: 'Agra',
    market: 'Agra',
    commodity: 'Potato',
    variety: 'Desi',
    arrival_date: '2026-04-15',
    min_price: '900',
    max_price: '1000',
    modal_price: '950',
  },
  {
    state: 'Telangana',
    district: 'Warangal',
    market: 'Warangal',
    commodity: 'Cotton',
    variety: 'Other',
    arrival_date: '2026-04-15',
    min_price: '6800',
    max_price: '7200',
    modal_price: '7000',
  },
];

const buildMarketCacheKey = (params: {
  state?: string | null;
  district?: string | null;
  commodity?: string | null;
  limit?: string | number | null;
}) => JSON.stringify({
  state: params.state || '',
  district: params.district || '',
  commodity: params.commodity || '',
  limit: params.limit || 100,
});

const filterBackupMarketData = (params: {
  state?: string | null;
  district?: string | null;
  commodity?: string | null;
}) =>
  LOCAL_MARKET_BACKUP.filter((record) => {
    if (params.state && params.state !== 'All States' && record.state !== params.state) {
      return false;
    }

    if (params.district && params.district !== 'All Districts' && record.district !== params.district) {
      return false;
    }

    if (params.commodity && !record.commodity.toLowerCase().includes(params.commodity.toLowerCase())) {
      return false;
    }

    return true;
  });

const fetchMarketWithRetry = async (url: string, retries: number = 3): Promise<MarketApiResponse> => {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`API failed: ${response.status}`);
    }

    const data = await response.json();
    if (!data || !Array.isArray(data.records)) {
      throw new Error('Market API returned invalid payload');
    }

    return {
      ...data,
      source: 'live',
    };
  } catch (error) {
    if (retries > 1) {
      await new Promise((resolve) => setTimeout(resolve, (4 - retries) * 1000));
      return fetchMarketWithRetry(url, retries - 1);
    }

    throw error;
  }
};

const getCachedMarketData = (cacheKey: string): MarketApiResponse | null => {
  const cached = marketCache.get(cacheKey);
  if (!cached) {
    return null;
  }

  if (Date.now() - cached.fetchedAt > MARKET_CACHE_TIME) {
    marketCache.delete(cacheKey);
    return null;
  }

  return {
    ...cached.data,
    source: 'cache',
    fallback: true,
    message: 'Using cached market data.',
  };
};

const getRuntimeDataFile = (fileName: string, defaultValue: unknown) => {
  if (!process.env.VERCEL) {
    return path.join(process.cwd(), fileName);
  }

  const dataDir = path.join('/tmp', 'smart-agriculture-ai');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const runtimeFile = path.join(dataDir, fileName);
  const bundledFile = path.join(process.cwd(), fileName);

  if (!fs.existsSync(runtimeFile)) {
    if (fs.existsSync(bundledFile)) {
      fs.copyFileSync(bundledFile, runtimeFile);
    } else {
      fs.writeFileSync(runtimeFile, JSON.stringify(defaultValue, null, 2));
    }
  }

  return runtimeFile;
};

export async function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  const JWT_SECRET = process.env.JWT_SECRET || 'smart-agri-secret-key-2026';

  app.use(express.json());

  // Persistence for users
  const usersFile = getRuntimeDataFile('users.json', {});
  const historyFile = getRuntimeDataFile('history.json', []);
  const productsFile = getRuntimeDataFile('products.json', []);
  const fertilizerHistoryFile = getRuntimeDataFile('fertilizer_history.json', []);

  if (!fs.existsSync(usersFile)) {
    fs.writeFileSync(usersFile, JSON.stringify({}));
  }
  if (!fs.existsSync(historyFile)) {
    fs.writeFileSync(historyFile, JSON.stringify([]));
  }
  if (!fs.existsSync(productsFile)) {
    fs.writeFileSync(productsFile, JSON.stringify([]));
  }
  if (!fs.existsSync(fertilizerHistoryFile)) {
    fs.writeFileSync(fertilizerHistoryFile, JSON.stringify([]));
  }

  const getUsers = () => {
    try {
      const data = fs.readFileSync(usersFile, 'utf-8');
      console.log(`[DEBUG] Reading users.json: ${data.substring(0, 50)}...`);
      if (!data || data.trim() === '') return {};
      return JSON.parse(data);
    } catch (error) {
      console.error('[ERROR] Failed to parse users.json:', error);
      return {};
    }
  };
  const saveUsers = (users: any) => fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));

  const getHistory = () => {
    try {
      const data = fs.readFileSync(historyFile, 'utf-8');
      if (!data || data.trim() === '') return [];
      return JSON.parse(data);
    } catch (error) {
      console.error('[ERROR] Failed to parse history.json:', error);
      return [];
    }
  };
  const saveHistory = (history: any) => fs.writeFileSync(historyFile, JSON.stringify(history, null, 2));

  const getProducts = () => {
    try {
      const data = fs.readFileSync(productsFile, 'utf-8');
      if (!data || data.trim() === '') return [];
      return JSON.parse(data);
    } catch (error) {
      console.error('[ERROR] Failed to parse products.json:', error);
      return [];
    }
  };
  const saveProducts = (products: any) => fs.writeFileSync(productsFile, JSON.stringify(products, null, 2));

  const getFertilizerHistory = () => {
    try {
      const data = fs.readFileSync(fertilizerHistoryFile, 'utf-8');
      if (!data || data.trim() === '') return [];
      return JSON.parse(data);
    } catch (error) {
      console.error('[ERROR] Failed to parse fertilizer_history.json:', error);
      return [];
    }
  };
  const saveFertilizerHistory = (history: any) => fs.writeFileSync(fertilizerHistoryFile, JSON.stringify(history, null, 2));

  // In-memory OTP store (identifier -> { hashedOtp, expiresAt, attempts })
  const otpStore = new Map<string, { hashedOtp: string; expiresAt: number; attempts: number }>();

  // Rate limiting for login and register
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 requests per windowMs
    message: { status: 'error', error: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Auth Middleware
  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ status: 'error', error: 'Access denied' });

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) return res.status(403).json({ status: 'error', error: 'Invalid token' });
      req.user = user;
      next();
    });
  };

  // Setup multer for image uploads
  const uploadDir = process.env.VERCEL ? path.join('/tmp', 'smart-agriculture-ai-uploads') : 'uploads';
  const upload = multer({ dest: uploadDir });

  // Ensure uploads directory exists
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'AI Smart Agriculture Adviser API is running' });
  });

  // --- Fertilizer Recommendation ---
  app.post('/api/fertilizer/recommend', authenticateToken, (req: any, res) => {
    try {
      const { cropType, soilType, n, p, k, location } = req.body;

      if (!cropType || !soilType) {
        return res.status(400).json({ status: 'error', error: 'Crop type and soil type are required' });
      }

      // Rule-based logic
      let fertilizerName = 'NPK 19-19-19 (Balanced)';
      let quantity = '50kg per acre';
      let instructions = 'Apply as a basal dose during sowing or transplanting.';
      let reason = 'Your soil nutrients are balanced. A general NPK fertilizer is recommended for healthy growth.';

      const nVal = Number(n);
      const pVal = Number(p);
      const kVal = Number(k);

      if (!isNaN(nVal) && nVal < 50) {
        fertilizerName = 'Urea (46% Nitrogen)';
        reason = 'Low Nitrogen detected. Urea is recommended to promote vegetative growth and leaf development.';
      } else if (!isNaN(pVal) && pVal < 40) {
        fertilizerName = 'DAP (Diammonium Phosphate)';
        reason = 'Low Phosphorus detected. DAP is recommended for strong root development and early plant growth.';
      } else if (!isNaN(kVal) && kVal < 40) {
        fertilizerName = 'MOP (Muriate of Potash)';
        reason = 'Low Potassium detected. MOP is recommended to improve disease resistance and overall crop quality.';
      }

      const recommendation = {
        id: crypto.randomUUID(),
        userId: req.user.userId,
        cropType,
        soilType,
        n: nVal,
        p: pVal,
        k: kVal,
        location,
        fertilizerName,
        quantity,
        instructions,
        reason,
        timestamp: new Date().toISOString()
      };

      const history = getFertilizerHistory();
      history.push(recommendation);
      saveFertilizerHistory(history);

      res.json({ status: 'ok', ...recommendation });
    } catch (error) {
      console.error('[API] Fertilizer recommendation error:', error);
      res.json({ 
        status: 'ok', 
        fallback: true, 
        message: 'Using default recommendation due to server error',
        fertilizerName: 'NPK 19-19-19 (Balanced)',
        quantity: '50kg per acre',
        instructions: 'Apply as a basal dose.',
        reason: 'Server error occurred. Providing general recommendation.'
      });
    }
  });

  app.get('/api/fertilizer/history', authenticateToken, (req: any, res) => {
    try {
      console.log(`[API] Fetching fertilizer history for user: ${req.user.userId}`);
      const history = getFertilizerHistory();
      const userHistory = history.filter((item: any) => item.userId === req.user.userId);
      res.json({ 
        status: 'ok', 
        history: userHistory.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()) 
      });
    } catch (error) {
      console.error('[API] Fertilizer history error:', error);
      res.json({ status: 'ok', history: [], fallback: true, message: 'Failed to fetch history' });
    }
  });

  // --- Marketplace (Farmer Self-Marketing) ---
  app.post('/api/products', authenticateToken, upload.single('image'), (req: any, res) => {
    try {
      const { name, category, quantity, price, location, description } = req.body;

      if (!name || !category || !quantity || !price || !location) {
        return res.status(400).json({ status: 'error', error: 'Missing required fields' });
      }

      const products = getProducts();
      const newProduct = {
        productId: crypto.randomUUID(),
        name,
        category,
        quantity,
        price: Number(price),
        location,
        description,
        image: req.file ? `/uploads/${req.file.filename}` : null,
        sellerId: req.user.userId,
        sellerName: req.user.identifier, // Simplified
        createdAt: new Date().toISOString()
      };

      products.push(newProduct);
      saveProducts(products);

      res.status(201).json({ status: 'ok', product: newProduct });
    } catch (error) {
      console.error('[API] Product creation error:', error);
      res.json({ status: 'ok', fallback: true, message: 'Failed to create product' });
    }
  });

  app.get('/api/products', (req, res) => {
    try {
      const { name, category, location, minPrice, maxPrice } = req.query;
      let products = getProducts();

      if (name) {
        products = products.filter((p: any) => p.name.toLowerCase().includes((name as string).toLowerCase()));
      }
      if (category && category !== 'All') {
        products = products.filter((p: any) => p.category === category);
      }
      if (location) {
        products = products.filter((p: any) => p.location.toLowerCase().includes((location as string).toLowerCase()));
      }
      if (minPrice) {
        products = products.filter((p: any) => p.price >= Number(minPrice));
      }
      if (maxPrice) {
        products = products.filter((p: any) => p.price <= Number(maxPrice));
      }

      res.json({ 
        status: 'ok', 
        products: products.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) 
      });
    } catch (error) {
      console.error('[API] Fetch products error:', error);
      res.json({ status: 'ok', products: [], fallback: true, message: 'Failed to fetch products' });
    }
  });

  app.get('/api/products/:id', (req, res) => {
    try {
      const products = getProducts();
      const product = products.find((p: any) => p.productId === req.params.id);
      if (!product) return res.status(404).json({ status: 'error', error: 'Product not found' });

      // Get seller info
      const users = getUsers();
      const seller = Object.values(users).find((u: any) => u.id === product.sellerId) as any;
      
      res.json({
        status: 'ok',
        product: {
          ...product,
          sellerInfo: seller ? {
            name: seller.name || seller.identifier,
            identifier: seller.identifier,
            location: seller.location
          } : null
        }
      });
    } catch (error) {
      console.error('[API] Fetch product detail error:', error);
      res.json({ status: 'ok', product: null, fallback: true, message: 'Failed to fetch product details' });
    }
  });

  app.get('/api/products/user/:userId', (req, res) => {
    try {
      const products = getProducts();
      const userProducts = products.filter((p: any) => p.sellerId === req.params.userId);
      res.json({ 
        status: 'ok', 
        products: userProducts.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) 
      });
    } catch (error) {
      console.error('[API] Fetch user products error:', error);
      res.json({ status: 'ok', products: [], fallback: true, message: 'Failed to fetch user products' });
    }
  });

  app.delete('/api/products/:id', authenticateToken, (req: any, res) => {
    try {
      let products = getProducts();
      const product = products.find((p: any) => p.productId === req.params.id);

      if (!product) return res.status(404).json({ status: 'error', error: 'Product not found' });
      if (product.sellerId !== req.user.userId && req.user.role !== 'admin') {
        return res.status(403).json({ status: 'error', error: 'Unauthorized to delete this product' });
      }

      // Remove image if exists
      if (product.image) {
        const imagePath = path.join(uploadDir, path.basename(product.image));
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      }

      products = products.filter((p: any) => p.productId !== req.params.id);
      saveProducts(products);

      res.json({ status: 'ok', message: 'Product deleted successfully' });
    } catch (error) {
      console.error('[API] Delete product error:', error);
      res.json({ status: 'ok', fallback: true, message: 'Failed to delete product' });
    }
  });

  // Serve uploaded files
  app.use('/uploads', express.static(uploadDir));

  // --- History Routes ---
  app.get('/api/history', authenticateToken, (req: any, res) => {
    try {
      const history = getHistory();
      const userHistory = history.filter((item: any) => item.userId === req.user.userId);
      res.json({ 
        status: 'ok', 
        history: userHistory.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()) 
      });
    } catch (error) {
      console.error('[API] Fetch history error:', error);
      res.json({ status: 'ok', history: [], fallback: true, message: 'Failed to fetch history' });
    }
  });

  app.post('/api/history', authenticateToken, (req: any, res) => {
    try {
      const history = getHistory();
      const newEntry = {
        id: crypto.randomUUID(),
        ...req.body,
        userId: req.user.userId,
        timestamp: new Date().toISOString()
      };
      history.push(newEntry);
      saveHistory(history);
      res.status(201).json({ status: 'ok', entry: newEntry });
    } catch (error) {
      console.error('[API] Save history error:', error);
      res.json({ status: 'ok', fallback: true, message: 'Failed to save history' });
    }
  });

  // --- Auth Routes ---
  
  // Register
  app.post('/api/auth/register', authLimiter, async (req, res) => {
    try {
      const { identifier, password, type } = req.body;
      if (!identifier || !password || !type) {
        return res.status(400).json({ status: 'error', error: 'Identifier, password and type are required' });
      }

      const users = getUsers();
      if (users[identifier]) {
        return res.status(400).json({ status: 'error', error: 'User already exists' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = {
        id: crypto.randomUUID(),
        identifier,
        password: hashedPassword,
        type,
        role: 'farmer',
        createdAt: new Date().toISOString()
      };

      users[identifier] = user;
      saveUsers(users);

      const token = jwt.sign(
        { userId: user.id, identifier: user.identifier, role: user.role }, 
        JWT_SECRET, 
        { expiresIn: '7d' }
      );

      const { password: _, ...userWithoutPassword } = user;
      res.status(201).json({ status: 'ok', user: userWithoutPassword, token, isNewUser: true });
    } catch (error) {
      console.error('[API] Register error:', error);
      res.json({ status: 'ok', fallback: true, message: 'Registration failed due to server error' });
    }
  });

  // Login
  app.post('/api/auth/login', authLimiter, async (req, res) => {
    try {
      const { identifier, password } = req.body;
      if (!identifier || !password) {
        return res.status(400).json({ status: 'error', error: 'Identifier and password are required' });
      }

      const users = getUsers();
      const user = users[identifier];

      if (!user || !user.password) {
        return res.status(401).json({ status: 'error', error: 'Invalid credentials' });
      }

      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return res.status(401).json({ status: 'error', error: 'Invalid credentials' });
      }

      const token = jwt.sign(
        { userId: user.id, identifier: user.identifier, role: user.role }, 
        JWT_SECRET, 
        { expiresIn: '7d' }
      );

      const { password: _, ...userWithoutPassword } = user;
      res.json({ status: 'ok', user: userWithoutPassword, token, isNewUser: false });
    } catch (error) {
      console.error('[API] Login error:', error);
      res.json({ status: 'ok', fallback: true, message: 'Login failed due to server error' });
    }
  });

  // Change Password
  app.post('/api/auth/change-password', authenticateToken, async (req: any, res) => {
    try {
      const { oldPassword, newPassword } = req.body;
      if (!oldPassword || !newPassword) {
        return res.status(400).json({ status: 'error', error: 'Old and new passwords are required' });
      }

      const users = getUsers();
      const user = Object.values(users).find((u: any) => u.id === req.user.userId) as any;

      if (!user || !user.password) {
        return res.status(404).json({ status: 'error', error: 'User not found' });
      }

      const isValid = await bcrypt.compare(oldPassword, user.password);
      if (!isValid) {
        return res.status(401).json({ status: 'error', error: 'Invalid old password' });
      }

      user.password = await bcrypt.hash(newPassword, 10);
      users[user.identifier] = user;
      saveUsers(users);

      res.json({ status: 'ok', message: 'Password changed successfully' });
    } catch (error) {
      console.error('[API] Change password error:', error);
      res.json({ status: 'ok', fallback: true, message: 'Failed to change password' });
    }
  });

  // Password Reset Request (Send OTP)
  app.post('/api/auth/reset-password-request', authLimiter, async (req, res) => {
    try {
      const { identifier } = req.body;
      if (!identifier) return res.status(400).json({ status: 'error', error: 'Identifier is required' });

      const users = getUsers();
      if (!users[identifier]) {
        return res.status(404).json({ status: 'error', error: 'User not found' });
      }

      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const hashedOtp = await bcrypt.hash(otp, 10);
      const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

      otpStore.set(identifier, { hashedOtp, expiresAt, attempts: 0 });

      console.log(`[AUTH] Password Reset OTP for ${identifier}: ${otp}`);
      res.json({ status: 'ok', message: 'Reset OTP sent successfully', expiresAt });
    } catch (error) {
      console.error('[API] Reset password request error:', error);
      res.json({ status: 'ok', fallback: true, message: 'Failed to send reset OTP' });
    }
  });

  // Password Reset Confirm
  app.post('/api/auth/reset-password-confirm', async (req, res) => {
    try {
      const { identifier, otp, newPassword } = req.body;
      if (!identifier || !otp || !newPassword) {
        return res.status(400).json({ status: 'error', error: 'Identifier, OTP and new password are required' });
      }

      const storedData = otpStore.get(identifier);
      if (!storedData) return res.status(400).json({ status: 'error', error: 'OTP not found or expired' });

      if (Date.now() > storedData.expiresAt) {
        otpStore.delete(identifier);
        return res.status(400).json({ status: 'error', error: 'OTP expired' });
      }

      const isValid = await bcrypt.compare(otp, storedData.hashedOtp);
      if (!isValid) {
        storedData.attempts += 1;
        if (storedData.attempts >= 5) {
          otpStore.delete(identifier);
          return res.status(400).json({ status: 'error', error: 'Too many attempts. Please request a new OTP.' });
        }
        return res.status(400).json({ status: 'error', error: 'Invalid OTP' });
      }

      otpStore.delete(identifier);

      const users = getUsers();
      const user = users[identifier];
      if (!user) return res.status(404).json({ status: 'error', error: 'User not found' });

      user.password = await bcrypt.hash(newPassword, 10);
      saveUsers(users);

      res.json({ status: 'ok', message: 'Password reset successfully' });
    } catch (error) {
      console.error('[API] Reset password confirm error:', error);
      res.json({ status: 'ok', fallback: true, message: 'Failed to reset password' });
    }
  });

  // Deprecated OTP routes (for backward compatibility if needed, but we'll remove them from UI)
  app.post('/api/auth/send-otp', async (req, res) => {
    const { identifier } = req.body;
    if (!identifier) return res.status(400).json({ status: 'error', error: 'Identifier is required' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = await bcrypt.hash(otp, 10);
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
    otpStore.set(identifier, { hashedOtp, expiresAt, attempts: 0 });
    console.log(`[AUTH] OTP for ${identifier}: ${otp}`);
    res.json({ status: 'ok', message: 'OTP sent successfully', expiresAt });
  });

  app.post('/api/auth/verify-otp', async (req, res) => {
    const { identifier, otp } = req.body;
    if (!identifier || !otp) return res.status(400).json({ status: 'error', error: 'Identifier and OTP are required' });

    const storedData = otpStore.get(identifier);
    if (!storedData) return res.status(400).json({ status: 'error', error: 'OTP not found or expired' });

    const isValid = await bcrypt.compare(otp, storedData.hashedOtp);
    if (!isValid) return res.status(400).json({ status: 'error', error: 'Invalid OTP' });

    otpStore.delete(identifier);

    const users = getUsers();
    let user = users[identifier];
    let isNewUser = false;

    if (!user) {
      isNewUser = true;
      user = {
        id: identifier === '+910000000000' ? 'demo-user-9999999999' : crypto.randomUUID(),
        identifier,
        type: identifier.includes('@') ? 'email' : 'mobile',
        role: 'farmer',
        createdAt: new Date().toISOString()
      };
      users[identifier] = user;
      saveUsers(users);
    }

    const token = jwt.sign(
      { userId: user.id, identifier: user.identifier, role: user.role || 'farmer' }, 
      JWT_SECRET, 
      { expiresIn: '7d' }
    );

    res.json({ status: 'ok', user, token, isNewUser });
  });

  app.get('/api/auth/profile', authenticateToken, (req: any, res) => {
    try {
      const users = getUsers();
      const user = Object.values(users).find((u: any) => u.id === req.user.userId);
      if (!user) return res.status(404).json({ status: 'error', error: 'User not found' });
      res.json({ status: 'ok', ...(user as any) });
    } catch (error) {
      console.error('[API] Fetch profile error:', error);
      res.json({ status: 'ok', fallback: true, message: 'Failed to fetch profile' });
    }
  });

  app.post('/api/auth/update-profile', authenticateToken, (req: any, res) => {
    try {
      const { name, location, farmType, role } = req.body;
      const users = getUsers();
      const user = Object.values(users).find((u: any) => u.id === req.user.userId);

      if (!user) return res.status(404).json({ status: 'error', error: 'User not found' });

      const updatedUser = {
        ...(user as any),
        name: name || (user as any).name,
        location: location || (user as any).location,
        farmType: farmType || (user as any).farmType,
        role: role || (user as any).role || 'farmer'
      };

      users[(user as any).identifier] = updatedUser;
      saveUsers(users);

      res.json({ status: 'ok', ...updatedUser });
    } catch (error) {
      console.error('[API] Update profile error:', error);
      res.json({ status: 'ok', fallback: true, message: 'Failed to update profile' });
    }
  });
  // --- End Auth Routes ---

  // Weather API Route
  app.get('/api/weather/:city', async (req, res) => {
    const { city } = req.params;
    const { lat, lon } = req.query;
    const apiKey = process.env.WEATHER_API_KEY || '19927003d654bcd63f64e32840eeba91';

    const fallbackData = {
      status: 'ok', 
      city: city || 'Unknown',
      temp: 25,
      humidity: 60,
      windSpeed: 5,
      condition: 'Clear',
      description: 'Clear sky (Fallback)',
      icon: '01d',
      uvIndex: 'Moderate',
      insights: ["Weather data currently unavailable. Showing seasonal averages."],
      forecast: [],
      fallback: true
    };

    if (!apiKey || apiKey === 'YOUR_OPENWEATHERMAP_API_KEY') {
      console.warn('[API] Weather API key not configured');
      return res.json(fallbackData);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      let currentUrl = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`;
      let forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${apiKey}&units=metric`;

      if (lat && lon) {
        currentUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;
        forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;
      }

      // Fetch current weather
      const currentRes = await fetch(currentUrl, { 
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      
      if (!currentRes.ok) {
        clearTimeout(timeoutId);
        console.warn(`[API] Weather API responded with ${currentRes.status}`);
        return res.json(fallbackData);
      }
      const currentData = await currentRes.json();

      // Fetch 5-day forecast
      const forecastRes = await fetch(forecastUrl, { 
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      const forecastData = await forecastRes.json();
      clearTimeout(timeoutId);

      // Simple AI Advisory Logic (Rule-based as requested)
      const insights: string[] = [];
      const temp = currentData.main.temp;
      const humidity = currentData.main.humidity;
      const weatherMain = currentData.weather[0].main.toLowerCase();

      if (humidity > 70 && (weatherMain.includes('rain') || weatherMain.includes('drizzle'))) {
        insights.push("High humidity & rainfall detected. Suitable for water-intensive crops like Rice or Sugarcane.");
        insights.push("High fungal risk due to moisture. Avoid Tomato or Potato exposure if possible.");
      } else if (temp > 30 && humidity < 40) {
        insights.push("Low humidity & high temperature. Suitable for drought-resistant crops like Millet or Cotton.");
        insights.push("Ensure adequate irrigation to prevent soil moisture depletion.");
      } else if (temp < 15) {
        insights.push("Cooler temperatures detected. Suitable for Rabi crops like Wheat or Mustard.");
      } else {
        insights.push("Moderate weather conditions. Good for a variety of seasonal vegetables.");
      }

      if (currentData.wind.speed > 20) {
        insights.push("Strong winds detected. Secure young saplings and avoid spraying pesticides.");
      }

      // Process forecast to get daily highs/lows (simplified)
      const dailyForecast = forecastData.list ? forecastData.list.filter((_: any, index: number) => index % 8 === 0).map((item: any) => ({
        date: item.dt_txt.split(' ')[0],
        temp: Math.round(item.main.temp),
        condition: item.weather[0].main,
        icon: item.weather[0].icon
      })) : [];

      res.json({
        status: 'ok',
        city: currentData.name,
        temp: Math.round(currentData.main.temp),
        humidity: currentData.main.humidity,
        windSpeed: currentData.wind.speed,
        condition: currentData.weather[0].main,
        description: currentData.weather[0].description,
        icon: currentData.weather[0].icon,
        uvIndex: "Moderate",
        insights,
        forecast: dailyForecast
      });
    } catch (error: any) {
      clearTimeout(timeoutId);
      console.warn('[API] Weather API error:', error.message);
      res.json(fallbackData);
    }
  });

  // Market API Route (Data.gov.in Proxy)
  app.get('/api/market', async (req, res) => {
    try {
      console.log(`[API] Fetching market data: ${req.url}`);
      const apiKey = process.env.MARKET_API_KEY || '579b464db66ec23bdd0000012ed5666eba6749fd7423718378c732ff';
      const { state, district, commodity, limit = 100 } = req.query;
      const cacheKey = buildMarketCacheKey({
        state: state as string | undefined,
        district: district as string | undefined,
        commodity: commodity as string | undefined,
        limit: limit as string | undefined,
      });

      const baseUrl = new URL(`https://api.data.gov.in/resource/${MARKET_RESOURCE_ID}`);
      baseUrl.searchParams.set('api-key', apiKey);
      baseUrl.searchParams.set('format', 'json');
      baseUrl.searchParams.set('limit', '100');
      baseUrl.searchParams.set('offset', '0');

      if (state && state !== 'All States') {
        baseUrl.searchParams.set('filters[state]', state as string);
      }
      if (district && district !== 'All Districts' && district !== state) {
        baseUrl.searchParams.set('filters[district]', district as string);
      }
      if (commodity) {
        baseUrl.searchParams.set('filters[commodity]', commodity as string);
      }

      console.log('FINAL API URL:', baseUrl.toString());

      try {
        const liveData = await fetchMarketWithRetry(baseUrl.toString(), 3);

        if (!liveData.records || liveData.records.length === 0) {
          throw new Error('Market API returned empty records');
        }

        marketCache.set(cacheKey, {
          data: liveData,
          fetchedAt: Date.now(),
        });

        return res.json({
          status: 'ok',
          ...liveData,
        });
      } catch (error: any) {
        console.warn('[API] Live market fetch failed:', error.message);

        const cachedData = getCachedMarketData(cacheKey);
        if (cachedData) {
          return res.json({
            status: 'ok',
            ...cachedData,
          });
        }

        const backupRecords = filterBackupMarketData({
          state: state as string | undefined,
          district: district as string | undefined,
          commodity: commodity as string | undefined,
        });

        return res.json({
          status: 'ok',
          records: backupRecords,
          count: backupRecords.length,
          source: 'backup',
          fallback: true,
          message: 'Using local backup market data.',
        });
      }
    } catch (error) {
      console.error('[API] Market route critical error:', error);
      const backupRecords = filterBackupMarketData({});
      res.json({
        status: 'ok',
        records: backupRecords,
        count: backupRecords.length,
        source: 'backup',
        fallback: true,
        message: 'Critical error in market route. Using local backup market data.',
      });
    }
  });

  // Chatbot API Route - DEPRECATED (Moved to Frontend)
  app.post('/api/chat', async (req, res) => {
    res.status(410).json({ status: 'error', error: 'This endpoint has moved to the frontend' });
  });

  // Image-based Disease Detection in Chat - DEPRECATED (Moved to Frontend)
  app.post('/api/chat/image', upload.single('image'), async (req, res) => {
    res.status(410).json({ status: 'error', error: 'This endpoint has moved to the frontend' });
  });

  // Catch-all for API routes that don't match
  app.all('/api/*', (req, res) => {
    console.warn(`[API] 404 Not Found: ${req.method} ${req.url}`);
    res.status(404).json({ status: 'error', error: `API route not found: ${req.method} ${req.url}` });
  });

  // Vite middleware for local development. Vercel serves the built frontend
  // separately, so serverless API functions should only register API routes.
  if (!process.env.VERCEL && process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else if (!process.env.VERCEL) {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  return app;
}

async function startServer() {
  const PORT = Number(process.env.PORT) || 3000;
  const app = await createApp();

  app.listen(PORT, '0.0.0.0', async () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}
