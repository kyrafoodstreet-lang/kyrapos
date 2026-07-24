'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ReceiptErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ReceiptErrorBoundary] Render exception caught safely:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div id="print-receipt-section" className="hidden print:block text-slate-800 bg-white p-4 text-center">
          <p className="text-xs font-bold text-slate-700">Receipt Preview Unavailable</p>
          <p className="text-xxs text-slate-500">Order saved successfully in system database.</p>
        </div>
      );
    }

    return this.props.children;
  }
}
