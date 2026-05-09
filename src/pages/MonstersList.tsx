import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Plus, Search, ShieldAlert, X, Dices, Trash2 } from 'lucide-react';

const statsList = ['hp', 'str', 'aur', 'int', 'dex', 'aus', 'def', 'res', 'fame'];

export const MonstersList: React.FC = () => {
  const { role } = useAuth();
  const location = useLocation();
  const isManagement = location.pathname === '/monsters';
  
  const [monsters, setMonsters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<any>({
    name: '', race: '',
    hp_base: 0, str_base: 0, aur_base: 0, int_base: 0, dex_base: 0, aus_base: 0, def_base: 0, res_base: 0, fame_base: 0
  });
  const [deleteTarget, setDeleteTarget] = useState<{id: string, name: string} | null>(null);
  
  // Detail modal state
  const [selectedMonster, setSelectedMonster] = useState<any | null>(null);
  const [monsterSkills, setMonsterSkills] = useState<any[]>([]);
  const [skillForm, setSkillForm] = useState({
    name: '', type: 'active', description: '', dice_type: 'd6', dice_quantity: 1, attribute_used: 'str'
  });
  const [combatLog, setCombatLog] = useState<string[]>([]);

  useEffect(() => {
    fetchMonsters();
  }, []);

  const fetchMonsters = async () => {
    setLoading(true);
    const { data } = await supabase.from('monsters').select('*').order('name');
    if (data) setMonsters(data);
    setLoading(false);
  };

  const fetchMonsterSkills = async (monsterId: string) => {
    const { data } = await supabase.from('skills').select('*').eq('monster_id', monsterId);
    if (data) setMonsterSkills(data);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev: any) => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value
    }));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await supabase.from('monsters').insert([formData]);
    setShowForm(false);
    setFormData({ 
      name: '', race: '', 
      hp_base: 0, str_base: 0, aur_base: 0, int_base: 0, dex_base: 0, aus_base: 0, def_base: 0, res_base: 0, fame_base: 0 
    });
    fetchMonsters();
  };

  const handleAddSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMonster) return;
    await supabase.from('skills').insert({
      monster_id: selectedMonster.id,
      ...skillForm
    });
    setSkillForm({ name: '', type: 'active', description: '', dice_type: 'd6', dice_quantity: 1, attribute_used: 'str' });
    fetchMonsterSkills(selectedMonster.id);
  };

  const handleDeleteSkill = async (skillId: string) => {
    await supabase.from('skills').delete().eq('id', skillId);
    if (selectedMonster) fetchMonsterSkills(selectedMonster.id);
  };

  const rollMonsterSkill = (skill: any) => {
    if (!selectedMonster) return;
    const diceMatch = skill.dice_type.match(/d(\d+)/i);
    if (!diceMatch) return;
    
    const maxDice = parseInt(diceMatch[1], 10);
    let totalDiceRoll = 0;
    const rolls = [];
    for(let i = 0; i < skill.dice_quantity; i++) {
      const roll = Math.floor(Math.random() * maxDice) + 1;
      rolls.push(roll);
      totalDiceRoll += roll;
    }

    const attrName = skill.attribute_used.toLowerCase();
    const totalAttr = selectedMonster[`${attrName}_base`] || 0;
    const multiplier = Math.floor(totalAttr / 10);
    const totalDamage = totalDiceRoll + multiplier;
    
    const logEntry = `👹 ${selectedMonster.name} usou ${skill.name}: [${rolls.join(', ')}] = ${totalDiceRoll} + ${multiplier} (${attrName.toUpperCase()}) = ${totalDamage}`;
    setCombatLog(prev => [logEntry, ...prev].slice(0, 5));
  };

  const filteredMonsters = monsters.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.race.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isManagement && role !== 'admin') {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '5rem 0' }}>
        <ShieldAlert size={64} color="var(--accent)" style={{ marginBottom: '1.5rem' }} />
        <h2 className="title-glow">Acesso Negado</h2>
        <p style={{ color: 'var(--text-muted)' }}>Apenas administradores podem gerenciar o banco de dados de monstros.</p>
      </div>
    );
  }

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 className="title-glow">{isManagement ? 'Gerenciar Monstros' : 'Bestiário'}</h1>
          <p style={{ color: 'var(--text-muted)' }}>
            {isManagement 
              ? 'Área administrativa para criação e edição de monstros do sistema.' 
              : 'Consulte as informações e status de todos os monstros conhecidos.'}
          </p>
        </div>
        {isManagement && (
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
            <Plus size={20} /> Novo Monstro
          </button>
        )}
      </div>

      <div className="input-group" style={{ marginBottom: '2rem' }}>
        <div style={{ position: 'relative' }}>
          <Search size={20} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            className="input" 
            placeholder="Pesquisar por nome ou raça..." 
            style={{ paddingLeft: '3rem' }}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {showForm && isManagement && (
        <form onSubmit={handleCreate} className="glass-panel" style={{ marginBottom: '2rem', border: '1px solid var(--primary)' }}>
          <h3 style={{ marginBottom: '1.5rem' }}>Adicionar Monstro ao Banco de Dados</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
            <div className="input-group">
              <label>Nome</label>
              <input type="text" name="name" className="input" value={formData.name} onChange={handleChange} required />
            </div>
            <div className="input-group">
              <label>Raça</label>
              <input type="text" name="race" className="input" value={formData.race} onChange={handleChange} required />
            </div>
            {statsList.map(stat => (
              <div className="input-group" key={stat}>
                <label style={{ textTransform: 'uppercase' }}>{stat} Base</label>
                <input type="number" name={`${stat}_base`} className="input" value={formData[`${stat}_base`]} onChange={handleChange} required />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
            <button type="submit" className="btn btn-primary">Salvar Monstro</button>
            <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
          </div>
        </form>
      )}

      {loading ? (
        <p>Carregando monstros...</p>
      ) : filteredMonsters.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
          Nenhum monstro encontrado com os critérios de busca.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {filteredMonsters.map(m => (
            <div key={m.id} className="glass-panel animate-fade-in" style={{ border: '1px solid var(--border-subtle)', cursor: 'pointer' }} onClick={() => {
              setSelectedMonster(m);
              fetchMonsterSkills(m.id);
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <h3 style={{ color: '#ef4444' }}>{m.name}</h3>
                <span style={{ fontSize: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 'bold' }}>
                  {m.race}
                </span>
              </div>
              
              <div style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                {statsList.slice(0, 3).map(stat => (
                  <div key={stat} style={{ background: 'rgba(255,255,255,0.03)', padding: '0.25rem', borderRadius: '4px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{stat}</div>
                    <div style={{ fontWeight: 'bold' }}>{m[`${stat}_base`]}</div>
                  </div>
                ))}
              </div>

              {isManagement && (
                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'flex-end' }}>
                   <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', color: '#ff4444' }} onClick={(e) => {
                     e.stopPropagation();
                     setDeleteTarget({ id: m.id, name: m.name });
                   }}>Excluir</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Monster Detail Modal */}
      {selectedMonster && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content" style={{ maxWidth: '800px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <div>
                <h2 style={{ color: '#ef4444' }}>{selectedMonster.name}</h2>
                <span style={{ color: 'var(--text-muted)' }}>{selectedMonster.race}</span>
              </div>
              <button onClick={() => setSelectedMonster(null)} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}><X /></button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
              {/* Stats Section */}
              <div>
                <h3>Atributos Base</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginTop: '1rem' }}>
                  {statsList.map(stat => (
                    <div key={stat} style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 'bold', textTransform: 'uppercase' }}>{stat}</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{selectedMonster[`${stat}_base`]}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Skills Section */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3>Habilidades</h3>
                  {isManagement && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Adicione habilidades abaixo</span>}
                </div>
                
                <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {monsterSkills.map(skill => (
                    <div key={skill.id} style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontWeight: 'bold', color: 'var(--primary-hover)' }}>{skill.name}</div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button onClick={() => rollMonsterSkill(skill)} style={{ background: 'var(--primary)', border: 'none', color: 'white', padding: '0.2rem 0.5rem', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem' }}>
                            <Dices size={14} /> Rolar
                          </button>
                          {isManagement && (
                            <button onClick={() => handleDeleteSkill(skill.id)} style={{ background: 'transparent', border: 'none', color: '#ff4444', cursor: 'pointer' }}>
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        {skill.dice_quantity}{skill.dice_type} + mod({skill.attribute_used.toUpperCase()})
                      </div>
                    </div>
                  ))}
                  {monsterSkills.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Nenhuma habilidade cadastrada.</p>}
                </div>

                {isManagement && (
                  <form onSubmit={handleAddSkill} style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                    <h4 style={{ marginBottom: '1rem' }}>Nova Habilidade</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                      <input type="text" placeholder="Nome" className="input" value={skillForm.name} onChange={e => setSkillForm({...skillForm, name: e.target.value})} required />
                      <select className="input" value={skillForm.attribute_used} onChange={e => setSkillForm({...skillForm, attribute_used: e.target.value})}>
                        {statsList.map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
                      </select>
                      <input type="number" placeholder="Qtd Dados" className="input" value={skillForm.dice_quantity} onChange={e => setSkillForm({...skillForm, dice_quantity: Number(e.target.value)})} required />
                      <input 
                        type="text" 
                        placeholder="Tipo Dado (Ex: d20)" 
                        className="input" 
                        value={skillForm.dice_type} 
                        onChange={e => setSkillForm({...skillForm, dice_type: e.target.value.toLowerCase()})} 
                      />
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>Adicionar</button>
                  </form>
                )}
              </div>
            </div>

            {combatLog.length > 0 && (
              <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <h4 style={{ color: 'var(--secondary)' }}>Log de Combate</h4>
                  <button onClick={() => setCombatLog([])} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.75rem' }}>Limpar</button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {combatLog.map((log, i) => (
                    <div key={i} style={{ fontSize: '0.875rem' }}>{log}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="modal-overlay" style={{ zIndex: 1000 }}>
          <div className="glass-panel modal-content animate-fade-in" style={{ maxWidth: '400px', width: '100%', textAlign: 'center' }}>
            <h2 style={{ color: '#ff4444', marginBottom: '1rem' }}>Excluir Monstro</h2>
            <p style={{ marginBottom: '2rem' }}>Deseja realmente excluir <strong>{deleteTarget.name}</strong> do banco de dados permanentemente?</p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button className="btn btn-secondary" onClick={() => setDeleteTarget(null)}>Cancelar</button>
              <button className="btn" style={{ background: '#ff4444' }} onClick={async () => {
                await supabase.from('monsters').delete().eq('id', deleteTarget.id);
                setDeleteTarget(null);
                fetchMonsters();
              }}>Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
