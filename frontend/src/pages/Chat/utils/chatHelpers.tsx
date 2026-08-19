import { Send, Camera, Laptop, MessageCircle } from 'lucide-react';

export const formatTime = (dateStr: string) => {
  try {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
};

export const formatPhoneNumber = (phone: string) => {
  if (!phone) return '';
  const cleanPhone = phone.replace(/\D/g, '');
  if (cleanPhone.startsWith('55') && cleanPhone.length >= 12) {
    const ddd = cleanPhone.substring(2, 4);
    const firstPart = cleanPhone.substring(4, cleanPhone.length - 4);
    const lastPart = cleanPhone.substring(cleanPhone.length - 4);
    return `(${ddd}) ${firstPart}-${lastPart}`;
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

export const formatCNPJ = (cnpj: string) => {
  if (!cnpj) return '';
  const cleanCnpj = cnpj.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  if (cleanCnpj.length === 14) {
    return cleanCnpj.replace(
      /^([A-Z0-9]{2})([A-Z0-9]{3})([A-Z0-9]{3})([A-Z0-9]{4})([0-9]{2})$/,
      '$1.$2.$3/$4-$5'
    );
  }
  return cnpj;
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
