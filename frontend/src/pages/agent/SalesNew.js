import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { salesAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { Plus, X, DollarSign } from 'lucide-react';

const SalesNew = () => {
  const { user } = useAuth();
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  
  // Simple form state
  const [form, setForm] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    paymentMethod: 'cash',
    notes: '',
    items: [{ itemName: '', quantity: 1, unitPrice: 0, discount: 0 }]
  });

  // Load sales
  const loadSales = async () => {
    try {
      setLoading(true);
      const response = await salesAPI.getAll({ limit: 100 });
      setSales(response.data.sales || []);
    } catch (error) {
      console.error('Error loading sales:', error);
      toast.error('Failed to load sales');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSales();
  }, []);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle item changes
  const handleItemChange = (index, field, value) => {
    const updatedItems = [...form.items];
    updatedItems[index][field] = field === 'itemName' ? value : Number(value) || 0;
    setForm(prev => ({
      ...prev,
      items: updatedItems
    }));
  };

  // Add item
  const addItem = () => {
    setForm(prev => ({
      ...prev,
      items: [...prev.items, { itemName: '', quantity: 1, unitPrice: 0, discount: 0 }]
    }));
  };

  // Remove item
  const removeItem = (index) => {
    if (form.items.length > 1) {
      setForm(prev => ({
        ...prev,
        items: prev.items.filter((_, i) => i !== index)
      }));
    }
  };

  // Submit sale
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!form.customerName.trim()) {
      toast.error('Customer name is required');
      return;
    }

    const validItems = form.items.filter(item => item.itemName.trim());
    if (validItems.length === 0) {
      toast.error('Add at least one item');
      return;
    }

    for (const item of validItems) {
      if (item.quantity < 1) {
        toast.error('Quantity must be at least 1');
        return;
      }
      if (item.unitPrice < 0) {
        toast.error('Price cannot be negative');
        return;
      }
    }

    try {
      const saleData = {
        customerName: form.customerName.trim(),
        customerEmail: form.customerEmail.trim() || undefined,
        customerPhone: form.customerPhone.trim() || undefined,
        paymentMethod: form.paymentMethod,
        notes: form.notes.trim() || undefined,
        items: validItems
      };

      console.log('Submitting sale:', saleData);

      const response = await salesAPI.create(saleData);
      console.log('Sale created:', response.data);
      
      toast.success('Sale created successfully!');
      
      // Reset form
      setForm({
        customerName: '',
        customerEmail: '',
        customerPhone: '',
        paymentMethod: 'cash',
        notes: '',
        items: [{ itemName: '', quantity: 1, unitPrice: 0, discount: 0 }]
      });
      
      setShowModal(false);
      loadSales();
    } catch (error) {
      console.error('Error creating sale:', error);
      const errorMsg = error.response?.data?.message || error.message || 'Failed to create sale';
      toast.error(errorMsg);
    }
  };

  // Calculate total
  const calculateTotal = () => {
    return form.items.reduce((sum, item) => {
      const itemTotal = item.quantity * item.unitPrice;
      const discount = itemTotal * (item.discount / 100);
      return sum + (itemTotal - discount);
    }, 0);
  };

  const formatCurrency = (amount) => {
    return `UGX ${Number(amount || 0).toLocaleString('en-UG')}`;
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Sales</h1>
          <p className="text-gray-600 mt-1">Manage your sales transactions</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 font-medium"
        >
          <Plus size={20} />
          New Sale
        </button>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold">Create New Sale</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Customer Info */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg text-gray-800">Customer Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    name="customerName"
                    placeholder="Customer Name *"
                    value={form.customerName}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <input
                    type="email"
                    name="customerEmail"
                    placeholder="Email (optional)"
                    value={form.customerEmail}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="tel"
                    name="customerPhone"
                    placeholder="Phone (optional)"
                    value={form.customerPhone}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <select
                    name="paymentMethod"
                    value={form.paymentMethod}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="cash">Cash</option>
                    <option value="credit">Credit</option>
                  </select>
                </div>
                <textarea
                  name="notes"
                  placeholder="Notes (optional)"
                  value={form.notes}
                  onChange={handleInputChange}
                  rows="2"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Items */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg text-gray-800">Items</h3>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {form.items.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 items-end bg-gray-50 p-3 rounded-lg">
                      <input
                        type="text"
                        placeholder="Item Name *"
                        value={item.itemName}
                        onChange={(e) => handleItemChange(index, 'itemName', e.target.value)}
                        className="col-span-4 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                      <input
                        type="number"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                        min="1"
                        className="col-span-2 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                      <input
                        type="number"
                        placeholder="Price"
                        value={item.unitPrice}
                        onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                        min="0"
                        className="col-span-2 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                      <input
                        type="number"
                        placeholder="Disc %"
                        value={item.discount}
                        onChange={(e) => handleItemChange(index, 'discount', e.target.value)}
                        min="0"
                        max="100"
                        className="col-span-2 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        disabled={form.items.length === 1}
                        className="col-span-1 text-red-600 hover:text-red-800 disabled:text-gray-300"
                      >
                        <X size={20} />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addItem}
                  className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 rounded-lg font-medium flex items-center justify-center gap-2"
                >
                  <Plus size={18} />
                  Add Item
                </button>
              </div>

              {/* Total */}
              <div className="bg-blue-50 p-4 rounded-lg flex items-center justify-between">
                <span className="text-lg font-semibold text-gray-700">Total:</span>
                <span className="text-2xl font-bold text-blue-600">{formatCurrency(calculateTotal())}</span>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 py-3 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium"
                >
                  Create Sale
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sales List */}
      <div className="bg-white rounded-lg shadow">
        <table className="w-full">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Customer</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Items</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Amount</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Method</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
            </tr>
          </thead>
          <tbody>
            {sales.map(sale => (
              <tr key={sale._id} className="border-b hover:bg-gray-50">
                <td className="px-6 py-4 text-sm text-gray-900">{sale.customerName}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{sale.items?.length || 0} item(s)</td>
                <td className="px-6 py-4 text-sm font-semibold text-gray-900">{formatCurrency(sale.finalAmount)}</td>
                <td className="px-6 py-4 text-sm">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    sale.paymentMethod === 'cash'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-orange-100 text-orange-800'
                  }`}>
                    {sale.paymentMethod}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {new Date(sale.saleDate).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {sales.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No sales yet. Create your first sale!
          </div>
        )}
      </div>
    </div>
  );
};

export default SalesNew;
