'use client';

import React, { useState, useEffect, useRef } from 'react';
import { FaRegBookmark, FaBell, FaSearch, FaCheckCircle, FaPlus, FaMinus } from 'react-icons/fa';
import { GiSettingsKnobs } from "react-icons/gi";
import { FiBriefcase } from 'react-icons/fi';
import { HiOutlineNewspaper } from 'react-icons/hi2';
import { TbBriefcaseOff } from "react-icons/tb";
import { MdSearchOff } from "react-icons/md";
import { TbNewsOff } from "react-icons/tb";

import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Brush, CartesianGrid, Cell } from 'recharts';
import { Drawer } from 'vaul';

//================================================================
// 1. TYPE DEFINITIONS
//================================================================

type CurrentView = 'home' | 'watchlist' | 'portfolio' | 'news';
type ActionType = 'BUY' | 'SELL';

type SelectableStock = Stock | HoldingStock | PositionStock;
type WState = Record<string, string[]>;

interface Stock {
  id: string;
  name: string;
  exchange: string;
  currentPrice: number;
  previousDayPrice: number;
}

interface HoldingStock {
  id: string;
  name: string;
  exchange: string;
  quantity: number;
  avgBuyPrice: number;
  currentMarketPrice: number;
}

interface PositionStock {
  id: string;
  name: string;
  exchange: string;
  quantity: number;
  entryPrice: number;
  currentMarketPrice: number;
  type: 'BUY' | 'SELL';
}

interface NewsArticle {
  id: string;
  imageUrl: string;
  title: string;
  description: string;
  stockSymbol: string;
  category: string;
}

interface PriceAlert {
  id: number;
  stockId: string;
  stockName: string;
  targetPrice: number;
  direction: 'up' | 'down';
  triggered: boolean;
}

interface StockChartProps {
  chartType: 'Line' | 'Candle';
  activeTimeline: keyof typeof CHART_DATA_SETS;
}

interface CustomNotificationProps {
  visible: boolean;
  message: string;
  description: string;
  type: string;
}

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (quantity: number, transactionType?: 'holding' | 'position') => void;
  stock: SelectableStock | null;
  action: ActionType;
  ownedQuantity?: number;
}

interface AlertCreationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  stock: SelectableStock | null;
  onSetAlert: (price: number) => void;
}

interface StockDetailSheetProps {
  stock: SelectableStock | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSetAlert: (stock: SelectableStock, price: number) => void;
  onBuy: (stock: SelectableStock, quantity: number, transactionType: 'holding' | 'position') => void;
  onSell: (stock: SelectableStock, quantity: number, assetType: 'holding' | 'position') => void;
}

interface StockItemProps {
  stock: Stock;
  onStockClick: (stock: Stock) => void;
  isAdded: boolean;
  isEditActive: boolean;
  onAdd: () => void;
  onRemove: () => void;
}

interface HoldingStockItemProps {
  stock: HoldingStock;
  onStockClick: (stock: HoldingStock) => void;
}

interface PositionStockItemProps {
  stock: PositionStock;
  onStockClick: (stock: PositionStock) => void;
}

interface NewsItemProps {
  article: NewsArticle;
}

interface SummaryCardProps {
  investedAmount: number;
  currentAmount: number;
  profit: number;
  profitPercentage?: number;
  showPercentagePL: boolean;
}

interface BottomNavBarProps {
  onNavClick: (view: CurrentView) => void;
  currentView: CurrentView;
}

interface WatchlistPageProps {
  onStockSelect: (stock: SelectableStock) => void;
  allStocks: Stock[];
  watchList: Record<string, string[]>;
  onAddStock: (stockId: string, watchListName: string) => void;
  onRemoveStock: (stockId: string, watchListName: string) => void;
}

interface PortfolioPageProps {
  onStockSelect: (stock: SelectableStock) => void;
  holdings: HoldingStock[];
  positions: PositionStock[];
}

//================================================================
// 2. DUMMY DATA & HELPERS
//================================================================

// --- Chart Data Generation ---
const generateOHLCData = (numPoints: number, period: 'hour' | 'day', basePrice: number, volatility: number) => {
  const data = [];
  let lastClose = basePrice;

  for (let i = 0; i < numPoints; i++) {
    const date = new Date();
    if (period === 'hour') date.setHours(new Date().getHours() - (numPoints - 1 - i));
    if (period === 'day') date.setDate(new Date().getDate() - (numPoints - 1 - i));

    const open = lastClose;
    const close = open + (Math.random() - 0.5) * volatility;
    const high = Math.max(open, close) + Math.random() * (volatility / 2);
    const low = Math.min(open, close) - Math.random() * (volatility / 2);

    data.push({
      date: date.toISOString(),
      body: [open, close],
      ohlc: {
        open: open.toFixed(2),
        high: high.toFixed(2),
        low: low.toFixed(2),
        close: close.toFixed(2),
      },
    });
    lastClose = close;
  }
  return data;
};

// --- Static Data ---
const CHART_DATA_SETS = {
  '6H': generateOHLCData(6, 'hour', 175, 1.5),
  '1D': generateOHLCData(24, 'hour', 178, 2),
  '5D': generateOHLCData(5, 'day', 180, 5),
  '1M': generateOHLCData(30, 'day', 185, 8),
  '6M': generateOHLCData(180, 'day', 200, 15),
  '1Y': generateOHLCData(365, 'day', 220, 25),
  'All': generateOHLCData(500, 'day', 150, 30),
};

const DUMMY_STOCKS: Stock[] = [
  { id: '1', name: 'AAPL', exchange: 'NASDAQ', currentPrice: 175.50, previousDayPrice: 174.00 },
  { id: '2', name: 'MSFT', exchange: 'NASDAQ', currentPrice: 420.10, previousDayPrice: 425.00 },
  { id: '3', name: 'GOOGL', exchange: 'NASDAQ', currentPrice: 155.20, previousDayPrice: 153.50 },
  { id: '4', name: 'AMZN', exchange: 'NASDAQ', currentPrice: 185.00, previousDayPrice: 186.20 },
  { id: '5', name: 'TSLA', exchange: 'NASDAQ', currentPrice: 170.80, previousDayPrice: 168.00 },
  { id: '6', name: 'RELIANCE', exchange: 'NSE', currentPrice: 2900.50, previousDayPrice: 2880.00 },
  { id: '8', name: 'TCS', exchange: 'NSE', currentPrice: 3800.00, previousDayPrice: 3810.00 },
  { id: '9', name: 'ONGC', exchange: 'NSE', currentPrice: 242.22, previousDayPrice: 235.30 },
  { id: '10', name: 'NTPCGREEN', exchange: 'BSE', currentPrice: 112.80, previousDayPrice: 111.00 },
  { id: '11', name: 'NVDA', exchange: 'NASDAQ', currentPrice: 121.50, previousDayPrice: 120.90 },
  { id: '12', name: 'META', exchange: 'NASDAQ', currentPrice: 475.20, previousDayPrice: 478.00 },
  { id: '13', name: 'JPM', exchange: 'NYSE', currentPrice: 195.80, previousDayPrice: 196.10 },
  { id: '14', name: 'V', exchange: 'NYSE', currentPrice: 278.40, previousDayPrice: 275.90 },
  { id: '15', name: 'JNJ', exchange: 'NYSE', currentPrice: 148.10, previousDayPrice: 148.50 },
  { id: '16', name: 'INFY', exchange: 'NSE', currentPrice: 1450.75, previousDayPrice: 1460.00 },
  { id: '17', name: 'HDFCBANK', exchange: 'NSE', currentPrice: 1530.50, previousDayPrice: 1525.00 },
  { id: '18', name: 'SBIN', exchange: 'NSE', currentPrice: 835.20, previousDayPrice: 830.00 },
  { id: '19', name: 'TATAMOTORS', exchange: 'NSE', currentPrice: 970.00, previousDayPrice: 975.50 },
  { id: '20', name: 'ICICIBANK', exchange: 'NSE', currentPrice: 1120.80, previousDayPrice: 1125.00 },
];

const DUMMY_HOLDINGS: HoldingStock[] = [
  { id: 'h1', name: 'RELIANCE', exchange: 'NSE', quantity: 10, avgBuyPrice: 2800.00, currentMarketPrice: 2900.50 },
  { id: 'h2', name: 'TCS', exchange: 'NSE', quantity: 5, avgBuyPrice: 3850.00, currentMarketPrice: 3800.00 },
  { id: 'h3', name: 'AAPL', exchange: 'NASDAQ', quantity: 2, avgBuyPrice: 170.00, currentMarketPrice: 175.50 },
];

const DUMMY_POSITIONS: PositionStock[] = [
  { id: 'p1', name: 'INFY', exchange: 'NSE', quantity: 20, entryPrice: 1500.00, currentMarketPrice: 1450.75, type: 'BUY' },
  { id: 'p2', name: 'HDFCBANK', exchange: 'NSE', quantity: 15, entryPrice: 1470.00, currentMarketPrice: 1530.50, type: 'SELL' },
];

const DUMMY_NEWS_CATEGORIES: string[] = ['All', 'New', 'Discover', 'Following', 'Hot', 'Breaking', 'Market Analysis', 'Tech'];

const DUMMY_NEWS_ARTICLES: NewsArticle[] = [
  { id: 'n1', imageUrl: 'https://images.unsplash.com/photo-1556740714-a8395b3bf30f?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D', title: 'AAPL hits record high after iPhone sales surge', description: 'Apple shares surged today following unexpectedly strong iPhone sales figures.', stockSymbol: 'AAPL', category: 'Hot' },
  { id: 'n2', imageUrl: 'https://images.unsplash.com/photo-1501167786227-4cba60f6d58f?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D', title: 'RBI rate hike expected next quarter', description: 'Analysts predict a 25 basis point hike by the Reserve Bank of India.', stockSymbol: 'NIFTY', category: 'Market Analysis' },
  { id: 'n3', imageUrl: 'https://plus.unsplash.com/premium_photo-1683121710572-7723bd2e235d?q=80&w=1932&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D', title: 'Microsoft acquires AI startup for $500M', description: 'Microsoft continues its aggressive push into AI with this new acquisition.', stockSymbol: 'MSFT', category: 'New' },
  { id: 'n4', imageUrl: 'https://plus.unsplash.com/premium_photo-1676637656166-cb7b3a43b81a?q=80&w=1932&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D', title: 'Infosys Secures Major AI Contract in Europe', description: 'Indian tech giant Infosys has announced a multi-year deal to provide AI and cloud services to a leading European retailer.', stockSymbol: 'INFY', category: 'New' },
  { id: 'n5', imageUrl: 'https://plus.unsplash.com/premium_photo-1683120793196-0797cec08a7d?q=80&w=1974&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D', title: 'Tesla Unveils New Battery Tech, Promises Longer Range', description: 'At its annual investor day, Tesla showcased a new battery architecture that could significantly boost the range of its electric vehicles.', stockSymbol: 'TSLA', category: 'Tech' },
  { id: 'n6', imageUrl: 'https://plus.unsplash.com/premium_photo-1664476845274-27c2dabdd7f0?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D', title: 'SEBI Proposes T+0 Settlement Cycle by End of Year', description: 'The Securities and Exchange Board of India is planning to introduce a same-day settlement cycle to improve market efficiency and liquidity.', stockSymbol: 'SENSEX', category: 'Breaking' },
  { id: 'n7', imageUrl: 'https://images.unsplash.com/photo-1613665641266-7bb90dd86a8b?q=80&w=2071&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D', title: 'Reliance Industries to Invest ₹15,000 Crore in Green Hydrogen', description: 'As part of its ambitious green energy push, Reliance has earmarked a significant investment for building new hydrogen production facilities.', stockSymbol: 'RELIANCE', category: 'Following' },
  { id: 'n8', imageUrl: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D', title: 'Auto Sector Soars as Tata Motors Reports Record EV Sales', description: 'Tata Motors posted a 70% year-on-year increase in electric vehicle sales, driving a rally in auto stocks on the NSE.', stockSymbol: 'TATAMOTORS', category: 'Hot' },
  { id: 'n9', imageUrl: 'https://images.unsplash.com/photo-1682068548081-50aa8b92c8c1?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D', title: 'NVIDIA Stock Jumps on Strong Earnings and AI Chip Demand', description: 'NVIDIA surpassed analyst expectations with a stellar quarterly report, citing unprecedented demand for its AI hardware.', stockSymbol: 'NVDA', category: 'Hot' },
];

//================================================================
// 3. REUSABLE & CHILD COMPONENTS
//================================================================

// --- Charting Components ---

const StockChart: React.FC<StockChartProps> = ({ chartType, activeTimeline }) => {
  const data = CHART_DATA_SETS[activeTimeline];

  const isHourly = activeTimeline === '6H' || activeTimeline === '1D';

  const formatXAxis = (isoString: string) => {
    const date = new Date(isoString);
    if (isHourly) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    } else {
      return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
    }
  };

  return (
    <div style={{ width: '100%', height: 'clamp(250px, 35vh, 400px)' }}>
      <ResponsiveContainer width="100%" height="100%">
        {chartType === 'Line' ? (
          <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" opacity={0.6} />
            <XAxis
              dataKey="date"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              stroke="#5c5e62"
              tickFormatter={formatXAxis}
            />
            <YAxis
              dataKey="ohlc.close"
              domain={['dataMin - 5', 'dataMax + 5']}
              fontSize={12}
              tickLine={false}
              axisLine={false}
              stroke="#5c5e62"
              tickFormatter={(value) => `$${Number(value).toFixed(0)}`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                fontSize: '14px',
                color: '#5c5e62'
              }}
              labelStyle={{ color: '#5d93e3', fontWeight: 'bold' }}
              cursor={{ stroke: '#5d93e3', strokeDasharray: '3 3' }}
            />
            <Line type="monotone" dataKey="ohlc.close" name="Price" stroke="#5d93e3" strokeWidth={2} dot={false} />
            <Brush
              dataKey="date"
              height={20}
              stroke="#5d93e3"
              fill="rgba(93, 147, 227, 0.1)"
              travellerWidth={10}
              tickFormatter={formatXAxis}
            >
            </Brush>
          </LineChart>
        ) : (
          <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" opacity={0.6} />
            <XAxis
              dataKey="date"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              stroke="#5c5e62"
              tickFormatter={formatXAxis}
            />
            <YAxis
              domain={['dataMin - 2', 'dataMax + 2']}
              fontSize={12}
              tickLine={false}
              axisLine={false}
              stroke="#5c5e62"
              tickFormatter={(value) => `$${Number(value).toFixed(0)}`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                fontSize: '14px',
                color: '#5c5e62'
              }}
              labelStyle={{ color: '#5d93e3', fontWeight: 'bold' }}
              cursor={{ stroke: '#5d93e3', strokeDasharray: '3 3' }}
            />
            <Bar dataKey="body" name="Price OHLC">
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.ohlc.close >= entry.ohlc.open ? '#22c55e' : '#ef4444'} />
              ))}
            </Bar>
            <Brush
              dataKey="date"
              height={20}
              stroke="#5d93e3"
              fill="rgba(93, 147, 227, 0.1)"
              travellerWidth={10}
              tickFormatter={formatXAxis}
            >
            </Brush>
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
};

// --- Notifications  ---

const CustomNotification: React.FC<CustomNotificationProps> = ({ visible, message, description, type }) => {
  const isSuccess = type === 'success';
  const IconComponent = isSuccess ? FaCheckCircle : FaBell;
  const iconColorClass = isSuccess ? 'text-green-500' : 'text-blue-600';

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return;
    }

    if (visible && !isSuccess) {
      if (Notification.permission === 'granted') {
        new Notification(message, {
          body: description,
          icon: 'https://plus.unsplash.com/premium_vector-1731740566836-bb12e5b8711d?q=80&w=2360&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
        });
      }
    }
  }, [isSuccess, visible, type, message, description]);
  return (
    <div
      className={`
        fixed bottom-[25%] left-1/2 -translate-x-1/2
        z-[100] transition-all duration-300 ease-in-out
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5 pointer-events-none'}
      `}
    >
      <div className="bg-white rounded-xl shadow-lg p-4 w-80 flex items-center border border-gray-200">
        <div className="flex-shrink-0">
          <IconComponent className={`h-6 w-6 ${iconColorClass}`} />
        </div>
        <div className="ml-4 flex-grow">
          <p className="font-bold text-md text-[#5c5e62]">{message}</p>
          <p className="text-sm text-gray-500 mt-0.5">{description}</p>
        </div>
      </div>
    </div>
  );
};

const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, subtitle }) => {
  return (
    <div className="text-center py-24 px-5 text-[#5c5e62]">
      <div className="flex justify-center mb-4">
        {icon}
      </div>
      <h3 className="text-xl font-bold">{title}</h3>
      <p className="text-md mt-2">{subtitle}</p>
    </div>
  );
};

// --- Dialogs & Sheets ---

const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({ isOpen, onClose, onConfirm, stock, action, ownedQuantity = 0 }) => {
  const [quantity, setQuantity] = useState('');
  const [error, setError] = useState('');
  const [transactionType, setTransactionType] = useState<'holding' | 'position'>('holding');

  // Effect to reset state when the dialog opens
  useEffect(() => {
    if (isOpen) {
      setQuantity('');
      setError('');
      setTransactionType('holding');
    }
  }, [isOpen]);

  useEffect(() => {
    const numVal = parseInt(quantity, 10);
    // Don't show an error for an empty input, the confirm button will be disabled anyway.
    if (!quantity) {
      setError('');
      return;
    }

    if (isNaN(numVal) || numVal <= 0) {
      setError('Please enter a valid, positive quantity.');
    } else if (action === 'SELL' && numVal > ownedQuantity) {
      setError(`You can only sell up to ${ownedQuantity} shares.`);
    } else {
      // If all checks pass, clear any existing error.
      setError('');
    }
  }, [quantity, ownedQuantity, action]); // Dependencies for re-validation

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuantity(e.target.value);
  };

  const handleConfirmClick = () => {
    if (!error && quantity) {
      onConfirm(parseInt(quantity, 10), action === 'BUY' ? transactionType : undefined);
    }
  };


  if (!isOpen || !stock) {
    return null;
  }

  const getCurrentPrice = (s: SelectableStock): number => 'currentMarketPrice' in s ? s.currentMarketPrice : s.currentPrice;
  const currentPrice = getCurrentPrice(stock);
  const numericQuantity = parseInt(quantity, 10) || 0;
  const totalPrice = currentPrice * numericQuantity;
  const isButtonDisabled = !!error || !quantity;
  const actionButtonClass = action === 'BUY'
    ? 'bg-blue-600 hover:bg-blue-700'
    : 'bg-red-500 hover:bg-red-600';

  const CloseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );

  return (
    <Drawer.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 z-[60]" />
        <Drawer.Content className="fixed inset-0 z-[70] flex flex-col p-6 font-sans bg-[#ebecee] text-[#5c5e62] outline-none focus:outline-none">
          <div className="w-full h-full flex flex-col" onClick={(e) => e.stopPropagation()}>
            <header className="flex-shrink-0">
              <div className="flex justify-between items-start">
                <div>
                  <Drawer.Title className="text-4xl font-bold tracking-tight text-[#5c5e62]">
                    {action} {stock.name}
                  </Drawer.Title>
                  <Drawer.Description className="text-lg text-gray-500">
                    {stock.exchange}
                  </Drawer.Description>
                </div>
                <button onClick={onClose} className="p-2 -mr-2 text-gray-500 hover:text-gray-900 transition-colors">
                  <CloseIcon />
                </button>
              </div>
              <div className="mt-6">
                <p className="text-sm text-gray-500">Current Market Price</p>
                <p className="text-5xl font-bold text-[#5c5e62]">${currentPrice.toFixed(2)}</p>
              </div>
            </header>

            <main className="flex-grow flex flex-col justify-center items-center py-10">
              <label htmlFor="quantity" className="text-lg text-gray-600">
                Quantity
              </label>
              <input
                id="quantity"
                type="number"
                value={quantity}
                onChange={handleQuantityChange}
                placeholder="0"
                className="bg-transparent text-[#5c5e62] placeholder:text-gray-400 text-7xl font-bold text-center w-full focus:outline-none mt-2"
                autoFocus
              />
              {error && <p className="text-red-500 text-sm mt-4 -translate-y-4">{error}</p>}

              {action === 'BUY' && (
                <div className="mt-6 flex justify-center items-center p-1 bg-gray-300/50 rounded-lg">
                  <button
                    onClick={() => setTransactionType('holding')}
                    className={`px-6 py-2 text-sm font-bold rounded-md transition-colors ${transactionType === 'holding' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600'}`}
                  >
                    Holding
                  </button>
                  <button
                    onClick={() => setTransactionType('position')}
                    className={`px-6 py-2 text-sm font-bold rounded-md transition-colors ${transactionType === 'position' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600'}`}
                  >
                    Position
                  </button>
                </div>
              )}
            </main>

            <footer className="flex-shrink-0 space-y-4">
              <div className="flex justify-between items-center text-lg">
                <span className="text-gray-600">Total Estimated Price</span>
                <span className="font-bold text-2xl text-[#5c5e62]">
                  ${totalPrice.toFixed(2)}
                </span>
              </div>
              <button
                onClick={handleConfirmClick}
                disabled={isButtonDisabled}
                className={`w-full text-white font-bold text-lg p-4 rounded-lg transition-colors ${actionButtonClass} disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed`}
              >
                Confirm {action}
              </button>
            </footer>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
};



const AlertCreationDialog: React.FC<AlertCreationDialogProps> = ({ isOpen, onClose, stock, onSetAlert }) => {
  const [price, setPrice] = useState('');

  useEffect(() => {
    if (isOpen) {
      setPrice('');
    }
  }, [isOpen]);

  const handleSetAlertClick = async () => {
    const priceValue = parseFloat(price);
    if (isNaN(priceValue) || priceValue <= 0) {
      console.error("Invalid price entered for the alert.");
      return;
    }

    if ("Notification" in window && Notification.permission === "default") {
      console.log("Requesting notification permission...");
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        console.log("Notification permission granted.");
      } else {
        console.log("Notification permission was denied.");
      }
    }
    onSetAlert(priceValue);
  };

  const CloseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );

  if (!stock) return null;

  const getCurrentPrice = (s: SelectableStock): number => 'currentMarketPrice' in s ? s.currentMarketPrice : s.currentPrice;
  const currentPrice = getCurrentPrice(stock);

  return (
    <Drawer.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 z-[60]" />
        <Drawer.Content className="fixed inset-0 z-[70] flex flex-col p-6 font-sans bg-[#ebecee] text-[#5c5e62] outline-none focus:outline-none">
          <div
            className="w-full h-full flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Section */}
            <header className="flex-shrink-0">
              <div className="flex justify-between items-start">
                <div>
                  <Drawer.Title className="text-4xl font-bold tracking-tight text-[#5c5e62]">
                    {stock.name}
                  </Drawer.Title>
                  <Drawer.Description className="text-lg text-gray-500">
                    {stock.exchange}
                  </Drawer.Description>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 -mr-2 text-gray-500 hover:text-gray-900 transition-colors"
                >
                  <CloseIcon />
                </button>
              </div>
              <div className="mt-6">
                <p className="text-sm text-gray-500">Current Price</p>
                <p className="text-5xl font-bold text-[#5c5e62]">${currentPrice.toFixed(2)}</p>
              </div>
            </header>

            {/* Main Input Section */}
            <main className="flex-grow flex flex-col justify-center items-center py-10">
              <label
                htmlFor="alert-price"
                className="text-lg text-gray-600"
              >
                Alert me when price is above:
              </label>
              <input
                id="alert-price"
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder={currentPrice.toFixed(2)}
                className="bg-transparent text-[#5c5e62] placeholder:text-gray-400 text-7xl font-bold text-center w-full focus:outline-none mt-2"
                autoFocus
              />
            </main>

            {/* Footer Button */}
            <footer className="flex-shrink-0">
              <button
                onClick={handleSetAlertClick}
                disabled={!price}
                className="w-full bg-blue-600 text-white font-bold text-lg p-4 rounded-lg transition-colors hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
              >
                Set Alert
              </button>
            </footer>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
};

const StockDetailSheet: React.FC<StockDetailSheetProps> = ({ stock, open, onOpenChange, onSetAlert, onBuy, onSell }) => {
  const [activeTimeline, setActiveTimeline] = useState<keyof typeof CHART_DATA_SETS>('1D');
  const [chartType, setChartType] = useState<'Line' | 'Candle'>('Line');
  const [isAlertDialogOpen, setAlertDialogOpen] = useState(false);
  const [isConfirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<ActionType>('BUY');

  if (!stock) return null;

  const getProfitLossDetails = (s: SelectableStock) => {
    let change = 0;
    let percentage = 0;
    let label = 'Today';
    let isTotalProfit = false;

    const currentPrice = 'currentMarketPrice' in s ? s.currentMarketPrice : s.currentPrice;

    if ('avgBuyPrice' in s) { // It's a HoldingStock
      label = 'Total P&L';
      isTotalProfit = true;
      const investedValue = s.avgBuyPrice * s.quantity;
      change = s.currentMarketPrice * s.quantity - investedValue;
      percentage = investedValue > 0 ? (change / investedValue) * 100 : 0;
    } else if ('entryPrice' in s) { // It's a PositionStock
      label = 'Position P&L';
      isTotalProfit = true;
      const entryValue = s.entryPrice * s.quantity;
      if (s.type === 'SELL') {
        change = (s.entryPrice - s.currentMarketPrice) * s.quantity;
      } else {
        change = (s.currentMarketPrice - s.entryPrice) * s.quantity;
      }
      percentage = entryValue > 0 ? (Math.abs(change) / entryValue) * 100 : 0;
    } else if ('previousDayPrice' in s) { // It's a generic Watchlist Stock
      label = "Today P&L";
      change = currentPrice - s.previousDayPrice;
      percentage = s.previousDayPrice > 0 ? (change / s.previousDayPrice) * 100 : 0;
    }

    const colorClass = change >= 0 ? 'text-green-600' : 'text-red-600';
    const sign = change >= 0 ? '+' : '';

    return { change, percentage, colorClass, sign, label, isTotalProfit };
  };

  const { change, percentage, colorClass, sign, label, isTotalProfit } = getProfitLossDetails(stock);

  const timelines = Object.keys(CHART_DATA_SETS) as Array<keyof typeof CHART_DATA_SETS>;
  const handleSetAlert = (price: number) => { onSetAlert(stock, price); setAlertDialogOpen(false); };
  const handleActionClick = (type: ActionType) => { setActionType(type); setConfirmDialogOpen(true); };
  const isOwned = stock && 'quantity' in stock;

  const handleConfirmAction = (quantity: number, transactionType?: 'holding' | 'position') => {
    if (actionType === 'BUY' && transactionType) {
      onBuy(stock, quantity, transactionType);
    } else if (actionType === 'SELL') {
      const assetTypeToSell = 'avgBuyPrice' in stock ? 'holding' : 'position';
      onSell(stock, quantity, assetTypeToSell);
    }
    setConfirmDialogOpen(false);
  };

  const getOwnedQuantity = () => {
    if (isOwned) {
      return (stock as HoldingStock | PositionStock).quantity;
    }
    return 0;
  };

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50" />
        <Drawer.Content className="bg-[#ebecee] flex flex-col rounded-t-[2rem] h-[75%] fixed bottom-0 left-0 right-0 z-50 text-[#5c5e62] shadow-lg outline-none focus:outline-none">
          <div className="p-3 bg-white rounded-t-[2rem] flex-shrink-0">
            <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-gray-300" />
          </div>
          <div className="flex flex-col px-5 pb-4 border-b border-gray-200 flex-shrink-0 bg-white">
            <Drawer.Title className="font-bold text-3xl text-[#5c5e62]">
              {stock.name}
            </Drawer.Title>
            <div className="flex items-center text-sm mt-1">
              <Drawer.Description className="text-lg text-gray-500">
                {stock.exchange}
              </Drawer.Description>
              <span className={`ml-3 font-semibold ${colorClass}`}>
                {sign}{isTotalProfit ? `$${Math.abs(change).toFixed(2)}` : change.toFixed(2)} ({sign}{percentage.toFixed(2)}%) {label}
              </span>
            </div>
          </div>
          <div className="flex-grow px-5 py-4 bg-white">
            <div className="grid grid-cols-2 gap-3 mb-5">
              <button
                onClick={() => handleActionClick('BUY')}
                className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Buy
              </button>
              <button
                onClick={() => handleActionClick('SELL')}
                disabled={!isOwned}
                className="w-full bg-red-500 text-white font-bold py-3 rounded-lg hover:bg-red-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                Sell
              </button>
            </div>
            <div className="flex justify-between items-center mb-4">
              <button
                onClick={() => setAlertDialogOpen(true)}
                className="flex items-center text-blue-600 font-semibold text-sm p-2 rounded-md hover:bg-blue-50 transition-colors"
              >
                <FaBell className="mr-2" /> Set Alert
              </button>
              <select
                value={chartType}
                onChange={(e) =>
                  setChartType(e.target.value as 'Line' | 'Candle')
                }
                className={`bg-white text-[#5c5e62] text-sm font-semibold focus:outline-none
                  ${chartType == "Line" ? "" : "pr-1"}`}
              >
                <option value="Line">
                  Line Chart
                </option>
                <option value="Candle">Candle Chart</option>
              </select>
            </div>
            <StockChart
              chartType={chartType}
              activeTimeline={activeTimeline}
            />
            <div className="flex justify-between items-center p-1 rounded-lg mt-4">
              {timelines.map((time) => (
                <button
                  key={time}
                  onClick={() => setActiveTimeline(time)}
                  className={`flex-1 py-1.5 rounded-md text-sm font-bold transition-all duration-200 relative
                    ${activeTimeline === time
                      ? 'text-[#5d93e3]'
                      : 'bg-transparent text-[#5c5e62]'
                    }`}
                >
                  {time}
                  {activeTimeline === time && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 bg-[#5d93e3] w-[50%]"></span>
                  )}
                </button>
              ))}
            </div>
          </div>
          <AlertCreationDialog
            isOpen={isAlertDialogOpen}
            onClose={() => setAlertDialogOpen(false)}
            stock={stock}
            onSetAlert={handleSetAlert}
          />
          <ConfirmationDialog
            isOpen={isConfirmDialogOpen}
            onClose={() => setConfirmDialogOpen(false)}
            onConfirm={handleConfirmAction}
            stock={stock}
            action={actionType}
            ownedQuantity={getOwnedQuantity()}
          />
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
};


const StockItem: React.FC<StockItemProps> = ({ stock, onStockClick, isAdded, isEditActive, onAdd, onRemove }) => {
  const profit = stock.currentPrice - stock.previousDayPrice;
  const profitPercentage = (profit / stock.previousDayPrice) * 100;
  const profitColorClass = profit >= 0 ? 'text-green-600' : 'text-red-600';
  const profitSign = profit >= 0 ? '+' : '';

  const renderActionButton = () => (
    <button
      onClick={(e) => {
        e.stopPropagation(); // Prevent opening the detail sheet
        if (isAdded) {
          onRemove();
        } else {
          onAdd();
        }
      }}
      className={`p-3 rounded-full transition-colors ${isAdded
        ? 'bg-red-100 text-red-600 hover:bg-red-200'
        : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
        }`}
      aria-label={isAdded ? "Remove from watchlist" : "Add to watchlist"}
    >
      {isAdded ? <FaMinus size={12} /> : <FaPlus size={12} />}
    </button>
  );

  return (
    <div
      className="p-4 border-b border-gray-200 flex justify-between items-center last:border-b bg-white hover:bg-gray-100 transition-colors duration-150 cursor-pointer"
      onClick={() => onStockClick(stock)}
    >
      <div>
        <span className="font-semibold text-lg">{stock.name}</span>
        <span className="text-gray-500 text-sm block">{stock.exchange}</span>
      </div>
      <div className="text-right">
        {isEditActive ? (
          renderActionButton()
        ) : (
          <>
            <span className="text-xl font-bold">${stock.currentPrice.toFixed(2)}</span>
            <span className={`${profitColorClass} text-sm block`}>{profitSign}{profit.toFixed(2)} ({profitSign}{profitPercentage.toFixed(2)}%)</span>
          </>
        )}
      </div>
    </div>
  );
};


const HoldingStockItem: React.FC<HoldingStockItemProps> = ({ stock, onStockClick }) => {
  const holdingValue = stock.quantity * stock.currentMarketPrice;
  const investedValue = stock.quantity * stock.avgBuyPrice;
  const profit = holdingValue - investedValue;
  const profitPercentage = investedValue > 0 ? (profit / investedValue) * 100 : 0;
  const profitColorClass = profit >= 0 ? 'text-green-600' : 'text-red-600';
  const profitSign = profit >= 0 ? '+' : '';

  return (
    <div className="p-4 border-b border-gray-200 flex justify-between items-center last:border-b bg-white hover:bg-gray-100 transition-colors duration-150 cursor-pointer" onClick={() => onStockClick(stock)}>
      <div>
        <span className="font-semibold text-lg">{stock.name}</span>
        <span className="text-sm block">{stock.exchange} | {stock.quantity} Qty</span>
      </div>
      <div className="text-right">
        <span className="text-xl font-bold">${stock.currentMarketPrice.toFixed(2)}</span>
        <span className={`${profitColorClass} text-sm block`}>{profitSign}{profit.toFixed(2)} ({profitSign}{profitPercentage.toFixed(2)}%)</span>
      </div>
    </div>
  );
};


const PositionStockItem: React.FC<PositionStockItemProps> = ({ stock, onStockClick }) => {
  // 1. Calculate P&L for both BUY (long) and SELL (short) positions.
  let positionPL;
  if (stock.type === 'SELL') {
    // For short positions, profit is made when the price goes down.
    positionPL = (stock.entryPrice - stock.currentMarketPrice) * stock.quantity;
  } else {
    // For long positions, profit is made when the price goes up.
    positionPL = (stock.currentMarketPrice - stock.entryPrice) * stock.quantity;
  }

  // 2. Calculate the percentage P&L based on the initial investment value.
  const investedValue = stock.entryPrice * stock.quantity;
  const percentagePL = investedValue > 0 ? (positionPL / investedValue) * 100 : 0;

  // 3. Determine display styles based on the final P&L.
  const profitColorClass = positionPL >= 0 ? 'text-green-600' : 'text-red-600';
  const profitSign = positionPL >= 0 ? '+' : '';
  const typeColorClass = stock.type === 'BUY' ? 'text-green-500' : 'text-red-500';

  return (
    <div className="p-4 border-b border-gray-200 flex justify-between items-center last:border-b bg-white hover:bg-gray-100 transition-colors duration-150 cursor-pointer" onClick={() => onStockClick(stock)}>
      <div>
        <span className="font-semibold text-lg">{stock.name}</span>
        <span className="text-gray-500 text-sm block">{stock.exchange} | {stock.quantity} Qty | <span className={typeColorClass}>{stock.type}</span></span>
      </div>
      <div className="text-right">
        <span className="text-xl font-bold">${stock.currentMarketPrice.toFixed(2)}</span>
        {/* 4. Update the JSX to display both absolute and percentage P&L */}
        <span className={`${profitColorClass} text-sm block`}>
          {profitSign}{positionPL.toFixed(2)} ({profitSign}{percentagePL.toFixed(2)}%)
        </span>
      </div>
    </div>
  );
};

const NewsItem: React.FC<NewsItemProps> = ({ article }) => {
  return (
    <div className="flex flex-col bg-white rounded-lg shadow-sm p-4 mb-4 border border-gray-200 hover:shadow-md text-[#5c5e62]">
      {/* Image at the top */}
      <img
        src={article.imageUrl}
        alt={article.title}
        className="w-full h-auto aspect-video object-cover rounded-md mb-2"
      />

      {/* Title below the image */}
      <h3 className="font-semibold text-lg mt-2 leading-tight mb-1">
        {article.title}
      </h3>

      {/* Description after the title */}
      <p className="text-sm mt-0 line-clamp-2 mb-2">
        {article.description}
      </p>

      {/* Stock Symbol at the bottom right */}
      <div className="flex justify-end">
        <div className="text-right text-[#5d93e3] font-medium text-sm">
          {article.stockSymbol}
        </div>
      </div>
    </div>
  );
};

// --- Summary & Navigation Components ---

const SummaryCard: React.FC<SummaryCardProps> = ({ investedAmount, currentAmount, profit, profitPercentage, showPercentagePL }) => {
  const profitColorClass = profit >= 0 ? 'text-green-600' : 'text-red-600';
  const profitSign = profit >= 0 ? '+' : '';
  return (
    <div className="relative bg-white p-5 mx-5 mt-4 rounded-sm shadow-sm z-10">
      <div className="flex justify-between text-lg"><span>Invested</span><span>Current</span></div>
      <div className="flex justify-between mt-1 text-2xl font-medium"><span>${investedAmount.toFixed(2)}</span><span>${currentAmount.toFixed(2)}</span></div>
      <div className="border-t mt-4 pt-4 flex justify-between items-center">
        <span className="font-semibold">P&L</span>
        <div className="flex items-center space-x-2">
          <span className={`text-xl font-bold ${profitColorClass}`}>{profitSign}{profit.toFixed(2)}</span>
          {showPercentagePL && profitPercentage !== undefined && (<span className={`text-lg font-medium ${profitColorClass}`}>({profitSign}{profitPercentage.toFixed(2)}%)</span>)}
        </div>
      </div>
    </div>
  );
};

function BottomNavBar({ onNavClick, currentView }: BottomNavBarProps) {
  return (
    <nav className="fixed bottom-0 left-0 w-full bg-white text-[#5c5e62] flex justify-around py-2 shadow-[0_-4px_8px_-1px_rgba(0,0,0,0.05)] z-50">
      <div className={`flex flex-col items-center p-2 text-sm cursor-pointer hover:text-blue-600 ${currentView === 'watchlist' ? 'text-blue-600' : ''}`} onClick={() => onNavClick('watchlist')}>
        <FaRegBookmark className="text-xl mb-1 scale-125" /><span>Watchlist</span>
      </div>
      <div className={`flex flex-col items-center p-2 text-sm cursor-pointer hover:text-blue-600 ${currentView === 'portfolio' ? 'text-blue-600' : ''}`} onClick={() => onNavClick('portfolio')}>
        <FiBriefcase className='text-xl mb-1 scale-135' /><span>Portfolio</span>
      </div>
      <div className={`flex flex-col items-center p-2 text-sm cursor-pointer hover:text-blue-600 ${currentView === 'news' ? 'text-blue-600' : ''}`} onClick={() => onNavClick('news')}>
        <HiOutlineNewspaper className="text-xl mb-1 scale-145" /><span>News</span>
      </div>
    </nav>
  );
}

//================================================================
// 4. PAGE COMPONENTS
//================================================================


const WatchlistPage: React.FC<WatchlistPageProps> = ({ onStockSelect, allStocks, watchList, onAddStock, onRemoveStock }) => {
  const [selectedWatchlist, setSelectedWatchlist] = useState<string>(Object.keys(watchList)[0] || '');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isEditMode, setIsEditMode] = useState(false);

  const watchListNames = Object.keys(watchList);
  const isSearchActive = searchQuery.length > 0;
  const showActionButtons = isEditMode || isSearchActive;

  const stocksToDisplay = isSearchActive
    ? allStocks.filter(stock =>
      stock.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stock.exchange.toLowerCase().includes(searchQuery.toLowerCase())
    )
    : (watchList[selectedWatchlist] || []).map(stockId =>
      allStocks.find(stock => stock.id === stockId)
    ).filter((stock): stock is Stock => stock !== undefined);

  const renderActionButton = () => {
    if (isEditMode || isSearchActive) {
      return (
        <button
          onClick={() => {
            setIsEditMode(false);
            setSearchQuery('');
          }}
          className="self-stretch inline-flex items-center px-4 rounded-lg shadow-sm bg-[#5d93e3] text-white transition-colors"
          aria-label="Done editing"
        >
          <FaCheckCircle className='scale-125' />
        </button>
      );
    }
    return (
      <button
        onClick={() => setIsEditMode(true)}
        className="self-stretch inline-flex items-center px-4 rounded-lg shadow-sm bg-white text-[#5c5e62] hover:bg-gray-100 transition-colors"
        aria-label="Edit watchlist"
      >
        <GiSettingsKnobs className='scale-125' />
      </button>
    );
  };

  return (
    <div className="flex flex-col bg-[#ebecee] text-[#5c5e62]">
      <div className="sticky top-0 z-20 bg-[#ebecee]">
        <h1 className="text-3xl font-bold pt-5 pl-5">
          Watchlist
        </h1>
        {/* Watchlist tabs */}
        <div className="px-5 py-3 whitespace-nowrap border-b border-gray-200 overflow-x-scroll no-scrollbar">
          {watchListNames.map((watchListName) => (
            <button
              key={watchListName}
              className={`inline-block px-4 py-2 text-sm font-bold mr-2 relative ${selectedWatchlist === watchListName ? 'text-[#5d93e3]' : ''}`}
              onClick={() => setSelectedWatchlist(watchListName)}
            >
              {watchListName}
              {selectedWatchlist === watchListName && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 bg-[#5d93e3] w-[50%]"></span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Search Bar and Smart Button Container */}
      <div className="flex items-center gap-3 px-5 py-3 z-10">
        <div className="relative flex-grow flex items-center w-full rounded-lg shadow-sm bg-white">
          <span className="absolute left-3"><FaSearch size={20} color="#5c5e62" /></span>
          <input
            type="text"
            placeholder="Search to add stocks..."
            className="w-full pl-10 py-3 bg-transparent text-[#5c5e62] placeholder:[#5c5e62] rounded-lg focus:outline-none"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        {renderActionButton()}
      </div>

      {/* Stock List */}
      <div className="flex-grow rounded-t-[2rem] bg-white shadow-inner -mt-10 z-0">
        <div className="border-b border-gray-200 mx-5 mt-10" />
        <div className="px-5 text-[#5c5e62]">
          {stocksToDisplay.length > 0 ? (
            stocksToDisplay.map((stock) => {
              const isAdded = (watchList[selectedWatchlist] || []).includes(stock.id);
              return (
                <StockItem
                  key={stock.id}
                  stock={stock}
                  onStockClick={onStockSelect}
                  isAdded={isAdded}
                  isEditActive={showActionButtons}
                  onAdd={() => onAddStock(stock.id, selectedWatchlist)}
                  onRemove={() => onRemoveStock(stock.id, selectedWatchlist)}
                />
              );
            })
          ) : (
            <div className="text-center mt-10 pb-10">
              {isSearchActive ?
                < EmptyState
                  icon={<MdSearchOff size={80} />}
                  title="No stocks found"
                  subtitle="Try searching something different"
                /> :
                < EmptyState
                  icon={<TbBriefcaseOff size={80} />}
                  title="This watchlist is empty"
                  subtitle="Try adding new stocks to the watchlist"
                />
              }
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


const PortfolioPage: React.FC<PortfolioPageProps> = ({ onStockSelect, holdings, positions }) => {
  const [activeTab, setActiveTab] = useState<'holdings' | 'positions'>('holdings');

  // Totals for holdings
  const totalInvestedHoldings = holdings.reduce((sum, s) => sum + s.quantity * s.avgBuyPrice, 0);
  const totalCurrentHoldings = holdings.reduce((sum, s) => sum + s.quantity * s.currentMarketPrice, 0);
  const holdingsPL = totalCurrentHoldings - totalInvestedHoldings;
  const holdingsPLPercentage = totalInvestedHoldings > 0 ? (holdingsPL / totalInvestedHoldings) * 100 : 0;

  // Totals for positions
  const totalInvestedPositions = positions.reduce((sum, s) => sum + s.quantity * s.entryPrice, 0);
  const totalCurrentPositions = positions.reduce((sum, s) => sum + s.quantity * s.currentMarketPrice, 0);
  const positionsPL = totalCurrentPositions - totalInvestedPositions;

  return (
    <div className="flex flex-col bg-[#ebecee] text-[#5c5e62]">
      <div className="sticky top-0 z-20 bg-[#ebecee]">
        <h1 className="text-3xl font-bold pt-5 pl-5">
          Portfolio
        </h1>

        {/* Tab Navigation (Holdings/Positions) */}
        <div className="px-5 pt-1 border-b border-gray-200 bg-transparent">
          <div className="flex bg-transparent p-1">
            <button
              className={`flex-1 py-2 text-sm font-bold relative
                ${activeTab === 'holdings'
                  ? 'text-[#5d93e3]' // Active tab text color
                  : 'text-[#5c5e62]' // Inactive tab text color
                }`}
              onClick={() => setActiveTab('holdings')}
            >
              Holdings
              <span className="ml-1 pt-0.5 text-white text-xs inline-flex items-center justify-center h-5 w-5 rounded-full bg-blue-600">
                {holdings.length}
              </span>
              {activeTab === 'holdings' && (
                <span className="absolute bottom-0 left-1/2 -translate-x-10 h-0.5 bg-[#5d93e3] w-[18%]"></span>
              )}
            </button>
            <button
              className={`flex-1 py-2 text-sm font-bold relative
                ${activeTab === 'positions'
                  ? 'text-[#5d93e3]' // Active tab text color
                  : 'text-[#5c5e62]' // Inactive tab text color
                }`}
              onClick={() => setActiveTab('positions')}
            >
              Positions
              <span className="ml-1 pt-0.5 text-white text-xs inline-flex items-center justify-center h-5 w-5 rounded-full bg-blue-600">
                {positions.length}
              </span>
              {activeTab === 'positions' && (
                <span className="absolute bottom-0 left-1/2 -translate-x-10 h-0.5 bg-[#5d93e3] w-[18%]"></span>
              )}
            </button>
          </div>
        </div>
      </div>
      <div className='flex flex-col bg-[#ebecee] text-[#5c5e62]'>
        {/* Main Content Area */}
        {activeTab === 'holdings' && (
          <>
            <SummaryCard investedAmount={totalInvestedHoldings} currentAmount={totalCurrentHoldings} profit={holdingsPL} profitPercentage={holdingsPLPercentage} showPercentagePL={true} />
            <div className="border-b border-gray-200 mx-5 my-3 z-10" />
            <div className="px-5 py-24 flex-grow rounded-t-[2rem] bg-white shadow-inner -mt-28 z-0">
              {holdings.length ? (
                <>
                  {holdings.map((stock) => <HoldingStockItem key={stock.id} stock={stock} onStockClick={onStockSelect} />)}
                </>) : (
                <>
                  <EmptyState
                    icon={<TbBriefcaseOff size={80} />}
                    title="No holdings"
                    subtitle="Place an order from your watchlist"
                  />
                </>
              )}
            </div>
          </>
        )}
        {activeTab === 'positions' && (
          <>
            <SummaryCard investedAmount={totalInvestedPositions} currentAmount={totalCurrentPositions} profit={positionsPL} showPercentagePL={false} />
            <div className="border-b border-gray-200 mx-5 my-3 z-10" />
            <div className="px-5 py-24 flex-grow rounded-t-[2rem] bg-white shadow-inner -mt-28 z-0">
              {positions.length > 0 ? (
                <>
                  {positions.map((stock) => <PositionStockItem key={stock.id} stock={stock} onStockClick={onStockSelect} />)}
                </>) : (
                <>
                  <EmptyState
                    icon={<TbBriefcaseOff size={80} />}
                    title="No positions"
                    subtitle="Place an order from your watchlist"
                  />
                </>)}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const NewsPage: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const filteredNews = selectedCategory === 'All' ? DUMMY_NEWS_ARTICLES : DUMMY_NEWS_ARTICLES.filter(a => a.category === selectedCategory);

  return (
    <div className="flex flex-col bg-[#ebecee] text-[#5c5e62]">
      <div className="sticky top-0 z-20 bg-[#ebecee]">
        {/* Title */}
        <h1 className="text-3xl font-bold pt-5 pl-5">
          News
        </h1>
        {/* Category Tabs */}
        <div className="px-5 py-3 whitespace-nowrap border-b border-gray-200 overflow-x-scroll no-scrollbar">
          {DUMMY_NEWS_CATEGORIES.map((category) => (
            <button
              key={category}
              className={`inline-block px-4 py-2 text-sm font-bold mr-2 relative
                ${selectedCategory === category
                  ? 'text-[#5d93e3]'
                  : 'text-[#5c5e62]'
                }`}
              onClick={() => setSelectedCategory(category)}
            >
              {category}
              {selectedCategory === category && (
                <span className="absolute bottom-0 left-5 -translate-x-1 h-0.5 bg-[#5d93e3] w-[30%]"></span>
              )}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-grow rounded-t-[2rem] bg-white shadow-inner relative z-0">
        <div className="px-5 py-2 pt-8">
          {filteredNews.length > 0 ? (
            filteredNews.map((article) => <NewsItem key={article.id} article={article} />)
          ) : (
            < EmptyState
              icon={<TbNewsOff size={80} />}
              title="No News Available"
              subtitle="There are no articles in this category right now"
            />
          )}
        </div>
      </div>
    </div>
  );
};

//================================================================
// 5. MAIN PARENT COMPONENT
//================================================================

export default function Home() {
  const [currentView, setCurrentView] = useState<CurrentView>('watchlist');
  const [selectedStock, setSelectedStock] = useState<SelectableStock | null>(null);
  const [isSheetOpen, setSheetOpen] = useState(false);

  // State for dynamic data
  const [stocks, setStocks] = useState<Stock[]>(DUMMY_STOCKS);
  const [watchList, setwatchList] = useState<WState>({
    'My Stocks': ['1', '6', '8'],
    'Tech Giants': ['1', '2', '3', '4', '5'],
    'Green Energy': ['10'],
    'Value Picks': ['6'],
    'Growth Stocks': ['5'],
    'ETFs': [],
  });
  const [holdings, setHoldings] = useState<HoldingStock[]>(DUMMY_HOLDINGS);
  const [positions, setPositions] = useState<PositionStock[]>(DUMMY_POSITIONS);
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);

  const [notification, setNotification] = useState({ visible: false, message: '', description: '', type: '' });
  const notificationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // --- Handlers & Helpers ---
  const triggerHapticFeedback = () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(200);
    }
  };

  const showNotification = (message: string, description: string, type: 'success' | 'alert' = 'success') => {
    if (notificationTimeoutRef.current) {
      clearTimeout(notificationTimeoutRef.current);
    }
    // Set the type along with other properties
    setNotification({ visible: true, message, description, type });

    notificationTimeoutRef.current = setTimeout(() => {
      setNotification(prev => ({ ...prev, visible: false }));
    }, 3000);
  };

  const handleAddStockToWatchlist = (stockId: string, watchListName: string) => {
    setwatchList(prev => {
      const currentList = prev[watchListName] || [];
      // Add only if it's not already in the list
      if (!currentList.includes(stockId)) {
        return {
          ...prev,
          [watchListName]: [...currentList, stockId],
        };
      }
      return prev;
    });
    showNotification('Stock Added', `Added to ${watchListName}`);
  };

  const handleRemoveStockFromWatchlist = (stockId: string, watchListName: string) => {
    setwatchList(prev => ({
      ...prev,
      [watchListName]: (prev[watchListName] || []).filter((id: string) => id !== stockId),
    }));
    showNotification('Stock Removed', `Removed from ${watchListName}`);
  };

  // Effect 1: Simulate price fluctuations on a timer
  useEffect(() => {
    const interval = setInterval(() => {
      const updatePrice = (price: number) => Math.max(0, price + (Math.random() - 0.5) * 0.5);

      // Use functional updates to prevent issues with stale state
      setStocks(prevStocks => prevStocks.map(s => ({ ...s, currentPrice: updatePrice(s.currentPrice) })));
      setHoldings(prevHoldings => prevHoldings.map(h => ({ ...h, currentMarketPrice: updatePrice(h.currentMarketPrice) })));
      setPositions(prevPositions => prevPositions.map(p => ({ ...p, currentMarketPrice: updatePrice(p.currentMarketPrice) })));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // Effect 2: Check for triggered alerts whenever prices or alerts change
  useEffect(() => {
    const priceMap = new Map<string, number>();
    stocks.forEach(s => priceMap.set(s.id, s.currentPrice));
    holdings.forEach(h => priceMap.set(h.id, h.currentMarketPrice));
    positions.forEach(p => priceMap.set(p.id, p.currentMarketPrice));

    const triggeredAlertIds = new Set<number>();

    alerts.forEach(alert => {
      if (!alert.triggered && priceMap.has(alert.stockId)) {
        const currentPrice = priceMap.get(alert.stockId)!;

        const hasTriggered =
          (alert.direction === 'up' && currentPrice >= alert.targetPrice) ||
          (alert.direction === 'down' && currentPrice <= alert.targetPrice);

        if (hasTriggered) {
          triggerHapticFeedback();
          const movement = alert.direction === 'up' ? 'crossed above' : 'dropped below';
          showNotification(
            `Price Alert!`,
            `${alert.stockName} has ${movement} $${alert.targetPrice.toFixed(2)}`,
            'alert'
          );
          triggeredAlertIds.add(alert.id);
        }
      }
    });

    if (triggeredAlertIds.size > 0) {
      setAlerts(prevAlerts =>
        prevAlerts.map(a =>
          triggeredAlertIds.has(a.id) ? { ...a, triggered: true } : a
        )
      );
    }
  }, [stocks, holdings, positions, alerts]);

  const handleStockSelect = (clickedStock: SelectableStock) => {
    let stockForSheet: SelectableStock = clickedStock;
    if (!('quantity' in clickedStock)) {
      const holdingInfo = holdings.find(h => h.name === clickedStock.name);
      const positionInfo = positions.find(p => p.name === clickedStock.name);
      if (holdingInfo) {
        stockForSheet = {
          ...clickedStock,
          id: holdingInfo.id,
          quantity: holdingInfo.quantity,
        };
      } else if (positionInfo) {
        stockForSheet = {
          ...clickedStock,
          id: positionInfo.id,
          quantity: positionInfo.quantity,
          type: positionInfo.type,
        };
      }
    }
    setSelectedStock(stockForSheet);
    setSheetOpen(true);
  };



  const handleSheetOpenChange = (open: boolean) => {
    setSheetOpen(open);
    if (!open) {
      setTimeout(() => setSelectedStock(null), 300);
    }
  };

  const handleSetAlert = (stock: SelectableStock, targetPrice: number) => {
    const currentPrice = 'currentMarketPrice' in stock ? stock.currentMarketPrice : stock.currentPrice;

    const newAlert: PriceAlert = {
      id: Date.now(),
      stockId: stock.id,
      stockName: stock.name,
      targetPrice: targetPrice,
      direction: targetPrice > currentPrice ? 'up' : 'down',
      triggered: false,
    };
    setAlerts(prevAlerts => [...prevAlerts, newAlert]);
    const directionText = newAlert.direction === 'up' ? 'goes above' : 'drops below';

    showNotification('Alert Set!', `We'll notify you if ${stock.name} ${directionText} $${targetPrice.toFixed(2)}`, 'success');
  };

  const handleBuy = (stockToBuy: SelectableStock, quantity: number, transactionType: 'holding' | 'position') => {
    const currentPrice = 'currentMarketPrice' in stockToBuy ? stockToBuy.currentMarketPrice : stockToBuy.currentPrice;

    if (transactionType === 'holding') {
      setHoldings(prevHoldings => {
        const existingHoldingIndex = prevHoldings.findIndex(h => h.name === stockToBuy.name);

        if (existingHoldingIndex > -1) {
          const updatedHoldings = [...prevHoldings];
          const existingHolding = updatedHoldings[existingHoldingIndex];
          const totalExistingValue = existingHolding.avgBuyPrice * existingHolding.quantity;
          const newPurchaseValue = currentPrice * quantity;
          const newTotalQuantity = existingHolding.quantity + quantity;

          updatedHoldings[existingHoldingIndex] = {
            ...existingHolding,
            quantity: newTotalQuantity,
            avgBuyPrice: (totalExistingValue + newPurchaseValue) / newTotalQuantity,
          };
          return updatedHoldings;
        } else {
          const newHolding: HoldingStock = {
            id: `h-${Date.now()}`,
            name: stockToBuy.name,
            exchange: stockToBuy.exchange,
            quantity: quantity,
            avgBuyPrice: currentPrice,
            currentMarketPrice: currentPrice,
          };
          return [...prevHoldings, newHolding];
        }
      });
    } else { // transactionType === 'position'
      setPositions(prevPositions => {
        const existingPositionIndex = prevPositions.findIndex(p => p.name === stockToBuy.name && p.type === 'BUY');

        if (existingPositionIndex > -1) {
          const updatedPositions = [...prevPositions];
          const existingPosition = updatedPositions[existingPositionIndex];
          const totalExistingValue = existingPosition.entryPrice * existingPosition.quantity;
          const newPurchaseValue = currentPrice * quantity;
          const newTotalQuantity = existingPosition.quantity + quantity;

          updatedPositions[existingPositionIndex] = {
            ...existingPosition,
            quantity: newTotalQuantity,
            entryPrice: (totalExistingValue + newPurchaseValue) / newTotalQuantity,
            currentMarketPrice: currentPrice,
          };
          return updatedPositions;
        } else {
          const newPosition: PositionStock = {
            id: `p-${Date.now()}`,
            name: stockToBuy.name,
            exchange: stockToBuy.exchange,
            quantity: quantity,
            entryPrice: currentPrice,
            currentMarketPrice: currentPrice,
            type: 'BUY',
          };
          return [...prevPositions, newPosition];
        }
      });
    }
    setSheetOpen(false);
    showNotification(
      'Transaction Complete',
      `${quantity} ${stockToBuy.name} shares added to your ${transactionType}s`
    );
  };

  const handleSell = (stockToBuy: SelectableStock, quantity: number, transactionType: 'holding' | 'position') => {
    if (transactionType === 'holding') {
      setHoldings(prevHoldings => {
        const holdingIndex = prevHoldings.findIndex(h => h.id === stockToBuy.id);
        if (holdingIndex === -1) return prevHoldings;

        const holding = prevHoldings[holdingIndex];
        if (holding.quantity < quantity) return prevHoldings; // Failsafe validation

        if (holding.quantity === quantity) {
          return prevHoldings.filter(h => h.id !== stockToBuy.id);
        } else {
          const updatedHoldings = [...prevHoldings];
          updatedHoldings[holdingIndex] = { ...holding, quantity: holding.quantity - quantity };
          return updatedHoldings;
        }
      });
    } else { // transactionType === 'position'
      setPositions(prevPositions => {
        const positionIndex = prevPositions.findIndex(p => p.id === stockToBuy.id);
        if (positionIndex === -1) return prevPositions;

        const position = prevPositions[positionIndex];
        if (position.quantity < quantity) return prevPositions; // Failsafe validation

        if (position.quantity === quantity) {
          return prevPositions.filter(p => p.id !== stockToBuy.id);
        } else {
          const updatedPositions = [...prevPositions];
          updatedPositions[positionIndex] = { ...position, quantity: position.quantity - quantity };
          return updatedPositions;
        }
      });
    }
    setSheetOpen(false);
    showNotification(
      'Transaction Complete',
      `You sold ${quantity} shares of ${stockToBuy.name}`
    );
  };


  const renderCurrentView = () => {
    switch (currentView) {
      case 'watchlist':
        return <WatchlistPage
          onStockSelect={handleStockSelect}
          allStocks={stocks}
          watchList={watchList}
          onAddStock={handleAddStockToWatchlist}
          onRemoveStock={handleRemoveStockFromWatchlist}
        />;
      case 'portfolio':
        return <PortfolioPage onStockSelect={handleStockSelect} holdings={holdings} positions={positions} />;
      case 'news':
        return <NewsPage />;
      default:
        return <WatchlistPage
          onStockSelect={handleStockSelect}
          allStocks={stocks}
          watchList={watchList}
          onAddStock={handleAddStockToWatchlist}
          onRemoveStock={handleRemoveStockFromWatchlist}
        />;
    }
  };

  return (
    <div className="pb-[70px] min-h-screen flex flex-col font-sans bg-white">
      <main className="flex-grow">
        {renderCurrentView()}
      </main>

      <BottomNavBar onNavClick={setCurrentView} currentView={currentView} />

      <StockDetailSheet
        open={isSheetOpen}
        onOpenChange={handleSheetOpenChange}
        stock={selectedStock}
        onSetAlert={handleSetAlert}
        onBuy={handleBuy}
        onSell={handleSell}
      />
      <CustomNotification
        visible={notification.visible}
        message={notification.message}
        description={notification.description}
        type={notification.type}
      />
    </div>
  );
}
