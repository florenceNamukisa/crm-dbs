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
  CheckCircle,
  CreditCard
} from 'lucide-react';

const Sales = () => {
  const { user } = useAuth();
  const [sales, setSales] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [loadingClients, setLoadingClients] = useState(false);
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [filteredClients, setFilteredClients] = useState([]);

  // Sale form state
  const [saleForm, setSaleForm] = useState({
    clientId: '',
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    paymentMethod: 'cash',
    notes: '',
    items: [{ itemName: '', quantity: 1, unitPrice: 0, discount: 0 }]
  });

  // Format currency
  const formatCurrency = (amount) => {
    return `UGX ${Number(amount || 0).toLocaleString('en-UG', { maximumFractionDigits: 0 })}`;
  };

  // Load sales from database
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

  // Load clients from database
  const loadClients = async () => {
    try {
      setLoadingClients(true);
      const response = await clientsAPI.getAll({ limit: 200 });
      const fetchedClients = response.data?.clients || response.data || [];
      setClients(fetchedClients);
      setFilteredClients(fetchedClients);
    } catch (error) {
      console.error('Error loading clients:', error);
      toast.error('Failed to load clients');
      setClients([]);
      setFilteredClients([]);
    } finally {
      setLoadingClients(false);
    }
  };

  useEffect(() => {
    loadSales();
  }, []);

  // Load clients when modal opens
  useEffect(() => {
    if (showModal) {
      loadClients();
    }
  }, [showModal]);

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
  const handleClientSelect = (client) => {
    setSaleForm({
      ...saleForm,
      clientId: client._id,
      customerName: client.name,
      customerEmail: client.email || '',
      customerPhone: client.phone || ''
    });
    setClientSearchTerm(client.name);
    setShowClientDropdown(false);
  };

  // Handle client search change
  const handleClientSearchChange = (value) => {
    setClientSearchTerm(value);
    setShowClientDropdown(true);
    // Clear selection if search doesn't match
    if (value !== saleForm.customerName) {
      setSaleForm({
        ...saleForm,
        clientId: '',
        customerName: '',
        customerEmail: '',
        customerPhone: ''
      });
    }
  };

  // Clear client selection
  const clearClientSelection = () => {
    setSaleForm({
      ...saleForm,
      clientId: '',
      customerName: '',
      customerEmail: '',
      customerPhone: ''
    });
    setClientSearchTerm('');
    setShowClientDropdown(false);
  };

  // Handle item changes
  const handleItemChange = (index, field, value) => {
    const updatedItems = [...saleForm.items];
    if (field === 'itemName') {
      updatedItems[index][field] = value;
    } else {
      // Allow empty string during typing, validate on blur
      if (value === '' || value === null || value === undefined) {
        updatedItems[index][field] = '';
      } else {
        const numValue = Number(value);
        if (!isNaN(numValue)) {
          updatedItems[index][field] = numValue;
        }
      }
    }
    setSaleForm({ ...saleForm, items: updatedItems });
  };

  // Handle blur to validate and set defaults
  const handleItemBlur = (index, field) => {
    const updatedItems = [...saleForm.items];
    const item = updatedItems[index];
    
    if (field === 'quantity') {
      if (item.quantity === '' || item.quantity === null || item.quantity === undefined || item.quantity < 1) {
        updatedItems[index][field] = 1;
      }
    } else if (field === 'unitPrice') {
      if (item.unitPrice === '' || item.unitPrice === null || item.unitPrice === undefined || item.unitPrice < 0) {
        updatedItems[index][field] = 0;
      }
    } else if (field === 'discount') {
      if (item.discount === '' || item.discount === null || item.discount === undefined || item.discount < 0) {
        updatedItems[index][field] = 0;
      } else if (item.discount > 100) {
        updatedItems[index][field] = 100;
      }
    }
    
    setSaleForm({ ...saleForm, items: updatedItems });
  };

  // Add item
  const addItem = () => {
    setSaleForm({
      ...saleForm,
      items: [...saleForm.items, { itemName: '', quantity: 1, unitPrice: 0, discount: 0 }]
    });
  };

  // Remove item
  const removeItem = (index) => {
    if (saleForm.items.length > 1) {
      const updatedItems = saleForm.items.filter((_, i) => i !== index);
      setSaleForm({ ...saleForm, items: updatedItems });
    }
  };

  // Calculate item total
  const calculateItemTotal = (item) => {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unitPrice) || 0;
    const itemTotal = qty * price;
    const discount = itemTotal * ((Number(item.discount) || 0) / 100);
    return itemTotal - discount;
  };

  // Calculate grand total
  const calculateGrandTotal = () => {
    return saleForm.items.reduce((sum, item) => sum + calculateItemTotal(item), 0);
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!saleForm.clientId || !saleForm.customerName.trim()) {
      toast.error('Please select a client from the database');
      return;
    }

    const validItems = saleForm.items.filter(item => item.itemName.trim() !== '');
    if (validItems.length === 0) {
      toast.error('Please add at least one item');
      return;
    }

    // Validate items
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
      // Prepare sale data - ensure all numeric fields are valid
      const saleData = {
        customerName: saleForm.customerName,
        customerEmail: saleForm.customerEmail || undefined,
        customerPhone: saleForm.customerPhone || undefined,
        client: saleForm.clientId,
        items: validItems.map(item => ({
          itemName: item.itemName.trim(),
          quantity: Number(item.quantity) || 1,
          unitPrice: Number(item.unitPrice) || 0,
          discount: Number(item.discount) || 0
        })),
        paymentMethod: saleForm.paymentMethod,
        notes: saleForm.notes.trim() || undefined
      };

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/f41aa935-3855-4b65-91af-b127905fefef',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Sales.js:231',message:'Preparing sale data',data:{saleData,clientId:saleForm.clientId,itemCount:validItems.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion

      console.log('Creating sale with data:', saleData);

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/f41aa935-3855-4b65-91af-b127905fefef',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Sales.js:234',message:'Calling salesAPI.create',data:{hasClientId:!!saleData.client,itemCount:saleData.items.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion

      const response = await salesAPI.create(saleData);
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/f41aa935-3855-4b65-91af-b127905fefef',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Sales.js:238',message:'Sale created successfully',data:{saleId:response?.data?.sale?._id,status:response?.status},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion

      console.log('Sale created successfully:', response.data);

      toast.success('Sale created successfully!');

      // Reset form
      setSaleForm({
        clientId: '',
        customerName: '',
        customerEmail: '',
        customerPhone: '',
        paymentMethod: 'cash',
        notes: '',
        items: [{ itemName: '', quantity: 1, unitPrice: 0, discount: 0 }]
      });
      setClientSearchTerm('');
      setShowClientDropdown(false);
      setShowModal(false);

      // Reload sales
      loadSales();
    } catch (error) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/f41aa935-3855-4b65-91af-b127905fefef',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Sales.js:255',message:'Error creating sale',data:{errorMessage:error.message,status:error.response?.status,errorData:error.response?.data,hasClientId:!!saleForm.clientId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      console.error('Error creating sale:', error);
      const errorMsg = error.response?.data?.message || error.message || 'Failed to create sale';
      toast.error(errorMsg);
    }
  };

  // Reset form when modal closes
  const handleModalClose = () => {
    setShowModal(false);
    setSaleForm({
      clientId: '',
      customerName: '',
      customerEmail: '',
      customerPhone: '',
      paymentMethod: 'cash',
      notes: '',
      items: [{ itemName: '', quantity: 1, unitPrice: 0, discount: 0 }]
    });
    setClientSearchTerm('');
    setShowClientDropdown(false);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Sales Management</h1>
          <p className="text-gray-600 mt-1">Record and manage your sales transactions</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 font-medium transition-colors"
        >
          <Plus size={20} />
          New Sale
        </button>
      </div>

      {/* Sales List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Recent Sales</h2>
        </div>
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
            <p className="mt-2 text-gray-600">Loading sales...</p>
          </div>
        ) : sales.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingCart className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No sales yet</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating your first sale</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Items
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment Method
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sales.map((sale) => (
                  <tr key={sale._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{sale.customerName}</div>
                      {sale.customerEmail && (
                        <div className="text-sm text-gray-500">{sale.customerEmail}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {sale.items?.length || 0} item(s)
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      {formatCurrency(sale.finalAmount || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          sale.paymentMethod === 'cash'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-orange-100 text-orange-800'
                        }`}
                      >
                        {sale.paymentMethod === 'cash' ? (
                          <CheckCircle className="w-3 h-3 mr-1" />
                        ) : (
                          <CreditCard className="w-3 h-3 mr-1" />
                        )}
                        {sale.paymentMethod}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {sale.saleDate
                        ? new Date(sale.saleDate).toLocaleDateString('en-UG', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })
                        : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Sale Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-center z-10">
              <h2 className="text-2xl font-bold text-gray-900">Create New Sale</h2>
              <button
                onClick={handleModalClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Client Selection */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Select Client from Database *
                </label>
                <div className="relative">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      value={clientSearchTerm}
                      onChange={(e) => handleClientSearchChange(e.target.value)}
                      onFocus={() => setShowClientDropdown(true)}
                      placeholder="Search clients by name, email, phone, or company..."
                      className={`w-full pl-10 pr-10 py-2.5 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                        saleForm.clientId ? 'border-green-300 bg-green-50' : 'border-gray-300'
                      }`}
                      required
                    />
                    {saleForm.clientId && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      </div>
                    )}
                    {clientSearchTerm && !saleForm.clientId && (
                      <button
                        type="button"
                        onClick={clearClientSelection}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <X size={18} />
                      </button>
                    )}
                  </div>

                  {/* Client Dropdown */}
                  {showClientDropdown && (
                    <>
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                        {loadingClients ? (
                          <div className="px-4 py-3 text-sm text-gray-500 flex items-center">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-500 mr-3"></div>
                            Loading clients...
                          </div>
                        ) : filteredClients.length === 0 ? (
                          <div className="px-4 py-3 text-sm text-gray-500">
                            {clientSearchTerm.trim() === ''
                              ? 'No clients found in database. Please add clients first.'
                              : 'No clients found matching your search'}
                          </div>
                        ) : (
                          <div className="py-1">
                            {filteredClients.map((client) => (
                              <div
                                key={client._id}
                                onClick={() => handleClientSelect(client)}
                                className="px-4 py-3 hover:bg-orange-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <div className="font-medium text-gray-900">{client.name}</div>
                                    <div className="text-sm text-gray-600 flex items-center space-x-4 mt-1">
                                      {client.email && <span>{client.email}</span>}
                                      {client.phone && <span>{client.phone}</span>}
                                    </div>
                                    {client.company && (
                                      <div className="text-sm text-gray-500 mt-1">{client.company}</div>
                                    )}
                                  </div>
                                  <span
                                    className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                      client.status === 'active'
                                        ? 'bg-green-100 text-green-800'
                                        : client.status === 'vip'
                                        ? 'bg-purple-100 text-purple-800'
                                        : 'bg-gray-100 text-gray-800'
                                    }`}
                                  >
                                    {client.status || 'prospect'}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      {/* Click outside to close */}
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowClientDropdown(false)}
                      />
                    </>
                  )}
                </div>

                {/* Selected Client Info */}
                {saleForm.clientId && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-green-900">Selected Client</p>
                        <div className="mt-1 text-sm text-green-700">
                          <p><strong>Name:</strong> {saleForm.customerName}</p>
                          {saleForm.customerEmail && (
                            <p><strong>Email:</strong> {saleForm.customerEmail}</p>
                          )}
                          {saleForm.customerPhone && (
                            <p><strong>Phone:</strong> {saleForm.customerPhone}</p>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={clearClientSelection}
                        className="text-green-600 hover:text-green-800"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Items Section */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900">Items</h3>
                  <button
                    type="button"
                    onClick={addItem}
                    className="text-orange-600 hover:text-orange-700 text-sm font-medium flex items-center gap-1"
                  >
                    <Plus size={16} />
                    Add Item
                  </button>
                </div>

                <div className="space-y-3">
                  {saleForm.items.map((item, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-12 gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <div className="col-span-5">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Item Name *
                        </label>
                        <input
                          type="text"
                          value={item.itemName}
                          onChange={(e) => handleItemChange(index, 'itemName', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                          placeholder="Enter item name"
                          required
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Quantity *
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity === '' ? '' : item.quantity}
                          onChange={(e) => {
                            const val = e.target.value;
                            handleItemChange(index, 'quantity', val === '' ? '' : (parseInt(val) || ''));
                          }}
                          onBlur={() => handleItemBlur(index, 'quantity')}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 text-sm"
                          required
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Unit Price (UGX) *
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="100"
                          value={item.unitPrice === '' ? '' : item.unitPrice}
                          onChange={(e) => {
                            const val = e.target.value;
                            // Allow typing, but prevent negative values
                            if (val === '' || val === '-') {
                              handleItemChange(index, 'unitPrice', val);
                            } else {
                              const numVal = parseFloat(val);
                              if (!isNaN(numVal) && numVal >= 0) {
                                handleItemChange(index, 'unitPrice', numVal);
                              }
                            }
                          }}
                          onBlur={() => handleItemBlur(index, 'unitPrice')}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 text-sm"
                          required
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Discount (%)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={item.discount === '' ? '' : item.discount}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '' || val === '-') {
                              handleItemChange(index, 'discount', val);
                            } else {
                              const numVal = parseFloat(val);
                              if (!isNaN(numVal) && numVal >= 0 && numVal <= 100) {
                                handleItemChange(index, 'discount', numVal);
                              }
                            }
                          }}
                          onBlur={() => handleItemBlur(index, 'discount')}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 text-sm"
                        />
                      </div>
                      <div className="col-span-1 flex items-end">
                        {saleForm.items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="text-red-600 hover:text-red-800 p-2"
                          >
                            <X size={18} />
                          </button>
                        )}
                      </div>
                      <div className="col-span-12 mt-2">
                        <div className="text-sm text-gray-600">
                          <strong>Item Total:</strong>{' '}
                          {formatCurrency(calculateItemTotal(item))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment Method */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Method *
                  </label>
                  <select
                    value={saleForm.paymentMethod}
                    onChange={(e) => setSaleForm({ ...saleForm, paymentMethod: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    required
                  >
                    <option value="cash">Cash</option>
                    <option value="credit">Credit</option>
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={saleForm.notes}
                  onChange={(e) => setSaleForm({ ...saleForm, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="Any additional notes about this sale..."
                />
              </div>

              {/* Grand Total */}
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold text-gray-900">Grand Total:</span>
                  <span className="text-2xl font-bold text-orange-600">
                    {formatCurrency(calculateGrandTotal())}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleModalClose}
                  className="px-6 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium transition-colors"
                >
                  Create Sale
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




