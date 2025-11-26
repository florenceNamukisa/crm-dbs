import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { salesAPI, stockAPI, clientsAPI } from '../../services/api';
import toast from 'react-hot-toast';
import {
  Plus,
  Download,
  CreditCard,
  DollarSign,
  ShoppingCart,
  CheckCircle,
  MessageCircle,
  XCircle
} from 'lucide-react';

const Sales = () => {
  const { user } = useAuth();
  const [sales, setSales] = useState([]);
  const [creditSales, setCreditSales] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    totalSales: 0,
    totalAmount: 0,
    cashSales: 0,
    creditSales: 0,
    pendingCredits: 0
  });
  const [showNewSaleModal, setShowNewSaleModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedCreditSale, setSelectedCreditSale] = useState(null);
  const [filters, setFilters] = useState({
    period: 'daily',
    paymentMethod: '',
    status: '',
    customerName: ''
  });

  // New sale form state
  const [newSale, setNewSale] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    clientId: '',
    items: [{ itemName: '', quantity: 1, unitPrice: 0, discount: 0 }],
    paymentMethod: 'cash',
    notes: '',
    dueDate: ''
  });

  // Payment form state
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    paymentMethod: 'cash',
    notes: ''
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      // Load all sales
      const salesResponse = await salesAPI.getAll({
        ...filters,
        page: 1,
        limit: 100
      });
      const allSales = salesResponse.data.sales || [];
      setSales(allSales.filter(sale => sale.paymentMethod === 'cash'));
      setCreditSales(allSales.filter(sale => sale.paymentMethod === 'credit'));

      // Load sales summary stats
      const summaryStats = await salesAPI.getSummary(filters.period);
      setSummary(summaryStats.data || {});

      // Load clients for customer selection
      const clientsResponse = await clientsAPI.getAll({ limit: 100 });
      setClients(clientsResponse.data.clients || []);

    } catch (error) {
      console.error('Error loading sales data:', error);
      toast.error('Failed to load sales data');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleNewSale = async (e) => {
    e.preventDefault();

    // Check if user is authenticated
    if (!user) {
      toast.error('You must be logged in to create a sale');
      return;
    }

    // Validate form
    if (!newSale.clientId) {
      toast.error('Please select a customer');
      return;
    }

    const validItems = newSale.items.filter(item => item.itemName.trim() !== '');
    if (validItems.length === 0) {
      toast.error('Please add at least one item');
      return;
    }

    // Check if all items have required fields
    for (const item of validItems) {
      if (!item.itemName.trim()) {
        toast.error('All items must have a name');
        return;
      }
      if (item.quantity < 1) {
        toast.error('Item quantity must be at least 1');
        return;
      }
      if (item.unitPrice < 0) {
        toast.error('Item price cannot be negative');
        return;
      }
    }

    try {
      // Prepare the sale data for backend
      const saleData = {
        customerName: newSale.customerName,
        customerEmail: newSale.customerEmail,
        customerPhone: newSale.customerPhone,
        client: newSale.clientId || null, // Backend expects 'client' field
        items: validItems,
        paymentMethod: newSale.paymentMethod,
        notes: newSale.notes || '',
        dueDate: newSale.paymentMethod === 'credit' && newSale.dueDate ? new Date(newSale.dueDate).toISOString() : null
      };

      console.log('Creating sale with data:', saleData);
      console.log('Items to be sent:', saleData.items);
      console.log('Current user:', user);

      const response = await salesAPI.create(saleData);
      console.log('Sale created successfully:', response.data);
      toast.success('Sale created successfully!');
      setShowNewSaleModal(false);
      setNewSale({
        customerName: '',
        customerEmail: '',
        customerPhone: '',
        clientId: '',
        items: [{ itemName: '', quantity: 1, unitPrice: 0, discount: 0 }],
        paymentMethod: 'cash',
        notes: '',
        dueDate: ''
      });
      loadData();
    } catch (error) {
      console.error('Error creating sale:', error);
      console.error('Error response:', error.response);
      console.error('Error response data:', error.response?.data);
      toast.error(error.response?.data?.message || error.message || 'Failed to create sale');
    }
  };

  const addItemToSale = () => {
    setNewSale({
      ...newSale,
      items: [...newSale.items, { itemName: '', quantity: 1, unitPrice: 0, discount: 0 }]
    });
  };

  const updateSaleItem = (index, field, value) => {
    const updatedItems = [...newSale.items];
    updatedItems[index][field] = value;

    // Calculate total price for the item
    if (field === 'quantity' || field === 'unitPrice' || field === 'discount') {
      const item = updatedItems[index];
      const total = item.quantity * item.unitPrice;
      const discount = total * (item.discount / 100);
      item.totalPrice = total - discount;
    }

    setNewSale({ ...newSale, items: updatedItems });
  };

  const removeSaleItem = (index) => {
    if (newSale.items.length > 1) {
      const updatedItems = newSale.items.filter((_, i) => i !== index);
      setNewSale({ ...newSale, items: updatedItems });
    }
  };


  const exportSales = () => {
    const allSales = [...sales, ...creditSales];
    const csvContent = [
      ['Customer Name', 'Email', 'Phone', 'Items', 'Payment Method', 'Total Amount (UGX)', 'Discount (UGX)', 'Final Amount (UGX)', 'Status', 'Date'],
      ...allSales.map(sale => [
        sale.customerName || '',
        sale.customerEmail || '',
        sale.customerPhone || '',
        sale.items?.map(item => `${item.itemName || ''} (${item.quantity || 0})`).join('; ') || '',
        sale.paymentMethod || '',
        sale.totalAmount || 0,
        sale.discountAmount || 0,
        sale.finalAmount || 0,
        sale.paymentMethod === 'credit' ? (sale.creditStatus || 'unpaid') : 'paid',
        sale.saleDate ? new Date(sale.saleDate).toLocaleDateString() : ''
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Sales Management</h1>
          <p className="text-gray-600">Record and manage your sales transactions</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowNewSaleModal(true)}
            className="bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 flex items-center space-x-2 font-medium"
          >
            <Plus className="w-5 h-5" />
            <span>New Sale</span>
          </button>
          <button
            onClick={exportSales}
            className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 flex items-center space-x-2"
          >
            <Download className="w-5 h-5" />
            <span>Export All Sales</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-lg shadow-sm border border-gray-200"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Sales</p>
              <p className="text-2xl font-bold text-gray-900">{summary.totalSales || 0}</p>
            </div>
            <ShoppingCart className="w-8 h-8 text-orange-600" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-6 rounded-lg shadow-sm border border-gray-200"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Amount</p>
              <p className="text-2xl font-bold text-gray-900">UGX {(summary.totalAmount || 0).toLocaleString()}</p>
            </div>
            <DollarSign className="w-8 h-8 text-green-600" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white p-6 rounded-lg shadow-sm border border-gray-200"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Cash Sales</p>
              <p className="text-2xl font-bold text-gray-900">{summary.cashSales || 0}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white p-6 rounded-lg shadow-sm border border-gray-200"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Credit Sales</p>
              <p className="text-2xl font-bold text-gray-900">{summary.creditSales || 0}</p>
            </div>
            <CreditCard className="w-8 h-8 text-orange-600" />
          </div>
        </motion.div>
      </div>

      {/* Cash Sales Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Cash Sales</h2>
          <p className="text-sm text-gray-600 mt-1">Completed cash transactions</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sales.map((sale) => (
                <tr key={sale._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{sale.customerName || 'N/A'}</div>
                    {sale.customerEmail && (
                      <div className="text-sm text-gray-500">{sale.customerEmail}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {sale.items?.length || 0} item(s)
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    UGX {(sale.finalAmount || 0).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {sale.saleDate ? new Date(sale.saleDate).toLocaleDateString() : 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {sales.length === 0 && (
            <div className="text-center py-12">
              <ShoppingCart className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No cash sales</h3>
              <p className="mt-1 text-sm text-gray-500">Cash sales will appear here.</p>
            </div>
          )}
        </div>
      </div>

      {/* Credit Sales Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Credit Sales</h2>
          <p className="text-sm text-gray-600 mt-1">Outstanding credit transactions and payments</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paid</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {creditSales.map((sale) => {
                const totalPaid = sale.payments?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;
                const balance = (sale.finalAmount || 0) - totalPaid;
                const status = balance <= 0 ? 'paid' : sale.creditStatus || 'pending';

                return (
                  <tr key={sale._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{sale.customerName || 'N/A'}</div>
                      {sale.customerEmail && (
                        <div className="text-sm text-gray-500">{sale.customerEmail}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {sale.items?.length || 0} item(s)
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      UGX {(sale.finalAmount || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      UGX {totalPaid.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      UGX {balance.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        status === 'paid'
                          ? 'bg-green-100 text-green-800'
                          : status === 'partial'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => {
                          setSelectedCreditSale(sale);
                          setShowPaymentModal(true);
                        }}
                        className="text-orange-600 hover:text-orange-900 mr-3"
                      >
                        Record Payment
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {creditSales.length === 0 && (
            <div className="text-center py-12">
              <CreditCard className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No credit sales</h3>
              <p className="mt-1 text-sm text-gray-500">Credit sales will appear here.</p>
            </div>
          )}
        </div>
      </div>

      {/* New Sale Modal */}
      {showNewSaleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">Create New Sale</h2>

              <form onSubmit={handleNewSale} className="space-y-6">
                {/* Customer Information */}
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Select Customer *
                    </label>
                    <select
                      required
                      value={newSale.clientId}
                      onChange={(e) => {
                        const selectedClient = clients.find(c => c._id === e.target.value);
                        setNewSale({
                          ...newSale,
                          clientId: e.target.value,
                          customerName: selectedClient?.name || '',
                          customerEmail: selectedClient?.email || '',
                          customerPhone: selectedClient?.phone || ''
                        });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    >
                      <option value="">Select a customer</option>
                      {clients.map((client) => (
                        <option key={client._id} value={client._id}>
                          {client.name} - {client.email || client.phone || 'No contact info'}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Display selected customer info */}
                {newSale.clientId && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Customer Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Name:</span>
                        <span className="ml-2 font-medium">{newSale.customerName}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Email:</span>
                        <span className="ml-2">{newSale.customerEmail || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Phone:</span>
                        <span className="ml-2">{newSale.customerPhone || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Items */}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium">Items</h3>
                    <button
                      type="button"
                      onClick={addItemToSale}
                      className="bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 text-sm"
                    >
                      Add Item
                    </button>
                  </div>

                  <div className="space-y-3">
                    {newSale.items.map((item, index) => (
                      <div key={index} className="grid grid-cols-1 md:grid-cols-6 gap-3 p-4 bg-gray-50 rounded-lg">
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Item Name *
                          </label>
                          <input
                            type="text"
                            required
                            value={item.itemName}
                            onChange={(e) => updateSaleItem(index, 'itemName', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                            placeholder="Enter item name"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Quantity *
                          </label>
                          <input
                            type="number"
                            min="1"
                            required
                            value={item.quantity}
                            onChange={(e) => updateSaleItem(index, 'quantity', parseInt(e.target.value) || 1)}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Unit Price (UGX) *
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="100"
                            required
                            value={item.unitPrice}
                            onChange={(e) => updateSaleItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Discount (%)
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={item.discount}
                            onChange={(e) => updateSaleItem(index, 'discount', parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div className="flex items-end space-x-2">
                          <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Total
                            </label>
                            <input
                              type="number"
                              readOnly
                              value={item.totalPrice?.toFixed(2) || '0.00'}
                              className="w-full px-3 py-2 border rounded-lg bg-gray-100"
                            />
                          </div>
                          {newSale.items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeSaleItem(index)}
                              className="px-3 py-2 text-red-600 hover:text-red-800"
                            >
                              <XCircle className="w-5 h-5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Payment Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Payment Method *
                    </label>
                    <select
                      required
                      value={newSale.paymentMethod}
                      onChange={(e) => setNewSale({ ...newSale, paymentMethod: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    >
                      <option value="cash">Cash</option>
                      <option value="credit">Credit</option>
                    </select>
                  </div>
                  {newSale.paymentMethod === 'credit' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Due Date
                      </label>
                      <input
                        type="date"
                        value={newSale.dueDate}
                        onChange={(e) => setNewSale({ ...newSale, dueDate: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={newSale.notes}
                    onChange={(e) => setNewSale({ ...newSale, notes: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Any additional notes..."
                  />
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => setShowNewSaleModal(false)}
                    className="px-4 py-2 text-gray-700 border rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Create Sale
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedCreditSale && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg max-w-md w-full p-6"
          >
            <h2 className="text-xl font-semibold mb-4 text-gray-900">Record Payment</h2>

            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">{selectedCreditSale.customerName}</h3>
              <div className="text-sm text-gray-600 space-y-1">
                <p>Total Amount: UGX {selectedCreditSale.finalAmount?.toLocaleString() || 0}</p>
                <p>Paid: UGX {(selectedCreditSale.payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0).toLocaleString()}</p>
                <p className="font-medium text-orange-600">
                  Balance: UGX {((selectedCreditSale.finalAmount || 0) - (selectedCreditSale.payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0)).toLocaleString()}
                </p>
              </div>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();

              try {
                await salesAPI.recordPayment(selectedCreditSale._id, paymentForm);
                toast.success('Payment recorded successfully!');
                setShowPaymentModal(false);
                setSelectedCreditSale(null);
                setPaymentForm({ amount: '', paymentMethod: 'cash', notes: '' });
                loadData();
              } catch (error) {
                console.error('Error recording payment:', error);
                toast.error(error.response?.data?.message || 'Failed to record payment');
              }
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Amount (UGX) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    required
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="Enter payment amount"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Method *
                  </label>
                  <select
                    required
                    value={paymentForm.paymentMethod}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  >
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="online">Online Payment</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={paymentForm.notes}
                    onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="Optional payment notes..."
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowPaymentModal(false);
                    setSelectedCreditSale(null);
                    setPaymentForm({ amount: '', paymentMethod: 'cash', notes: '' });
                  }}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                >
                  Record Payment
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Sales;
