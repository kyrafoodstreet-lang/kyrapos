'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { Printer, Settings, CheckCircle2, AlertCircle, RefreshCw, Play } from 'lucide-react';

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
}

export default function PrinterSettingsPage() {
  const [agentStatus, setAgentStatus] = useState<'ONLINE' | 'OFFLINE' | 'CHECKING'>('CHECKING');
  const [printersList, setPrintersList] = useState<string[]>([]);
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    checkHealth();
  }, []);

  const checkHealth = async () => {
    setAgentStatus('CHECKING');
    try {
      // Check health endpoint of Local Agent
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
      // Fetch printers list and configurations
      const [printersRes, configRes] = await Promise.all([
        axios.get(`${AGENT_URL}/printer/list`),
        axios.get(`${AGENT_URL}/config`)
      ]);
      setPrintersList(printersRes.data.printers || []);
      setConfig(configRes.data);
    } catch (e) {
      console.error('Failed to retrieve print agent configurations', e);
      setStatusMessage({ type: 'error', text: 'Failed to connect to local printer agent database.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!config) return;
    setIsSaving(true);
    setStatusMessage(null);
    try {
      const res = await axios.post(`${AGENT_URL}/config`, config);
      if (res.data.success) {
        setStatusMessage({ type: 'success', text: 'Printer configurations saved successfully.' });
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
        setStatusMessage({ type: 'success', text: `Test print queued for ${printerKey === 'customerPrinter' ? 'Customer' : 'Kitchen'} printer.` });
      }
    } catch (e) {
      setStatusMessage({ type: 'error', text: 'Test print failed. Check print queue and connection.' });
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
        [prop]: value
      }
    });
  };

  return (
    <div className="flex-1 p-6 md:p-8 bg-slate-50 overflow-y-auto">
      <div className="max-w-4xl mx-auto flex flex-col gap-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
              <Printer className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">ESC/POS Printer Settings</h1>
              <p className="text-sm text-slate-500">Configure receipt and kitchen printers via the local print agent.</p>
            </div>
          </div>
          <button 
            onClick={checkHealth}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${agentStatus === 'CHECKING' ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Status Alert Banner */}
        {agentStatus === 'OFFLINE' ? (
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl">
            <AlertCircle className="h-5 w-5 shrink-0 text-red-600 mt-0.5" />
            <div>
              <span className="font-semibold block">Local Print Agent is Offline</span>
              <p className="text-sm text-red-700 mt-0.5">
                The printer service is not running on this machine at port 4000. Please run the local print agent or check that the Windows background service is active.
              </p>
            </div>
          </div>
        ) : agentStatus === 'ONLINE' ? (
          <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
            <div>
              <span className="font-semibold block">Print Agent Connected (Running on localhost:4000)</span>
            </div>
          </div>
        ) : (
          <div className="bg-slate-100 text-slate-600 p-4 rounded-xl animate-pulse">
            Checking Print Agent connection...
          </div>
        )}

        {statusMessage && (
          <div className={`p-4 rounded-xl flex items-center gap-3 border ${
            statusMessage.type === 'success' 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            {statusMessage.type === 'success' ? <CheckCircle2 className="h-5 w-5 shrink-0" /> : <AlertCircle className="h-5 w-5 shrink-0" />}
            <span className="text-sm font-medium">{statusMessage.text}</span>
          </div>
        )}

        {/* Settings Form */}
        {config && agentStatus === 'ONLINE' && (
          <div className="flex flex-col gap-6">
            
            {/* General Configurations */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-4">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <Settings className="h-5 w-5 text-slate-500" />
                General Settings
              </h2>
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                <div>
                  <span className="font-medium text-slate-700 block">Auto-Print on Checkout</span>
                  <span className="text-xs text-slate-500">Automatically print customer copies upon successful POS order completion.</span>
                </div>
                <input 
                  type="checkbox"
                  checked={config.autoPrintEnabled}
                  onChange={(e) => setConfig({ ...config, autoPrintEnabled: e.target.checked })}
                  className="h-5 w-5 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500 cursor-pointer"
                />
              </div>
            </div>

            {/* Split layout for Customer and Kitchen printer configurations */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Customer Printer settings */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-bold text-slate-800">Customer Receipt Printer</h3>
                  <button 
                    onClick={() => handleTestPrint('customerPrinter')}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg transition-colors"
                  >
                    <Play className="h-3 w-3 fill-emerald-700" />
                    Test Print
                  </button>
                </div>

                <div className="flex flex-col gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 block mb-1">Connection Type</label>
                    <select 
                      value={config.customerPrinter.connectionType}
                      onChange={(e) => updatePrinterProp('customerPrinter', 'connectionType', e.target.value)}
                      className="w-full text-sm border-slate-200 rounded-lg p-2 bg-white"
                    >
                      <option value="USB">USB / Local Windows Spooler</option>
                      <option value="NETWORK">Network (TCP/IP socket)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-500 block mb-1">
                      {config.customerPrinter.connectionType === 'NETWORK' ? 'Printer IP Address' : 'Printer Port Name'}
                    </label>
                    {config.customerPrinter.connectionType === 'NETWORK' ? (
                      <input 
                        type="text"
                        value={config.customerPrinter.printerName}
                        onChange={(e) => updatePrinterProp('customerPrinter', 'printerName', e.target.value)}
                        placeholder="e.g. 192.168.1.100"
                        className="w-full text-sm border-slate-200 rounded-lg p-2"
                      />
                    ) : (
                      <select 
                        value={config.customerPrinter.printerName}
                        onChange={(e) => updatePrinterProp('customerPrinter', 'printerName', e.target.value)}
                        className="w-full text-sm border-slate-200 rounded-lg p-2 bg-white"
                      >
                        {printersList.map((p) => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                        {!printersList.includes(config.customerPrinter.printerName) && (
                          <option value={config.customerPrinter.printerName}>{config.customerPrinter.printerName} (Configured)</option>
                        )}
                      </select>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-500 block mb-1">Paper Width</label>
                      <select 
                        value={config.customerPrinter.paperWidth}
                        onChange={(e) => updatePrinterProp('customerPrinter', 'paperWidth', e.target.value)}
                        className="w-full text-sm border-slate-200 rounded-lg p-2 bg-white"
                      >
                        <option value="80mm">80mm (Standard)</option>
                        <option value="58mm">58mm (Small)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 block mb-1">Character Encoding</label>
                      <select 
                        value={config.customerPrinter.characterEncoding}
                        onChange={(e) => updatePrinterProp('customerPrinter', 'characterEncoding', e.target.value)}
                        className="w-full text-sm border-slate-200 rounded-lg p-2 bg-white"
                      >
                        <option value="CP437">CP437 (Standard)</option>
                        <option value="UTF-8">UTF-8</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-500 block mb-1">Font Size</label>
                      <select 
                        value={config.customerPrinter.fontSize}
                        onChange={(e) => updatePrinterProp('customerPrinter', 'fontSize', e.target.value)}
                        className="w-full text-sm border-slate-200 rounded-lg p-2 bg-white"
                      >
                        <option value="REGULAR">Regular Size</option>
                        <option value="MEDIUM">Medium Size</option>
                        <option value="LARGE">Large Size</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 block mb-1">Font Style</label>
                      <select 
                        value={config.customerPrinter.fontStyle}
                        onChange={(e) => updatePrinterProp('customerPrinter', 'fontStyle', e.target.value)}
                        className="w-full text-sm border-slate-200 rounded-lg p-2 bg-white"
                      >
                        <option value="A">Font A (Default)</option>
                        <option value="B">Font B (Small)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 border-t border-slate-100 pt-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-500 block mb-1">Print Density</label>
                      <select 
                        value={config.customerPrinter.printDensity}
                        onChange={(e) => updatePrinterProp('customerPrinter', 'printDensity', e.target.value)}
                        className="w-full text-sm border-slate-200 rounded-lg p-2 bg-white"
                      >
                        <option value="LOW">Low</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HIGH">High</option>
                        <option value="MAXIMUM">Maximum</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 block mb-1">Line Spacing</label>
                      <input 
                        type="number"
                        value={config.customerPrinter.lineSpacing}
                        onChange={(e) => updatePrinterProp('customerPrinter', 'lineSpacing', Number(e.target.value))}
                        className="w-full text-sm border-slate-200 rounded-lg p-2 bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 block mb-1">Char Spacing</label>
                      <input 
                        type="number"
                        value={config.customerPrinter.characterSpacing}
                        onChange={(e) => updatePrinterProp('customerPrinter', 'characterSpacing', Number(e.target.value))}
                        className="w-full text-sm border-slate-200 rounded-lg p-2 bg-white"
                      />
                    </div>
                  </div>


                  <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-1">
                    <span className="text-sm font-medium text-slate-700">Auto-Cut Paper</span>
                    <input 
                      type="checkbox"
                      checked={config.customerPrinter.autoCut}
                      onChange={(e) => updatePrinterProp('customerPrinter', 'autoCut', e.target.checked)}
                      className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                    <span className="text-sm font-medium text-slate-700">Open Cash Drawer Pulse</span>
                    <input 
                      type="checkbox"
                      checked={config.customerPrinter.openCashDrawer}
                      onChange={(e) => updatePrinterProp('customerPrinter', 'openCashDrawer', e.target.checked)}
                      className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Kitchen KOT Printer settings */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-bold text-slate-800">Kitchen KOT Printer</h3>
                  <button 
                    onClick={() => handleTestPrint('kitchenPrinter')}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg transition-colors"
                  >
                    <Play className="h-3 w-3 fill-emerald-700" />
                    Test Print
                  </button>
                </div>

                <div className="flex flex-col gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 block mb-1">Connection Type</label>
                    <select 
                      value={config.kitchenPrinter.connectionType}
                      onChange={(e) => updatePrinterProp('kitchenPrinter', 'connectionType', e.target.value)}
                      className="w-full text-sm border-slate-200 rounded-lg p-2 bg-white"
                    >
                      <option value="USB">USB / Local Windows Spooler</option>
                      <option value="NETWORK">Network (TCP/IP socket)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-500 block mb-1">
                      {config.kitchenPrinter.connectionType === 'NETWORK' ? 'Printer IP Address' : 'Printer Port Name'}
                    </label>
                    {config.kitchenPrinter.connectionType === 'NETWORK' ? (
                      <input 
                        type="text"
                        value={config.kitchenPrinter.printerName}
                        onChange={(e) => updatePrinterProp('kitchenPrinter', 'printerName', e.target.value)}
                        placeholder="e.g. 192.168.1.101"
                        className="w-full text-sm border-slate-200 rounded-lg p-2"
                      />
                    ) : (
                      <select 
                        value={config.kitchenPrinter.printerName}
                        onChange={(e) => updatePrinterProp('kitchenPrinter', 'printerName', e.target.value)}
                        className="w-full text-sm border-slate-200 rounded-lg p-2 bg-white"
                      >
                        {printersList.map((p) => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                        {!printersList.includes(config.kitchenPrinter.printerName) && (
                          <option value={config.kitchenPrinter.printerName}>{config.kitchenPrinter.printerName} (Configured)</option>
                        )}
                      </select>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-500 block mb-1">Paper Width</label>
                      <select 
                        value={config.kitchenPrinter.paperWidth}
                        onChange={(e) => updatePrinterProp('kitchenPrinter', 'paperWidth', e.target.value)}
                        className="w-full text-sm border-slate-200 rounded-lg p-2 bg-white"
                      >
                        <option value="80mm">80mm (Standard)</option>
                        <option value="58mm">58mm (Small)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 block mb-1">Character Encoding</label>
                      <select 
                        value={config.kitchenPrinter.characterEncoding}
                        onChange={(e) => updatePrinterProp('kitchenPrinter', 'characterEncoding', e.target.value)}
                        className="w-full text-sm border-slate-200 rounded-lg p-2 bg-white"
                      >
                        <option value="CP437">CP437 (Standard)</option>
                        <option value="UTF-8">UTF-8</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-500 block mb-1">Font Size</label>
                      <select 
                        value={config.kitchenPrinter.fontSize}
                        onChange={(e) => updatePrinterProp('kitchenPrinter', 'fontSize', e.target.value)}
                        className="w-full text-sm border-slate-200 rounded-lg p-2 bg-white"
                      >
                        <option value="REGULAR">Regular Size</option>
                        <option value="MEDIUM">Medium Size</option>
                        <option value="LARGE">Large Size</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 block mb-1">Font Style</label>
                      <select 
                        value={config.kitchenPrinter.fontStyle}
                        onChange={(e) => updatePrinterProp('kitchenPrinter', 'fontStyle', e.target.value)}
                        className="w-full text-sm border-slate-200 rounded-lg p-2 bg-white"
                      >
                        <option value="A">Font A (Default)</option>
                        <option value="B">Font B (Small)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 border-t border-slate-100 pt-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-500 block mb-1">Print Density</label>
                      <select 
                        value={config.kitchenPrinter.printDensity}
                        onChange={(e) => updatePrinterProp('kitchenPrinter', 'printDensity', e.target.value)}
                        className="w-full text-sm border-slate-200 rounded-lg p-2 bg-white"
                      >
                        <option value="LOW">Low</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HIGH">High</option>
                        <option value="MAXIMUM">Maximum</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 block mb-1">Line Spacing</label>
                      <input 
                        type="number"
                        value={config.kitchenPrinter.lineSpacing}
                        onChange={(e) => updatePrinterProp('kitchenPrinter', 'lineSpacing', Number(e.target.value))}
                        className="w-full text-sm border-slate-200 rounded-lg p-2 bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 block mb-1">Char Spacing</label>
                      <input 
                        type="number"
                        value={config.kitchenPrinter.characterSpacing}
                        onChange={(e) => updatePrinterProp('kitchenPrinter', 'characterSpacing', Number(e.target.value))}
                        className="w-full text-sm border-slate-200 rounded-lg p-2 bg-white"
                      />
                    </div>
                  </div>


                  <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-1">
                    <span className="text-sm font-medium text-slate-700">Auto-Cut Paper</span>
                    <input 
                      type="checkbox"
                      checked={config.kitchenPrinter.autoCut}
                      onChange={(e) => updatePrinterProp('kitchenPrinter', 'autoCut', e.target.checked)}
                      className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

            </div>

            {/* Bottom CTA Actions */}
            <div className="flex justify-end gap-3 mt-2 pb-12">
              <button 
                onClick={fetchData}
                className="px-4 py-2 border border-slate-200 rounded-xl hover:bg-slate-100 text-sm font-semibold transition-colors"
              >
                Reset Changes
              </button>
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="px-6 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 text-sm font-semibold transition-colors disabled:opacity-50 flex items-center gap-2 shadow-xs"
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
