'use client';

import React, { useState, useEffect } from 'react';
import { FaRegBookmark, FaBell, FaSearch } from 'react-icons/fa';
import { FiBriefcase } from 'react-icons/fi';
import { HiOutlineNewspaper } from 'react-icons/hi2';

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Brush,
  CartesianGrid,
  Cell,
} from 'recharts';
import { Drawer } from 'vaul';

//================================================================
// 1. TYPE DEFINITIONS
//================================================================

type CurrentView = 'home' | 'wishlist' | 'portfolio' | 'news';
type ActionType = 'BUY' | 'SELL';

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
  triggered: boolean;
}

type SelectableStock = Stock | HoldingStock | PositionStock;

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
      date: period === 'hour'
        ? date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
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

const CHART_DATA_SETS = {
  '6H': generateOHLCData(6, 'hour', 175, 1.5),
  '1D': generateOHLCData(24, 'hour', 178, 2),
  '5D': generateOHLCData(5, 'day', 180, 5),
  '1M': generateOHLCData(30, 'day', 185, 8),
  '6M': generateOHLCData(180, 'day', 200, 15),
  '1Y': generateOHLCData(365, 'day', 220, 25),
  'All': generateOHLCData(500, 'day', 150, 30),
};

// --- Static Data ---
const DUMMY_WISHLISTS: string[] = ['My Stocks', 'Tech Giants', 'Green Energy', 'Value Picks', 'Growth Stocks', 'ETFs'];
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
];
const DUMMY_HOLDINGS: HoldingStock[] = [
  { id: 'h1', name: 'RELIANCE', exchange: 'NSE', quantity: 10, avgBuyPrice: 2800.00, currentMarketPrice: 2900.50 },
  { id: 'h2', name: 'TCS', exchange: 'NSE', quantity: 5, avgBuyPrice: 3850.00, currentMarketPrice: 3800.00 },
  { id: 'h3', name: 'AAPL', exchange: 'NASDAQ', quantity: 2, avgBuyPrice: 170.00, currentMarketPrice: 175.50 },
];
const DUMMY_POSITIONS: PositionStock[] = [
  { id: 'p1', name: 'INFY', exchange: 'NSE', quantity: 20, entryPrice: 1500.00, currentMarketPrice: 1550.20, type: 'BUY' },
  { id: 'p2', name: 'HDFC BANK', exchange: 'NSE', quantity: 15, entryPrice: 1470.00, currentMarketPrice: 1450.75, type: 'SELL' },
];
const DUMMY_NEWS_CATEGORIES: string[] = ['All', 'New', 'Discover', 'Following', 'Hot', 'Breaking', 'Market Analysis', 'Tech'];
const DUMMY_NEWS_ARTICLES: NewsArticle[] = [
  { id: 'n1', imageUrl: 'YOUR_IMAGE_URL', title: 'AAPL hits record high after iPhone sales surge', description: 'Apple shares surged today following unexpectedly strong iPhone sales figures.', stockSymbol: 'AAPL', category: 'Hot' },
  { id: 'n2', imageUrl: 'YOUR_IMAGE_URL', title: 'RBI rate hike expected next quarter', description: 'Analysts predict a 25 basis point hike by the Reserve Bank of India.', stockSymbol: 'NIFTY', category: 'Market Analysis' },
  { id: 'n3', imageUrl: 'YOUR_IMAGE_URL', title: 'Microsoft acquires AI startup for $500M', description: 'Microsoft continues its aggressive push into AI with this new acquisition.', stockSymbol: 'MSFT', category: 'New' },
];

//================================================================
// 3. REUSABLE & CHILD COMPONENTS
//================================================================

// --- Charting Components ---
interface StockChartProps {
  chartType: 'Line' | 'Candle';
  activeTimeline: keyof typeof CHART_DATA_SETS;
}


const StockChart: React.FC<StockChartProps> = ({ chartType, activeTimeline }) => {
  const data = CHART_DATA_SETS[activeTimeline];

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
              tickFormatter={(value) => new Date(value).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
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
              tickFormatter={(value) => new Date(value).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
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
            >
            </Brush>
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
};

// --- Dialogs & Sheets ---

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (quantity: number) => void;
  stock: SelectableStock | null;
  action: ActionType;
  ownedQuantity?: number;
}

const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({ isOpen, onClose, onConfirm, stock, action, ownedQuantity = 0 }) => {
  const [quantity, setQuantity] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setQuantity('');
      setError('');
    }
  }, [isOpen]);

  // Early exit if the component shouldn't be rendered
  if (!isOpen || !stock) {
    return null;
  }

  // Helper to get the current price from the stock object
  const getCurrentPrice = (s: SelectableStock): number => 'currentMarketPrice' in s ? s.currentMarketPrice : s.currentPrice;
  const currentPrice = getCurrentPrice(stock);

  // Parse the quantity safely, treating empty string or invalid input as 0
  const numericQuantity = parseInt(quantity, 10) || 0;
  const totalPrice = currentPrice * numericQuantity;

  // Handle changes to the quantity input
  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuantity(val);
    setError(''); // Clear error on new input

    const numVal = parseInt(val, 10);
    if (val && (isNaN(numVal) || numVal <= 0)) {
      setError('Please enter a valid, positive quantity.');
    } else if (action === 'SELL' && numVal > ownedQuantity) {
      setError(`You can only sell up to ${ownedQuantity} shares.`);
    }
  };

  const handleConfirmClick = () => {
    if (!error && quantity) {
      onConfirm(parseInt(quantity, 10));
    }
  };

  // Define styles based on the action type (BUY or SELL)
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
        <Drawer.Content className="fixed inset-0 z-[70] flex flex-col p-6 font-sans bg-[#ebecee] text-[#5c5e62] outline-none">
          <div
            className="w-full h-full flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Section */}
            <header className="flex-shrink-0">
              <div className="flex justify-between items-start">
                <div>
                  <Drawer.Title className="text-4xl font-bold tracking-tight text-[#5c5e62]">
                    {action} {stock.name}
                  </Drawer.Title>
                  <p className="text-lg text-gray-500">{stock.exchange}</p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 -mr-2 text-gray-500 hover:text-gray-900 transition-colors"
                >
                  <CloseIcon />
                </button>
              </div>
              <div className="mt-6">
                <p className="text-sm text-gray-500">Current Market Price</p>
                <p className="text-5xl font-bold text-[#5c5e62]">${currentPrice.toFixed(2)}</p>
              </div>
            </header>

            {/* Main Input Section */}
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
            </main>

            {/* Footer with Total Price and Action Button */}
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

interface AlertCreationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  stock: SelectableStock | null;
  onSetAlert: (price: number) => void;
}

const AlertCreationDialog: React.FC<AlertCreationDialogProps> = ({ isOpen, onClose, stock, onSetAlert }) => {
  const [price, setPrice] = useState('');

  useEffect(() => {
    if (isOpen) {
      setPrice('');
    }
  }, [isOpen]);

  const handleSetAlertClick = () => {
    const priceValue = parseFloat(price);
    if (!isNaN(priceValue) && priceValue > 0) {
      onSetAlert(priceValue);
    }
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
        <Drawer.Content className="fixed inset-0 z-[70] flex flex-col p-6 font-sans bg-[#ebecee] text-[#5c5e62] outline-none">
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
                  <p className="text-lg text-gray-500">{stock.exchange}</p>
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

interface StockDetailSheetProps {
  stock: SelectableStock | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSetAlert: (stock: SelectableStock, price: number) => void;
  onBuy: (stock: SelectableStock, quantity: number) => void;
  onSell: (stockId: string, quantity: number) => void;
  holdings: HoldingStock[];
}

// StockDetailSheet ---
const StockDetailSheet: React.FC<StockDetailSheetProps> = ({ stock, open, onOpenChange, onSetAlert, onBuy, onSell, holdings }) => {
  const [activeTimeline, setActiveTimeline] = useState<keyof typeof CHART_DATA_SETS>('1D');
  const [chartType, setChartType] = useState<'Line' | 'Candle'>('Line');
  const [isAlertDialogOpen, setAlertDialogOpen] = useState(false);
  const [isConfirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<ActionType>('BUY');

  if (!stock) return null;

  const timelines = Object.keys(CHART_DATA_SETS) as Array<keyof typeof CHART_DATA_SETS>;
  const getCurrentPrice = (s: SelectableStock): number => 'currentMarketPrice' in s ? s.currentMarketPrice : s.currentPrice;
  const getProfitLoss = (s: SelectableStock) => {
    const previousPrice = 'previousDayPrice' in s ? s.previousDayPrice : getCurrentPrice(s);
    const currentPrice = getCurrentPrice(s); const change = currentPrice - previousPrice;
    const percentage = previousPrice > 0 ? (change / previousPrice) * 100 : 0;
    const colorClass = change >= 0 ? 'text-green-600' : 'text-red-600'; const sign = change >= 0 ? '+' : '';
    return { change: change.toFixed(2), percentage: percentage.toFixed(2), colorClass, sign };
  };
  const { change, percentage, colorClass, sign } = getProfitLoss(stock);
  const handleSetAlert = (price: number) => { onSetAlert(stock, price); setAlertDialogOpen(false); };
  const handleActionClick = (type: ActionType) => { setActionType(type); setConfirmDialogOpen(true); };
  const handleConfirmAction = (quantity: number) => {
    if (actionType === 'BUY') { onBuy(stock, quantity); } else { onSell(stock.id, quantity); }
    setConfirmDialogOpen(false);
  };
  const getOwnedQuantity = () => {
    if (actionType === 'SELL') { const holding = holdings.find(h => h.name === stock.name); return holding ? holding.quantity : 0; }
    return 0;
  }

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50" />
        <Drawer.Content className="bg-[#ebecee] flex flex-col rounded-t-[2rem] h-[75%] fixed bottom-0 left-0 right-0 z-50 text-[#5c5e62] shadow-lg">
          <div className="p-3 bg-white rounded-t-[2rem] flex-shrink-0">
            <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-gray-300" />
          </div>
          <div className="flex flex-col px-5 pb-4 border-b border-gray-200 flex-shrink-0 bg-white">
            <Drawer.Title className="font-bold text-3xl text-[#5c5e62]">
              {stock.name}
            </Drawer.Title>
            <div className="flex items-center text-sm mt-1">
              <span className="text-[#5c5e62]">{stock.exchange}</span>
              <span className={`ml-3 font-semibold ${colorClass}`}>
                {sign}
                {change} ({sign}
                {percentage}%) Today
              </span>
            </div>
          </div>
          <div className="flex-grow px-5 py-4 bg-white overflow-y-scroll no-scrollbar">
            <div className="grid grid-cols-2 gap-3 mb-5">
              <button
                onClick={() => handleActionClick('BUY')}
                className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Buy
              </button>
              <button
                onClick={() => handleActionClick('SELL')}
                className="w-full bg-red-500 text-white font-bold py-3 rounded-lg hover:bg-red-600 transition-colors"
              >
                Sell
              </button>
            </div>
            <div className="flex justify-between items-center mb-4">
              <button
                onClick={() => setAlertDialogOpen(true)}
                className="flex items-center text-[#5d93e3] font-semibold text-sm p-2 rounded-md hover:bg-blue-50 transition-colors"
              >
                <FaBell className="mr-2" /> Set Alert
              </button>
              <select
                value={chartType}
                onChange={(e) =>
                  setChartType(e.target.value as 'Line' | 'Candle')
                }
                className="bg-white text-[#5c5e62] text-sm font-semibold focus:outline-none"
              >
                <option className="outline-none" value="Line">
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
                      ? 'text-[#5d93e3]' // Active tab style
                      : 'bg-transparent text-[#5c5e62]' // Inactive tab style (inherits)
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

// --- Page Specific Item Components ---

interface StockItemProps {
  stock: Stock;
  onStockClick: (stock: Stock) => void;
}
const StockItem: React.FC<StockItemProps> = ({ stock, onStockClick }) => {
  const profit = stock.currentPrice - stock.previousDayPrice;
  const profitPercentage = (profit / stock.previousDayPrice) * 100;
  const profitColorClass = profit >= 0 ? 'text-green-600' : 'text-red-600';
  const profitSign = profit >= 0 ? '+' : '';

  return (
    <div className="p-4 border-b border-gray-200 flex justify-between items-center last:border-b-0 bg-white hover:bg-gray-100 transition-colors duration-150 cursor-pointer" onClick={() => onStockClick(stock)}>
      <div>
        <span className="font-semibold text-lg">{stock.name}</span>
        <span className="text-gray-500 text-sm block">{stock.exchange}</span>
      </div>
      <div className="text-right">
        <span className="text-xl font-bold">${stock.currentPrice.toFixed(2)}</span>
        <span className={`${profitColorClass} text-sm block`}>{profitSign}{profit.toFixed(2)} ({profitSign}{profitPercentage.toFixed(2)}%)</span>
      </div>
    </div>
  );
};

interface HoldingStockItemProps {
  stock: HoldingStock;
  onStockClick: (stock: HoldingStock) => void;
}
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

interface PositionStockItemProps {
  stock: PositionStock;
  onStockClick: (stock: PositionStock) => void;
}
const PositionStockItem: React.FC<PositionStockItemProps> = ({ stock, onStockClick }) => {
  const positionPL = (stock.currentMarketPrice - stock.entryPrice) * stock.quantity;
  const profitColorClass = positionPL >= 0 ? 'text-green-600' : 'text-red-600';
  const profitSign = positionPL >= 0 ? '+' : '';
  const typeColorClass = stock.type === 'BUY' ? 'text-green-500' : 'text-red-500';

  return (
    <div className="p-4 border-b border-gray-200 flex justify-between items-center last:border-b-0 bg-white hover:bg-gray-100 transition-colors duration-150 cursor-pointer" onClick={() => onStockClick(stock)}>
      <div>
        <span className="font-semibold text-lg">{stock.name}</span>
        <span className="text-gray-500 text-sm block">{stock.exchange} | {stock.quantity} Qty | <span className={typeColorClass}>{stock.type}</span></span>
      </div>
      <div className="text-right">
        <span className="text-xl font-bold">${stock.currentMarketPrice.toFixed(2)}</span>
        <span className={`${profitColorClass} text-sm block`}>{profitSign}{positionPL.toFixed(2)}</span>
      </div>
    </div>
  );
};

interface NewsItemProps {
  article: NewsArticle;
}
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

interface SummaryCardProps {
  investedAmount: number;
  currentAmount: number;
  profit: number;
  profitPercentage?: number;
  showPercentagePL: boolean;
}
const SummaryCard: React.FC<SummaryCardProps> = ({ investedAmount, currentAmount, profit, profitPercentage, showPercentagePL }) => {
  const profitColorClass = profit >= 0 ? 'text-green-600' : 'text-red-600';
  const profitSign = profit >= 0 ? '+' : '';
  return (
    <div className="bg-white p-5 mx-5 mt-4 rounded-sm shadow-sm">
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

interface BottomNavBarProps {
  onNavClick: (view: CurrentView) => void;
  currentView: CurrentView;
}
function BottomNavBar({ onNavClick, currentView }: BottomNavBarProps) {
  return (
    <nav className="fixed bottom-0 left-0 w-full bg-white text-gray-800 flex justify-around py-2 shadow-md z-50">
      <div className={`flex flex-col items-center p-2 text-sm cursor-pointer hover:text-blue-600 ${currentView === 'wishlist' ? 'text-blue-600' : ''}`} onClick={() => onNavClick('wishlist')}>
        <FaRegBookmark className="text-xl mb-1 scale-125" /><span>Wishlist</span>
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

interface WishlistPageProps {
  onStockSelect: (stock: SelectableStock) => void;
  stocks: Stock[];
}
const WishlistPage: React.FC<WishlistPageProps> = ({ onStockSelect, stocks }) => {
  const [selectedWishlist, setSelectedWishlist] = useState<string>(DUMMY_WISHLISTS[0]);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredStocks = stocks.filter(stock =>
    stock.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    stock.exchange.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col bg-[#ebecee] text-[#5c5e62]">
      <div className="sticky top-0 z-20 bg-[#ebecee]">
        <h1 className="text-3xl font-bold pt-5 pl-5">
          Wishlist
        </h1>

        <div className="px-5 py-3 whitespace-nowrap border-b border-gray-200 overflow-x-scroll no-scrollbar">
          {DUMMY_WISHLISTS.map((wishlist) => (
            <button
              key={wishlist}
              className={`
            inline-block px-4 py-2 text-sm font-bold mr-2 relative
            ${selectedWishlist === wishlist
                  ? 'text-[#5d93e3]'
                  : ''
                }
          `}
              onClick={() => setSelectedWishlist(wishlist)}
            >
              {wishlist}
              {selectedWishlist === wishlist && (
                <span className="absolute bottom-0 left-4 h-0.5 bg-[#5d93e3] w-[30%]"></span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 py-3 z-10">
        <div className="relative flex items-center w-full rounded-sm shadow-sm bg-white">
          <span className="absolute left-3">
            <FaSearch size={20} color="#5c5e62" />
          </span>
          <input
            type="text"
            placeholder="Search stocks..."
            className="w-full pl-10 pr-3 py-3 bg-transparent text-[#5c5e62] placeholder:[#5c5e62] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#38393b]"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-grow rounded-t-[2rem] bg-white shadow-inner -mt-10 relative z-0">
        <div className="border-b border-gray-200 mx-5 mt-10" />
        <div className="px-5 text-[#5c5e62]">
          {filteredStocks.length > 0 ? (
            filteredStocks.map((stock) => (
              <StockItem key={stock.id} stock={stock} onStockClick={onStockSelect} />
            ))
          ) : (
            <p className="text-center mt-10">No stocks found.</p>
          )}
        </div>
      </div>
    </div>
  );
};

interface PortfolioPageProps {
  onStockSelect: (stock: SelectableStock) => void;
  holdings: HoldingStock[];
}
const PortfolioPage: React.FC<PortfolioPageProps> = ({ onStockSelect, holdings }) => {
  const [activeTab, setActiveTab] = useState<'holdings' | 'positions'>('holdings');

  // Totals for holdings
  const totalInvestedHoldings = holdings.reduce((sum, s) => sum + s.quantity * s.avgBuyPrice, 0);
  const totalCurrentHoldings = holdings.reduce((sum, s) => sum + s.quantity * s.currentMarketPrice, 0);
  const holdingsPL = totalCurrentHoldings - totalInvestedHoldings;
  const holdingsPLPercentage = totalInvestedHoldings > 0 ? (holdingsPL / totalInvestedHoldings) * 100 : 0;

  // Totals for positions
  const totalInvestedPositions = DUMMY_POSITIONS.reduce((sum, s) => sum + s.quantity * s.entryPrice, 0);
  const totalCurrentPositions = DUMMY_POSITIONS.reduce((sum, s) => sum + s.quantity * s.currentMarketPrice, 0);
  const positionsPL = totalCurrentPositions - totalInvestedPositions;

  return (
    <div className="flex flex-col bg-[#ebecee] text-[#5c5e62]">
      {/* Sticky header wrapper */}
      <div className="sticky top-0 z-20 bg-[#ebecee]">
        {/* Title */}
        <h1 className="text-3xl font-bold pt-5 pl-5">
          Portfolio
        </h1>

        {/* Tab Navigation (Holdings/Positions) */}
        {/* Adjusted tab container for transparent background and no default padding */}
        <div className="px-5 pt-1 border-b border-gray-200 bg-transparent">
          <div className="flex bg-transparent p-1"> {/* This div was originally rounded-lg p-1 but is now transparent */}
            <button
              className={`flex-1 py-2 text-sm font-bold relative
                ${activeTab === 'holdings'
                  ? 'text-[#5d93e3]' // Active tab text color
                  : 'text-[#5c5e62]' // Inactive tab text color
                }`}
              onClick={() => setActiveTab('holdings')}
            >
              Holdings
              <span className="ml-1 text-white text-xs inline-flex items-center justify-center h-4 w-4 rounded-full bg-blue-600">
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
              <span className="ml-1 text-white text-xs inline-flex items-center justify-center h-4 w-4 rounded-full bg-blue-600">
                {DUMMY_POSITIONS.length}
              </span>
              {activeTab === 'positions' && (
                <span className="absolute bottom-0 left-1/2 -translate-x-10 h-0.5 bg-[#5d93e3] w-[18%]"></span>
              )}
            </button>
          </div>
        </div>

        {/* Main Content Area (Summary Card + Stock List) - Rounded Top, Overlap */}
        {activeTab === 'holdings' && (
          <>
            <SummaryCard investedAmount={totalInvestedHoldings} currentAmount={totalCurrentHoldings} profit={holdingsPL} profitPercentage={holdingsPLPercentage} showPercentagePL={true} />
            <div className="border-b border-gray-200 mx-5 my-3" />
            <div className="px-5 py-20 flex-grow rounded-t-[2rem] bg-white shadow-inner -mt-20 relative -z-10">
              {holdings.map((stock) => <HoldingStockItem key={stock.id} stock={stock} onStockClick={onStockSelect} />)}
            </div>
          </>
        )}
        {activeTab === 'positions' && (
          <>
            <SummaryCard investedAmount={totalInvestedPositions} currentAmount={totalCurrentPositions} profit={positionsPL} showPercentagePL={false} />
            <div className="border-b border-gray-200 mx-5 my-3" />
            <div className="px-5 py-20 flex-grow rounded-t-[2rem] bg-white shadow-inner -mt-20 relative -z-10">
              {DUMMY_POSITIONS.map((stock) => <PositionStockItem key={stock.id} stock={stock} onStockClick={onStockSelect} />)}
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

        {/* Category Tabs (similar to Wishlist/Portfolio tabs) */}
        <div className="px-5 py-3 whitespace-nowrap border-b border-gray-200 overflow-x-scroll no-scrollbar">
          {DUMMY_NEWS_CATEGORIES.map((category) => (
            <button
              key={category}
              className={`inline-block px-4 py-2 text-sm font-bold mr-2 relative
                ${selectedCategory === category
                  ? 'text-[#5d93e3]' // Active tab text color
                  : 'text-[#5c5e62]' // Inactive tab text color (inherits if not set)
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

      {/* Main Content Area (News List) - Rounded Top, Overlap */}
      <div className="flex-grow rounded-t-[2rem] bg-white shadow-inner relative z-0">
        <div className="px-5 py-2 pt-8">
          {filteredNews.length > 0 ? (
            filteredNews.map((article) => <NewsItem key={article.id} article={article} />)
          ) : (
            <p className="text-center mt-10">No New News Article</p>
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
  const [currentView, setCurrentView] = useState<CurrentView>('wishlist');
  const [selectedStock, setSelectedStock] = useState<SelectableStock | null>(null);
  const [isSheetOpen, setSheetOpen] = useState(false);

  // State for dynamic data
  const [stocks, setStocks] = useState<Stock[]>(DUMMY_STOCKS);
  const [holdings, setHoldings] = useState<HoldingStock[]>(DUMMY_HOLDINGS);
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);

  // --- Handlers & Helpers ---
  const triggerHapticFeedback = () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(200);
    }
  };

  const showNotification = (stockName: string, targetPrice: number) => {
    if ('Notification' in window && Notification.permission === "granted") {
      console.log("oricafiof")
      new Notification('Price Alert!', {
        body: `${stockName} has crossed your alert price of $${targetPrice.toFixed(2)}!`,
        icon: '/favicon.ico'
      });
    }
  };

  // Effect 1: Request notification permission on component mount
  useEffect(() => {
    if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") {
      Notification.requestPermission().then(permission => {
        if (permission === "granted") {
          console.log("Notification permission granted.");
        }
      });
    }
  }, []);

  // Effect 2: Simulate price fluctuations on a timer
  useEffect(() => {
    const interval = setInterval(() => {
      const updatePrice = (price: number) => Math.max(0, price + (Math.random() - 0.5) * 0.5);

      // Use functional updates to prevent issues with stale state
      setStocks(prevStocks => prevStocks.map(s => ({ ...s, currentPrice: updatePrice(s.currentPrice) })));
      setHoldings(prevHoldings => prevHoldings.map(h => ({ ...h, currentMarketPrice: updatePrice(h.currentMarketPrice) })));
    }, 3000);

    return () => clearInterval(interval); // Cleanup on component unmount
  }, []); // Empty dependency array ensures this effect runs only once

  // Effect 3: Check for triggered alerts whenever prices or alerts change
  useEffect(() => {
    // Create a simple map of stock IDs to their current prices for quick lookups
    const priceMap = new Map<string, number>();
    stocks.forEach(s => priceMap.set(s.id, s.currentPrice));
    holdings.forEach(h => priceMap.set(h.id, h.currentMarketPrice));

    const triggeredAlertIds = new Set<number>();

    alerts.forEach(alert => {
      // Check only untriggered alerts that have a corresponding stock in our price map
      if (!alert.triggered && priceMap.has(alert.stockId)) {
        const currentPrice = priceMap.get(alert.stockId)!;
        if (currentPrice >= alert.targetPrice) {
          triggerHapticFeedback();
          showNotification(alert.stockName, alert.targetPrice);
          triggeredAlertIds.add(alert.id);
        }
      }
    });

    // If we have any newly triggered alerts, update the state
    if (triggeredAlertIds.size > 0) {
      setAlerts(prevAlerts =>
        prevAlerts.map(a =>
          triggeredAlertIds.has(a.id) ? { ...a, triggered: true } : a
        )
      );
    }
  }, [stocks, holdings, alerts]); // This effect depends on the data

  const handleStockSelect = (stock: SelectableStock) => {
    setSelectedStock(stock);
    setSheetOpen(true);
  };

  const handleSheetOpenChange = (open: boolean) => {
    setSheetOpen(open);
    if (!open) {
      setTimeout(() => setSelectedStock(null), 300);
    }
  };

  const handleSetAlert = (stock: SelectableStock, price: number) => {
    const newAlert: PriceAlert = {
      id: Date.now(),
      stockId: stock.id,
      stockName: stock.name,
      targetPrice: price,
      triggered: false,
    };
    setAlerts(prevAlerts => [...prevAlerts, newAlert]);
  };

  const handleBuyStock = (stockToBuy: SelectableStock, quantity: number) => {
    const currentPrice = 'currentMarketPrice' in stockToBuy ? stockToBuy.currentMarketPrice : stockToBuy.currentPrice;

    setHoldings(prevHoldings => {
      const existingHoldingIndex = prevHoldings.findIndex(h => h.name === stockToBuy.name);

      if (existingHoldingIndex > -1) {
        const updatedHoldings = [...prevHoldings];
        const existingHolding = updatedHoldings[existingHoldingIndex];
        const totalExistingValue = existingHolding.avgBuyPrice * existingHolding.quantity;
        const newPurchaseValue = currentPrice * quantity;
        const newTotalQuantity = existingHolding.quantity + quantity;

        const updatedHolding = {
          ...existingHolding,
          quantity: newTotalQuantity,
          avgBuyPrice: (totalExistingValue + newPurchaseValue) / newTotalQuantity,
        };
        updatedHoldings[existingHoldingIndex] = updatedHolding;
        return updatedHoldings;

      } else {
        const newHolding: HoldingStock = {
          id: `h-${Date.now()}`,
          name: stockToBuy.name,
          exchange: stockToBuy.exchange,
          quantity: quantity,
          avgBuyPrice: currentPrice,
          currentMarketPrice: currentPrice
        };
        return [...prevHoldings, newHolding];
      }
    });
  };

  const handleSellStock = (stockId: string, quantityToSell: number) => {
    setHoldings(prevHoldings => {
      const holdingIndex = prevHoldings.findIndex(h => h.id === stockId);
      if (holdingIndex === -1) return prevHoldings;

      const holding = prevHoldings[holdingIndex];
      if (holding.quantity < quantityToSell) return prevHoldings;

      if (holding.quantity === quantityToSell) {
        return prevHoldings.filter(h => h.id !== stockId);
      } else {
        const updatedHoldings = [...prevHoldings];
        const updatedHolding = {
          ...holding,
          quantity: holding.quantity - quantityToSell
        };
        updatedHoldings[holdingIndex] = updatedHolding;
        return updatedHoldings;
      }
    });
  };

  // --- Render Logic ---
  const renderCurrentView = () => {
    switch (currentView) {
      case 'wishlist':
        return <WishlistPage onStockSelect={handleStockSelect} stocks={stocks} />;
      case 'portfolio':
        return <PortfolioPage onStockSelect={handleStockSelect} holdings={holdings} />;
      case 'news':
        return <NewsPage />;
      default:
        return <WishlistPage onStockSelect={handleStockSelect} stocks={stocks} />;
    }
  };

  return (
    <div className="pb-[70px] min-h-screen flex flex-col font-sans bg-gray-50">
      <main className="flex-grow">
        {renderCurrentView()}
      </main>

      <BottomNavBar onNavClick={setCurrentView} currentView={currentView} />

      <StockDetailSheet
        open={isSheetOpen}
        onOpenChange={handleSheetOpenChange}
        stock={selectedStock}
        onSetAlert={handleSetAlert}
        onBuy={handleBuyStock}
        onSell={handleSellStock}
        holdings={holdings}
      />
    </div>
  );
}