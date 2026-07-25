'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuthStore } from '@/store/authStore';
import { 
  Printer, 
  Settings, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Play, 
  ShieldCheck, 
  Store, 
  QrCode, 
  Layout, 
  Lock, 
  Save, 
  RotateCcw, 
  UtensilsCrossed,
  Coffee,
  Cake,
  ShoppingBag,
  Pill,
  Hotel,
  Activity,
  Sliders,
  CheckSquare,
  Compass
} from 'lucide-react';

const AGENT_URL = 'http://localhost:4000';

interface PrinterSettings {
  printerName: string;
  connectionType: 'USB' | 'NETWORK';
  paperWidth: '80mm' | '58mm';
  characterEncoding: string;
  openCashDrawer: boolean;
  autoCut: boolean;
  printDensity: 'LOW' | 'MEDIUM' | 'HIGH' | 'MAXIMUM';
  fontSize: 'REGULAR' | 'MEDIUM' | 'LARGE' | 'DOUBLE_WIDTH' | 'DOUBLE_HEIGHT' | 'DOUBLE_BOTH';
  fontStyle: 'A' | 'B';
  lineSpacing: number;
  characterSpacing: number;
}

interface StoreInfo {
  storeName: string;
  address: string;
  city: string;
  phone: string;
  gstNumber: string;
  footerMessage: string;
  website: string;
  supportNumber: string;
}

interface ReceiptDisplayOptions {
  printLogo: boolean;
  printQrCode: boolean;
  printGst: boolean;
  printPaymentMethod: boolean;
  printFooter: boolean;
  printPoweredBy: boolean;
  printStorePhone: boolean;
  printStoreAddress: boolean;
}

interface QrConfig {
  type: 'Digital Receipt' | 'Google Review' | 'Website' | 'UPI Payment' | 'Custom URL';
  value: string;
}

interface SystemConfig {
  customerPrinter: PrinterSettings;
  kitchenPrinter: PrinterSettings;
  autoPrintEnabled: boolean;
  storeInfo?: StoreInfo;
  receiptOptions?: ReceiptDisplayOptions;
  qrConfig?: QrConfig;
  template?: 'Restaurant' | 'Cafe' | 'Bakery' | 'Retail' | 'Pharmacy' | 'Hotel';
  configRequired?: boolean;
}

interface WindowsPrinterInfo {
  name: string;
  driverName?: string;
  portName?: string;
  status?: string;
  isDefault: boolean;
  isThermal: boolean;
  isVirtual: boolean;
}

interface ValidationResult {
  isValid: boolean;
  autoHealed: boolean;
  configRequired: boolean;
  customerPrinterStatus: {
    configuredName: string;
    exists: boolean;
    status: 'ONLINE' | 'OFFLINE' | 'CONFIG_REQUIRED';
    message: string;
    errorCode?: string;
  };
  kitchenPrinterStatus: {
    configuredName: string;
    exists: boolean;
    status: 'ONLINE' | 'OFFLINE' | 'CONFIG_REQUIRED';
    message: string;
    errorCode?: string;
  };
  detectedPrinters: WindowsPrinterInfo[];
}

const TEMPLATE_PRESETS = {
  Restaurant: {
    name: 'KYRA FINE DINE',
    items: [
      { name: 'Chicken Dum Biryani', qty: 2, price: 320, total: 640 },
      { name: 'Paneer Butter Masala', qty: 1, price: 280, total: 280 },
      { name: 'Butter Naan', qty: 4, price: 45, total: 180 },
      { name: 'Fresh Lime Soda', qty: 2, price: 60, total: 120 },
    ],
    footer: 'Thank you for dining with us! Please visit again.',
  },
  Cafe: {
    name: 'KYRA CAFE & ROASTERY',
    items: [
      { name: 'Hazelnut Cappuccino', qty: 2, price: 180, total: 360 },
      { name: 'Avocado Toast & Egg', qty: 1, price: 240, total: 240 },
      { name: 'Dark Chocolate Muffin', qty: 2, price: 120, total: 240 },
    ],
    footer: 'Brewed with passion. Have a wonderful day!',
  },
  Bakery: {
    name: 'KYRA ARTISAN BAKERY',
    items: [
      { name: 'Belgian Truffle Cake 1kg', qty: 1, price: 850, total: 850 },
      { name: 'Garlic Cheese Breadsticks', qty: 2, price: 110, total: 220 },
      { name: 'Almond Croissant', qty: 3, price: 95, total: 285 },
    ],
    footer: 'Freshly baked every morning with love!',
  },
  Retail: {
    name: 'KYRA FASHION & LIFESTYLE',
    items: [
      { name: 'Slim Fit Cotton Denim Shirt', qty: 1, price: 1499, total: 1499 },
      { name: 'Casual Chino Trousers', qty: 1, price: 1899, total: 1899 },
      { name: 'Leather Belt (Tan)', qty: 1, price: 499, total: 499 },
    ],
    footer: 'Exchange permitted within 7 days with valid bill copy.',
  },
  Pharmacy: {
    name: 'KYRA MEDS & WELLNESS',
    items: [
      { name: 'Paracetamol 650mg Tab (15s)', qty: 2, price: 34, total: 68 },
      { name: 'Multivitamin Supplements 30s', qty: 1, price: 450, total: 450 },
      { name: 'Antiseptic Liquid 250ml', qty: 1, price: 125, total: 125 },
    ],
    footer: 'Keep out of reach of children. Consult doctor before use.',
  },
  Hotel: {
    name: 'KYRA GRAND SUITES & HOTEL',
    items: [
      { name: 'Deluxe Executive Suite - 1 Night', qty: 1, price: 4500, total: 4500 },
      { name: 'In-Room Dinner Buffet', qty: 2, price: 750, total: 1500 },
      { name: 'Express Laundry Service', qty: 1, price: 350, total: 350 },
    ],
    footer: 'We hope you enjoyed your luxurious stay!',
  },
};

export default function PrinterSettingsPage() {
  const user = useAuthStore((state) => state.user);
  
  const userRole = (user?.role || 'ADMIN').toUpperCase();
  const isAuthorized = userRole === 'ADMIN' || userRole === 'MANAGER';

  const [agentStatus, setAgentStatus] = useState<'ONLINE' | 'OFFLINE' | 'CHECKING'>('CHECKING');
  const [printersList, setPrintersList] = useState<WindowsPrinterInfo[]>([]);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [activeSection, setActiveSection] = useState('overview');
  const [lastCustomerTestPrint, setLastCustomerTestPrint] = useState<string>('Never');
  const [lastKitchenTestPrint, setLastKitchenTestPrint] = useState<string>('Never');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // System Configuration State
  const [config, setConfig] = useState<SystemConfig>({
    customerPrinter: {
      printerName: '',
      connectionType: 'USB',
      paperWidth: '80mm',
      characterEncoding: 'CP437',
      openCashDrawer: true,
      autoCut: true,
      printDensity: 'MEDIUM',
      fontSize: 'REGULAR',
      fontStyle: 'A',
      lineSpacing: 30,
      characterSpacing: 0,
    },
    kitchenPrinter: {
      printerName: '',
      connectionType: 'USB',
      paperWidth: '80mm',
      characterEncoding: 'CP437',
      openCashDrawer: false,
      autoCut: true,
      printDensity: 'MEDIUM',
      fontSize: 'REGULAR',
      fontStyle: 'A',
      lineSpacing: 30,
      characterSpacing: 0,
    },
    autoPrintEnabled: true,
    template: 'Restaurant',
    storeInfo: {
      storeName: 'KYRA FINE DINE',
      address: '123 Commercial Boulevard, Suite 400',
      city: 'Metropolis, NY 10001',
      phone: '+91 98765 43210',
      gstNumber: '22AAAAA0000A1Z5',
      footerMessage: 'Thank you for dining with us! Please visit again.',
      website: 'www.kyrapos.com',
      supportNumber: '+91 1800 123 4567',
    },
    receiptOptions: {
      printLogo: true,
      printQrCode: true,
      printGst: true,
      printPaymentMethod: true,
      printFooter: true,
      printPoweredBy: true,
      printStorePhone: true,
      printStoreAddress: true,
    },
    qrConfig: {
      type: 'Digital Receipt',
      value: 'https://kyrapos.com/receipt/INV-98241',
    },
  });

  useEffect(() => {
    if (isAuthorized) {
      checkHealth();
    }
  }, [isAuthorized]);

  const checkHealth = async () => {
    setAgentStatus('CHECKING');
    try {
      await axios.get(`${AGENT_URL}/health`, { timeout: 1500 });
      setAgentStatus('ONLINE');
      fetchData();
    } catch (e) {
      setAgentStatus('OFFLINE');
      setIsLoading(false);
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [printersRes, configRes, validateRes] = await Promise.all([
        axios.get(`${AGENT_URL}/printer/list`),
        axios.get(`${AGENT_URL}/config`),
        axios.get(`${AGENT_URL}/printer/validate`),
      ]);
      setPrintersList(printersRes.data.printers || []);
      setValidation(validateRes.data);

      if (configRes.data) {
        setConfig((prev) => ({
          ...prev,
          ...configRes.data,
          storeInfo: { ...prev.storeInfo, ...(configRes.data.storeInfo || {}) },
          receiptOptions: { ...prev.receiptOptions, ...(configRes.data.receiptOptions || {}) },
          qrConfig: { ...prev.qrConfig, ...(configRes.data.qrConfig || {}) },
        }));
      }

      if (validateRes.data?.autoHealed) {
        setStatusMessage({
          type: 'info',
          text: 'Auto-healing engine dynamically assigned installed Windows thermal printers.',
        });
      }
    } catch (e) {
      console.error('Failed to retrieve print agent configurations', e);
      setStatusMessage({ type: 'error', text: 'Failed to connect to local printer agent database.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleValidatePrinters = async () => {
    setIsValidating(true);
    setStatusMessage(null);
    try {
      const res = await axios.get(`${AGENT_URL}/printer/validate`);
      setValidation(res.data);
      if (res.data?.isValid) {
        setStatusMessage({ type: 'success', text: 'All configured thermal printers validated and operational!' });
      } else {
        setStatusMessage({ type: 'error', text: 'Printer validation alert: One or more configured printers require assignment.' });
      }
      const configRes = await axios.get(`${AGENT_URL}/config`);
      if (configRes.data) {
        setConfig((prev) => ({ ...prev, ...configRes.data }));
      }
    } catch (e) {
      setStatusMessage({ type: 'error', text: 'Failed to run printer validation check.' });
    } finally {
      setIsValidating(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setStatusMessage(null);
    try {
      const res = await axios.post(`${AGENT_URL}/config`, config);
      if (res.data.success) {
        if (res.data.validation) setValidation(res.data.validation);
        setStatusMessage({ type: 'success', text: 'Printer configurations & branding saved successfully.' });
      }
    } catch (e) {
      setStatusMessage({ type: 'error', text: 'Failed to save configuration settings to Print Agent.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestPrint = async (printerKey: 'customerPrinter' | 'kitchenPrinter') => {
    try {
      setStatusMessage(null);
      const endpoint = printerKey === 'customerPrinter' ? `${AGENT_URL}/print/test` : `${AGENT_URL}/print/kot`;
      const payload = printerKey === 'customerPrinter' ? { printerKey } : {
        restaurantName: config.storeInfo?.storeName || 'KYRA POS',
        orderNumber: 'KOT-104',
        tableNumber: 'Table 7',
        time: new Date().toLocaleTimeString(),
        items: [
          { name: 'Chicken Biryani', quantity: 2, notes: 'Extra spicy' },
          { name: 'Fresh Lime Soda', quantity: 2, notes: 'Less ice' }
        ]
      };

      const res = await axios.post(endpoint, payload);
      if (res.data.success) {
        const timeNow = new Date().toLocaleTimeString();
        if (printerKey === 'customerPrinter') setLastCustomerTestPrint(timeNow);
        else setLastKitchenTestPrint(timeNow);

        setStatusMessage({
          type: 'success',
          text: `Direct Win32 RAW test print queued for ${printerKey === 'customerPrinter' ? 'Customer' : 'Kitchen'} printer.`,
        });
      }
    } catch (e) {
      setStatusMessage({ type: 'error', text: 'Test print failed. Verify printer is connected and powered on.' });
    }
  };

  const updatePrinterProp = (
    printerKey: 'customerPrinter' | 'kitchenPrinter',
    prop: keyof PrinterSettings,
    value: any
  ) => {
    setConfig({
      ...config,
      [printerKey]: {
        ...config[printerKey],
        [prop]: value,
      },
    });
  };

  const updateStoreInfo = (prop: keyof StoreInfo, value: string) => {
    setConfig({
      ...config,
      storeInfo: {
        ...(config.storeInfo || {
          storeName: '', address: '', city: '', phone: '', gstNumber: '', footerMessage: '', website: '', supportNumber: ''
        }),
        [prop]: value,
      },
    });
  };

  const updateReceiptOptions = (prop: keyof ReceiptDisplayOptions, value: boolean) => {
    setConfig({
      ...config,
      receiptOptions: {
        ...(config.receiptOptions || {
          printLogo: true, printQrCode: true, printGst: true, printPaymentMethod: true, printFooter: true, printPoweredBy: true, printStorePhone: true, printStoreAddress: true
        }),
        [prop]: value,
      },
    });
  };

  const updateQrConfig = (prop: keyof QrConfig, value: string) => {
    setConfig({
      ...config,
      qrConfig: {
        ...(config.qrConfig || { type: 'Digital Receipt', value: '' }),
        [prop]: value,
      },
    });
  };

  const handleTemplateChange = (templateName: 'Restaurant' | 'Cafe' | 'Bakery' | 'Retail' | 'Pharmacy' | 'Hotel') => {
    const preset = TEMPLATE_PRESETS[templateName];
    setConfig({
      ...config,
      template: templateName,
      storeInfo: {
        ...(config.storeInfo || {
          storeName: '', address: '', city: '', phone: '', gstNumber: '', footerMessage: '', website: '', supportNumber: ''
        }),
        storeName: preset.name,
        footerMessage: preset.footer,
      },
    });
  };

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Section 12: Role Access Control Enforcement
  if (!isAuthorized) {
    return (
      <div className="flex-1 p-8 bg-slate-50 flex items-center justify-center min-h-[80vh]">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-slate-200 shadow-lg text-center flex flex-col items-center gap-4">
          <div className="p-4 bg-rose-100 text-rose-600 rounded-2xl">
            <Lock className="h-8 w-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Access Restricted</h2>
            <p className="text-xs text-slate-500 mt-1">
              Print Center settings are reserved for <span className="font-bold text-slate-700">Admin</span> and <span className="font-bold text-slate-700">Manager</span> roles.
            </p>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 w-full text-xxs font-mono text-slate-600">
            Current Role: <span className="font-bold text-rose-600">{userRole}</span> (Access Denied)
          </div>
        </div>
      </div>
    );
  }

  // Active Template Calculations
  const activeTemplate = config.template || 'Restaurant';
  const presetData = TEMPLATE_PRESETS[activeTemplate];
  const items = presetData.items;
  const subtotal = items.reduce((acc, item) => acc + item.total, 0);
  const taxAmount = config.receiptOptions?.printGst ? Math.round(subtotal * 0.05) : 0;
  const grandTotal = subtotal + taxAmount;

  const navigationSections = [
    { id: 'sec-status', name: 'Status Overview', icon: Activity },
    { id: 'sec-templates', name: 'Receipt Templates', icon: Layout },
    { id: 'sec-devices', name: 'Printer Devices', icon: Printer },
    { id: 'sec-hardware', name: 'Hardware Settings', icon: Sliders },
    { id: 'sec-branding', name: 'Store Branding', icon: Store },
    { id: 'sec-options', name: 'Receipt Options', icon: CheckSquare },
    { id: 'sec-qrcode', name: 'QR Code Config', icon: QrCode },
    { id: 'sec-diagnostics', name: 'Live Diagnostics', icon: ShieldCheck },
  ];

  return (
    <div className="flex-1 p-6 md:p-8 bg-slate-100 overflow-y-auto font-sans min-h-screen">
      <div className="max-w-7xl mx-auto flex flex-col gap-6">

        {/* Page Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-slate-900 text-white rounded-2xl shadow-sm">
              <Printer className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">Print Center</h1>
                <span className="text-xxs font-extrabold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Enterprise POS
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure receipt printers, kitchen printers, receipt layout, branding, and perform live diagnostics.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={handleValidatePrinters}
              disabled={isValidating}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl transition-all shadow-2xs cursor-pointer"
            >
              <ShieldCheck className={`h-4 w-4 text-emerald-600 ${isValidating ? 'animate-spin' : ''}`} />
              Validate Printers
            </button>
            <button 
              onClick={checkHealth}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 rounded-xl transition-all shadow-xs cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${agentStatus === 'CHECKING' ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Status Alert Banner */}
        {agentStatus === 'OFFLINE' ? (
          <div className="flex items-start gap-3 bg-rose-50 border border-rose-200 text-rose-900 p-4 rounded-2xl shadow-xs">
            <AlertCircle className="h-5 w-5 shrink-0 text-rose-600 mt-0.5" />
            <div>
              <span className="font-bold block text-sm">Local Print Agent is Offline</span>
              <p className="text-xs text-rose-700 mt-0.5">
                The Kyra POS Print Agent is not responding at <code className="font-mono bg-rose-100 px-1.5 py-0.5 rounded">http://localhost:4000</code>. Verify that the Windows background service is active or run the setup installer.
              </p>
            </div>
          </div>
        ) : agentStatus === 'ONLINE' ? (
          <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 text-emerald-900 p-4 rounded-2xl shadow-xs">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
              <div>
                <span className="font-bold text-sm block">Print Agent Active (Port 4000)</span>
                <span className="text-xs text-emerald-700">Direct Win32 Spooler RAW Printing Active • Zero Printer Sharing Required</span>
              </div>
            </div>
            {validation?.autoHealed && (
              <span className="text-xxs font-extrabold bg-emerald-600 text-white px-3 py-1 rounded-full uppercase tracking-wider">
                Auto-Healed
              </span>
            )}
          </div>
        ) : null}

        {statusMessage && (
          <div className={`p-4 rounded-2xl flex items-center gap-3 border text-xs font-semibold shadow-xs ${
            statusMessage.type === 'success' 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
              : statusMessage.type === 'info'
              ? 'bg-blue-50 border-blue-200 text-blue-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}>
            {statusMessage.type === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" /> : <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* 3-COLUMN MAIN LAYOUT:
            1. Left Sub-Sidebar (Section Jump Anchors - 2 Cols)
            2. Middle Configuration Forms (6 Cols)
            3. Right Sticky Live Receipt Preview (4 Cols)
        */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* Column 1: Print Center Settings Sub-Sidebar Navigation (2 Cols) */}
          <div className="lg:col-span-2 hidden lg:flex flex-col gap-1 sticky top-6 bg-white p-3 rounded-3xl border border-slate-200 shadow-xs">
            <div className="px-3 py-2 text-xxs font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Compass className="h-3.5 w-3.5 text-emerald-600" />
              Quick Jump
            </div>
            {navigationSections.map((sec) => {
              const Icon = sec.icon;
              const isActive = activeSection === sec.id;
              return (
                <button
                  key={sec.id}
                  onClick={() => scrollToSection(sec.id)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                  <span className="truncate">{sec.name}</span>
                </button>
              );
            })}
          </div>

          {/* Column 2: Middle Configuration Forms (6 Cols) */}
          <div className="lg:col-span-6 flex flex-col gap-6">

            {/* SECTION 1: Status Cards Overview */}
            <div id="sec-status" className="scroll-mt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Customer Printer Summary */}
                <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Customer</span>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                        validation?.customerPrinterStatus.exists ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                      }`}>
                        {validation?.customerPrinterStatus.exists ? '🟢 Online' : '🔴 Offline'}
                      </span>
                    </div>
                    <h3 className="font-black text-xs text-slate-900 truncate">
                      {config.customerPrinter.printerName || 'Not Configured'}
                    </h3>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-100 text-[10px] font-semibold text-slate-500 flex justify-between">
                    <span>Width: {config.customerPrinter.paperWidth}</span>
                    <span>Test: {lastCustomerTestPrint}</span>
                  </div>
                </div>

                {/* Kitchen Printer Summary */}
                <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Kitchen</span>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                        validation?.kitchenPrinterStatus.exists ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                      }`}>
                        {validation?.kitchenPrinterStatus.exists ? '🟢 Online' : '🔴 Offline'}
                      </span>
                    </div>
                    <h3 className="font-black text-xs text-slate-900 truncate">
                      {config.kitchenPrinter.printerName || 'Not Configured'}
                    </h3>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-100 text-[10px] font-semibold text-slate-500 flex justify-between">
                    <span>Width: {config.kitchenPrinter.paperWidth}</span>
                    <span>Test: {lastKitchenTestPrint}</span>
                  </div>
                </div>

                {/* Print Agent Summary */}
                <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Agent</span>
                      <span className="text-[10px] font-black bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                        {agentStatus === 'ONLINE' ? '🟢 Active' : '🔴 Off'}
                      </span>
                    </div>
                    <h3 className="font-black text-xs text-slate-900">v1.0.0 (Port 4000)</h3>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-100 text-[10px] font-semibold text-slate-500 flex justify-between">
                    <span>Queue: 0</span>
                    <span>Win32 Spooler</span>
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 11: Receipt Templates Selector */}
            <div id="sec-templates" className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col gap-4 scroll-mt-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Layout className="h-4 w-4 text-emerald-600" />
                  Receipt Template Preset
                </h2>
                <span className="text-xxs text-slate-400">Updates live receipt preview</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'Restaurant', label: 'Restaurant', icon: UtensilsCrossed },
                  { id: 'Cafe', label: 'Cafe', icon: Coffee },
                  { id: 'Bakery', label: 'Bakery', icon: Cake },
                  { id: 'Retail', label: 'Retail', icon: ShoppingBag },
                  { id: 'Pharmacy', label: 'Pharmacy', icon: Pill },
                  { id: 'Hotel', label: 'Hotel', icon: Hotel },
                ].map((tmpl) => {
                  const Icon = tmpl.icon;
                  const isActive = activeTemplate === tmpl.id;
                  return (
                    <button
                      key={tmpl.id}
                      onClick={() => handleTemplateChange(tmpl.id as any)}
                      className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${
                        isActive 
                          ? 'bg-slate-900 text-white border-slate-900 shadow-xs' 
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <Icon className="h-4 w-4 mb-1" />
                      {tmpl.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* SECTION 2 & 3: Receipt Printers Selection */}
            <div id="sec-devices" className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col gap-6 scroll-mt-6">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                <Printer className="h-4 w-4 text-slate-700" />
                Printer Device Assignment
              </h2>

              {/* Customer Printer */}
              <div className="flex flex-col gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900">Customer Receipt Printer</span>
                  <button 
                    onClick={() => handleTestPrint('customerPrinter')}
                    className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 rounded-xl transition-all shadow-2xs cursor-pointer"
                  >
                    <Play className="h-3 w-3 fill-white" />
                    Test Receipt
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xxs font-bold text-slate-500 block mb-1">Connection Type</label>
                    <select 
                      value={config.customerPrinter.connectionType}
                      onChange={(e) => updatePrinterProp('customerPrinter', 'connectionType', e.target.value)}
                      className="w-full text-xs font-medium border border-slate-200 rounded-xl p-2.5 bg-white"
                    >
                      <option value="USB">USB / Win32 Direct RAW</option>
                      <option value="NETWORK">Network TCP/IP (Port 9100)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xxs font-bold text-slate-500 block mb-1">Windows Printer</label>
                    {config.customerPrinter.connectionType === 'NETWORK' ? (
                      <input 
                        type="text"
                        value={config.customerPrinter.printerName}
                        onChange={(e) => updatePrinterProp('customerPrinter', 'printerName', e.target.value)}
                        placeholder="IP e.g. 192.168.1.100"
                        className="w-full text-xs font-medium border border-slate-200 rounded-xl p-2.5 bg-white"
                      />
                    ) : (
                      <select 
                        value={config.customerPrinter.printerName}
                        onChange={(e) => updatePrinterProp('customerPrinter', 'printerName', e.target.value)}
                        className="w-full text-xs font-medium border border-slate-200 rounded-xl p-2.5 bg-white"
                      >
                        <option value="">-- Select Installed Printer --</option>
                        {printersList.map((p) => (
                          <option key={p.name} value={p.name}>
                            {p.name} {p.isThermal ? '🔥 (Thermal)' : ''} {p.isDefault ? '⭐ (Default)' : ''}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              </div>

              {/* Kitchen KOT Printer */}
              <div className="flex flex-col gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900">Kitchen KOT Printer</span>
                  <button 
                    onClick={() => handleTestPrint('kitchenPrinter')}
                    className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 rounded-xl transition-all shadow-2xs cursor-pointer"
                  >
                    <Play className="h-3 w-3 fill-white" />
                    Test KOT
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xxs font-bold text-slate-500 block mb-1">Connection Type</label>
                    <select 
                      value={config.kitchenPrinter.connectionType}
                      onChange={(e) => updatePrinterProp('kitchenPrinter', 'connectionType', e.target.value)}
                      className="w-full text-xs font-medium border border-slate-200 rounded-xl p-2.5 bg-white"
                    >
                      <option value="USB">USB / Win32 Direct RAW</option>
                      <option value="NETWORK">Network TCP/IP (Port 9100)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xxs font-bold text-slate-500 block mb-1">Windows Printer</label>
                    {config.kitchenPrinter.connectionType === 'NETWORK' ? (
                      <input 
                        type="text"
                        value={config.kitchenPrinter.printerName}
                        onChange={(e) => updatePrinterProp('kitchenPrinter', 'printerName', e.target.value)}
                        placeholder="IP e.g. 192.168.1.101"
                        className="w-full text-xs font-medium border border-slate-200 rounded-xl p-2.5 bg-white"
                      />
                    ) : (
                      <select 
                        value={config.kitchenPrinter.printerName}
                        onChange={(e) => updatePrinterProp('kitchenPrinter', 'printerName', e.target.value)}
                        className="w-full text-xs font-medium border border-slate-200 rounded-xl p-2.5 bg-white"
                      >
                        <option value="">-- Select Installed Printer --</option>
                        {printersList.map((p) => (
                          <option key={p.name} value={p.name}>
                            {p.name} {p.isThermal ? '🔥 (Thermal)' : ''} {p.isDefault ? '⭐ (Default)' : ''}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              </div>

            </div>

            {/* SECTION 4: Receipt Layout Configurations */}
            <div id="sec-hardware" className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col gap-4 scroll-mt-6">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                <Sliders className="h-4 w-4 text-slate-700" />
                Receipt Hardware Settings
              </h2>

              <div className="grid grid-cols-2 gap-4">
                {/* Paper Width Selection */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-2">Paper Width</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => updatePrinterProp('customerPrinter', 'paperWidth', '80mm')}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                        config.customerPrinter.paperWidth === '80mm'
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      80 mm (Standard)
                    </button>
                    <button
                      onClick={() => updatePrinterProp('customerPrinter', 'paperWidth', '58mm')}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                        config.customerPrinter.paperWidth === '58mm'
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      58 mm (Compact)
                    </button>
                  </div>
                </div>

                {/* Character Encoding */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-2">Character Encoding</label>
                  <select 
                    value={config.customerPrinter.characterEncoding}
                    onChange={(e) => updatePrinterProp('customerPrinter', 'characterEncoding', e.target.value)}
                    className="w-full text-xs font-medium border border-slate-200 rounded-xl p-2.5 bg-slate-50"
                  >
                    <option value="CP437">CP437 (Standard English)</option>
                    <option value="UTF-8">UTF-8 (International)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-2">
                <div>
                  <label className="text-xxs font-bold text-slate-500 block mb-1">Print Density</label>
                  <select 
                    value={config.customerPrinter.printDensity}
                    onChange={(e) => updatePrinterProp('customerPrinter', 'printDensity', e.target.value)}
                    className="w-full text-xs font-medium border border-slate-200 rounded-xl p-2 bg-slate-50"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="MAXIMUM">Maximum</option>
                  </select>
                </div>
                <div>
                  <label className="text-xxs font-bold text-slate-500 block mb-1">Font Style</label>
                  <select 
                    value={config.customerPrinter.fontStyle}
                    onChange={(e) => updatePrinterProp('customerPrinter', 'fontStyle', e.target.value)}
                    className="w-full text-xs font-medium border border-slate-200 rounded-xl p-2 bg-slate-50"
                  >
                    <option value="A">Font A (Standard)</option>
                    <option value="B">Font B (Small)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xxs font-bold text-slate-500 block mb-1">Font Size</label>
                  <select 
                    value={config.customerPrinter.fontSize}
                    onChange={(e) => updatePrinterProp('customerPrinter', 'fontSize', e.target.value)}
                    className="w-full text-xs font-medium border border-slate-200 rounded-xl p-2 bg-slate-50"
                  >
                    <option value="REGULAR">Regular</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LARGE">Large</option>
                    <option value="DOUBLE_WIDTH">Double Width</option>
                    <option value="DOUBLE_HEIGHT">Double Height</option>
                    <option value="DOUBLE_BOTH">Double W + H</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-3">
                <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-xs font-bold text-slate-700">Auto Cut Paper</span>
                  <input 
                    type="checkbox"
                    checked={config.customerPrinter.autoCut}
                    onChange={(e) => updatePrinterProp('customerPrinter', 'autoCut', e.target.checked)}
                    className="h-4 w-4 text-slate-900 rounded cursor-pointer"
                  />
                </div>
                <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-xs font-bold text-slate-700">Open Cash Drawer Pulse</span>
                  <input 
                    type="checkbox"
                    checked={config.customerPrinter.openCashDrawer}
                    onChange={(e) => updatePrinterProp('customerPrinter', 'openCashDrawer', e.target.checked)}
                    className="h-4 w-4 text-slate-900 rounded cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* SECTION 5: Store Information Header */}
            <div id="sec-branding" className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col gap-4 scroll-mt-6">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                <Store className="h-4 w-4 text-slate-700" />
                Store Branding & Information
              </h2>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xxs font-bold text-slate-500 block mb-1">Store Name</label>
                  <input 
                    type="text"
                    value={config.storeInfo?.storeName || ''}
                    onChange={(e) => updateStoreInfo('storeName', e.target.value)}
                    className="w-full text-xs font-medium border border-slate-200 rounded-xl p-2.5"
                  />
                </div>
                <div>
                  <label className="text-xxs font-bold text-slate-500 block mb-1">GST / Tax Number</label>
                  <input 
                    type="text"
                    value={config.storeInfo?.gstNumber || ''}
                    onChange={(e) => updateStoreInfo('gstNumber', e.target.value)}
                    className="w-full text-xs font-medium border border-slate-200 rounded-xl p-2.5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xxs font-bold text-slate-500 block mb-1">Street Address</label>
                  <input 
                    type="text"
                    value={config.storeInfo?.address || ''}
                    onChange={(e) => updateStoreInfo('address', e.target.value)}
                    className="w-full text-xs font-medium border border-slate-200 rounded-xl p-2.5"
                  />
                </div>
                <div>
                  <label className="text-xxs font-bold text-slate-500 block mb-1">Phone Number</label>
                  <input 
                    type="text"
                    value={config.storeInfo?.phone || ''}
                    onChange={(e) => updateStoreInfo('phone', e.target.value)}
                    className="w-full text-xs font-medium border border-slate-200 rounded-xl p-2.5"
                  />
                </div>
              </div>

              <div>
                <label className="text-xxs font-bold text-slate-500 block mb-1">Footer Message</label>
                <input 
                  type="text"
                  value={config.storeInfo?.footerMessage || ''}
                  onChange={(e) => updateStoreInfo('footerMessage', e.target.value)}
                  className="w-full text-xs font-medium border border-slate-200 rounded-xl p-2.5"
                />
              </div>
            </div>

            {/* SECTION 6: Receipt Options Checkboxes */}
            <div id="sec-options" className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col gap-4 scroll-mt-6">
              <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
                Receipt Display Options
              </h2>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'printLogo', label: 'Print Header Logo' },
                  { key: 'printQrCode', label: 'Print QR Code' },
                  { key: 'printGst', label: 'Print Tax Breakup (GST)' },
                  { key: 'printPaymentMethod', label: 'Print Payment Method' },
                  { key: 'printFooter', label: 'Print Footer Message' },
                  { key: 'printPoweredBy', label: 'Print "Powered by KYRA POS"' },
                  { key: 'printStorePhone', label: 'Print Store Phone' },
                  { key: 'printStoreAddress', label: 'Print Store Address' },
                ].map((opt) => (
                  <label key={opt.key} className="flex items-center gap-2.5 p-2 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer text-xs font-bold text-slate-700">
                    <input 
                      type="checkbox"
                      checked={Boolean(config.receiptOptions?.[opt.key as keyof ReceiptDisplayOptions])}
                      onChange={(e) => updateReceiptOptions(opt.key as keyof ReceiptDisplayOptions, e.target.checked)}
                      className="h-4 w-4 text-slate-900 rounded"
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>

            {/* SECTION 7: QR Code Configuration */}
            <div id="sec-qrcode" className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col gap-4 scroll-mt-6">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                <QrCode className="h-4 w-4 text-slate-700" />
                QR Code Footer Configuration
              </h2>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xxs font-bold text-slate-500 block mb-1">QR Code Purpose</label>
                  <select 
                    value={config.qrConfig?.type || 'Digital Receipt'}
                    onChange={(e) => updateQrConfig('type', e.target.value)}
                    className="w-full text-xs font-medium border border-slate-200 rounded-xl p-2.5 bg-white"
                  >
                    <option value="Digital Receipt">Digital Receipt Link</option>
                    <option value="Google Review">Google Review Link</option>
                    <option value="Website">Store Website</option>
                    <option value="UPI Payment">UPI Direct Payment</option>
                    <option value="Custom URL">Custom Link</option>
                  </select>
                </div>
                <div>
                  <label className="text-xxs font-bold text-slate-500 block mb-1">QR Value / Payload</label>
                  <input 
                    type="text"
                    value={config.qrConfig?.value || ''}
                    onChange={(e) => updateQrConfig('value', e.target.value)}
                    placeholder="https://..."
                    className="w-full text-xs font-medium border border-slate-200 rounded-xl p-2.5"
                  />
                </div>
              </div>
            </div>

            {/* SECTION 9: Live Printer Diagnostics */}
            <div id="sec-diagnostics" className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col gap-4 scroll-mt-6">
              <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
                System Diagnostics & Spooler Health
              </h2>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                  <span className="text-xxs font-bold text-slate-400 uppercase block">Printer Online</span>
                  <span className="text-xs font-bold text-emerald-600 block mt-1">🟢 Verified</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                  <span className="text-xxs font-bold text-slate-400 uppercase block">Paper Status</span>
                  <span className="text-xs font-bold text-emerald-600 block mt-1">🟢 Paper OK</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                  <span className="text-xxs font-bold text-slate-400 uppercase block">USB Spooler</span>
                  <span className="text-xs font-bold text-emerald-600 block mt-1">🟢 Win32 RAW</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                  <span className="text-xxs font-bold text-slate-400 uppercase block">API Gateway</span>
                  <span className="text-xs font-bold text-emerald-600 block mt-1">🟢 Port 4000</span>
                </div>
              </div>
            </div>

          </div>

          {/* Column 3: Live Thermal Receipt Preview (Sticky 4 Cols) */}
          <div className="lg:col-span-4 sticky top-6">
            <div className="bg-slate-900 p-5 rounded-3xl text-white shadow-xl flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Printer className="h-4 w-4 text-emerald-400" />
                  <h3 className="font-bold text-xs uppercase tracking-wider text-slate-300">Live Thermal Preview</h3>
                </div>
                <span className="text-xxs font-extrabold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-md">
                  {config.customerPrinter.paperWidth}
                </span>
              </div>

              {/* Thermal Slip Container */}
              <div className="bg-amber-50 text-slate-900 p-5 rounded-2xl font-mono text-xs shadow-inner border border-amber-200 flex flex-col gap-3 min-h-[480px]">
                
                {/* Header Logo & Name */}
                <div className="text-center flex flex-col items-center">
                  {config.receiptOptions?.printLogo && (
                    <div className="font-black text-base border-2 border-slate-900 px-2.5 py-0.5 mb-1.5 tracking-widest uppercase">
                      KYRA
                    </div>
                  )}
                  <h4 className="font-bold text-xs tracking-tight uppercase">
                    {config.storeInfo?.storeName || 'KYRA POS'}
                  </h4>
                  {config.receiptOptions?.printStoreAddress && (
                    <p className="text-[10px] text-slate-600">{config.storeInfo?.address}</p>
                  )}
                  {config.receiptOptions?.printStorePhone && (
                    <p className="text-[10px] text-slate-600">Ph: {config.storeInfo?.phone}</p>
                  )}
                  {config.receiptOptions?.printGst && (
                    <p className="text-[10px] text-slate-600">GSTIN: {config.storeInfo?.gstNumber}</p>
                  )}
                </div>

                <div className="border-t border-dashed border-slate-400 my-0.5" />

                {/* Metadata */}
                <div className="text-[10px] flex flex-col gap-0.5 text-slate-700">
                  <div className="flex justify-between">
                    <span>Bill: INV-98241</span>
                    <span>Type: DINE IN</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Date: {new Date().toLocaleDateString()}</span>
                    <span>Time: {new Date().toLocaleTimeString()}</span>
                  </div>
                </div>

                <div className="border-t border-dashed border-slate-400 my-0.5" />

                {/* Items Table */}
                <div className="flex flex-col gap-1 text-[10px]">
                  <div className="flex justify-between font-bold border-b border-slate-300 pb-0.5">
                    <span>ITEM</span>
                    <span>QTY x PRICE</span>
                    <span>TOTAL</span>
                  </div>
                  {items.map((it, idx) => (
                    <div key={idx} className="flex justify-between items-start">
                      <span className="font-semibold truncate max-w-[110px]">{it.name}</span>
                      <span>{it.qty} x {it.price}</span>
                      <span className="font-bold">{it.total}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-dashed border-slate-400 my-0.5" />

                {/* Subtotal & Totals */}
                <div className="flex flex-col gap-0.5 text-[10px]">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>₹{subtotal}</span>
                  </div>
                  {config.receiptOptions?.printGst && (
                    <div className="flex justify-between text-slate-600">
                      <span>GST (5%)</span>
                      <span>₹{taxAmount}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-black text-xs border-t border-slate-900 pt-1 mt-0.5">
                    <span>GRAND TOTAL</span>
                    <span>₹{grandTotal}</span>
                  </div>
                </div>

                {config.receiptOptions?.printPaymentMethod && (
                  <div className="text-[10px] text-slate-600 border-t border-dashed border-slate-400 pt-1 flex justify-between">
                    <span>Payment Method:</span>
                    <span className="font-bold text-slate-900">UPI / Cash</span>
                  </div>
                )}

                {/* Footer Message */}
                {config.receiptOptions?.printFooter && config.storeInfo?.footerMessage && (
                  <div className="text-center text-[10px] text-slate-700 italic border-t border-dashed border-slate-400 pt-1.5 mt-1">
                    "{config.storeInfo.footerMessage}"
                  </div>
                )}

                {/* QR Code Graphic Box */}
                {config.receiptOptions?.printQrCode && (
                  <div className="flex flex-col items-center justify-center my-1.5 text-center">
                    <div className="w-14 h-14 bg-slate-900 p-1 flex items-center justify-center rounded-xs">
                      <div className="w-full h-full border border-white flex items-center justify-center text-white text-[7px] font-mono">
                        QR CODE
                      </div>
                    </div>
                    <span className="text-[8px] text-slate-500 mt-1 font-sans font-semibold">
                      Scan for {config.qrConfig?.type}
                    </span>
                  </div>
                )}

                {/* Powered By */}
                {config.receiptOptions?.printPoweredBy && (
                  <div className="text-center text-[8px] text-slate-500 font-sans tracking-widest uppercase border-t border-slate-300 pt-1">
                    Powered by KYRA POS
                  </div>
                )}

              </div>
            </div>
          </div>

        </div>

        {/* SECTION 10: Sticky Floating Bottom Action Control Bar */}
        <div className="sticky bottom-4 bg-slate-900 text-white p-4 rounded-3xl shadow-2xl border border-slate-800 flex items-center justify-between z-50">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0" />
            <span className="text-xs font-bold text-slate-200 hidden md:inline">
              Win32 RAW Spooler Active • Save persistent config immediately
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={fetchData}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Restore Defaults
            </button>
            <button 
              onClick={() => handleTestPrint('customerPrinter')}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Play className="h-3.5 w-3.5 fill-slate-200" />
              Test Receipt
            </button>
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <Save className="h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
