import { Send, Camera, Laptop, MessageCircle } from 'lucide-react';

export const formatDuration = (seconds: number | null | undefined): string => {
  if (seconds === null || seconds === undefined) return '-';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
};

export const formatCNPJ = (value: string): string => {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
};

export const formatPhone = (value: string): string => {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 0) return '';
  
  // Brazil DDI (55)
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
    const ddd = digits.slice(2, 4);
    const number = digits.slice(4);
    if (number.length === 8) {
      return `+55 (${ddd}) ${number.slice(0, 4)}-${number.slice(4)}`;
    } else {
      return `+55 (${ddd}) ${number.slice(0, 5)}-${number.slice(5)}`;
    }
  }
  
  // US / Canada DDI (1)
  if (digits.startsWith('1') && digits.length === 11) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  
  // Generic fallback
  if (digits.length > 10) {
    return `+${digits.slice(0, 2)} ${digits.slice(2)}`;
  }
  return `+${digits}`;
};

export const formatPhoneOnly = (value: string): string => {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 0) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
};

export const formatTechnicalName = (val: string): string => {
  return val
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
};

export const formatPhoneNumber = (phone: string) => {
  if (!phone) return '';
  const cleanPhone = phone.replace(/\D/g, '');
  if (cleanPhone.startsWith('55') && cleanPhone.length >= 12) {
    const ddd = cleanPhone.substring(2, 4);
    const firstPart = cleanPhone.substring(4, cleanPhone.length - 4);
    const lastPart = cleanPhone.substring(cleanPhone.length - 4);
    return `+55 (${ddd}) ${firstPart}-${lastPart}`;
  }
  if (cleanPhone.length === 11) {
    const ddd = cleanPhone.substring(0, 2);
    const firstPart = cleanPhone.substring(2, 7);
    const lastPart = cleanPhone.substring(7);
    return `(${ddd}) ${firstPart}-${lastPart}`;
  }
  if (cleanPhone.length === 10) {
    const ddd = cleanPhone.substring(0, 2);
    const firstPart = cleanPhone.substring(2, 6);
    const lastPart = cleanPhone.substring(6);
    return `(${ddd}) ${firstPart}-${lastPart}`;
  }
  return phone;
};

export const getChannelIcon = (number: string) => {
  if (number.startsWith('telegram:')) {
    return <Send className="h-4 w-4 text-sky-400" />;
  } else if (number.startsWith('instagram:')) {
    return <Camera className="h-4 w-4 text-pink-400" />;
  } else if (number.startsWith('web:')) {
    return <Laptop className="h-4 w-4 text-blue-400" />;
  }
  return <MessageCircle className="h-4 w-4 text-emerald-400" />;
};
