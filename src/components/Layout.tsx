import React from 'react';
import { Outlet, Navigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Sword, LogOut, User as UserIcon, Users, BookOpen, Package } from 'lucide-react';

export const Layout: React.FC = () => {
  const { session, role, loading, signOut } = useAuth();
  const location = useLocation();

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Carregando...</div>;
  if (!session) return <Navigate to="/login" replace />;

  const isActive = (path: string) => location.pathname === path;

  return (
    <div style={{ minHeight: '100vh', display: 'flex' }}>
      {/* Sidebar */}
      <aside style={{ width: '250px', background: 'var(--bg-panel-solid)', borderRight: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Sword size={28} color="var(--primary)" style={{ filter: 'drop-shadow(0 0 5px var(--primary-glow))' }} />
          <span className="title-glow" style={{ fontSize: '1.25rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>Legends of Austrum</span>
        </div>
        
        <nav style={{ flex: 1, padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <Link to="/" className={`btn ${isActive('/') ? 'btn-primary' : 'btn-secondary'}`} style={{ justifyContent: 'flex-start', border: 'none', background: isActive('/') ? '' : 'transparent' }}>
            <Users size={18} />
            Meus Personagens
          </Link>
          <Link to="/monsters/view" className={`btn ${isActive('/monsters/view') ? 'btn-primary' : 'btn-secondary'}`} style={{ justifyContent: 'flex-start', border: 'none', background: isActive('/monsters/view') ? '' : 'transparent' }}>
            <BookOpen size={18} />
            Bestiário
          </Link>
          <Link to="/inventory" className={`btn ${isActive('/inventory') ? 'btn-primary' : 'btn-secondary'}`} style={{ justifyContent: 'flex-start', border: 'none', background: isActive('/inventory') ? '' : 'transparent' }}>
            <Package size={18} />
            Inventário
          </Link>
          {role === 'admin' && (
            <Link to="/monsters" className={`btn ${isActive('/monsters') ? 'btn-primary' : 'btn-secondary'}`} style={{ justifyContent: 'flex-start', border: 'none', background: isActive('/monsters') ? '' : 'transparent', color: 'var(--accent)' }}>
              <Sword size={18} />
              Gerenciar Monstros
            </Link>
          )}
        </nav>

        <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
            <UserIcon size={18} />
            <span style={{ fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis' }}>{session.user.email}</span>
          </div>
          <button onClick={signOut} className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }}>
            <LogOut size={18} /> Sair
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, height: '100vh', overflowY: 'auto', padding: '2rem' }}>
        <Outlet />
      </main>
    </div>
  );
};
