import { useEffect, useMemo, useState } from 'react';
import {
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import api from '../lib/api.js';

function toDateKey(dateValue) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString().slice(0, 10);
}

function getLastDays(days) {
  const labels = [];
  const today = new Date();

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const point = new Date(today);
    point.setDate(today.getDate() - offset);
    labels.push(point.toISOString().slice(0, 10));
  }

  return labels;
}

function formatDateLabel(dateKey) {
  const date = new Date(dateKey);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function AdminReports() {
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadReports() {
      try {
        const response = await api.get('/visitors/admin/logs');
        if (active) {
          setLogs(response.visitors || []);
        }
      } catch (loadError) {
        if (active) {
          setError(loadError.message);
        }
      }
    }

    loadReports();

    return () => {
      active = false;
    };
  }, []);

  const dailySeries = useMemo(() => {
    const lastSevenDays = getLastDays(7);
    const countMap = Object.fromEntries(lastSevenDays.map((day) => [day, 0]));

    logs.forEach((log) => {
      const key = toDateKey(log.createdAt);
      if (key && countMap[key] !== undefined) {
        countMap[key] += 1;
      }
    });

    return lastSevenDays.map((day) => ({
      label: formatDateLabel(day),
      value: countMap[day],
    }));
  }, [logs]);

  const statusDistribution = useMemo(() => {
    const counts = { approved: 0, pending: 0, rejected: 0 };
    logs.forEach((log) => {
      if (counts[log.status] !== undefined) {
        counts[log.status] += 1;
      }
    });

    return [
      { name: 'Approved', value: counts.approved, color: '#10b981' },
      { name: 'Pending', value: counts.pending, color: '#f59e0b' },
      { name: 'Rejected', value: counts.rejected, color: '#ef4444' },
    ];
  }, [logs]);

  return (
    <section className="panel-card span-two">
      <div className="panel-header">
        <div>
          <span className="eyebrow">Analytics</span>
          <h4>Visitors per day and status distribution</h4>
        </div>
      </div>

      {error ? <div className="error-banner">{error}</div> : null}

      <div className="report-grid">
        <article className="chart-card">
          <h5>Visitors Per Day</h5>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={dailySeries}>
                <XAxis dataKey="label" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="value" name="Visitors" stroke="#10b981" strokeWidth={3} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="chart-card">
          <h5>Status Distribution</h5>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={statusDistribution} dataKey="value" nameKey="name" outerRadius={90} label>
                  {statusDistribution.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </article>
      </div>

    </section>
  );
}

export default AdminReports;
