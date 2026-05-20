import { Mail, Shield, Building2, User, Key } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

function Profile() {
  const { user } = useAuth();

  const roleDetails = {
    security: {
      title: 'Security Guard',
      description: 'Responsible for screening and creating visitor entries',
      color: '#3b82f6',
      permissions: ['Create visitor entries', 'View all visitor requests', 'Monitor check-in/out', 'Generate reports'],
    },
    user: {
      title: 'Resident',
      description: 'Can approve or reject visitor requests for their flat',
      color: '#10b981',
      permissions: ['Approve visitor requests', 'Reject visitor requests', 'View visitor history', 'Manage flat access'],
    },
    admin: {
      title: 'Administrator',
      description: 'Full system access and user management',
      color: '#f59e0b',
      permissions: ['Manage all users', 'View system logs', 'Generate reports', 'Configure settings', 'Monitor all activities'],
    },
  };

  const currentRole = roleDetails[user?.role] || roleDetails.user;

  return (
    <>
      {/* <section className="hero-card">
        <div>
          <span className="eyebrow">User Profile</span>
          <h3>Your account details and permissions</h3>
          <p>View your role information and system permissions below.</p>
        </div>
      </section> */}

      <section className="panel-card span-two">
        <div className="panel-header">
          <div>
            <span className="eyebrow">Profile Information</span>
            <h4>Your Details</h4>
          </div>
        </div>

        <div className="profile-content">
          {/* Role Card */}
          <div className="profile-section">
            <div className="profile-role-card" style={{ borderLeftColor: currentRole.color }}>
              <div className="role-header">
                <div className="role-badge" style={{ backgroundColor: currentRole.color }}>
                  <Shield size={24} />
                </div>
                <div>
                  <h3>{currentRole.title}</h3>
                  <p>{currentRole.description}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Personal Details */}
          <div className="profile-section">
            <h4 className="section-title">Personal Details</h4>
            <div className="profile-details-grid">
              <div className="profile-detail">
                <div className="detail-icon">
                  <User size={18} />
                </div>
                <div className="detail-content">
                  <label>Full Name</label>
                  <p>{user?.name}</p>
                </div>
              </div>

              <div className="profile-detail">
                <div className="detail-icon">
                  <Mail size={18} />
                </div>
                <div className="detail-content">
                  <label>Email Address</label>
                  <p>{user?.email}</p>
                </div>
              </div>

              <div className="profile-detail">
                <div className="detail-icon">
                  <Shield size={18} />
                </div>
                <div className="detail-content">
                  <label>User Role</label>
                  <p>{currentRole.title}</p>
                </div>
              </div>

              {user?.flatNumber && (
                <div className="profile-detail">
                  <div className="detail-icon">
                    <Building2 size={18} />
                  </div>
                  <div className="detail-content">
                    <label>Flat Number</label>
                    <p>Flat {user.flatNumber}</p>
                  </div>
                </div>
              )}

              <div className="profile-detail">
                <div className="detail-icon">
                  <Key size={18} />
                </div>
                <div className="detail-content">
                  <label>User ID</label>
                  <p className="user-id">{user?.id}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Permissions */}
          <div className="profile-section">
            <h4 className="section-title">Your Permissions</h4>
            <div className="permissions-list">
              {currentRole.permissions.map((permission, idx) => (
                <div key={idx} className="permission-item">
                  <span className="permission-check">✓</span>
                  <span>{permission}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

export default Profile;


