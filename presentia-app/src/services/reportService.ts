import api from './api';

export const getReports = async (filters?: {
  cycle?: string; subject?: string; faculty?: string;
  startDate?: string; endDate?: string; student?: string;
}) => {
  const params = new URLSearchParams({ status: 'Completed', limit: '1000', sort: '-presentationDate' });
  if (filters?.cycle && filters.cycle !== 'all') params.set('cycle', filters.cycle);
  if (filters?.subject && filters.subject !== 'all') params.set('subject', filters.subject);
  if (filters?.faculty && filters.faculty !== 'all') params.set('faculty', filters.faculty);
  const res = await api.get(`/presentations?${params}`);
  return res.data?.presentations || [];
};

export const exportReportXLSX = async (filters?: {
  ids?: string; cycle?: string; subject?: string; faculty?: string;
  startDate?: string; endDate?: string;
}) => {
  const params = new URLSearchParams();
  if (filters?.ids) params.set('ids', filters.ids);
  if (filters?.cycle && filters.cycle !== 'all') params.set('cycle', filters.cycle);
  if (filters?.subject && filters.subject !== 'all') params.set('subject', filters.subject);
  if (filters?.faculty && filters.faculty !== 'all') params.set('faculty', filters.faculty);
  if (filters?.startDate) params.set('startDate', filters.startDate);
  if (filters?.endDate) params.set('endDate', filters.endDate);

  // Use fetch for blob download
  const baseURL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000/api';
  const response = await fetch(`${baseURL}/reports/export?${params}`);
  if (!response.ok) throw new Error('Export failed');
  const blob = await response.blob();
  return blob;
};

export const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const getTotalRecordCount = async () => {
  const res = await api.get('/presentations?status=Completed&limit=1');
  return res.data?.total || 0;
};
