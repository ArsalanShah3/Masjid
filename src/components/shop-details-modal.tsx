'use client';

import { useState, useEffect } from 'react';
import { X, Download, Printer, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import jsPDF from 'jspdf';
import { toast } from 'sonner';

type ShopRecord = {
  _id: string;
  shopName: string;
  ownerName: string;
  contactNumber: string;
  buyDate: string | Date;
  buyRate: number;
  debtAmount: number;
  monthlyRent: number;
  monthsDue: number;
  month?: number;
  year?: number;
  date?: string | Date;
  paymentAmount?: number;
  previousBalance?: number;
  serialNumber?: string;
  paymentStatus: string;
  note: string;
};

interface ShopDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shopData: ShopRecord | null;
  history?: ShopRecord[];
}

type SiteSettings = {
  masjidName: string;
  madrasaName?: string;
  address?: string;
  phone?: string;
};

function formatDate(value: unknown) {
  if (!value) return '-';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(date);
}

export function ShopDetailsModal({ open, onOpenChange, shopData, history = [] }: ShopDetailsModalProps) {
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);
  const [settings, setSettings] = useState<SiteSettings | null>(null);

  useEffect(() => {
    if (!open) return;
    let mounted = true;
    fetch('/api/public/settings')
      .then((res) => res.json())
      .then((data) => {
        if (mounted) setSettings(data as SiteSettings);
      })
      .catch(() => {
        if (mounted) setSettings(null);
      });
    return () => {
      mounted = false;
    };
  }, [open]);

  async function fetchSettingsAsync() {
    try {
      const res = await fetch('/api/public/settings');
      if (!res.ok) return null;
      const data = await res.json();
      setSettings(data as SiteSettings);
      return data as SiteSettings;
    } catch {
      return null;
    }
  }

  if (!shopData) return null;

  async function generatePDF() {
    setIsLoadingPdf(true);
    try {
      const finalSettings = settings ?? (await fetchSettingsAsync());
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const marginLeft = 15;
      const marginTop = 15;
      const marginRight = 15;
      const lineHeight = 7;

      let yPosition = marginTop;

      // Header (site name + title)
      const siteTitle = (finalSettings && finalSettings.masjidName) ? finalSettings.masjidName : 'Masjid';
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.text(siteTitle, marginLeft, yPosition);
      yPosition += 8;

      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Shop Record', marginLeft, yPosition);
      yPosition += 10;

      // Divider
      pdf.setDrawColor(0, 100, 0);
      pdf.line(marginLeft, yPosition, pageWidth - marginRight, yPosition);
      yPosition += 8;

      // Details Section
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');

      const details = [
        { label: 'Serial Number:', value: shopData!.serialNumber || '-' },
        { label: 'Shop Name:', value: shopData!.shopName },
        { label: 'Rental Name:', value: shopData!.ownerName },
        { label: 'Month:', value: shopData!.month ? new Date(0, shopData!.month - 1).toLocaleString('en-US', { month: 'long' }) : '-' },
        { label: 'Year:', value: String(shopData!.year || '-') },
        { label: 'Payment Date:', value: formatDate(shopData!.date || shopData!.buyDate) },
        { label: 'Previous Balance:', value: formatCurrency(shopData!.previousBalance || 0) },
        { label: 'Paid Amount:', value: formatCurrency(shopData!.paymentAmount || 0) },
        { label: 'Remaining Balance:', value: formatCurrency(shopData!.debtAmount) },
        { label: 'Notes:', value: shopData!.note || '-' }
      ];

      details.forEach((detail) => {
        if (yPosition > pageHeight - marginTop - 10) {
          pdf.addPage();
          yPosition = marginTop;
        }

        pdf.setFont('helvetica', 'bold');
        pdf.text(detail.label, marginLeft, yPosition);
        
        pdf.setFont('helvetica', 'normal');
        const valueX = marginLeft + 50;
        const maxWidth = pageWidth - marginRight - valueX;
        
        const splitText = pdf.splitTextToSize(detail.value, maxWidth);
        pdf.text(splitText as string[], valueX, yPosition);
        
        yPosition += lineHeight * splitText.length + 2;
      });

      // Footer (address + generated on)
      yPosition = pageHeight - marginTop - 12;
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'italic');
      pdf.setTextColor(100, 100, 100);
      const footerLeft = finalSettings?.address ? finalSettings.address : '';
      if (footerLeft) {
        const splitFooter = pdf.splitTextToSize(footerLeft, pageWidth - marginLeft - marginRight - 40);
        pdf.text(splitFooter as string[], marginLeft, yPosition);
        yPosition += 4 * splitFooter.length;
      }

      pdf.text(
        `Generated on ${new Date().toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}`,
        pageWidth - marginRight - 60,
        pageHeight - marginTop - 5
      );

      // Download
      pdf.save(`shop-record-${shopData!.shopName.replace(/\s+/g, '-').toLowerCase()}.pdf`);
      toast.success('PDF downloaded successfully');
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setIsLoadingPdf(false);
    }
  }

  function printSlipForRecord(record: ShopRecord) {
    const siteTitle = (settings && settings.masjidName) ? settings.masjidName : 'Masjid';
    const siteAddress = settings?.address || '';
    const recordMonth = record.month ? new Date(0, record.month - 1).toLocaleString('en-US', { month: 'long' }) : '-';
    const recordYear = record.year || '-';

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Rent Slip - ${record.shopName}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 24px; background: white; color: #222; }
          .card { border: 1px solid #d1d5db; border-radius: 10px; padding: 20px; max-width: 700px; margin: 0 auto; }
          .title { font-size: 20px; font-weight: 700; color: #0f766e; text-align: center; margin-bottom: 8px; }
          .subtitle { font-size: 12px; color: #64748b; text-align: center; margin-bottom: 16px; }
          .row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed #e2e8f0; }
          .label { font-weight: 600; color: #334155; }
          .value { color: #0f172a; }
          .footer { margin-top: 16px; text-align: center; font-size: 12px; color: #64748b; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="title">${siteTitle}</div>
          <div class="subtitle">Rent Payment Slip</div>
          <div class="row"><span class="label">Serial Number</span><span class="value">${record.serialNumber || '-'}</span></div>
          <div class="row"><span class="label">Shop Name</span><span class="value">${record.shopName}</span></div>
          <div class="row"><span class="label">Rental Name</span><span class="value">${record.ownerName}</span></div>
          <div class="row"><span class="label">Month</span><span class="value">${recordMonth} ${recordYear}</span></div>
          <div class="row"><span class="label">Payment Date</span><span class="value">${formatDate(record.date || record.buyDate)}</span></div>
          <div class="row"><span class="label">Previous Balance</span><span class="value">${formatCurrency(record.previousBalance || 0)}</span></div>
          <div class="row"><span class="label">Paid Amount</span><span class="value">${formatCurrency(record.paymentAmount || 0)}</span></div>
          <div class="row"><span class="label">Remaining Balance</span><span class="value">${formatCurrency(record.debtAmount || 0)}</span></div>
          <div class="row"><span class="label">Note</span><span class="value">${record.note || '-'}</span></div>
          ${siteAddress ? `<div class="footer">${siteAddress}</div>` : ''}
          <div class="footer">Generated on ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '', 'width=800,height=700');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
      }, 250);
    }
  }

  async function handlePrint() {
    // ensure we have settings before printing
    const finalSettings = settings ?? (await fetchSettingsAsync());
    const siteTitle = (finalSettings && finalSettings.masjidName) ? finalSettings.masjidName : 'Masjid';
    const siteAddress = finalSettings?.address || '';

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Shop Record - ${shopData!.shopName}</title>
        <style>
          @media print {
            body { margin: 0; padding: 20mm; }
            .no-print { display: none; }
          }
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background: white;
            color: #222;
          }
          .print-header {
            text-align: center;
            margin-bottom: 10px;
          }
          .site-name {
            font-size: 20px;
            font-weight: 700;
            color: #0f766e;
          }
          .site-address {
            font-size: 12px;
            color: #444;
            margin-top: 4px;
          }
          .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 18px;
            border-radius: 6px;
          }
          h1 {
            color: #075985;
            margin: 8px 0 16px 0;
            font-size: 16px;
          }
          .details-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            margin-bottom: 16px;
          }
          .detail-label { font-weight: 600; color: #333; margin-bottom: 4px; }
          .detail-value { color: #444; padding-left: 8px; }
          .notes-section { grid-column: 1 / -1; margin-top: 10px; padding-top: 10px; border-top: 1px solid #eee; }
          .print-footer { margin-top: 18px; font-size: 12px; color: #666; text-align: center; border-top: 1px solid #eee; padding-top: 8px; }
          @media print { .container { border: none; } }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="print-header">
            <div class="site-name">${siteTitle}</div>
            ${siteAddress ? `<div class="site-address">${siteAddress}</div>` : ''}
          </div>
          <h1>Shop Record</h1>
          <div class="details-grid">
            <div>
              <div class="detail-label">Serial Number</div>
              <div class="detail-value">${shopData!.serialNumber || '-'}</div>
            </div>
            <div>
              <div class="detail-label">Shop Name</div>
              <div class="detail-value">${shopData!.shopName}</div>
            </div>
            <div>
              <div class="detail-label">Rental Name</div>
              <div class="detail-value">${shopData!.ownerName}</div>
            </div>
            <div>
              <div class="detail-label">Month</div>
              <div class="detail-value">${shopData!.month ? new Date(0, shopData!.month - 1).toLocaleString('en-US', { month: 'long' }) : '-'}</div>
            </div>
            <div>
              <div class="detail-label">Year</div>
              <div class="detail-value">${shopData!.year || '-'}</div>
            </div>
            <div>
              <div class="detail-label">Payment Date</div>
              <div class="detail-value">${formatDate(shopData!.date || shopData!.buyDate)}</div>
            </div>
            <div>
              <div class="detail-label">Previous Balance</div>
              <div class="detail-value">${formatCurrency(shopData!.previousBalance || 0)}</div>
            </div>
            <div>
              <div class="detail-label">Paid Amount</div>
              <div class="detail-value">${formatCurrency(shopData!.paymentAmount || 0)}</div>
            </div>
            <div>
              <div class="detail-label">Remaining Balance</div>
              <div class="detail-value">${formatCurrency(shopData!.debtAmount)}</div>
            </div>
            <div class="notes-section">
              <div class="detail-label">Notes</div>
              <div class="detail-value">${shopData!.note || '-'}</div>
            </div>
          </div>
          <div class="print-footer">
            ${siteAddress ? `<div>${siteAddress}</div>` : ''}
            <div>Generated on ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
          </div>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '', 'width=800,height=600');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
      }, 250);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="sticky top-0 bg-white z-10 pb-4">
          <DialogTitle className="text-2xl font-bold text-emerald-900">Shop Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pr-6">
          {/* Shop Information */}
          <Card className="p-6 border-emerald-200 bg-emerald-50">
            <h3 className="text-lg font-semibold text-emerald-900 mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DetailField label="Shop Name" value={shopData.shopName} />
              <DetailField label="Rental Name" value={shopData.ownerName} />
            </div>
          </Card>

          {/* Financial Information */}
          <Card className="p-6 border-blue-200 bg-blue-50">
            <h3 className="text-lg font-semibold text-blue-900 mb-4">Financial Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DetailField label="Serial Number" value={shopData.serialNumber || '-'} />
              <DetailField label="Previous Balance" value={formatCurrency(shopData.previousBalance || 0)} />
              <DetailField label="Payment Date" value={formatDate(shopData.date || shopData.buyDate)} />
              <DetailField label="Monthly Rent" value={formatCurrency(shopData.monthlyRent)} />
              <DetailField label="Paid Amount" value={formatCurrency(shopData.paymentAmount || 0)} />
              <DetailField label="Remaining Balance" value={formatCurrency(shopData.debtAmount)} />
            </div>
          </Card>

          {/* Payment Information */}
          <Card className="p-6 border-purple-200 bg-purple-50">
            <h3 className="text-lg font-semibold text-purple-900 mb-4">Payment Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DetailField label="Month" value={shopData.month ? new Date(0, shopData.month - 1).toLocaleString('en-US', { month: 'long' }) : '-'} />
              <DetailField label="Year" value={String(shopData.year || '-')} />
              <DetailField label="Payment Date" value={formatDate(shopData.date || shopData.buyDate)} />
              <DetailField label="Previous Balance" value={formatCurrency(shopData.previousBalance || 0)} />
            </div>
          </Card>

          {history.length ? (
            <Card className="p-6 border-amber-200 bg-amber-50">
              <div className="flex items-center justify-between gap-3 mb-4">
                <h3 className="text-lg font-semibold text-amber-900">Monthly Payment History</h3>
                <span className="text-sm font-medium text-amber-700">{history.length} record{history.length === 1 ? '' : 's'}</span>
              </div>
              <div className="space-y-3">
                {[...history].sort((a, b) => ((Number(b.year || 0) * 100) + Number(b.month || 0)) - ((Number(a.year || 0) * 100) + Number(a.month || 0))).map((record) => (
                  <div key={String(record._id)} className="rounded-2xl border border-amber-200 bg-white p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="font-semibold text-slate-900">{record.month ? new Date(0, record.month - 1).toLocaleString('en-US', { month: 'long' }) : '-'} {record.year || '-'}</div>
                        <div className="text-sm text-slate-500">Payment Date: {formatDate(record.date || record.buyDate)}</div>
                        <div className="text-sm font-medium text-amber-700">Serial No: {record.serialNumber || '-'}</div>
                      </div>
                    </div>
                    <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                      <div><span className="font-medium text-slate-700">Previous Balance:</span> {formatCurrency(record.previousBalance || 0)}</div>
                      <div><span className="font-medium text-slate-700">Monthly Rent:</span> {formatCurrency(record.monthlyRent || 0)}</div>
                      <div><span className="font-medium text-slate-700">Paid Amount:</span> {formatCurrency(record.paymentAmount || 0)}</div>
                      <div><span className="font-medium text-slate-700">Remaining Balance:</span> {formatCurrency(record.debtAmount || 0)}</div>
                      <div className="sm:col-span-2"><span className="font-medium text-slate-700">Note:</span> {record.note || '-'}</div>
                    </div>
                    <div className="mt-3 flex justify-end">
                      <Button variant="outline" size="sm" onClick={() => printSlipForRecord(record)}>
                        Print Slip
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}

          {/* Notes */}
          {shopData.note && (
            <Card className="p-6 border-gray-200 bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Notes</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{shopData.note}</p>
            </Card>
          )}
        </div>

        <DialogFooter className="sticky bottom-0 bg-white pt-4 mt-6 border-t gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            variant="outline"
            onClick={handlePrint}
            className="gap-2"
          >
            <Printer className="h-4 w-4" />
            Print
          </Button>
          <Button
            onClick={generatePDF}
            disabled={isLoadingPdf}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700"
          >
            {isLoadingPdf ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Download PDF
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <p className="text-gray-900 font-medium">{value}</p>
    </div>
  );
}
