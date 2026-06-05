import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

import UploadModal from './UploadModal';
import Toast from '../ui/Toast';
import type { ToastType } from '../ui/Toast';

import './shell.css';

export default function Shell({ children }: { children: React.ReactNode }) {
  const [showUpload, setShowUpload] = useState(false);

  const [toast, setToast] = useState<{
    message: string;
    type: ToastType;
  } | null>(null);

  const queryClient = useQueryClient();

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['scans'] });

    setToast({
      message: 'Scan complete — dashboard updated with new risk data.',
      type: 'success',
    });
  };

  return (
    <div className="app-root">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-logo">TRACELOCK</div>

          <div className="brand-subtitle">
            Dependency risk intelligence for enterprise teams
          </div>
        </div>

        <nav className="nav-list">
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `nav-link${isActive ? ' active' : ''}`
            }
          >
            Dashboard
          </NavLink>

          <NavLink
            to="/scans"
            className={({ isActive }) =>
              `nav-link${isActive ? ' active' : ''}`
            }
          >
            Scans
          </NavLink>

          <NavLink
            to="/executive"
            className={({ isActive }) =>
              `nav-link${isActive ? ' active' : ''}`
            }
          >
            Executive Overview
          </NavLink>

          <NavLink
            to="/organization"
            className={({ isActive }) =>
              `nav-link${isActive ? ' active' : ''}`
            }
          >
            Organization
          </NavLink>

        </nav>

        <div className="sidebar-footer">
          <span>
            Built for security, compliance, and engineering leaders.
          </span>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div>
            <p className="topbar-label">TraceLock Platform</p>

            <h1>Operational dependency risk analytics</h1>
          </div>

          <div className="topbar-actions">
            <button
              className="button button-primary"
              onClick={() => setShowUpload(true)}
            >
              Run scan
            </button>
          </div>
        </header>

        <main className="content">{children}</main>
      </div>

      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onSuccess={handleSuccess}
        />
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  );
}