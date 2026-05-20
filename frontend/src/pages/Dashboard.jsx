import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRightCircle,
  BadgeCheck,
  CheckCircle2,
  Clock3,
  Eye,
  Trash2,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../lib/api.js';
import { useLocation } from 'react-router-dom';

const initialStats = {
  total: 0,
  pending: 0,
  approved: 0,
  rejected: 0,
  checkedIn: 0,
  checkedOut: 0,
};

const pageSize = 8;

function Dashboard() {
  const { user } = useAuth();
  const location = useLocation();
  const [stats, setStats] = useState(initialStats);
  const [recentVisitors, setRecentVisitors] = useState([]);
  const [securityVisitors, setSecurityVisitors] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [residents, setResidents] = useState([]);
  const [logs, setLogs] = useState([]);
  const [filters, setFilters] = useState({ status: '', resident: '', from: '', to: '' });
  const [timestampDrafts, setTimestampDrafts] = useState({});
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedVisitor, setSelectedVisitor] = useState(null);

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      const requests = [api.get('/visitors/stats'), api.get('/visitors/recent')];

      if (user?.role === 'security') {
        requests.push(api.get('/visitors'));
      }

      if (user?.role === 'user') {
        requests.push(api.get('/visitors'));
      }

      if (user?.role === 'admin') {
        requests.push(api.get('/visitors/admin/logs'));
        requests.push(api.get('/users/residents'));
      }

      const results = await Promise.all(requests);

      if (!active) {
        return;
      }

      setStats(results[0].stats);
      setRecentVisitors(results[1].visitors);

      if (user?.role === 'security') {
        setSecurityVisitors(results[2].visitors);
      }

      if (user?.role === 'user') {
        setPendingRequests(results[2].visitors);
      }

      if (user?.role === 'admin') {
        setLogs(results[2].visitors);
        setResidents(results[3].residents);
      }
    }

    loadDashboard().catch((loadError) => {
      if (active) {
        setError(loadError.message);
      }
    });

    return () => {
      active = false;
    };
  }, [user?.role]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters.status, filters.resident, filters.from, filters.to, searchQuery]);

  function updateFilterField(event) {
    setFilters((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  function updateTimestampDraft(visitorId, field, value) {
    setTimestampDrafts((current) => ({
      ...current,
      [visitorId]: {
        ...current[visitorId],
        [field]: value,
      },
    }));
  }

  async function refreshSecurityVisitors() {
    const response = await api.get('/visitors');
    setSecurityVisitors(response.visitors);
    const statsResponse = await api.get('/visitors/stats');
    setStats(statsResponse.stats);
  }

  async function respondToRequest(id, status) {
    setError('');
    setMessage('');

    try {
      await api.put(`/visitors/respond/${id}`, { status });
      setMessage(`Request ${status}.`);
      await refreshSecurityVisitors();
    } catch (actionError) {
      setError(actionError.message);
    }
  }

  async function checkIn(id, checkedInAt) {
    setError('');
    setMessage('');

    try {
      const payload = checkedInAt ? { checkedInAt } : {};
      await api.put(`/visitors/checkin/${id}`, payload);
      setMessage('Visitor checked in.');
      await refreshSecurityVisitors();
    } catch (actionError) {
      setError(actionError.message);
    }
  }

  async function checkOut(id, checkedOutAt) {
    setError('');
    setMessage('');

    try {
      const payload = checkedOutAt ? { checkedOutAt } : {};
      await api.put(`/visitors/checkout/${id}`, payload);
      setMessage('Visitor checked out.');
      await refreshSecurityVisitors();
    } catch (actionError) {
      setError(actionError.message);
    }
  }

  async function refreshAdminData() {
    const [logsResponse, statsResponse] = await Promise.all([
      api.get('/visitors/admin/logs'),
      api.get('/visitors/stats'),
    ]);
    setStats(statsResponse.stats);
  }

  async function deleteVisitorLog(id) {
    setError('');
    setMessage('');

    try {
      await api.delete(`/visitors/admin/logs/${id}`);
      setMessage('Visitor log deleted successfully.');
      await refreshAdminData();
    } catch (deleteError) {
      setError(deleteError.message);
    }
  }

  const filteredLogs = useMemo(() => {
    return logs.filter((entry) => {
      const statusMatches = !filters.status || entry.status === filters.status;
      const residentMatches = !filters.resident || entry.visitTo?._id === filters.resident;
      const fromMatches = !filters.from || new Date(entry.createdAt) >= new Date(filters.from);
      const toMatches = !filters.to || new Date(entry.createdAt) <= new Date(filters.to);
      const query = searchQuery.trim().toLowerCase();
      const searchMatches =
        !query ||
        entry.visitorName?.toLowerCase().includes(query) ||
        entry.phone?.toLowerCase().includes(query) ||
        entry.purpose?.toLowerCase().includes(query) ||
        entry.visitTo?.name?.toLowerCase().includes(query);

      return statusMatches && residentMatches && fromMatches && toMatches && searchMatches;
    });
  }, [filters, logs, searchQuery]);

  const today = new Date().toDateString();
  const securityTodayVisitors = securityVisitors.filter((visitor) => new Date(visitor.createdAt).toDateString() === today);
  const securityTodayPendingVisitors = securityTodayVisitors.filter((visitor) => visitor.status === 'pending');
  const securityTodayApprovedVisitors = securityTodayVisitors.filter((visitor) => visitor.status === 'approved');
  const securityTodayRejectedVisitors = securityTodayVisitors.filter((visitor) => visitor.status === 'rejected');

  const securityCards = [
    { label: 'Today Requests', value: securityTodayVisitors.length, icon: ShieldCheck },
    { label: 'Pending review', value: securityTodayPendingVisitors.length, icon: Clock3 },
    { label: 'Approved', value: securityTodayApprovedVisitors.length, icon: BadgeCheck },
    { label: 'Rejected', value: securityTodayRejectedVisitors.length, icon: XCircle },
  ];

  const adminTodayVisitors = filteredLogs.filter((visitor) => new Date(visitor.createdAt).toDateString() === today).length;
  const currentlyInside = filteredLogs.filter((visitor) => visitor.checkedInAt && !visitor.checkedOutAt).length;

  const adminCards = [
    { label: 'Total Visitors Today', value: adminTodayVisitors, icon: ShieldCheck },
    { label: 'Pending Requests', value: stats.pending, icon: Clock3 },
    { label: 'Approved Entries', value: stats.approved, icon: BadgeCheck },
    { label: 'Rejected Requests', value: stats.rejected, icon: XCircle },
    { label: 'Currently Inside', value: currentlyInside, icon: ArrowRightCircle },
  ];

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / pageSize));
  const paginatedLogs = filteredLogs.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const pendingVisitors = securityVisitors.filter((v) => v.status === 'pending');
  const approvedVisitors = securityVisitors.filter((v) => v.status === 'approved');
  const rejectedVisitors = securityVisitors.filter((v) => v.status === 'rejected');

  const generalCards = [
    { label: 'Total Visitors', value: stats.total, icon: ShieldCheck },
    { label: 'Pending Requests', value: stats.pending, icon: Clock3 },
    { label: 'Approved', value: stats.approved, icon: BadgeCheck },
    { label: 'Rejected', value: stats.rejected, icon: XCircle },
  ];

  if (user?.role === 'security') {
    return (
      <>
        <section className="hero-card">
          <div>
            <span className="eyebrow">Security Guard Panel</span>
            <h3>Create requests, notify residents, and manage check-ins.</h3>
            <p>The guard records the visitor and sends a pending request to the selected resident.</p>
          </div>
          <div className="hero-meter">
            <strong>{securityTodayPendingVisitors.length}</strong>
            <span>Requests today</span>
          </div>
        </section>

        <section className="stats-grid">
          {securityCards.map((card) => {
            const Icon = card.icon;
            return (
              <article className="stat-card" key={card.label}>
                <span className="stat-icon"><Icon size={16} /></span>
                <span>{card.label}</span>
                <strong>{card.value}</strong>
              </article>
            );
          })}
        </section>

        <section className="panel-card span-two">
          <div className="panel-header">
            <div>
              <span className="eyebrow">Request Queue</span>
              <h4>Today's visitor requests</h4>
            </div>
          </div>

          <div className="tabs-header">
            <button
              type="button"
              className={`tab-button ${activeTab === 'pending' ? 'active' : ''}`}
              onClick={() => setActiveTab('pending')}
            >
              <Clock3 size={16} /> Pending ({securityTodayPendingVisitors.length})
            </button>
            <button
              type="button"
              className={`tab-button ${activeTab === 'approved' ? 'active' : ''}`}
              onClick={() => setActiveTab('approved')}
            >
              <CheckCircle2 size={16} /> Approved ({securityTodayApprovedVisitors.length})
            </button>
            <button
              type="button"
              className={`tab-button ${activeTab === 'rejected' ? 'active' : ''}`}
              onClick={() => setActiveTab('rejected')}
            >
              <XCircle size={16} /> Rejected ({securityTodayRejectedVisitors.length})
            </button>
          </div>

          <div className="request-list">
            {activeTab === 'pending' && (
              <>
                {securityTodayPendingVisitors.length ? (
                  securityTodayPendingVisitors.map((visitor) => (
                    <div key={visitor._id} className="request-card">
                      <div className="card-header">
                        <div>
                          <strong>{visitor.visitorName}</strong>
                          <p>{visitor.purpose} · {visitor.phone}</p>
                          <p>{visitor.visitTo?.name} {visitor.visitTo?.flatNumber ? `- Flat ${visitor.visitTo.flatNumber}` : ''}</p>
                        </div>
                        <span className="status-chip pending">Pending</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="empty-state">No pending requests today</p>
                )}
              </>
            )}

            {activeTab === 'approved' && (
              <>
                {securityTodayApprovedVisitors.length ? (
                  securityTodayApprovedVisitors.map((visitor) => (
                    <div key={visitor._id} className="request-card">
                      <div className="card-header">
                        <div>
                          <strong>{visitor.visitorName}</strong>
                          <p>{visitor.purpose} · {visitor.phone}</p>
                          <p>{visitor.visitTo?.name} {visitor.visitTo?.flatNumber ? `- Flat ${visitor.visitTo.flatNumber}` : ''}</p>
                        </div>
                        <span className="status-chip approved">Approved</span>
                      </div>

                      <div className="visitor-details">
                        <div className="detail-row">
                          <strong>Checked in:</strong> {visitor.checkedInAt ? new Date(visitor.checkedInAt).toLocaleString() : 'Not checked in'}
                        </div>
                        <div className="detail-row">
                          <strong>Checked out:</strong> {visitor.checkedOutAt ? new Date(visitor.checkedOutAt).toLocaleString() : 'Not checked out'}
                        </div>
                      </div>

                      <div className="timestamp-editor">
                        <label>
                          Check-in time
                          <input
                            type="datetime-local"
                            value={timestampDrafts[visitor._id]?.checkedInAt || ''}
                            onChange={(event) => updateTimestampDraft(visitor._id, 'checkedInAt', event.target.value)}
                          />
                        </label>
                        <label>
                          Check-out time
                          <input
                            type="datetime-local"
                            value={timestampDrafts[visitor._id]?.checkedOutAt || ''}
                            onChange={(event) => updateTimestampDraft(visitor._id, 'checkedOutAt', event.target.value)}
                          />
                        </label>
                      </div>

                      <div className="row-actions">
                        <button
                          type="button"
                          className="ghost-button"
                          onClick={() => checkIn(visitor._id, timestampDrafts[visitor._id]?.checkedInAt)}
                          disabled={visitor.checkedInAt}
                        >
                          Save check in
                        </button>
                        <button
                          type="button"
                          className="ghost-button"
                          onClick={() => checkOut(visitor._id, timestampDrafts[visitor._id]?.checkedOutAt)}
                          disabled={visitor.checkedOutAt}
                        >
                          Save check out
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="empty-state">No approved requests today</p>
                )}
              </>
            )}

            {activeTab === 'rejected' && (
              <>
                {securityTodayRejectedVisitors.length ? (
                  securityTodayRejectedVisitors.map((visitor) => (
                    <div key={visitor._id} className="request-card">
                      <div className="card-header">
                        <div>
                          <strong>{visitor.visitorName}</strong>
                          <p>{visitor.purpose} · {visitor.phone}</p>
                          <p>{visitor.visitTo?.name} {visitor.visitTo?.flatNumber ? `- Flat ${visitor.visitTo.flatNumber}` : ''}</p>
                        </div>
                        <span className="status-chip rejected">Rejected</span>
                      </div>
                      <div className="visitor-details">
                        <div className="detail-row">
                          <strong>Rejected by:</strong> {visitor.rejectedBy?.name || 'Unknown'}
                        </div>
                        <div className="detail-row">
                          <strong>Response time:</strong> {visitor.responseTime ? new Date(visitor.responseTime).toLocaleString() : 'N/A'}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="empty-state">No rejected requests today</p>
                )}
              </>
            )}
          </div>
        </section>
      </>
    );
  }

  if (user?.role === 'user') {
    const residentPendingVisitors = pendingRequests.filter(v => v.status === 'pending');
    const residentHistoryVisitors = pendingRequests.filter(v => v.status !== 'pending');
    const residentApprovedVisitors = residentHistoryVisitors.filter(v => v.status === 'approved');
    const residentRejectedVisitors = residentHistoryVisitors.filter(v => v.status === 'rejected');
    const showApproved = location.pathname.endsWith('/approved');
    const showRejected = location.pathname.endsWith('/rejected');

    return (
      <>
        {showApproved || showRejected ? null : (
          <>
            <section className="hero-card">
              <div>
                <span className="eyebrow">Resident Panel</span>
                <h3>Review requests from the guard.</h3>
                <p>Pending requests need your response.</p>
              </div>
              <div className="hero-meter">
                <strong>{residentPendingVisitors.length}</strong>
                <span>Awaiting your response</span>
              </div>
            </section>

            <section className="stats-grid">
              {generalCards.map((card) => {
                const Icon = card.icon;
                return (
                  <article className="stat-card" key={card.label}>
                    <span className="stat-icon"><Icon size={16} /></span>
                    <span>{card.label}</span>
                    <strong>{card.value}</strong>
                  </article>
                );
              })}
            </section>
          </>
        )}

        {showApproved ? (
          <section className="panel-card span-two">
            <div className="panel-header">
              <div>
                <span className="eyebrow">Approved</span>
                <h4>Approved requests</h4>
              </div>
            </div>

            <div className="request-list">
              {residentApprovedVisitors.length ? (
                residentApprovedVisitors.map((visitor) => (
                  <div key={visitor._id} className="request-card">
                    <div className="card-header">
                      <div>
                        <strong>{visitor.visitorName}</strong>
                        <p>{visitor.purpose} · {visitor.phone}</p>
                        <p>Requested by {visitor.createdBy?.name || 'Security'}</p>
                      </div>
                      <span className="status-chip approved">Approved</span>
                    </div>
                    <div className="visitor-details">
                      <div className="detail-row"><strong>Approved on:</strong> {visitor.responseTime ? new Date(visitor.responseTime).toLocaleString() : 'N/A'}</div>
                      <div className="detail-row"><strong>Checked in:</strong> {visitor.checkedInAt ? new Date(visitor.checkedInAt).toLocaleString() : 'Not yet'}</div>
                      <div className="detail-row"><strong>Checked out:</strong> {visitor.checkedOutAt ? new Date(visitor.checkedOutAt).toLocaleString() : 'Not yet'}</div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="empty-state">No approved history.</p>
              )}
            </div>
          </section>
        ) : showRejected ? (
          <section className="panel-card span-two">
            <div className="panel-header">
              <div>
                <span className="eyebrow">Rejected</span>
                <h4>Rejected requests</h4>
              </div>
            </div>

            <div className="request-list">
              {residentRejectedVisitors.length ? (
                residentRejectedVisitors.map((visitor) => (
                  <div key={visitor._id} className="request-card">
                    <div className="card-header">
                      <div>
                        <strong>{visitor.visitorName}</strong>
                        <p>{visitor.purpose} · {visitor.phone}</p>
                        <p>Requested by {visitor.createdBy?.name || 'Security'}</p>
                      </div>
                      <span className="status-chip rejected">Rejected</span>
                    </div>
                    <div className="visitor-details">
                      <div className="detail-row"><strong>Rejected on:</strong> {visitor.responseTime ? new Date(visitor.responseTime).toLocaleString() : 'N/A'}</div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="empty-state">No rejected history.</p>
              )}
            </div>
          </section>
        ) : (
          <section className="panel-card span-two">
            <div className="panel-header">
              <div>
                <span className="eyebrow">Current Requests</span>
                <h4>Requests sent by the guard</h4>
              </div>
            </div>

            <div className="request-list">
              {residentPendingVisitors.length ? (
                residentPendingVisitors.map((visitor) => (
                  <div key={visitor._id} className="request-card">
                    <div className="card-header">
                      <div>
                        <strong>{visitor.visitorName}</strong>
                        <p>{visitor.purpose} · {visitor.phone}</p>
                        <p>Requested by {visitor.createdBy?.name || 'Security'}</p>
                      </div>
                      <span className="status-chip pending">Pending</span>
                    </div>
                    <div className="row-actions">
                      <button type="button" className="ghost-button approve" onClick={() => respondToRequest(visitor._id, 'approved')}>✓ Approve</button>
                      <button type="button" className="ghost-button reject" onClick={() => respondToRequest(visitor._id, 'rejected')}>✕ Reject</button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="empty-state">No pending requests.</p>
              )}
            </div>
          </section>
        )}
      </>
    );
  }

  return (
    <>
      <section className="hero-card">
        <div>
          <span className="eyebrow">Admin Panel</span>
          <h3>Full monitoring and control center for visitor operations.</h3>
          <p>Track visitor flow, review status trends, and manage all logs from a single screen.</p>
        </div>
        <div className="hero-meter">
          <strong>{filteredLogs.length}</strong>
          <span>Matching logs</span>
        </div>
      </section>

      <section className="stats-grid">
        {adminCards.map((card) => {
          const Icon = card.icon;
          return (
            <article className="stat-card" key={card.label}>
              <span className="stat-icon"><Icon size={16} /></span>
              <span>{card.label}</span>
              <strong>{card.value}</strong>
            </article>
          );
        })}
      </section>

      <section className="panel-card span-two">
        <div className="panel-header">
          <div>
            <span className="eyebrow">Core Section</span>
            <h4>Latest 3 visitors</h4>
          </div>
        </div>

        <div className="request-list visitor-detail-list">
          {logs.slice(0, 3).length ? (
            logs.slice(0, 3).map((visitor) => (
              <div key={visitor._id} className="request-card visitor-detail-card">
                <div className="card-header">
                  <div>
                    <strong>{visitor.visitorName}</strong>
                    <p>{visitor.purpose} · {visitor.phone || 'No phone'}</p>
                    <p>{visitor.visitTo?.name} {visitor.visitTo?.flatNumber ? `- Flat ${visitor.visitTo.flatNumber}` : ''}</p>
                  </div>
                  <span className={`status-chip ${visitor.status}`}>{visitor.status}</span>
                </div>

                <div className="visitor-details visitor-details--admin">
                  <div className="detail-row"><strong>Check-In Time:</strong> <span>{visitor.checkedInAt ? new Date(visitor.checkedInAt).toLocaleString() : 'Not checked in'}</span></div>
                  <div className="detail-row"><strong>Check-Out Time:</strong> <span>{visitor.checkedOutAt ? new Date(visitor.checkedOutAt).toLocaleString() : 'Not checked out'}</span></div>
                  <div className="detail-row"><strong>Approved By:</strong> <span>{visitor.approvedBy?.name || visitor.rejectedBy?.name || '-'}</span></div>
                  <div className="detail-row"><strong>Created By:</strong> <span>{visitor.createdBy?.name || '-'}</span></div>
                </div>
              </div>
            ))
          ) : (
            <p className="empty-state">No visitors found.</p>
          )}
        </div>
      </section>
    </>
  );
}

export default Dashboard;
