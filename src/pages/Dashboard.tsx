import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import { Plus, User, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface Character {
  id: string;
  name: string;
  race: string;
  title: string | null;
  age: number;
}

export const Dashboard: React.FC = () => {
  const { session } = useAuth();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    fetchCharacters();
  }, [session]);

  const fetchCharacters = async () => {
    if (!session?.user) return;
    const { data, error } = await supabase
      .from('characters')
      .select('*')
      .eq('user_id', session.user.id);
      
    if (data) setCharacters(data);
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    console.log('Deletando personagem:', id);
    try {
      const { error } = await supabase.from('characters').delete().eq('id', id);
      if (error) throw error;
      setDeleteId(null);
      fetchCharacters();
    } catch (err: any) {
      console.error('Erro ao deletar:', err);
      alert('Erro ao deletar: ' + (err.message || 'Erro desconhecido'));
    }
  };

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 className="title-glow">Meus Personagens</h1>
        <Link to="/characters/new" className="btn btn-primary" style={{ textDecoration: 'none' }}>
          <Plus size={20} /> Novo Personagem
        </Link>
      </div>

      {loading ? (
        <p>Carregando personagens...</p>
      ) : characters.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <User size={48} color="var(--text-muted)" style={{ margin: '0 auto 1rem' }} />
          <h2 style={{ marginBottom: '1rem' }}>Nenhum personagem encontrado</h2>
          <p style={{ color: 'var(--text-muted)' }}>Crie seu primeiro aventureiro para começar a jornada em Austrum.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {characters.map(char => (
            <div key={char.id} className="glass-panel animate-fade-in" style={{ cursor: 'pointer', transition: 'transform 0.2s', border: '1px solid var(--border-subtle)', position: 'relative', overflow: 'hidden' }}
                 onMouseOver={e => e.currentTarget.style.borderColor = 'var(--primary)'}
                 onMouseOut={e => e.currentTarget.style.borderColor = 'var(--border-subtle)'}>
              
              <Link to={`/characters/${char.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block', paddingRight: '2.5rem' }}>
                <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: 'var(--primary-hover)' }}>{char.name}</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                  <p><strong>Raça:</strong> {char.race}</p>
                  <p><strong>Idade:</strong> {char.age} anos</p>
                  {char.title && <p><strong>Título:</strong> {char.title}</p>}
                </div>
              </Link>

              <button 
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeleteId(char.id); }} 
                style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', color: 'var(--health-bg)', cursor: 'pointer', padding: '0.5rem', zIndex: 10 }}
                title="Deletar Personagem"
              >
                <Trash2 size={20} style={{ pointerEvents: 'none' }} />
              </button>

              {deleteId === char.id && (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 20, padding: '1rem', textAlign: 'center', animation: 'fadeIn 0.2s ease' }}>
                  <p style={{ marginBottom: '1rem', fontWeight: 'bold' }}>Deletar {char.name}?</p>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <button className="btn btn-secondary" onClick={(e) => { e.stopPropagation(); setDeleteId(null); }}>Não</button>
                    <button className="btn" style={{ background: 'var(--health-bg)' }} onClick={(e) => { e.stopPropagation(); handleDelete(char.id); }}>Sim</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
