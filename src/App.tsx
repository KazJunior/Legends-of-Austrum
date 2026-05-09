import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { CharacterCreate } from './pages/CharacterCreate';
import { CharacterView } from './pages/CharacterView';
import { MonstersList } from './pages/MonstersList';
import { GlobalInventory } from './pages/GlobalInventory';
import { Board } from './pages/Board';

class ErrorBoundary extends React.Component<{children: React.ReactNode}, {error: any}> {
  constructor(props: any) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return <pre>{this.state.error.stack}</pre>;
    }
    return this.props.children;
  }
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/characters/new" element={<CharacterCreate />} />
              <Route path="/characters/:id" element={<CharacterView />} />
              <Route path="/monsters/view" element={<MonstersList />} />
              <Route path="/monsters" element={<MonstersList />} />
              <Route path="/inventory" element={<GlobalInventory />} />
              <Route path="/board" element={<Board />} />
            </Route>
            
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
