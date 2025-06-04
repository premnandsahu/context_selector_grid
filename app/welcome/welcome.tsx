import React, { useReducer, useMemo } from 'react';
import {
  createContext,
  useContextSelector,
} from 'use-context-selector';
import { v4 as uuid } from 'uuid';

/** TYPES */
type TaxType = 'percentage' | 'amount' | 'onUnit';
type TaxPer = 'onOrder' | 'onItem';

type ItemRow = {
  id: string;
  name: string;
  quantity: number;
  rate: number;
  amount: number;
  hsn: string;
};

type TaxRow = {
  id: string;
  tax: string;
  taxType: TaxType;
  taxPer: TaxPer;
  chargeValue: number;
  totalAmount: number;
};

type ItemTaxRow = {
  id: string;
  tax: string;
  itemId: string;
  taxId: string;
  itemName: string;
  quantity: number;
  taxType: TaxType;
  taxPer: TaxPer;
  chargeValue: number;
  totalAmount: number;
};

/** CONTEXT STATE */
type AppState = {
  itemDetails: ItemRow[];
  taxDetails: TaxRow[];
  itemTax: ItemTaxRow[];
};

const initialState: AppState = {
  itemDetails: [],
  taxDetails: [],
  itemTax: [],
};

const AppContext = createContext<any>(null);

function calculateTaxAmount(item: ItemRow, tax: TaxRow): number {
  const baseAmount = item.quantity * item.rate;
  switch (tax.taxType) {
    case 'percentage':
      return (baseAmount * tax.chargeValue) / 100;
    case 'amount':
      return tax.chargeValue;
    case 'onUnit':
      return item.quantity * tax.chargeValue;
    default:
      return 0;
  }
}

function reducer(state: AppState, action: any): AppState {
  switch (action.type) {
    case 'ADD_ITEM': {
      const newItem: ItemRow = {
        ...action.payload,
        id: uuid(),
        amount: action.payload.quantity * action.payload.rate,
      };
      const newItemTaxes: ItemTaxRow[] = state.taxDetails.map(tax => ({
        id: uuid(),
        tax: tax.tax,
        itemId: newItem.id,
        taxId: tax.id,
        itemName: newItem.name,
        quantity: newItem.quantity,
        taxType: tax.taxType,
        taxPer: tax.taxPer,
        chargeValue: tax.chargeValue,
        totalAmount: calculateTaxAmount(newItem, tax),
      }));
      const updatedTaxDetails = state.taxDetails.map(tax => {
        const relatedTaxes = [...state.itemTax, ...newItemTaxes].filter(row => row.tax === tax.tax);
        return {
          ...tax,
          totalAmount: relatedTaxes.reduce((sum, row) => sum + row.totalAmount, 0),
        };
      });
      return {
        itemDetails: [...state.itemDetails, newItem],
        itemTax: [...state.itemTax, ...newItemTaxes],
        taxDetails: updatedTaxDetails,
      };
    }
    case 'ADD_TAX': {
      const newTax: TaxRow = {
        ...action.payload,
        id: uuid(),
        totalAmount: 0,
      };
      const newItemTaxes: ItemTaxRow[] = state.itemDetails.map(item => {
        const amount = calculateTaxAmount(item, newTax);
        return {
          id: uuid(),
          tax: newTax.tax,
          itemId: item.id,
          taxId: newTax.id, 
          itemName: item.name,
          quantity: item.quantity,
          taxType: newTax.taxType,
          taxPer: newTax.taxPer,
          chargeValue: newTax.chargeValue,
          totalAmount: amount,
        };
      });
      const updatedTax = {
        ...newTax,
        totalAmount: newItemTaxes.reduce((sum, row) => sum + row.totalAmount, 0),
      };
      return {
        ...state,
        taxDetails: [...state.taxDetails, updatedTax],
        itemTax: [...state.itemTax, ...newItemTaxes],
      };
    }
    case 'UPDATE_ITEM': {
      const updatedItems = state.itemDetails.map(item =>
        item.id === action.payload.id
          ? { ...item, ...action.payload, amount: action.payload.quantity * action.payload.rate }
          : item
      );
      const updatedItemTax = state.itemTax.map(row => {
        const updatedItem = updatedItems.find(i => i.id === row.itemId);
        const matchingTax = state.taxDetails.find(t => t.id === row.taxId);
        return updatedItem && matchingTax
          ? {
              ...row,
              quantity: updatedItem.quantity,
              itemName: updatedItem.name,
              chargeValue: matchingTax.chargeValue,
              taxType: matchingTax.taxType,
              taxPer: matchingTax.taxPer,
              totalAmount: calculateTaxAmount(updatedItem, matchingTax),
            }
          : row;
      });
      const updatedTaxDetails = state.taxDetails.map(tax => {
        const totalAmount = updatedItemTax
          .filter(row => row.taxId === tax.id)
          .reduce((sum, row) => sum + row.totalAmount, 0);
        return { ...tax, totalAmount };
      });
      return { itemDetails: updatedItems, itemTax: updatedItemTax, taxDetails: updatedTaxDetails };
    }
    case 'UPDATE_TAX': {
      const updatedTaxes = state.taxDetails.map(tax =>
        tax.id === action.payload.id ? { ...tax, ...action.payload } : tax
      );
      const updatedItemTax = state.itemTax.map(row => {
        const updatedTax = updatedTaxes.find(t => t.id === row.taxId);
        const relatedItem = state.itemDetails.find(i => i.id === row.itemId);
        return updatedTax && relatedItem
          ? {
              ...row,
              chargeValue: updatedTax.chargeValue,
              taxType: updatedTax.taxType,
              taxPer: updatedTax.taxPer,
              totalAmount: calculateTaxAmount(relatedItem, updatedTax),
            }
          : row;
      });
      const finalTaxDetails = updatedTaxes.map(tax => {
        const totalAmount = updatedItemTax
          .filter(row => row.taxId === tax.id)
          .reduce((sum, row) => sum + row.totalAmount, 0);
        console.log("totalAmount--->",totalAmount);
        return { ...tax, totalAmount };
      });
      return { itemDetails: state.itemDetails, itemTax: updatedItemTax, taxDetails: finalTaxDetails };
    }
    case 'UPDATE_ITEM_TAX': {
      const updatedItemTax = state.itemTax.map(row =>
        row.id === action.payload.id ? { ...row, ...action.payload } : row
      );
      const updatedTaxDetails = state.taxDetails.map(tax => {
        const totalAmount = updatedItemTax
          .filter(row => row.taxId === tax.id)
          .reduce((sum, row) => sum + row.totalAmount, 0);
        return { ...tax, totalAmount };
      });
      return { itemDetails: state.itemDetails, itemTax: updatedItemTax, taxDetails: updatedTaxDetails };
    }
    default:
      return state;
  }
}

function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const value = useMemo(
    () => ({
      itemDetails: state.itemDetails,
      taxDetails: state.taxDetails,
      itemTax: state.itemTax,
      addItem: (item: Partial<ItemRow>) => dispatch({ type: 'ADD_ITEM', payload: item }),
      addTax: (tax: Partial<TaxRow>) => dispatch({ type: 'ADD_TAX', payload: tax }),
      updateItem: (item: Partial<ItemRow>) => dispatch({ type: 'UPDATE_ITEM', payload: item }),
      updateTax: (tax: Partial<TaxRow>) => dispatch({ type: 'UPDATE_TAX', payload: tax }),
      updateItemTax: (itemTax: Partial<ItemTaxRow>) => dispatch({ type: 'UPDATE_ITEM_TAX', payload: itemTax }),
    }),
    [state]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

function ItemDetailsGrid() {
  const items = useContextSelector(AppContext, v => v.itemDetails);
  const updateItem = useContextSelector(AppContext, v => v.updateItem);
  const addItem = useContextSelector(AppContext, v => v.addItem);
  return (
    <div className="p-4 border">
      <h2 className="font-bold">Item Details</h2>
      <button
        onClick={() => addItem({ name: 'Item A', quantity: 2, rate: 100, hsn: '1234' })}
        className="mt-2 px-2 py-1 bg-blue-500 text-white"
      >
        Add Item
      </button>
      <table className="mt-2 w-full border">
        <thead>
          <tr><th>Name</th><th>Qty</th><th>Rate</th><th>Amount</th><th>HSN</th></tr>
        </thead>
        <tbody>
          {items.map((item: { id: React.Key | null | undefined; name: string | number | readonly string[] | undefined; quantity: string | number | readonly string[] | undefined; rate: string | number | readonly string[] | undefined; amount: number; hsn: string | number | readonly string[] | undefined; }) => (
            <tr key={item.id}>
              <td><input value={item.name} onChange={e => updateItem({ ...item, name: e.target.value })} /></td>
              <td><input type="number" value={item.quantity} onChange={e => updateItem({ ...item, quantity: +e.target.value })} /></td>
              <td><input type="number" value={item.rate} onChange={e => updateItem({ ...item, rate: +e.target.value })} /></td>
              <td>{item.amount.toFixed(2)}</td>
              <td><input value={item.hsn} onChange={e => updateItem({ ...item, hsn: e.target.value })} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TaxGrid() {
  const taxes = useContextSelector(AppContext, v => v.taxDetails);
  const addTax = useContextSelector(AppContext, v => v.addTax);
  const updateTax = useContextSelector(AppContext, v => v.updateTax);
  return (
    <div className="p-4 border">
      <h2 className="font-bold">Tax</h2>
      <button
        onClick={() => addTax({ tax: 'GST', taxType: 'percentage', taxPer: 'onOrder', chargeValue: 18 })}
        className="mt-2 px-2 py-1 bg-green-500 text-white"
      >
        Add Tax
      </button>
      <table className="mt-2 w-full border">
        <thead>
          <tr><th>Tax</th><th>Tax type</th><th>Tax on</th><th>Charge</th><th>Total</th></tr>
        </thead>
        <tbody>
          {taxes.map((t: { id: React.Key | null | undefined; tax: string | number | readonly string[] | undefined; taxType: string | number | readonly string[] | undefined; taxPer: string | number | readonly string[] | undefined; chargeValue: string | number | readonly string[] | undefined; totalAmount: number; }) => (
            <tr key={t.id}>
              <td><input value={t.tax} onChange={e => updateTax({ ...t, tax: e.target.value })} /></td>
              <td>
                <select 
                  name="taxType" 
                  id="taxType" 
                  onChange={e => updateTax({ ...t, taxType: e.target.value as TaxType })}
                  value={t.taxType}
                >
                  <option value="percentage">Percentage</option>
                  <option value="amount">Amount</option>
                  <option value="onUnit">Per Unit</option>
                </select>
              </td>
              <td>
                <select name="taxPer" id="taxPer" onChange={e => updateTax({ ...t, taxPer: e.target.value as TaxPer })} value={t.taxPer}>
                  <option value="onOrder">Order</option>
                  <option value="onItem">Item</option>
                </select>
              </td>
              <td><input type="number" value={t.chargeValue} onChange={e => updateTax({ ...t, chargeValue: +e.target.value })} /></td>
              <td>{t.totalAmount.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ItemTaxGrid() {
  const itemTaxes = useContextSelector(AppContext, v => v.itemTax);
  const updateItemTax = useContextSelector(AppContext, v => v.updateItemTax);
  return (
    <div className="p-4 border">
      <h2 className="font-bold">Item Tax</h2>
      <table className="mt-2 w-full border">
        <thead>
          <tr><th>Item</th><th>Tax</th><th>Tax type</th><th>Tax on</th><th>Charge</th><th>Total</th></tr>
        </thead>
        <tbody>
          {itemTaxes.map((row: { id: React.Key | null | undefined; itemName: string | number | bigint | boolean | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | null | undefined; tax: string | number | bigint | boolean | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | null | undefined; taxType: string | number | bigint | boolean | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | null | undefined; taxPer: string | number | bigint | boolean | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | null | undefined; chargeValue: string | number | bigint | boolean | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | null | undefined; totalAmount: number; }) => (
            <tr key={row.id}>
              <td>{row.itemName}</td>
              <td>{row.tax}</td>
              <td>{row.taxType}</td>
              <td>{row.taxPer === 'onOrder' ? 'Order' : 'Item'}</td>
              <td>
                {row.taxPer === 'onOrder' ? 
                  row.chargeValue
                : 
                  <input type="number" value={row.chargeValue} onChange={e => updateItemTax({ ...row, chargeValue: +e.target.value })} />
                }
              </td>
              <td>{row.totalAmount.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Welcome() {
  return (
    <AppProvider>
      <div className="max-w-6xl mx-auto space-y-4">
        <ItemDetailsGrid />
        <TaxGrid />
        <ItemTaxGrid />
      </div>
    </AppProvider>
  );
}
