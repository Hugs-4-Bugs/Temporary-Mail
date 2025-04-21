import React from 'react';
import { Download, Save } from 'lucide-react';
import { EmailItem } from './EmailList';

interface ExportEmailButtonProps {
  email: {
    id: number;
    from: string;
    to: string;
    subject: string;
    receivedAt: string;
    content: string;
  } | null;
}

const ExportEmailButton: React.FC<ExportEmailButtonProps> = ({ email }) => {
  if (!email) return null;

  const exportAsHTML = () => {
    if (!email) return;

    const date = new Date(email.receivedAt).toLocaleString();
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${email.subject || 'No Subject'}</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; }
          .email-header { background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
          .email-content { padding: 20px; border: 1px solid #eee; border-radius: 5px; }
          .meta-item { margin-bottom: 10px; }
          .label { font-weight: bold; display: inline-block; width: 60px; }
        </style>
      </head>
      <body>
        <div class="email-header">
          <h1>${email.subject || 'No Subject'}</h1>
          <div class="meta-item"><span class="label">From:</span> ${email.from}</div>
          <div class="meta-item"><span class="label">To:</span> ${email.to}</div>
          <div class="meta-item"><span class="label">Date:</span> ${date}</div>
        </div>
        <div class="email-content">
          ${email.content}
        </div>
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${email.subject || 'email'}-${email.id}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportAsPDF = async () => {
    if (!email) return;

    // Simple PDF generation using print to PDF
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups for this website to export as PDF');
      return;
    }

    const date = new Date(email.receivedAt).toLocaleString();
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${email.subject || 'No Subject'}</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; }
          .email-header { background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
          .email-content { padding: 20px; border: 1px solid #eee; border-radius: 5px; }
          .meta-item { margin-bottom: 10px; }
          .label { font-weight: bold; display: inline-block; width: 60px; }
          @media print {
            body { margin: 0; padding: 10px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="margin-bottom: 20px; text-align: center;">
          <button onclick="window.print();" style="padding: 10px 20px; background-color: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;">
            Print / Save as PDF
          </button>
        </div>
        <div class="email-header">
          <h1>${email.subject || 'No Subject'}</h1>
          <div class="meta-item"><span class="label">From:</span> ${email.from}</div>
          <div class="meta-item"><span class="label">To:</span> ${email.to}</div>
          <div class="meta-item"><span class="label">Date:</span> ${date}</div>
        </div>
        <div class="email-content">
          ${email.content}
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={exportAsHTML}
        className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-800/50 text-blue-700 dark:text-blue-300 rounded"
        title="Export as HTML"
      >
        <Save size={14} />
        <span>Save HTML</span>
      </button>
      <button
        onClick={exportAsPDF}
        className="flex items-center gap-1 px-2 py-1 text-xs bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/30 dark:hover:bg-purple-800/50 text-purple-700 dark:text-purple-300 rounded"
        title="Export as PDF"
      >
        <Download size={14} />
        <span>Save PDF</span>
      </button>
    </div>
  );
};

export default ExportEmailButton;
