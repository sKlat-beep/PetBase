import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { getOrCreateUserKey, encryptField, decryptField } from '../lib/crypto';
import { saveVaultExpenses, loadVaultExpenses } from '../lib/firestoreService';

export type RecurringFrequency = 'Weekly' | 'Bi-weekly' | 'Monthly' | 'Yearly';

export interface Expense {
  id: string;
  amount: number;
  date: string;
  label: string; // PII — stored encrypted in localStorage
  recurring?: boolean;
  frequency?: RecurringFrequency;
  // Household expense splitting
  paidBy?: string;                       // uid of member who paid
  sharedWith?: string[];                 // uids of household members sharing cost
  splitAmounts?: Record<string, number>; // uid → amount owed
}

interface ExpenseContextType {
  expenses: Expense[];
  addExpense: (expense: Omit<Expense, 'id'>) => void;
  removeExpense: (id: string) => void;
  stopRecurring: (id: string) => void;
  totalExpenses: number;
}

const ExpenseContext = createContext<ExpenseContextType | undefined>(undefined);

const STORAGE_KEY = (uid: string) => `petbase_expenses_${uid}`;

export function ExpenseProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);

  // Load and decrypt expenses: localStorage first, Firestore vault as cross-device fallback
  useEffect(() => {
    if (!user) { setExpenses([]); return; }
    const uid = user.uid;

    getOrCreateUserKey(uid).then(async (key) => {
      try {
        // 1. Try localStorage (fast path)
        let rawJson: string | null = localStorage.getItem(STORAGE_KEY(uid));

        // 2. Cross-device fallback: try Firestore vault if localStorage is empty
        if (!rawJson) {
          const vaultBlob = await loadVaultExpenses(uid).catch(() => null);
          if (vaultBlob) {
            const decryptedBlob = await decryptField(vaultBlob, key);
            if (decryptedBlob) {
              rawJson = decryptedBlob;
              // Populate local cache
              localStorage.setItem(STORAGE_KEY(uid), rawJson);
            }
          }
        }

        if (!rawJson) { setExpenses([]); return; }

        const raw: Expense[] = JSON.parse(rawJson);
        const decrypted = await Promise.all(
          raw.map(async (e) => ({ ...e, label: await decryptField(e.label, key) }))
        );
        setExpenses(decrypted);
      } catch {
        setExpenses([]);
      }
    });
  }, [user]);

  // Encrypt and persist whenever expenses change (localStorage + Firestore vault write-through)
  useEffect(() => {
    if (!user || expenses.length === 0) return;
    const uid = user.uid;
    getOrCreateUserKey(uid).then(async (key) => {
      const encrypted = await Promise.all(
        expenses.map(async (e) => ({ ...e, label: await encryptField(e.label, key) }))
      );
      const jsonStr = JSON.stringify(encrypted);
      // Write-through: local cache
      localStorage.setItem(STORAGE_KEY(uid), jsonStr);
      // Write-through: Firestore vault (entire blob re-encrypted for cross-device sync)
      const vaultBlob = await encryptField(jsonStr, key);
      saveVaultExpenses(uid, vaultBlob).catch(console.error);
    });
  }, [expenses, user]);

  const addExpense = useCallback((expenseInfo: Omit<Expense, 'id'>) => {
    setExpenses((prev) => [{ ...expenseInfo, id: crypto.randomUUID() }, ...prev]);
  }, []);

  const removeExpense = useCallback((id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const stopRecurring = useCallback((id: string) => {
    setExpenses((prev) => prev.map(e => e.id === id ? { ...e, recurring: false, frequency: undefined } : e));
  }, []);

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <ExpenseContext.Provider value={{ expenses, addExpense, removeExpense, stopRecurring, totalExpenses }}>
      {children}
    </ExpenseContext.Provider>
  );
}

export function useExpenses() {
  const context = useContext(ExpenseContext);
  if (!context) throw new Error('useExpenses must be used within an ExpenseProvider');
  return context;
}
