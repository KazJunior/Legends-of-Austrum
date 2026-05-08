import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Package, Search, Plus, Trash2, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const GlobalInventory: React.FC = () => {
  const { role } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'arma',
    description: '',
    bonus_hp: 0,
    bonus_str: 0,
    bonus_aur: 0,
    bonus_int: 0,
    bonus_dex: 0,
    bonus_aus: 0,
    bonus_def: 0,
    bonus_res: 0,
    bonus_fame: 0
  });
  const [deleteTarget, setDeleteTarget] = useState<{id: string, name: string} | null>(null);

  const statsList = ['hp', 'str', 'aur', 'int', 'dex', 'aus', 'def', 'res', 'fame'];

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('global_items')
      .select('*')
      .order('name');
    if (data) setItems(data);
    setLoading(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase
      .from('global_items')
      .insert(formData);
    
    if (error) {
      alert('Erro ao criar item: ' + error.message);
    } else {
      setShowAddModal(false);
      setFormData({
        name: '', type: 'arma', description: '',
        bonus_hp: 0, bonus_str: 0, bonus_aur: 0, bonus_int: 0, bonus_dex: 0, bonus_aus: 0, bonus_def: 0, bonus_res: 0, bonus_fame: 0
      });
      fetchItems();
    }
  };

  const handleDelete = async (id: string) => {
    await supabase.from('global_items').delete().eq('id', id);
    setDeleteTarget(null);
    fetchItems();
  };

  const filteredItems = items.filter(i => 
    i.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 className="title-glow">Inventário Global</h1>
          <p style={{ color: 'var(--text-muted)' }}>Catálogo de itens e equipamentos do mundo de Austrum.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          <Plus size={20} /> Novo Item
        </button>
      </div>

      <div className="input-group" style={{ marginBottom: '2rem' }}>
        <div style={{ position: 'relative' }}>
          <Search size={20} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            className="input" 
            placeholder="Pesquisar itens por nome ou tipo..." 
            style={{ paddingLeft: '3rem' }}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <p>Carregando catálogo...</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {filteredItems.map(item => (
            <div key={item.id} className="glass-panel" style={{ position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <h3 style={{ color: 'var(--primary-hover)' }}>{item.name}</h3>
                <button onClick={() => setDeleteTarget({ id: item.id, name: item.name })} style={{ background: 'transparent', border: 'none', color: '#ff4444', cursor: 'pointer' }}>
                  <Trash2 size={18} style={{ pointerEvents: 'none' }} />
                </button>
              </div>
              <div style={{ fontSize: '0.875rem', color: 'var(--accent)', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                {item.type}
              </div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>{item.description}</p>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                {statsList.map(stat => {
                  const val = item[`bonus_${stat}`];
                  if (!val) return null;
                  return (
                    <div key={stat} style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.05)', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>
                      <span style={{ textTransform: 'uppercase' }}>{stat}:</span> <span style={{ color: 'var(--secondary)', fontWeight: 'bold' }}>+{val}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          {filteredItems.length === 0 && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              Nenhum item encontrado.
            </div>
          )}
        </div>
      )}

      {showAddModal && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content" style={{ maxWidth: '600px', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2>Criar Item no Catálogo</h2>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}><X /></button>
            </div>
            <form onSubmit={handleCreate}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="input-group">
                  <label>Nome do Item</label>
                  <input type="text" className="input" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
                </div>
                <div className="input-group">
                  <label>Tipo</label>
                  <select className="input" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                    <option value="capacete">Capacete</option>
                    <option value="peitoral">Peitoral</option>
                    <option value="perneta">Perneta</option>
                    <option value="bota">Bota</option>
                    <option value="arma">Arma</option>
                    <option value="acessorio">Acessório</option>
                  </select>
                </div>
              </div>
              <div className="input-group">
                <label>Descrição</label>
                <textarea className="input" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
              </div>
              <h4 style={{ marginBottom: '1rem', color: 'var(--accent)' }}>Bônus de Atributos</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                {statsList.map(stat => (
                  <div className="input-group" key={stat}>
                    <label style={{ textTransform: 'uppercase', fontSize: '0.75rem' }}>{stat}</label>
                    <input type="number" className="input" value={formData[`bonus_${stat}` as keyof typeof formData]} onChange={e => setFormData({...formData, [`bonus_${stat}`]: Number(e.target.value)})} />
                  </div>
                ))}
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1.5rem' }}>Salvar no Catálogo</button>
            </form>
          </div>
        </div>
      )}
      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="modal-overlay" style={{ zIndex: 1000 }}>
          <div className="glass-panel modal-content animate-fade-in" style={{ maxWidth: '400px', width: '100%', textAlign: 'center' }}>
            <h2 style={{ color: '#ff4444', marginBottom: '1rem' }}>Excluir do Catálogo</h2>
            <p style={{ marginBottom: '2rem' }}>Deseja realmente remover <strong>{deleteTarget.name}</strong> do catálogo global? Isso não afetará itens já possuídos por personagens.</p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button className="btn btn-secondary" onClick={() => setDeleteTarget(null)}>Cancelar</button>
              <button className="btn" style={{ background: '#ff4444' }} onClick={() => handleDelete(deleteTarget.id)}>Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
