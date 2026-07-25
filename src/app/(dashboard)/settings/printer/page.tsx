'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { Printer, Settings, CheckCircle2, AlertCircle, RefreshCw, Play, ShieldCheck, Cpu } from 'lucide-react';

const AGENT_URL = 'http://localhost:4000';

interface PrinterSettings {
  printerName: string;
  connectionType: 'USB' | 'NETWORK';
  paperWidth: '80mm' | '58mm';
  characterEncoding: string;
  openCashDrawer: boolean;
  autoCut: boolean;
  printDensity: 'LOW' | 'MEDIUM' | 'HIGH' | 'MAXIMUM';
  fontSize: 'REGULAR' | 'MEDIUM' | 'LARGE';
  fontStyle: 'A' | 'B';
  lineSpacing: number;
  characterSpacing: number;
}

interface SystemConfig {
  customerPrinter: PrinterSettings;
  kitchenPrinter: PrinterSettings;
  autoPrintEnabled: boolean;
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

export default function PrinterSettingsPage() {
  const [agentStatus, setAgentStatus] = useState<'ONLINE' | 'OFFLINE' | 'CHECKING'>('CHECKING');
  const [printersList, setPrintersList] = useState<WindowsPrinterInfo[]>([]);
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  useEffect(() => {
    checkHealth();
  }, []);

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
      setConfig(configRes.data);
      setValidation(validateRes.data);

      if (validateRes.data?.autoHealed) {
        setStatusMessage({
          type: 'info',
          text: 'Auto-healing engine dynamically configured receipt printers based on Windows OS detection.',
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
        setStatusMessage({ type: 'success', text: 'All configured thermal printers validated successfully and ready for printing!' });
      } else {
        setStatusMessage({ type: 'error', text: 'Printer validation alert: One or more configured printers require selection.' });
      }
      const configRes = await axios.get(`${AGENT_URL}/config`);
      setConfig(configRes.data);
    } catch (e) {
      setStatusMessage({ type: 'error', text: 'Failed to run printer validation check.' });
    } finally {
      setIsValidating(false);
    }
  };

  const handleSave = async () => {
    if (!config) return;
    setIsSaving(true);
    setStatusMessage(null);
    try {
      const res = await axios.post(`${AGENT_URL}/config`, config);
      if (res.data.success) {
        setConfig(res.data.config);
        if (res.data.validation) setValidation(res.data.validation);
        setStatusMessage({ type: 'success', text: 'Printer configurations saved & validated successfully.' });
      }
    } catch (e) {
      setStatusMessage({ type: 'error', text: 'Failed to save configuration settings.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestPrint = async (printerKey: 'customerPrinter' | 'kitchenPrinter') => {
    try {
      setStatusMessage(null);
      const res = await axios.post(`${AGENT_URL}/print/test`, { printerKey });
      if (res.data.success) {
        setStatusMessage({ type: 'success', text: `Direct RAW test print queued for ${printerKey === 'customerPrinter' ? 'Customer' : 'Kitchen'} printer.` });
      }
    } catch (e) {
      setStatusMessage({ type: 'error', text: 'Test print failed. Make sure printer is powered on and connected.' });
    }
  };

  const updatePrinterProp = (
    printerKey: 'customerPrinter' | 'kitchenPrinter',
    prop: keyof PrinterSettings,
    value: any
  ) => {
    if (!config) return;
    setConfig({
      ...config,
      [printerKey]: {
        ...config[printerKey],
        [prop]: value,
      },
    });
  };

  return (
    <div className="flex-1 p-6 md:p-8 bg-slate-50 overflow-y-auto font-sans">
      <div className="max-w-4xl mx-auto flex flex-col gap-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-slate-900 text-white rounded-xl shadow-xs">
              <Printer className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Enterprise Printer Settings</h1>
              <p className="text-sm text-slate-500">Manage ESC/POS receipt & kitchen printers with Win32 Spooler RAW printing.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleValidatePrinters}
              disabled={isValidating}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold bg-white text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-100 transition-all shadow-2xs"
            >
              <ShieldCheck className={`h-4 w-4 text-emerald-600 ${isValidating ? 'animate-spin' : ''}`} />
              Validate Printers
            </button>
            <button 
              onClick={checkHealth}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all shadow-xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${agentStatus === 'CHECKING' ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Status Alert Banner */}
        {agentStatus === 'OFFLINE' ? (
          <div className="flex items-start gap-3 bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-2xl shadow-xs">
            <AlertCircle className="h-5 w-5 shrink-0 text-rose-600 mt-0.5" />
            <div>
              <span className="font-bold block">Local Print Agent is Offline</span>
              <p className="text-xs text-rose-700 mt-0.5">
                The Kyra POS Print Agent is not responding at <code className="font-mono bg-rose-100 px-1 py-0.5 rounded">http://localhost:4000</code>. Please make sure the background Windows Service is active or download the setup installer.
              </p>
            </div>
          </div>
        ) : agentStatus === 'ONLINE' ? (
          <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 text-emerald-900 p-4 rounded-2xl shadow-xs">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
              <div>
                <span className="font-bold block">Print Agent Connected (Port 4000)</span>
                <span className="text-xs text-emerald-700">Win32 Spooler RAW API Engine Active • Zero Printer Sharing Required</span>
              </div>
            </div>
            {validation?.autoHealed && (
              <span className="text-xxs font-extrabold bg-emerald-600 text-white px-3 py-1 rounded-full uppercase tracking-wider">
                Auto-Healed
              </span>
            )}
          </div>
        ) : (
          <div className="bg-slate-100 text-slate-600 p-4 rounded-2xl animate-pulse text-xs font-medium">
            Checking Print Agent connection...
          </div>
        )}

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

        {/* Settings Form */}
        {config && agentStatus === 'ONLINE' && (
          <div className="flex flex-col gap-6">
            
            {/* General Configurations */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Settings className="h-4 w-4 text-slate-500" />
                General Printing Policy
              </h2>
              <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200/80 rounded-xl">
                <div>
                  <span className="font-bold text-xs text-slate-800 block">Auto-Print on Checkout</span>
                  <span className="text-xxs text-slate-500">Automatically queue and print receipt tickets immediately upon POS checkout completion.</span>
                </div>
                <input 
                  type="checkbox"
                  checked={config.autoPrintEnabled}
                  onChange={(e) => setConfig({ ...config, autoPrintEnabled: e.target.checked })}
                  className="h-5 w-5 text-slate-900 border-slate-300 rounded focus:ring-slate-900 cursor-pointer"
                />
              </div>
            </div>

            {/* Split layout for Customer and Kitchen printer configurations */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Customer Printer settings */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">Customer Receipt Printer</h3>
                    <span className="text-xxs font-medium text-slate-400">Prints Customer Tax Invoices</span>
                  </div>
                  <button 
                    onClick={() => handleTestPrint('customerPrinter')}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all shadow-xs cursor-pointer"
                  >
                    <Play className="h-3 w-3 fill-white" />
                    Test Print
                  </button>
                </div>

                <div className="flex flex-col gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">Connection Type</label>
                    <select 
                      value={config.customerPrinter.connectionType}
                      onChange={(e) => updatePrinterProp('customerPrinter', 'connectionType', e.target.value)}
                      className="w-full text-xs font-medium border border-slate-200 rounded-xl p-2.5 bg-slate-50 focus:bg-white focus:outline-none"
                    >
                      <option value="USB">USB / Win32 Spooler (Direct RAW)</option>
                      <option value="NETWORK">Network TCP/IP (Port 9100)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">
                      {config.customerPrinter.connectionType === 'NETWORK' ? 'Printer IP Address' : 'Windows Spooler Printer'}
                    </label>
                    {config.customerPrinter.connectionType === 'NETWORK' ? (
                      <input 
                        type="text"
                        value={config.customerPrinter.printerName}
                        onChange={(e) => updatePrinterProp('customerPrinter', 'printerName', e.target.value)}
                        placeholder="e.g. 192.168.1.100"
                        className="w-full text-xs font-medium border border-slate-200 rounded-xl p-2.5"
                      />
                    ) : (
                      <select 
                        value={config.customerPrinter.printerName}
                        onChange={(e) => updatePrinterProp('customerPrinter', 'printerName', e.target.value)}
                        className="w-full text-xs font-medium border border-slate-200 rounded-xl p-2.5 bg-slate-50 focus:bg-white focus:outline-none"
                      >
                        <option value="">-- Select Windows Printer --</option>
                        {printersList.map((p) => (
                          <option key={p.name} value={p.name}>
                            {p.name} {p.isThermal ? '🔥 (Thermal)' : ''} {p.isDefault ? '⭐ (Default)' : ''}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1">Paper Width</label>
                      <select 
                        value={config.customerPrinter.paperWidth}
                        onChange={(e) => updatePrinterProp('customerPrinter', 'paperWidth', e.target.value)}
                        className="w-full text-xs font-medium border border-slate-200 rounded-xl p-2.5 bg-slate-50"
                      >
                        <option value="80mm">80mm (Standard)</option>
                        <option value="58mm">58mm (Small)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1">Encoding</label>
                      <select 
                        value={config.customerPrinter.characterEncoding}
                        onChange={(e) => updatePrinterProp('customerPrinter', 'characterEncoding', e.target.value)}
                        className="w-full text-xs font-medium border border-slate-200 rounded-xl p-2.5 bg-slate-50"
                      >
                        <option value="CP437">CP437 (Standard)</option>
                        <option value="UTF-8">UTF-8</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                    <span className="text-xs font-bold text-slate-700">Auto-Cut Paper</span>
                    <input 
                      type="checkbox"
                      checked={config.customerPrinter.autoCut}
                      onChange={(e) => updatePrinterProp('customerPrinter', 'autoCut', e.target.checked)}
                      className="h-4 w-4 text-slate-900 rounded cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-100 pt-3">
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

              {/* Kitchen KOT Printer settings */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">Kitchen KOT Printer</h3>
                    <span className="text-xxs font-medium text-slate-400">Prints Kitchen Order Tickets</span>
                  </div>
                  <button 
                    onClick={() => handleTestPrint('kitchenPrinter')}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all shadow-xs cursor-pointer"
                  >
                    <Play className="h-3 w-3 fill-white" />
                    Test Print
                  </button>
                </div>

                <div className="flex flex-col gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">Connection Type</label>
                    <select 
                      value={config.kitchenPrinter.connectionType}
                      onChange={(e) => updatePrinterProp('kitchenPrinter', 'connectionType', e.target.value)}
                      className="w-full text-xs font-medium border border-slate-200 rounded-xl p-2.5 bg-slate-50 focus:bg-white focus:outline-none"
                    >
                      <option value="USB">USB / Win32 Spooler (Direct RAW)</option>
                      <option value="NETWORK">Network TCP/IP (Port 9100)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">
                      {config.kitchenPrinter.connectionType === 'NETWORK' ? 'Printer IP Address' : 'Windows Spooler Printer'}
                    </label>
                    {config.kitchenPrinter.connectionType === 'NETWORK' ? (
                      <input 
                        type="text"
                        value={config.kitchenPrinter.printerName}
                        onChange={(e) => updatePrinterProp('kitchenPrinter', 'printerName', e.target.value)}
                        placeholder="e.g. 192.168.1.101"
                        className="w-full text-xs font-medium border border-slate-200 rounded-xl p-2.5"
                      />
                    ) : (
                      <select 
                        value={config.kitchenPrinter.printerName}
                        onChange={(e) => updatePrinterProp('kitchenPrinter', 'printerName', e.target.value)}
                        className="w-full text-xs font-medium border border-slate-200 rounded-xl p-2.5 bg-slate-50 focus:bg-white focus:outline-none"
                      >
                        <option value="">-- Select Windows Printer --</option>
                        {printersList.map((p) => (
                          <option key={p.name} value={p.name}>
                            {p.name} {p.isThermal ? '🔥 (Thermal)' : ''} {p.isDefault ? '⭐ (Default)' : ''}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1">Paper Width</label>
                      <select 
                        value={config.kitchenPrinter.paperWidth}
                        onChange={(e) => updatePrinterProp('kitchenPrinter', 'paperWidth', e.target.value)}
                        className="w-full text-xs font-medium border border-slate-200 rounded-xl p-2.5 bg-slate-50"
                      >
                        <option value="80mm">80mm (Standard)</option>
                        <option value="58mm">58mm (Small)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1">Encoding</label>
                      <select 
                        value={config.kitchenPrinter.characterEncoding}
                        onChange={(e) => updatePrinterProp('kitchenPrinter', 'characterEncoding', e.target.value)}
                        className="w-full text-xs font-medium border border-slate-200 rounded-xl p-2.5 bg-slate-50"
                      >
                        <option value="CP437">CP437 (Standard)</option>
                        <option value="UTF-8">UTF-8</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                    <span className="text-xs font-bold text-slate-700">Auto-Cut Paper</span>
                    <input 
                      type="checkbox"
                      checked={config.kitchenPrinter.autoCut}
                      onChange={(e) => updatePrinterProp('kitchenPrinter', 'autoCut', e.target.checked)}
                      className="h-4 w-4 text-slate-900 rounded cursor-pointer"
                    />
                  </div>
                </div>
              </div>

            </div>

            {/* Bottom Actions */}
            <div className="flex justify-end gap-3 mt-2 pb-12">
              <button 
                onClick={fetchData}
                className="px-5 py-2.5 border border-slate-200 bg-white rounded-xl hover:bg-slate-100 text-xs font-bold transition-all shadow-2xs cursor-pointer"
              >
                Reset
              </button>
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-500 text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-2 shadow-sm cursor-pointer"
              >
                {isSaving ? 'Saving Configurations...' : 'Save Settings'}
              </button>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
