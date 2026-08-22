import toast, { ToastOptions } from 'react-hot-toast';

const defaultOptions: ToastOptions = {
  duration: 4000,
  position: 'bottom-right',
  className: '!rounded-xl !shadow-lg !border !border-slate-100 !bg-white !text-slate-800 !font-medium',
};

export const showToast = {
  success: (message: string, options?: ToastOptions) => 
    toast.success(message, {
      ...defaultOptions,
      iconTheme: {
        primary: '#14b8a0',
        secondary: '#fff',
      },
      ...options,
    }),
  
  error: (message: string, options?: ToastOptions) => 
    toast.error(message, {
      ...defaultOptions,
      iconTheme: {
        primary: '#ef4444',
        secondary: '#fff',
      },
      ...options,
    }),
    
  loading: (message: string, options?: ToastOptions) => 
    toast.loading(message, {
      ...defaultOptions,
      ...options,
    }),
    
  custom: (message: string, options?: ToastOptions) => 
    toast(message, {
      ...defaultOptions,
      ...options,
    }),
    
  dismiss: (toastId?: string) => toast.dismiss(toastId),
};
