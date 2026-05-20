import { useEffect, useMemo, useState } from 'react';
import { Eye, Trash2 } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../lib/api.js';

const emptyForm = {
  visitorName: '',
  phone: '',
  purpose: '',
  visitTo: '',
  checkedInAt: '',
  notes: '',
};

const pageSize = 8;

function Visitors() {
  const { user } = useAuth();
  const location = useLocation();
  const [visitors, setVisitors] = useState([]);
  const [residents, setResidents] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ status: '', resident: '', from: '', to: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedVisitor, setSelectedVisitor] = useState(null);

  const canCreateVisitor = user?.role === 'security';
  const isAdminView = user?.role === 'admin';

  const securityView = useMemo(() => {
    if (!canCreateVisitor) {
      return 'all';
    }
    if (location.pathname.endsWith('/visitors/add')) {
      return 'add';
    }
    if (location.pathname.endsWith('/visitors/requests')) {
      return 'requests';
    }
    if (location.pathname.endsWith('/visitors/all')) {
      return 'all';
    }
    return 'all';
  }, [canCreateVisitor, location.pathname]);

  async function loadVisitors() {
    if (isAdminView) {
      const [visitorsResponse, residentsResponse] = await Promise.all([
        api.get('/visitors'),
        api.get('/users/residents'),
      ]);
      setVisitors(visitorsResponse.visitors || []);
      setResidents(residentsResponse.residents || []);
      return;
    }

    if (canCreateVisitor) {
      const [visitorsResponse, residentsResponse] = await Promise.all([
        api.get('/visitors'),
        api.get('/users/residents'),
      ]);
      setVisitors(visitorsResponse.visitors || []);
      setResidents(residentsResponse.residents || []);
      return;
    }

    const response = await api.get('/visitors');
    setVisitors(response.visitors || []);
  }

  useEffect(() => {
    loadVisitors().catch((loadError) => setError(loadError.message));
  }, [canCreateVisitor, isAdminView]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters.status, filters.resident, filters.from, filters.to, searchQuery]);

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  function updateFilterField(event) {
    setFilters((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setMessage('');

    try {
      await api.post('/visitors/create', form);
      setForm(emptyForm);
      setMessage('Visitor request created and sent to the resident.');
      await loadVisitors();
    } catch (submitError) {
      setError(submitError.message);
    }
  }

  async function updateStatus(id, action) {
    setError('');
    setMessage('');

    try {
      if (action === 'checked-in') {
        await api.put(`/visitors/checkin/${id}`);
        setMessage('Visitor checked in.');
      } else if (action === 'checked-out') {
        await api.put(`/visitors/checkout/${id}`);
        setMessage('Visitor checked out.');
      } else {
        await api.put(`/visitors/respond/${id}`, { status: action });
        setMessage(`Visitor marked as ${action}.`);
      }
      await loadVisitors();
    } catch (statusError) {
      setError(statusError.message);
    }
  }

  async function deleteVisitorLog(id) {
    setError('');
    setMessage('');

    try {
      await api.delete(`/visitors/admin/logs/${id}`);
      setMessage('Visitor log deleted successfully.');
      await loadVisitors();
    } catch (deleteError) {
      setError(deleteError.message);
    }
  }

  const filteredVisitors = useMemo(() => {
    if (isAdminView) {
      return visitors.filter((entry) => {
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
    }

    if (!canCreateVisitor) {
      return visitors;
    }

    if (securityView === 'requests') {
      return visitors.filter((entry) => entry.status === 'pending');
    }

    if (securityView === 'all') {
      return visitors.filter((entry) => {
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
    }

    return visitors;
  }, [canCreateVisitor, filters, isAdminView, searchQuery, securityView, visitors]);

  const securityHeading = {
    add: 'Add visitor entry',
    requests: 'Pending visitor requests',
    all: 'All visitor entries',
  }[securityView];

  const showSecurityForm = canCreateVisitor && securityView === 'add';
  const showTable = !showSecurityForm;

  const totalPages = Math.max(1, Math.ceil(filteredVisitors.length / pageSize));
  const paginatedVisitors = isAdminView
    ? filteredVisitors.slice((currentPage - 1) * pageSize, currentPage * pageSize)
    : filteredVisitors;

  return (
    <div className="visitor-layout visitor-layout--table-only visitor-layout--full">
      {showSecurityForm ? (
        <section className="panel-card visitor-form-panel">
          <div className="panel-header">
            <div>
              <span className="eyebrow">New entry</span>
              <h4>{securityHeading}</h4>
            </div>
          </div>

          <form className="visitor-form" onSubmit={handleSubmit}>
            <label>
              Visitor name
              <input name="visitorName" value={form.visitorName} onChange={updateField} required />
            </label>
            <label>
              Phone
              <input name="phone" value={form.phone} onChange={updateField} required />
            </label>
            <label>
              Purpose
              <input name="purpose" value={form.purpose} onChange={updateField} required />
            </label>
            <label>
              Resident
              <select name="visitTo" value={form.visitTo} onChange={updateField} required>
                <option value="">Select resident</option>
                {residents.map((resident) => (
                  <option key={resident._id} value={resident._id}>
                    {resident.name} {resident.flatNumber ? `- Flat ${resident.flatNumber}` : ''}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Check-in time (optional)
              <input name="checkedInAt" type="datetime-local" value={form.checkedInAt} onChange={updateField} />
            </label>
            <label className="full-span">
              Notes
              <textarea name="notes" rows="3" value={form.notes} onChange={updateField} />
            </label>

            {error ? <div className="error-banner full-span">{error}</div> : null}
            {message ? <div className="success-banner full-span">{message}</div> : null}

            <button type="submit" className="primary-button full-span">Send request</button>
          </form>
        </section>
      ) : null}

      {showTable ? (
      <section className="panel-card visitor-table-panel visitor-table-panel--full">
        <div className="panel-header">
          <div>
            <span className="eyebrow">Visitor log</span>
            <h4>{isAdminView ? 'All visitors table' : securityHeading}</h4>
          </div>
        </div>

        {isAdminView || securityView === 'all' ? (
          <>
            <div className="filter-row">
              <input
                name="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by name, phone, purpose, resident"
              />
              <select name="status" value={filters.status} onChange={updateFilterField}>
                <option value="">All statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
              <select name="resident" value={filters.resident} onChange={updateFilterField}>
                <option value="">All residents</option>
                {residents.map((resident) => (
                  <option key={resident._id} value={resident._id}>
                    {resident.name}
                  </option>
                ))}
              </select>
              <input name="from" type="date" value={filters.from} onChange={updateFilterField} placeholder="From date" />
              <input name="to" type="date" value={filters.to} onChange={updateFilterField} placeholder="To date" />
            </div>

            {error ? <div className="error-banner">{error}</div> : null}
            {message ? <div className="success-banner">{message}</div> : null}

            <div className="table-wrap table-wrap--wide">
              <table className="admin-visitors-table">
                <thead>
                  <tr>
                    <th>Visitor Name</th>
                    <th>Phone</th>
                    <th>Purpose</th>
                    <th>Visiting To</th>
                    <th>Status</th>
                    <th>Check-In Time</th>
                    <th>Check-Out Time</th>
                    <th className="col-approved">Approved By</th>
                    <th className="col-actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedVisitors.length ? (
                    paginatedVisitors.map((visitor) => (
                      <tr key={visitor._id}>
                        <td><strong>{visitor.visitorName}</strong></td>
                        <td>{visitor.phone || '-'}</td>
                        <td>{visitor.purpose || '-'}</td>
                        <td>{visitor.visitTo?.name} {visitor.visitTo?.flatNumber ? `- Flat ${visitor.visitTo.flatNumber}` : ''}</td>
                        <td><span className={`status-chip ${visitor.status}`}>{visitor.status}</span></td>
                        <td>{visitor.checkedInAt ? new Date(visitor.checkedInAt).toLocaleString() : '-'}</td>
                        <td>{visitor.checkedOutAt ? new Date(visitor.checkedOutAt).toLocaleString() : '-'}</td>
                        <td className="col-approved">{visitor.approvedBy?.name || '-'}</td>
                        <td className="col-actions">
                          <div className="row-actions">
                            <button type="button" className="ghost-button" onClick={() => setSelectedVisitor(visitor)}>
                              <Eye size={14} /> View
                            </button> 
                  
                            <button type="button" className="ghost-button reject" onClick={() => deleteVisitorLog(visitor._id)}>
                              <Trash2 size={14} /> Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="9" className="empty-state">No matching logs found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="table-pagination">
              <button
                type="button"
                className="ghost-button"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </button>
              <span>Page {currentPage} of {totalPages}</span>
              <button
                type="button"
                className="ghost-button"
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </button>
            </div>

            {selectedVisitor ? (
              <section className="panel-card">
                <div className="panel-header">
                  <div>
                    <span className="eyebrow">Details</span>
                    <h4>Visitor detail view</h4>
                  </div>
                  <button type="button" className="ghost-button" onClick={() => setSelectedVisitor(null)}>Close</button>
                </div>

                <div className="profile-details-grid">
                  <div className="profile-detail"><div className="detail-content"><label>Visitor Name</label><p>{selectedVisitor.visitorName}</p></div></div>
                  <div className="profile-detail"><div className="detail-content"><label>Phone</label><p>{selectedVisitor.phone || '-'}</p></div></div>
                  <div className="profile-detail"><div className="detail-content"><label>Purpose</label><p>{selectedVisitor.purpose || '-'}</p></div></div>
                  <div className="profile-detail"><div className="detail-content"><label>Resident</label><p>{selectedVisitor.visitTo?.name || '-'}</p></div></div>
                  <div className="profile-detail"><div className="detail-content"><label>Approved By</label><p>{selectedVisitor.approvedBy?.name || '-'}</p></div></div>
                  <div className="profile-detail"><div className="detail-content"><label>Rejected By</label><p>{selectedVisitor.rejectedBy?.name || '-'}</p></div></div>
                </div>
              </section>
            ) : null}
          </>
        ) : securityView === 'requests' ? (
          <div className="table-wrap table-wrap--wide">
            <table>
              <thead>
                <tr>
                  <th>Visitor</th>
                  <th>Resident</th>
                  <th>Status</th>
                  <th>Requested</th>
                </tr>
              </thead>
              <tbody>
                {paginatedVisitors.length ? (
                  paginatedVisitors.map((visitor) => (
                    <tr key={visitor._id}>
                      <td>
                        <strong>{visitor.visitorName}</strong>
                        <span>{visitor.purpose || '-'}</span>
                      </td>
                      <td>
                        {visitor.visitTo?.name}
                        {visitor.visitTo?.flatNumber ? ` - Flat ${visitor.visitTo.flatNumber}` : ''}
                      </td>
                      <td><span className={`status-chip ${visitor.status}`}>{visitor.status}</span></td>
                      <td>{new Date(visitor.createdAt).toLocaleString()}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="empty-state">No visitors found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="table-wrap table-wrap--wide">
            <table>
              <thead>
                <tr>
                  <th>Visitor</th>
                  <th>Resident</th>
                  <th>Status</th>
                  <th>Requested</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedVisitors.length ? (
                  paginatedVisitors.map((visitor) => (
                    <tr key={visitor._id}>
                      <td>
                        <strong>{visitor.visitorName}</strong>
                        <span>{visitor.purpose || '-'}</span>
                      </td>
                      <td>
                        {visitor.visitTo?.name}
                        {visitor.visitTo?.flatNumber ? ` - Flat ${visitor.visitTo.flatNumber}` : ''}
                      </td>
                      <td><span className={`status-chip ${visitor.status}`}>{visitor.status}</span></td>
                      <td>{new Date(visitor.createdAt).toLocaleString()}</td>
                      <td>
                        <div className="row-actions">
                          <button type="button" className="ghost-button" onClick={() => updateStatus(visitor._id, 'checked-in')}>Check in</button>
                          <button type="button" className="ghost-button" onClick={() => updateStatus(visitor._id, 'checked-out')}>Check out</button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="empty-state">No visitors found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
      ) : null}
    </div>
  );
}

export default Visitors;
