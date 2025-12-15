import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { salesAPI, clientsAPI } from '../../services/api';
import toast from 'react-hot-toast';
import {
  Plus,
  ShoppingCart,
  DollarSign,
  Search,
  X,
  Edit,
  Trash2,
  Eye,
  CreditCard,
  Calendar
} from 'lucide-react';

const SalesManagement = () => {
  const { user } = useAuth();
  const [sales, setSales] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('cash'); // 'cash' or 'credit'
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [editingSale, setEditingSale] = useState(null);
  const [selectedSaleForPayment, setSelectedSaleForPayment] = useState(null);
  const [loadingClients, setLoadingClients] = useState(false);
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [filteredClients, setFilteredClients] = useState([]);
  const [selectedSaleForDetails, setSelectedSaleForDetails] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Sale form state
  const [saleForm, setSaleForm] = useState({
    clientId: '',
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    paymentMethod: 'cash',
    saleDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    initialPayment: '',
    notes: '',
    items: [{ itemName: '', quantity: 1, unitPrice: 0, discount: 0 }]
  });

  // Payment form state
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'cash',
    cardNumber: '',
    bankName: '',
    accountName: '',
    notes: ''
  });

  // Format currency
  const formatCurrency = (amount) => {
    return `UGX ${Number(amount || 0).toLocaleString('en-UG', { maximumFractionDigits: 0 })}`;
  };

  // Load sales from database
  const loadSales = async () => {
    try {
      const response = await salesAPI.getAll({ limit: 200 });
      setSales(response.data.sales || []);
    } catch (error) {
      console.error('Error loading sales:', error);
      toast.error('Failed to load sales');
    }
  };

  // Load clients from database
  const loadClients = async () => {
    try {
      const response = await clientsAPI.getAll({ limit: 200 });
      const fetchedClients = response.data?.clients || response.data || [];
      setClients(fetchedClients);
      setFilteredClients(fetchedClients);
    } catch (error) {
      console.error('Error loading clients:', error);
      setClients([]);
      setFilteredClients([]);
    }
  };

  useEffect(() => {
    loadSales();
  }, []);

  useEffect(() => {
    if (showSaleModal) {
      loadClients();
    }
  }, [showSaleModal]);

  // Filter clients based on search term
  useEffect(() => {
    if (clientSearchTerm.trim() === '') {
      setFilteredClients(clients);
    } else {
      const filtered = clients.filter(client =>
        client.name?.toLowerCase().includes(clientSearchTerm.toLowerCase()) ||
        client.email?.toLowerCase().includes(clientSearchTerm.toLowerCase()) ||
        client.phone?.includes(clientSearchTerm) ||
        client.company?.toLowerCase().includes(clientSearchTerm.toLowerCase())
      );
      setFilteredClients(filtered);
    }
  }, [clientSearchTerm, clients]);

  // Handle client selection
  const handleSelectClient = (client) => {
    setSaleForm({
      ...saleForm,
      clientId: client._id,
      customerName: client.name,
      customerEmail: client.email || '',
      customerPhone: client.phone || ''
    });
    setClientSearchTerm('');
    setShowClientDropdown(false);
  };

  // Handle adding item
  const handleAddItem = () => {
    setSaleForm({
      ...saleForm,
      items: [...saleForm.items, { itemName: '', quantity: 1, unitPrice: 0, discount: 0 }]
    });
  };

  // Handle removing item
  const handleRemoveItem = (index) => {
    setSaleForm({
      ...saleForm,
      items: saleForm.items.filter((_, i) => i !== index)
    });
  };

  // Handle item change
  const handleItemChange = (index, field, value) => {
    const newItems = [...saleForm.items];
    newItems[index][field] = value;
    setSaleForm({ ...saleForm, items: newItems });
  };

  // Calculate totals
  const calculateTotals = () => {
    let total = 0;
    let discount = 0;
    saleForm.items.forEach(item => {
      const itemTotal = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
      const itemDiscount = itemTotal * ((Number(item.discount) || 0) / 100);
      total += itemTotal;
      discount += itemDiscount;
    });
    return { total, discount, finalAmount: total - discount };
  };

  const totals = calculateTotals();

  // Handle form submission
  const handleSaveSale = async (e) => {
    e.preventDefault();

    if (!saleForm.customerName || !saleForm.items.length) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (saleForm.items.some(item => !item.itemName || !item.quantity || !item.unitPrice)) {
      toast.error('Please fill in all item details');
      return;
    }

    try {
      const saleData = {
        ...saleForm,
        saleDate: new Date(saleForm.saleDate).toISOString()
      };

      if (saleForm.paymentMethod === 'credit' && saleForm.dueDate) {
        saleData.dueDate = new Date(saleForm.dueDate).toISOString();
      }

      if (editingSale) {
        // When editing a credit sale with initial payment, record it as a payment
        if (saleForm.paymentMethod === 'credit' && saleForm.initialPayment) {
          await salesAPI.update(editingSale._id, saleData);
          
          // Record the initial payment
          await salesAPI.recordPayment(editingSale._id, {
            amount: parseFloat(saleForm.initialPayment),
            paymentDate: new Date(saleForm.saleDate).toISOString(),
            paymentMethod: 'cash',
            notes: 'Initial payment at sale'
          });
          
          toast.success('Sale updated and payment recorded successfully');
        } else {
          await salesAPI.update(editingSale._id, saleData);
          toast.success('Sale updated successfully');
        }
      } else {
        // Creating new sale
        const createResponse = await salesAPI.create(saleData);
        
        // If credit sale with initial payment, record it
        if (saleForm.paymentMethod === 'credit' && saleForm.initialPayment && createResponse.data?.sale?._id) {
          await salesAPI.recordPayment(createResponse.data.sale._id, {
            amount: parseFloat(saleForm.initialPayment),
            paymentDate: new Date(saleForm.saleDate).toISOString(),
            paymentMethod: 'cash',
            notes: 'Initial payment at sale'
          });
          toast.success('Sale created and initial payment recorded successfully');
        } else {
          toast.success('Sale created successfully');
        }
      }

      resetForm();
      setShowSaleModal(false);
      loadSales();
    } catch (error) {
      console.error('Error saving sale:', error);
      toast.error(error.response?.data?.message || 'Failed to save sale');
    }
  };

  // Handle recording payment
  const handleRecordPayment = async (e) => {
    e.preventDefault();

    if (!paymentForm.amount) {
      toast.error('Please enter payment amount');
      return;
    }

    try {
      await salesAPI.recordPayment(selectedSaleForPayment._id, paymentForm);
      toast.success('Payment recorded successfully');
      setShowPaymentModal(false);
      setPaymentForm({
        amount: '',
        paymentDate: new Date().toISOString().split('T')[0],
        paymentMethod: 'cash',
        cardNumber: '',
        bankName: '',
        accountName: '',
        notes: ''
      });
      loadSales();
    } catch (error) {
      console.error('Error recording payment:', error);
      toast.error('Failed to record payment');
    }
  };

  // Handle edit sale
  const handleEditSale = (sale) => {
    setEditingSale(sale);
    setSaleForm({
      clientId: sale.client?._id || sale.client || '',
      customerName: sale.customerName,
      customerEmail: sale.customerEmail,
      customerPhone: sale.customerPhone,
      paymentMethod: sale.paymentMethod,
      saleDate: sale.saleDate ? sale.saleDate.split('T')[0] : new Date().toISOString().split('T')[0],
      dueDate: sale.dueDate ? sale.dueDate.split('T')[0] : '',
      initialPayment: '',
      notes: sale.notes || '',
      items: sale.items || [{ itemName: '', quantity: 1, unitPrice: 0, discount: 0 }]
    });
    setShowSaleModal(true);
  };

  // Handle delete sale
  const handleDeleteSale = async (saleId) => {
    if (!window.confirm('Are you sure you want to delete this sale?')) return;

    try {
      // Implement delete if API supports it
      toast.info('Delete functionality coming soon');
    } catch (error) {
      toast.error('Failed to delete sale');
    }
  };

  // Reset form
  const resetForm = () => {
    setSaleForm({
      clientId: '',
      customerName: '',
      customerEmail: '',
      customerPhone: '',
      paymentMethod: 'cash',
      saleDate: new Date().toISOString().split('T')[0],
      dueDate: '',
      initialPayment: '',
      notes: '',
      items: [{ itemName: '', quantity: 1, unitPrice: 0, discount: 0 }]
    });
    setEditingSale(null);
    setClientSearchTerm('');
  };

  // Filter sales by payment method
  const filteredSales = sales.filter(sale => {
    if (activeTab === 'cash') return sale.paymentMethod === 'cash';
    if (activeTab === 'credit') return sale.paymentMethod === 'credit';
    return true;
  });

  const getSaleStatus = (sale) => {
    if (sale.paymentMethod === 'cash') {
      return <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">Completed</span>;
    }
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
        sale.creditStatus === 'paid' ? 'bg-green-100 text-green-800' :
        sale.creditStatus === 'partial' ? 'bg-yellow-100 text-yellow-800' :
        'bg-red-100 text-red-800'
      }`}>
        {sale.creditStatus === 'paid' ? 'Fully Paid' :
         sale.creditStatus === 'partial' ? 'Partially Paid' :
         'Unpaid'}
      </span>
    );
  };

  const calculateTotalPaid = (sale) => {
    return sale.payments?.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0) || 0;
  };

  const calculateBalance = (sale) => {
    const totalPaid = calculateTotalPaid(sale);
    return Math.max(0, sale.finalAmount - totalPaid);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Sales Management</h1>
          <p className="text-gray-600 mt-1">Track cash and credit sales with detailed payment records</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            resetForm();
            setShowSaleModal(true);
          }}
          className="flex items-center space-x-2 bg-orange-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-orange-600 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>New Sale</span>
        </motion.button>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm p-4 flex gap-4">
        <button
          onClick={() => setActiveTab('cash')}
          className={`px-6 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2 ${
            activeTab === 'cash'
              ? 'bg-orange-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <DollarSign className="w-5 h-5" />
          Cash Sales
        </button>
        <button
          onClick={() => setActiveTab('credit')}
          className={`px-6 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2 ${
            activeTab === 'credit'
              ? 'bg-orange-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <CreditCard className="w-5 h-5" />
          Credit Sales
        </button>
      </div>

      {/* Sales Tables */}
      {filteredSales.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <ShoppingCart className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No {activeTab} sales yet</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating your first sale</p>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-sm overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Customer</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Sale Date</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Items</th>
                  {activeTab === 'credit' && (
                    <>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Due Date</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Status</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Amount</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Paid</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Balance</th>
                    </>
                  )}
                  {activeTab === 'cash' && (
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Amount</th>
                  )}
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredSales.map((sale) => (
                  <tr key={sale._id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => { setSelectedSaleForDetails(sale); setShowDetailsModal(true); }}>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{sale.customerName}</p>
                        <p className="text-sm text-gray-600">{sale.customerEmail}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(sale.saleDate).toLocaleDateString('en-UG')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        {sale.items && sale.items.length > 0 ? (
                          sale.items.map((item, idx) => (
                            <p key={idx} className="text-sm text-gray-700">• {item.itemName}</p>
                          ))
                        ) : (
                          <span className="text-sm text-gray-500">No items</span>
                        )}
                      </div>
                    </td>
                    {activeTab === 'credit' && (
                      <>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {sale.dueDate ? new Date(sale.dueDate).toLocaleDateString('en-UG') : '-'}
                        </td>
                        <td className="px-6 py-4">{getSaleStatus(sale)}</td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {formatCurrency(sale.finalAmount)}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-green-600">
                          {formatCurrency(calculateTotalPaid(sale))}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-orange-600">
                          {formatCurrency(calculateBalance(sale))}
                        </td>
                      </>
                    )}
                    {activeTab === 'cash' && (
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {formatCurrency(sale.finalAmount)}
                      </td>
                    )}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {activeTab === 'credit' && (
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            onClick={(e) => { e.stopPropagation(); setSelectedSaleForPayment(sale); setShowPaymentModal(true); }}
                            className="text-blue-600 hover:text-blue-800 font-semibold text-sm"
                          >
                            Record Payment
                          </motion.button>
                        )}
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          onClick={(e) => { e.stopPropagation(); handleEditSale(sale); }}
                          className="text-green-600 hover:text-green-800"
                        >
                          <Edit className="w-5 h-5" />
                        </motion.button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Sale Modal */}
      {showSaleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="sticky top-0 bg-gradient-to-r from-orange-500 to-orange-600 text-white p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold">
                {editingSale ? 'Edit Sale' : 'Create New Sale'}
              </h2>
              <button onClick={() => { setShowSaleModal(false); resetForm(); }} className="hover:bg-orange-700 p-2 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSale} className="p-6 space-y-6">
              {/* Customer Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Customer *</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search customer by name, email, phone..."
                    value={clientSearchTerm || saleForm.customerName}
                    onChange={(e) => {
                      setClientSearchTerm(e.target.value);
                      setShowClientDropdown(true);
                    }}
                    onFocus={() => setShowClientDropdown(true)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                  {showClientDropdown && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                      {loadingClients ? (
                        <div className="px-4 py-3 text-sm text-gray-500">Loading clients...</div>
                      ) : filteredClients.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-gray-500">
                          {clientSearchTerm.trim() === ''
                            ? 'No clients found. Please add clients first.'
                            : 'No matching clients found'}
                        </div>
                      ) : (
                        filteredClients.map((client) => (
                          <div
                            key={client._id}
                            onClick={() => handleSelectClient(client)}
                            className="px-4 py-3 hover:bg-orange-50 cursor-pointer border-b last:border-b-0"
                          >
                            <p className="font-medium text-gray-900">{client.name}</p>
                            <p className="text-sm text-gray-600">{client.email}</p>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Customer Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={saleForm.customerEmail}
                    onChange={(e) => setSaleForm({ ...saleForm, customerEmail: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Phone</label>
                  <input
                    type="tel"
                    value={saleForm.customerPhone}
                    onChange={(e) => setSaleForm({ ...saleForm, customerPhone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Sale Date *</label>
                  <input
                    type="date"
                    value={saleForm.saleDate}
                    onChange={(e) => setSaleForm({ ...saleForm, saleDate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              {/* Payment Method */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Payment Method *</label>
                  <select
                    value={saleForm.paymentMethod}
                    onChange={(e) => setSaleForm({ ...saleForm, paymentMethod: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    required
                  >
                    <option value="cash">Cash</option>
                    <option value="credit">Credit</option>
                  </select>
                </div>
                {saleForm.paymentMethod === 'credit' && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Due Date</label>
                    <input
                      type="date"
                      value={saleForm.dueDate}
                      onChange={(e) => setSaleForm({ ...saleForm, dueDate: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                )}
              </div>

              {/* Partial Payment for Credit Sales */}
              {saleForm.paymentMethod === 'credit' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Initial Payment Amount (Optional)</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={saleForm.initialPayment || ''}
                    onChange={(e) => setSaleForm({ ...saleForm, initialPayment: e.target.value ? parseFloat(e.target.value) : '' })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    min="0"
                  />
                  <p className="text-xs text-gray-600 mt-1">Leave empty if no initial payment. Balance will be: {formatCurrency(Math.max(0, totals.finalAmount - (parseFloat(saleForm.initialPayment) || 0)))}</p>
                </div>
              )}

              {/* Items */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-4">Items *</label>
                <div className="space-y-3">
                  {saleForm.items.map((item, index) => (
                    <div key={index} className="flex gap-2 items-end">
                      <input
                        type="text"
                        placeholder="Item name"
                        value={item.itemName}
                        onChange={(e) => handleItemChange(index, 'itemName', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                      <input
                        type="number"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                        className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                      <input
                        type="number"
                        placeholder="Price"
                        value={item.unitPrice}
                        onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                        className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                      <input
                        type="number"
                        placeholder="Disc %"
                        value={item.discount}
                        onChange={(e) => handleItemChange(index, 'discount', e.target.value)}
                        className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="text-red-600 hover:text-red-800 p-2"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="mt-3 text-orange-600 hover:text-orange-800 font-semibold text-sm flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" /> Add Item
                </button>
              </div>

              {/* Totals */}
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-semibold">{formatCurrency(totals.total)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Discount:</span>
                  <span className="font-semibold text-red-600">-{formatCurrency(totals.discount)}</span>
                </div>
                <div className="border-t pt-2 flex justify-between">
                  <span className="font-semibold text-gray-900">Total:</span>
                  <span className="font-bold text-lg text-orange-600">{formatCurrency(totals.finalAmount)}</span>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Notes</label>
                <textarea
                  value={saleForm.notes}
                  onChange={(e) => setSaleForm({ ...saleForm, notes: e.target.value })}
                  placeholder="Add any notes about this sale..."
                  rows="3"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-4 pt-4 border-t">
                <button
                  type="submit"
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-lg font-semibold transition-colors"
                >
                  {editingSale ? 'Update Sale' : 'Create Sale'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowSaleModal(false);
                    resetForm();
                  }}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-900 py-3 rounded-lg font-semibold transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Sale Details Modal */}
      {showDetailsModal && selectedSaleForDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="sticky top-0 bg-gradient-to-r from-orange-500 to-orange-600 text-white p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold">Sale Details</h2>
              <button onClick={() => setShowDetailsModal(false)} className="hover:bg-orange-700 p-2 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Customer Info */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-3">Customer Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Name</p>
                    <p className="font-medium text-gray-900">{selectedSaleForDetails.customerName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="font-medium text-gray-900">{selectedSaleForDetails.customerEmail || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Phone</p>
                    <p className="font-medium text-gray-900">{selectedSaleForDetails.customerPhone || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Sale Date</p>
                    <p className="font-medium text-gray-900">{new Date(selectedSaleForDetails.saleDate).toLocaleDateString('en-UG')}</p>
                  </div>
                </div>
              </div>

              {/* Items */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Items Sold</h3>
                <div className="bg-white border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100 border-b">
                      <tr>
                        <th className="px-4 py-2 text-left font-semibold text-gray-700">Item Name</th>
                        <th className="px-4 py-2 text-center font-semibold text-gray-700">Qty</th>
                        <th className="px-4 py-2 text-right font-semibold text-gray-700">Unit Price</th>
                        <th className="px-4 py-2 text-right font-semibold text-gray-700">Discount</th>
                        <th className="px-4 py-2 text-right font-semibold text-gray-700">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {selectedSaleForDetails.items && selectedSaleForDetails.items.length > 0 ? (
                        selectedSaleForDetails.items.map((item, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-gray-900 font-medium">{item.itemName}</td>
                            <td className="px-4 py-3 text-center text-gray-600">{item.quantity}</td>
                            <td className="px-4 py-3 text-right text-gray-600">{formatCurrency(item.unitPrice)}</td>
                            <td className="px-4 py-3 text-right">
                              <span className="text-orange-600 font-medium">{item.discount || 0}%</span>
                            </td>
                            <td className="px-4 py-3 text-right font-semibold text-gray-900">
                              {formatCurrency(item.totalPrice || (item.quantity * item.unitPrice * (1 - (item.discount || 0) / 100)))}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="5" className="px-4 py-3 text-center text-gray-500">No items found</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals */}
              <div className="space-y-2 bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-semibold">{formatCurrency(selectedSaleForDetails.totalAmount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Discount:</span>
                  <span className="font-semibold text-red-600">-{formatCurrency(selectedSaleForDetails.discountAmount)}</span>
                </div>
                <div className="border-t pt-2 flex justify-between">
                  <span className="font-semibold text-gray-900">Total:</span>
                  <span className="font-bold text-lg text-orange-600">{formatCurrency(selectedSaleForDetails.finalAmount)}</span>
                </div>
              </div>

              {/* Payment Info (Credit Sales) */}
              {selectedSaleForDetails.paymentMethod === 'credit' && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-3">Payment Information</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                    <div>
                      <p className="text-gray-600">Status</p>
                      <p className="font-semibold text-blue-600">
                        {selectedSaleForDetails.creditStatus === 'paid' ? 'Fully Paid' :
                         selectedSaleForDetails.creditStatus === 'partial' ? 'Partially Paid' :
                         'Unpaid'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Due Date</p>
                      <p className="font-semibold text-gray-900">
                        {selectedSaleForDetails.dueDate ? new Date(selectedSaleForDetails.dueDate).toLocaleDateString('en-UG') : '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Amount Paid</p>
                      <p className="font-semibold text-green-600">{formatCurrency(calculateTotalPaid(selectedSaleForDetails))}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Balance</p>
                      <p className="font-semibold text-orange-600">{formatCurrency(calculateBalance(selectedSaleForDetails))}</p>
                    </div>
                  </div>
                  {selectedSaleForDetails.payments && selectedSaleForDetails.payments.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm font-semibold text-gray-900 mb-2">Payment History</p>
                      <div className="space-y-2">
                        {selectedSaleForDetails.payments.map((payment, idx) => (
                          <div key={idx} className="bg-white p-2 rounded text-xs">
                            <div className="flex justify-between">
                              <span className="font-medium">{formatCurrency(payment.amount)}</span>
                              <span className="text-gray-600">{new Date(payment.paymentDate).toLocaleDateString('en-UG')}</span>
                            </div>
                            <div className="text-gray-600 capitalize">{payment.paymentMethod.replace('_', ' ')}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-4 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowDetailsModal(false)}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-900 py-3 rounded-lg font-semibold transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Payment Recording Modal */}
      {showPaymentModal && selectedSaleForPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl max-w-md w-full"
          >
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold">Record Payment</h2>
              <button onClick={() => setShowPaymentModal(false)} className="hover:bg-orange-700 p-2 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Sale Summary */}
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <p className="text-sm text-gray-600">Customer: <span className="font-semibold text-gray-900">{selectedSaleForPayment.customerName}</span></p>
                <p className="text-sm text-gray-600">Total Amount: <span className="font-semibold text-gray-900">{formatCurrency(selectedSaleForPayment.finalAmount)}</span></p>
                <p className="text-sm text-gray-600">Already Paid: <span className="font-semibold text-green-600">{formatCurrency(calculateTotalPaid(selectedSaleForPayment))}</span></p>
                <p className="text-sm text-gray-600">Balance: <span className="font-semibold text-orange-600">{formatCurrency(calculateBalance(selectedSaleForPayment))}</span></p>
              </div>

              <form onSubmit={handleRecordPayment} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Payment Amount *</label>
                  <input
                    type="number"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                    placeholder="0"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Payment Date *</label>
                  <input
                    type="date"
                    value={paymentForm.paymentDate}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Payment Method *</label>
                  <select
                    value={paymentForm.paymentMethod}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                  </select>
                </div>

                {paymentForm.paymentMethod === 'bank_transfer' && (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Bank Name</label>
                      <input
                        type="text"
                        value={paymentForm.bankName}
                        onChange={(e) => setPaymentForm({ ...paymentForm, bankName: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Account Name</label>
                      <input
                        type="text"
                        value={paymentForm.accountName}
                        onChange={(e) => setPaymentForm({ ...paymentForm, accountName: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={paymentForm.notes}
                    onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                    placeholder="Add notes about this payment..."
                    rows="2"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="flex gap-4 pt-4 border-t">
                  <button
                    type="submit"
                    className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-lg font-semibold transition-colors"
                  >
                    Record Payment
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPaymentModal(false)}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-900 py-2 rounded-lg font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default SalesManagement;
