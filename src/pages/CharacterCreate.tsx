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

      // 2. Create base attributes
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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
          {['hp', 'str', 'aur', 'int', 'dex', 'aus'].map(attr => (
            <div className="input-group" key={attr}>
              <label style={{ textTransform: 'uppercase' }}>{attr}</label>
              <input type="number" name={`${attr}_base`} className="input" value={formData[`${attr}_base` as keyof typeof formData]} onChange={handleChange} min="0" required />
            </div>
          ))}
        </div>

        <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/')}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Criando...' : 'Criar Personagem'}
          </button>
        </div>
      </form>
    </div>
  );
};
