import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const CharacterCreate: React.FC = () => {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    race: 'Humano',
    title: '',
    hp_base: '',
    str_base: '',
    aur_base: '',
    int_base: '',
    dex_base: '',
    aus_base: ''
  });
  const [masteries, setMasteries] = useState<{name: string, description: string, level: number, xp: number}[]>([]);
  const [newMastery, setNewMastery] = useState({ name: '', description: '' });

  const races = [
    'Humano', 'Anão', 'Elfo', 'Orc', 'Goblin', 'Slime', 'Espírito', 'Fada', 
    'Demônio', 'Anjo', 'Gigante', 'Vampiro', 'Trent', 'Cristalis', 
    'Morto-Vivo', 'Golem', 'Bestial', 'Insectóide', 'M.E.C.A', 'Xenomorfo'
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? (value === '' ? '' : Number(value)) : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user) return;
    setLoading(true);

    try {
      const hp_base = Number(formData.hp_base) || 0;
      const str_base = Number(formData.str_base) || 0;
      const aur_base = Number(formData.aur_base) || 0;
      const int_base = Number(formData.int_base) || 0;
      const dex_base = Number(formData.dex_base) || 0;
      const aus_base = Number(formData.aus_base) || 0;

      // 1. Create character
      const { data: charData, error: charError } = await supabase
        .from('characters')
        .insert({
          user_id: session.user.id,
          name: formData.name,
          age: Number(formData.age),
          race: formData.race,
          title: formData.title,
          masteries: '',
          current_hp: hp_base,
          current_mana: aus_base
        })
        .select()
        .single();

      if (charError) throw charError;

      // 2. Create masteries if any
      if (masteries.length > 0) {
        const { error: mastError } = await supabase
          .from('masteries')
          .insert(masteries.map(m => ({
            character_id: charData.id,
            name: m.name,
            description: m.description,
            level: m.level,
            xp: m.xp
          })));
        if (mastError) throw mastError;
      }

      // 3. Create base attributes
      const { error: attrError } = await supabase
        .from('attributes')
        .insert({
          character_id: charData.id,
          hp_base,
          str_base,
          aur_base,
          int_base,
          dex_base,
          aus_base,
          def_base: 0,
          res_base: 0,
          fame_base: 0
        });

      if (attrError) throw attrError;

      navigate(`/characters/${charData.id}`);
    } catch (error) {
      console.error('Erro ao criar personagem:', error);
      alert('Erro ao criar personagem.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <h1 className="title-glow" style={{ marginBottom: '2rem' }}>Criar Novo Personagem</h1>
      <form onSubmit={handleSubmit} className="glass-panel" style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h2 style={{ marginBottom: '1.5rem', color: 'var(--primary-hover)' }}>Informações Básicas</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }} className="grid-mobile-1">
          <div className="input-group">
            <label>Nome</label>
            <input type="text" name="name" className="input" value={formData.name} onChange={handleChange} required />
          </div>
          <div className="input-group">
            <label>Idade</label>
            <input type="number" name="age" className="input" value={formData.age} onChange={handleChange} required />
          </div>
          <div className="input-group">
            <label>Raça</label>
            <select name="race" className="input" value={formData.race} onChange={handleChange} required>
              {races.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="input-group">
            <label>Título (Opcional)</label>
            <input type="text" name="title" className="input" value={formData.title} onChange={handleChange} />
          </div>
        </div>

        <h2 style={{ margin: '2rem 0 1.5rem', color: 'var(--primary-hover)' }}>Atributos Base</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }} className="grid-mobile-1">
          {['hp', 'str', 'aur', 'int', 'dex', 'aus'].map(attr => (
            <div className="input-group" key={attr}>
              <label style={{ textTransform: 'uppercase' }}>{attr}</label>
              <input type="number" name={`${attr}_base`} className="input" value={formData[`${attr}_base` as keyof typeof formData]} onChange={handleChange} min="0" required />
            </div>
          ))}
        </div>

        <h2 style={{ margin: '2rem 0 1.5rem', color: 'var(--primary-hover)' }}>Maestrias Iniciais</h2>
        <div className="glass-panel" style={{ background: 'rgba(0,0,0,0.2)', marginBottom: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '1rem', alignItems: 'flex-end' }} className="grid-mobile-1">
            <div className="input-group">
              <label>Nome da Maestria</label>
              <input type="text" className="input" value={newMastery.name} onChange={e => setNewMastery({...newMastery, name: e.target.value})} placeholder="Ex: Espada Longa" />
            </div>
            <div className="input-group">
              <label>Descrição (Opcional)</label>
              <input type="text" className="input" value={newMastery.description} onChange={e => setNewMastery({...newMastery, description: e.target.value})} placeholder="Breve descrição..." />
            </div>
            <button type="button" className="btn btn-secondary" style={{ height: '42px' }} onClick={() => {
              if (newMastery.name) {
                setMasteries([...masteries, { ...newMastery, level: 1, xp: 0 }]);
                setNewMastery({ name: '', description: '' });
              }
            }}>Adicionar</button>
          </div>

          {masteries.length > 0 && (
            <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {masteries.map((m, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }}>
                  <span><strong>{m.name}</strong> - Nível {m.level} ({m.xp} XP)</span>
                  <button type="button" style={{ background: 'transparent', border: 'none', color: '#ff4444', cursor: 'pointer' }} onClick={() => setMasteries(masteries.filter((_, idx) => idx !== i))}>Remover</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }} className="flex-mobile-column">
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/')}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Criando...' : 'Criar Personagem'}
          </button>
        </div>
      </form>
    </div>
  );
};
