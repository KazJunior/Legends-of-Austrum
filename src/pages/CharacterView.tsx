import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Shield, Sword, Dices, Plus, Minus, Trash2, Eraser, X, Zap } from 'lucide-react';

export const CharacterView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { session } = useAuth();
  
  const [character, setCharacter] = useState<any>(null);
  const [attributes, setAttributes] = useState<any>(null);
  const [inventory, setInventory] = useState<any[]>([]);
  const [skills, setSkills] = useState<any[]>([]);
  const [masteries, setMasteries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showItemModal, setShowItemModal] = useState(false);
  const [showSkillModal, setShowSkillModal] = useState(false);
  const [showMasteryModal, setShowMasteryModal] = useState(false);

  // Form states
  const [itemForm, setItemForm] = useState({
    name: '', type: 'arma', quantity: 1, bonus_hp: 0, bonus_str: 0, bonus_aur: 0, bonus_int: 0, bonus_dex: 0, bonus_aus: 0, bonus_def: 0, bonus_res: 0, bonus_fame: 0
  });
  const [skillForm, setSkillForm] = useState({
    name: '', type: 'active', description: '', dice_type: 'd6', dice_quantity: 1, attribute_used: 'str', cost: 0
  });
  const [masteryForm, setMasteryForm] = useState({
    name: '', description: ''
  });
  const [combatLog, setCombatLog] = useState<string[]>([]);
  const [globalItems, setGlobalItems] = useState<any[]>([]);

  useEffect(() => {
    if (id) {
      fetchCharacterData();
      fetchGlobalItems();
    }
  }, [id]);

  const fetchGlobalItems = async () => {
    const { data } = await supabase.from('global_items').select('*').order('name');
    if (data) setGlobalItems(data);
  };

  const fetchCharacterData = async () => {
    setLoading(true);
    
    const [charRes, attrRes, invRes, skillRes, mastRes] = await Promise.all([
      supabase.from('characters').select('*').eq('id', id).single(),
      supabase.from('attributes').select('*').eq('character_id', id).single(),
      supabase.from('inventory').select('*').eq('character_id', id),
      supabase.from('skills').select('*').eq('character_id', id),
      supabase.from('masteries').select('*').eq('character_id', id)
    ]);

    if (charRes.data) setCharacter(charRes.data);
    if (attrRes.data) setAttributes(attrRes.data);
    if (invRes.data) setInventory(invRes.data);
    if (skillRes.data) setSkills(skillRes.data);
    if (mastRes.data) setMasteries(mastRes.data);
    
    setLoading(false);
  };

  const updateHpMana = async (type: 'hp' | 'mana', amount: number) => {
    if (!character) return;
    const field = type === 'hp' ? 'current_hp' : 'current_mana';
    const newVal = Math.max(0, character[field] + amount);
    setCharacter({ ...character, [field]: newVal });
    await supabase.from('characters').update({ [field]: newVal }).eq('id', character.id);
  };

  const updateAchiev = async (stat: string, delta: number) => {
    if (!attributes) return;
    const fieldName = `${stat}_achiev`;
    const newVal = (attributes[fieldName] || 0) + delta;
    setAttributes({ ...attributes, [fieldName]: newVal });
    await supabase.from('attributes').update({ [fieldName]: newVal }).eq('character_id', character.id);
  };

  const toggleEquip = async (itemId: string, itemType: string, isCurrentlyEquipped: boolean) => {
    if (!isCurrentlyEquipped) {
      // Check if another item of the same type is equipped
      const equippedOfSameType = inventory.find(i => i.type === itemType && i.is_equipped);
      if (equippedOfSameType) {
        await supabase.from('inventory').update({ is_equipped: false }).eq('id', equippedOfSameType.id);
      }
    }
    
    await supabase.from('inventory').update({ is_equipped: !isCurrentlyEquipped }).eq('id', itemId);
    fetchCharacterData(); // Refresh data to recalculate stats
  };

  const calculateEquippedStat = (statName: string) => {
    return inventory
      .filter(item => item.is_equipped)
      .reduce((acc, item) => acc + (item[`bonus_${statName}`] || 0), 0);
  };

  const rollSkill = (skill: any) => {
    if (skill.type === 'passive') return;
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
    const base = attributes[`${attrName}_base`] || 0;
    const achiev = attributes[`${attrName}_achiev`] || 0;
    const equip = calculateEquippedStat(attrName);
    const totalAttr = base + achiev + equip;
    const multiplier = Math.floor(totalAttr / 10);

    const totalDamage = totalDiceRoll + multiplier;

    // Consume Mana
    if (skill.cost > 0) {
      if (character.current_mana < skill.cost) {
        alert('Mana insuficiente!');
        return;
      }
      updateHpMana('mana', -skill.cost);
    }
    
    const logEntry = `⚔️ ${skill.name}: Rolou ${skill.dice_quantity}${skill.dice_type} [${rolls.join(', ')}] = ${totalDiceRoll}. Multiplicador (${attrName.toUpperCase()} ${totalAttr}) = +${multiplier}. Dano Total: ${totalDamage}`;
    setCombatLog(prev => [logEntry, ...prev].slice(0, 5));
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    await supabase.from('inventory').insert({
      character_id: id,
      ...itemForm
    });
    setShowItemModal(false);
    setItemForm({
      name: '', type: 'arma', quantity: 1, bonus_hp: 0, bonus_str: 0, bonus_aur: 0, bonus_int: 0, bonus_dex: 0, bonus_aus: 0, bonus_def: 0, bonus_res: 0, bonus_fame: 0
    });
    fetchCharacterData();
  };

  const [deleteTarget, setDeleteTarget] = useState<{id: string, type: 'item' | 'skill' | 'mastery' | 'character', name: string} | null>(null);

  const handleDeleteItem = async (itemId: string) => {
    await supabase.from('inventory').delete().eq('id', itemId);
    setDeleteTarget(null);
    fetchCharacterData();
  };

  const updateInventoryQuantity = async (itemId: string, delta: number) => {
    const item = inventory.find(i => i.id === itemId);
    if (!item) return;
    const newQty = Math.max(1, (item.quantity || 1) + delta);
    setInventory(inventory.map(i => i.id === itemId ? { ...i, quantity: newQty } : i));
    await supabase.from('inventory').update({ quantity: newQty }).eq('id', itemId);
  };

  const maximizeStatus = async (type: 'hp' | 'mana') => {
    if (!character) return;
    const targetMax = type === 'hp' ? maxHp : maxMana;
    const field = type === 'hp' ? 'current_hp' : 'current_mana';
    setCharacter({ ...character, [field]: targetMax });
    await supabase.from('characters').update({ [field]: targetMax }).eq('id', character.id);
  };

  const handleAddSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    await supabase.from('skills').insert({
      character_id: id,
      ...skillForm
    });
    setShowSkillModal(false);
    setSkillForm({
      name: '', type: 'active', description: '', dice_type: 'd6', dice_quantity: 1, attribute_used: 'str', cost: 0
    });
    fetchCharacterData();
  };

  const handleDeleteSkill = async (skillId: string) => {
    await supabase.from('skills').delete().eq('id', skillId);
    setDeleteTarget(null);
    fetchCharacterData();
  };

  const handleAddMastery = async (e: React.FormEvent) => {
    e.preventDefault();
    await supabase.from('masteries').insert({
      character_id: id,
      ...masteryForm
    });
    setShowMasteryModal(false);
    setMasteryForm({ name: '', description: '' });
    fetchCharacterData();
  };

  const handleDeleteMastery = async (masteryId: string) => {
    await supabase.from('masteries').delete().eq('id', masteryId);
    setDeleteTarget(null);
    fetchCharacterData();
  };

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDeleteCharacter = async () => {
    try {
      const { error } = await supabase.from('characters').delete().eq('id', character.id);
      if (error) throw error;
      navigate('/');
    } catch (err: any) {
      console.error('Erro ao deletar personagem:', err);
      alert('Erro ao deletar: ' + (err.message || 'Erro desconhecido'));
    }
  };

  if (loading) return <div className="container">Carregando...</div>;
  if (!character) return <div className="container">Personagem não encontrado.</div>;

  const statsList = ['hp', 'str', 'aur', 'int', 'dex', 'aus', 'def', 'res', 'fame'];
  
  // Calculate max HP and Mana
  const maxHp = (attributes.hp_base || 0) + (attributes.hp_achiev || 0) + calculateEquippedStat('hp');
  const maxMana = (attributes.aus_base || 0) + (attributes.aus_achiev || 0) + calculateEquippedStat('aus');

  const hpPercent = Math.min(100, Math.max(0, (character.current_hp / (maxHp || 1)) * 100));
  const manaPercent = Math.min(100, Math.max(0, (character.current_mana / (maxMana || 1)) * 100));

  return (
    <div className="container">
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
        
        {/* Left Column */}
        <div>
          {/* Header */}
          <div className="glass-panel" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', overflow: 'hidden' }}>
            <div>
              <h1 className="title-glow" style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>{character.name}</h1>
              <div style={{ display: 'flex', gap: '1rem', color: 'var(--text-muted)' }}>
                <span>Raça: {character.race}</span>
                <span>Idade: {character.age}</span>
                {character.title && <span>Título: {character.title}</span>}
              </div>
            </div>
            <button onClick={() => setShowDeleteConfirm(true)} className="btn btn-secondary" style={{ color: '#ff4444', zIndex: 10 }} title="Deletar Personagem">
              <Trash2 size={20} style={{ pointerEvents: 'none' }} />
            </button>

            {showDeleteConfirm && (
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.95)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 20, padding: '1rem', textAlign: 'center', animation: 'fadeIn 0.2s ease' }}>
                <p style={{ marginBottom: '1rem', fontWeight: 'bold' }}>Deseja permanentemente deletar {character.name}?</p>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button className="btn btn-secondary" onClick={() => setShowDeleteConfirm(false)}>Cancelar</button>
                  <button className="btn" style={{ background: 'var(--health-bg)' }} onClick={handleDeleteCharacter}>Confirmar Exclusão</button>
                </div>
              </div>
            )}
          </div>

          {/* Health and Mana */}
          <div className="glass-panel" style={{ marginBottom: '2rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>Status Vital</h3>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ width: '80px', fontWeight: 'bold', color: 'var(--health-bg)' }}>HP</div>
              <div className="status-bar-container">
                <div className="status-bar-fill health-fill" style={{ width: `${hpPercent}%` }}></div>
                <div className="status-bar-text">{character.current_hp} / {maxHp}</div>
              </div>
              <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem' }} onClick={() => updateHpMana('hp', -1)}><Minus size={16} /></button>
              <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem' }} onClick={() => updateHpMana('hp', 1)}><Plus size={16} /></button>
              <button className="btn btn-primary" style={{ padding: '0.25rem 0.5rem', background: 'var(--health-bg)', border: 'none' }} onClick={() => maximizeStatus('hp')} title="Maximizar HP"><Zap size={16} /></button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '80px', fontWeight: 'bold', color: 'var(--mana-bg)' }}>MANA</div>
              <div className="status-bar-container">
                <div className="status-bar-fill mana-fill" style={{ width: `${manaPercent}%` }}></div>
                <div className="status-bar-text">{character.current_mana} / {maxMana}</div>
              </div>
              <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem' }} onClick={() => updateHpMana('mana', -1)}><Minus size={16} /></button>
              <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem' }} onClick={() => updateHpMana('mana', 1)}><Plus size={16} /></button>
              <button className="btn btn-primary" style={{ padding: '0.25rem 0.5rem', background: 'var(--mana-bg)', border: 'none' }} onClick={() => maximizeStatus('mana')} title="Maximizar Mana"><Zap size={16} /></button>
            </div>
          </div>

          {/* Attributes Table */}
          <div className="glass-panel" style={{ marginBottom: '2rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>Atributos</h3>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Atributo</th>
                    <th>Base</th>
                    <th>Conquista</th>
                    <th>Equipado</th>
                    <th>Total</th>
                    <th>Mult.</th>
                  </tr>
                </thead>
                <tbody>
                  {statsList.map(stat => {
                    const base = attributes[`${stat}_base`] || 0;
                    const achiev = attributes[`${stat}_achiev`] || 0;
                    const equip = calculateEquippedStat(stat);
                    const total = base + achiev + equip;
                    const mult = Math.floor(total / 10);
                    
                    return (
                      <tr key={stat}>
                        <td style={{ fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--primary-hover)' }}>{stat}</td>
                        <td>{base}</td>
                        <td style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <button className="btn btn-secondary" style={{ padding: '0.1rem 0.25rem', minWidth: 'auto', height: 'auto' }} onClick={() => updateAchiev(stat, -1)}><Minus size={12} /></button>
                          <span style={{ minWidth: '1.5rem', textAlign: 'center' }}>{achiev}</span>
                          <button className="btn btn-secondary" style={{ padding: '0.1rem 0.25rem', minWidth: 'auto', height: 'auto' }} onClick={() => updateAchiev(stat, 1)}><Plus size={12} /></button>
                        </td>
                        <td style={{ color: equip > 0 ? 'var(--accent)' : 'inherit' }}>{equip > 0 ? `+${equip}` : 0}</td>
                        <td style={{ fontWeight: 'bold' }}>{total}</td>
                        <td style={{ color: 'var(--secondary)', fontWeight: 'bold' }}>+{mult}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div>
          {/* Masteries */}
          <div className="glass-panel" style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3>Maestrias</h3>
              <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => setShowMasteryModal(true)}>+ Add Maestria</button>
            </div>
            {masteries.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>Nenhuma maestria.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {masteries.map(m => (
                  <div key={m.id} style={{ padding: '0.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ fontWeight: 'bold', color: 'var(--accent)' }}>{m.name}</div>
                      <button onClick={() => setDeleteTarget({ id: m.id, type: 'mastery', name: m.name })} style={{ background: 'transparent', border: 'none', color: '#ff4444', cursor: 'pointer' }}>
                        <Trash2 size={14} style={{ pointerEvents: 'none' }} />
                      </button>
                    </div>
                    {m.description && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{m.description}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Inventory */}
          <div className="glass-panel" style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3>Equipamentos</h3>
              <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => setShowItemModal(true)}>+ Add Item</button>
            </div>
            
            {inventory.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>Inventário vazio.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {inventory.map(item => (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', borderLeft: item.is_equipped ? '4px solid var(--accent)' : '4px solid transparent' }}>
                    <div>
                      <div style={{ fontWeight: 'bold' }}>{item.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>Tipo: {item.type}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', padding: '0.1rem' }}>
                        <button onClick={() => updateInventoryQuantity(item.id, -1)} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', padding: '0.2rem' }}><Minus size={12} /></button>
                        <span style={{ fontSize: '0.75rem', minWidth: '20px', textAlign: 'center' }}>{item.quantity || 1}</span>
                        <button onClick={() => updateInventoryQuantity(item.id, 1)} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', padding: '0.2rem' }}><Plus size={12} /></button>
                      </div>
                      <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => toggleEquip(item.id, item.type, item.is_equipped)}>
                        {item.is_equipped ? 'Desequipar' : 'Equipar'}
                      </button>
                      <button onClick={() => setDeleteTarget({ id: item.id, type: 'item', name: item.name })} style={{ background: 'transparent', border: 'none', color: '#ff4444', cursor: 'pointer' }}>
                        <Trash2 size={16} style={{ pointerEvents: 'none' }} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Combat & Skills */}
          <div className="glass-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3>Habilidades e Combate</h3>
              <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => setShowSkillModal(true)}>+ Add Skill</button>
            </div>
            
            {combatLog.length > 0 && (
              <div style={{ background: 'rgba(0,0,0,0.5)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid var(--border-subtle)', position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <h4 style={{ color: 'var(--secondary)', fontSize: '0.875rem' }}>Log de Combate</h4>
                  <button className="btn btn-secondary" style={{ padding: '0.2rem 0.4rem', fontSize: '0.75rem' }} onClick={() => setCombatLog([])} title="Limpar Log">
                    <Eraser size={14} /> Limpar
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {combatLog.map((log, i) => (
                    <div key={i} style={{ fontSize: '0.875rem', opacity: 1 - (i * 0.2) }}>{log}</div>
                  ))}
                </div>
              </div>
            )}

            {skills.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>Nenhuma habilidade cadastrada.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {skills.map(skill => (
                  <div key={skill.id} style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <div style={{ fontWeight: 'bold', color: skill.type === 'active' ? 'var(--primary-hover)' : 'var(--accent)' }}>{skill.name}</div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {skill.type === 'active' && (
                          <button className="btn btn-primary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => rollSkill(skill)}>
                            <Dices size={14} /> Rolar
                          </button>
                        )}
                        <button onClick={() => setDeleteTarget({ id: skill.id, type: 'skill', name: skill.name })} style={{ background: 'transparent', border: 'none', color: '#ff4444', cursor: 'pointer' }}>
                          <Trash2 size={16} style={{ pointerEvents: 'none' }} />
                        </button>
                      </div>
                    </div>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{skill.description}</p>
                    {skill.type === 'active' && (
                      <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        <span>Dado: {skill.dice_quantity}{skill.dice_type}</span>
                        <span style={{ textTransform: 'uppercase' }}>Atributo: {skill.attribute_used}</span>
                        <span>Custo: {skill.cost}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Item Modal */}
      {showItemModal && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content" style={{ maxWidth: '500px', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2>Novo Equipamento</h2>
              <button onClick={() => setShowItemModal(false)} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}><X /></button>
            </div>
            <form onSubmit={handleAddItem}>
              <div className="input-group">
                <label>Selecionar do Catálogo (Opcional)</label>
                <select className="input" onChange={e => {
                  const selected = globalItems.find(i => i.id === e.target.value);
                  if (selected) {
                    setItemForm({
                      ...itemForm,
                      name: selected.name,
                      type: selected.type,
                      bonus_hp: selected.bonus_hp,
                      bonus_str: selected.bonus_str,
                      bonus_aur: selected.bonus_aur,
                      bonus_int: selected.bonus_int,
                      bonus_dex: selected.bonus_dex,
                      bonus_aus: selected.bonus_aus,
                      bonus_def: selected.bonus_def,
                      bonus_res: selected.bonus_res,
                      bonus_fame: selected.bonus_fame
                    });
                  }
                }}>
                  <option value="">-- Criar Item Customizado --</option>
                  {globalItems.map(gi => (
                    <option key={gi.id} value={gi.id}>{gi.name} ({gi.type})</option>
                  ))}
                </select>
              </div>
              <div className="input-group">
                <label>Nome do Item</label>
                <input type="text" className="input" value={itemForm.name} onChange={e => setItemForm({...itemForm, name: e.target.value})} required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="input-group">
                  <label>Tipo</label>
                  <select className="input" value={itemForm.type} onChange={e => setItemForm({...itemForm, type: e.target.value})}>
                    <option value="capacete">Capacete</option>
                    <option value="peitoral">Peitoral</option>
                    <option value="perneta">Perneta</option>
                    <option value="bota">Bota</option>
                    <option value="arma">Arma</option>
                    <option value="acessorio">Acessório</option>
                  </select>
                </div>
                <div className="input-group">
                  <label>Quantidade</label>
                  <input type="number" className="input" value={itemForm.quantity} onChange={e => setItemForm({...itemForm, quantity: Number(e.target.value)})} min="1" />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                {statsList.map(stat => (
                  <div className="input-group" key={stat}>
                    <label style={{ textTransform: 'uppercase', fontSize: '0.75rem' }}>Bônus {stat}</label>
                    <input type="number" className="input" value={itemForm[`bonus_${stat}` as keyof typeof itemForm]} onChange={e => setItemForm({...itemForm, [`bonus_${stat}`]: Number(e.target.value)})} />
                  </div>
                ))}
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>Adicionar ao Inventário</button>
            </form>
          </div>
        </div>
      )}

      {/* Skill Modal */}
      {showSkillModal && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content" style={{ maxWidth: '500px', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2>Nova Habilidade</h2>
              <button onClick={() => setShowSkillModal(false)} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}><X /></button>
            </div>
            <form onSubmit={handleAddSkill}>
              <div className="input-group">
                <label>Nome</label>
                <input type="text" className="input" value={skillForm.name} onChange={e => setSkillForm({...skillForm, name: e.target.value})} required />
              </div>
              <div className="input-group">
                <label>Tipo</label>
                <select className="input" value={skillForm.type} onChange={e => setSkillForm({...skillForm, type: e.target.value})}>
                  <option value="active">Ativa</option>
                  <option value="passive">Passiva</option>
                </select>
              </div>
              <div className="input-group">
                <label>Descrição</label>
                <textarea className="input" value={skillForm.description} onChange={e => setSkillForm({...skillForm, description: e.target.value})} />
              </div>
              {skillForm.type === 'active' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="input-group">
                    <label>Dados (qtd)</label>
                    <input type="number" className="input" value={skillForm.dice_quantity} onChange={e => setSkillForm({...skillForm, dice_quantity: Number(e.target.value)})} />
                  </div>
                  <div className="input-group">
                    <label>Tipo Dado</label>
                    <select className="input" value={skillForm.dice_type} onChange={e => setSkillForm({...skillForm, dice_type: e.target.value})}>
                      <option value="d4">d4</option>
                      <option value="d6">d6</option>
                      <option value="d8">d8</option>
                      <option value="d10">d10</option>
                      <option value="d12">d12</option>
                      <option value="d20">d20</option>
                      <option value="d100">d100</option>
                    </select>
                  </div>
                  <div className="input-group">
                    <label>Atributo Base</label>
                    <select className="input" value={skillForm.attribute_used} onChange={e => setSkillForm({...skillForm, attribute_used: e.target.value})} style={{ textTransform: 'uppercase' }}>
                      {statsList.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="input-group">
                    <label>Custo Mana</label>
                    <input type="number" className="input" value={skillForm.cost} onChange={e => setSkillForm({...skillForm, cost: Number(e.target.value)})} />
                  </div>
                </div>
              )}
              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>Criar Habilidade</button>
            </form>
          </div>
        </div>
      )}

      {/* Mastery Modal */}
      {showMasteryModal && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content" style={{ maxWidth: '500px', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2>Nova Maestria</h2>
              <button onClick={() => setShowMasteryModal(false)} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}><X /></button>
            </div>
            <form onSubmit={handleAddMastery}>
              <div className="input-group">
                <label>Nome</label>
                <input type="text" className="input" value={masteryForm.name} onChange={e => setMasteryForm({...masteryForm, name: e.target.value})} required />
              </div>
              <div className="input-group">
                <label>Descrição</label>
                <textarea className="input" value={masteryForm.description} onChange={e => setMasteryForm({...masteryForm, description: e.target.value})} placeholder="Opcional..." />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>Salvar Maestria</button>
            </form>
          </div>
        </div>
      )}
      {/* Generic Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="modal-overlay" style={{ zIndex: 1000 }}>
          <div className="glass-panel modal-content animate-fade-in" style={{ maxWidth: '400px', width: '100%', textAlign: 'center' }}>
            <h2 style={{ color: '#ff4444', marginBottom: '1rem' }}>Confirmar Exclusão</h2>
            <p style={{ marginBottom: '2rem' }}>Deseja realmente excluir {deleteTarget.type === 'item' ? 'o item' : deleteTarget.type === 'skill' ? 'a habilidade' : 'a maestria'} <strong>{deleteTarget.name}</strong>?</p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button className="btn btn-secondary" onClick={() => setDeleteTarget(null)}>Cancelar</button>
              <button className="btn" style={{ background: '#ff4444' }} onClick={() => {
                if (deleteTarget.type === 'item') handleDeleteItem(deleteTarget.id);
                if (deleteTarget.type === 'skill') handleDeleteSkill(deleteTarget.id);
                if (deleteTarget.type === 'mastery') handleDeleteMastery(deleteTarget.id);
              }}>Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
