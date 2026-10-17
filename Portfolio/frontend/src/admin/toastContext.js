import { createContext, useContext } from 'react';

export const ToastContext = createContext({ notify: () => {}, confirm: async () => false });
export const useToast = () => useContext(ToastContext);
