// src/context/DialogContext.jsx
import React, { createContext, useContext, useState, useCallback } from 'react';
import Dialog from '../components/Dialog';

const DialogContext = createContext();

export const useDialog = () => useContext(DialogContext);

export const DialogProvider = ({ children }) => {
  const [dialog, setDialog] = useState({
    open: false,
    type: 'info',
    title: '',
    message: '',
    onConfirm: null,
    onCancel: null,
    confirmText: '',
    cancelText: '',
    danger: false,
    loading: false,
  });

  // Show a simple alert (with OK button)
  const showAlert = useCallback((message, options = {}) => {
    return new Promise((resolve) => {
      setDialog({
        open: true,
        type: options.type || 'info',
        title: options.title || '',
        message,
        confirmText: options.confirmText || 'OK',
        cancelText: '',
        danger: options.danger || false,
        loading: false,
        onConfirm: () => {
          setDialog((d) => ({ ...d, open: false }));
          resolve(true);
        },
        onCancel: () => {
          setDialog((d) => ({ ...d, open: false }));
          resolve(true);
        },
      });
    });
  }, []);

  // Success alert
  const showSuccess = useCallback((message, title = 'Success') => {
    return showAlert(message, { type: 'success', title, confirmText: 'Great!' });
  }, [showAlert]);

  // Error alert
  const showError = useCallback((message, title = 'Error') => {
    return showAlert(message, { type: 'error', title, confirmText: 'OK' });
  }, [showAlert]);

  // Confirm dialog (returns true/false)
  const showConfirm = useCallback((message, options = {}) => {
    return new Promise((resolve) => {
      setDialog({
        open: true,
        type: options.type || 'confirm',
        title: options.title || 'Confirm',
        message,
        confirmText: options.confirmText || 'Yes, Confirm',
        cancelText: options.cancelText || 'Cancel',
        danger: options.danger || false,
        loading: false,
        onConfirm: () => {
          setDialog((d) => ({ ...d, open: false }));
          resolve(true);
        },
        onCancel: () => {
          setDialog((d) => ({ ...d, open: false }));
          resolve(false);
        },
      });
    });
  }, []);

  // Danger confirm (for delete/reject)
  const showDanger = useCallback((message, options = {}) => {
    return showConfirm(message, { ...options, type: 'danger', danger: true });
  }, [showConfirm]);

  // Show loading state (for async operations)
  const setLoading = useCallback((loading) => {
    setDialog((d) => ({ ...d, loading }));
  }, []);

  return (
    <DialogContext.Provider value={{ showAlert, showSuccess, showError, showConfirm, showDanger, setLoading }}>
      {children}
      <Dialog {...dialog} />
    </DialogContext.Provider>
  );
};