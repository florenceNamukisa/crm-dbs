import React, { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { salesAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const SalesPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [totalSales, setTotalSales] = useState(0);
  const [monthly, setMonthly] = useState([]);
  const [topDeals, setTopDeals] = useState([]);

  useEffect(() => {
    loadSales();
  }, [user]);

  const loadSales = async () => {
    try {
      setLoading(true);
      const params = {};
      // if user is an agent, request agent-specific sales
      if (user && (user.role === 'agent' || user.role === 'sales')) {
        params.agent = user._id || user.id;
      }
      const res = await salesAPI.getStats(params);
      const data = res?.data || {};
      setTotalSales(data.totalSales || 0);

      // backend returns monthly as [{month: 1, total: x}, ...]
      const months = (data.monthly && Array.isArray(data.monthly)) ? data.monthly : [];
      const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const chartData = monthNames.map((m, idx) => {
        const found = months.find(x => Number(x.month) === idx + 1);
        return { month: m, sales: found ? (found.total || 0) : 0 };
      });
      setMonthly(chartData);

      setTopDeals(Array.isArray(data.topDeals) ? data.topDeals : []);
    } catch (err) {
      console.error('Failed to load sales', err);
      toast.error('Failed to load sales data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sales</h1>
          <p className="text-sm text-gray-600">Total sales and monthly breakdown</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <p className="text-sm text-gray-600">Total Sales</p>
          <p className="text-3xl font-bold mt-2">UGX {Number(totalSales || 0).toLocaleString('en-UG')}</p>
          <p className="text-sm text-gray-500 mt-2">{loading ? 'Refreshing...' : 'Updated from database'}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold mb-4">Monthly Sales</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => `UGX ${Number(value).toLocaleString('en-UG')}`} />
              <Line type="monotone" dataKey="sales" stroke="#ff8c00" strokeWidth={3} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4">Top Deals</h3>
        {topDeals.length === 0 ? (
          <p className="text-sm text-gray-500">No top deals available</p>
        ) : (
          <div className="space-y-3">
            {topDeals.map((d) => (
              <div key={d._id || d.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-md">
                <div>
                  <p className="font-medium">{d.title || (d.client && d.client.name) || 'Deal'}</p>
                  <p className="text-sm text-gray-500">Client: {d.client?.name || '—'} • Agent: {d.agent?.name || '—'}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">UGX {Number(d.value || 0).toLocaleString('en-UG')}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SalesPage;
