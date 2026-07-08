import api from './api';

export const getStudents = async (params?: { page?: number; limit?: number; search?: string }) => {
  const { page = 1, limit = 50, search = '' } = params || {};
  const query = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (search) query.set('search', search);
  const res = await api.get(`/students/overview?${query}`);
  return res.data || [];
};

export const getRawStudents = async (params?: { page?: number; limit?: number; search?: string }) => {
  const { page = 1, limit = 50, search = '' } = params || {};
  const query = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (search) query.set('search', search);
  const res = await api.get(`/students?${query}`);
  return res.data || { students: [], total: 0, page: 1, limit: 50 };
};

export const createStudent = async (data: { rollNo: string; name: string; admissionNo?: string; title?: string }) => {
  const res = await api.post('/students', data);
  return res.data?.student || null;
};

export const updateStudent = async (id: string, data: { rollNo?: string; name?: string; admissionNo?: string; title?: string }) => {
  const res = await api.patch(`/students/${id}`, data);
  return res.data?.student || null;
};

export const deleteStudent = async (id: string) => {
  await api.delete(`/students/${id}`);
};

export const importStudents = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  const res = await api.post('/students/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

export const updateStudentTitle = async (id: string, title: string) => {
  const res = await api.patch(`/students/${id}`, { title });
  return res.data?.student || null;
};
