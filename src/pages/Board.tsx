import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Sword, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface BoardEntity {
  id: string;
  character_id: string | null;
  monster_id: string | null;
  entity_type: 'character' | 'monster' | 'obstacle';
  pos_row: string;
  pos_col: number;
  name?: string;
  current_hp: number | null;
  current_mana: number | null;
  max_hp: number | null;
  max_mana: number | null;
  character?: {
    id: string;
    name: string;
    user_id: string;
  };
  monster?: any;
}

interface Skill {
  id: string;
  name: string;
  description: string;
  dice_type: string;
  dice_quantity: number;
  attribute_used: string;
  cost: number;
  range: string;
}

export const Board: React.FC = () => {
  const { role, user } = useAuth();
  const currentUserId = user?.id;
  
  const [characters, setCharacters] = useState<any[]>([]);
  const [monsters, setMonsters] = useState<any[]>([]);
  const [entities, setEntities] = useState<BoardEntity[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<{type: string, id: string, name: string, data: any} | null>(null);
  
  const [actionMenuEntity, setActionMenuEntity] = useState<BoardEntity | null>(null);
  const [movingEntity, setMovingEntity] = useState<BoardEntity | null>(null);
  const [attackingEntity, setAttackingEntity] = useState<BoardEntity | null>(null);
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [entitySkills, setEntitySkills] = useState<Skill[]>([]);
  const [damageResult, setDamageResult] = useState<{total: number, rolls: number[]} | null>(null);

  const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'];
  const cols = Array.from({ length: 12 }, (_, i) => i + 1);

  useEffect(() => {
    fetchData();
    const subscription = supabase
      .channel('board_changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'board_entities' }, async (payload) => {
        const { data } = await supabase.from('board_entities').select('*, character:characters(*, attributes(*)), monster:monsters(*)').eq('id', payload.new.id).single();
        if (data) setEntities(prev => [...prev.filter(e => e.id !== data.id), data]);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'board_entities' }, (payload) => {
        setEntities(prev => prev.map(e => e.id === payload.new.id ? { ...e, ...payload.new } : e));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'board_entities' }, (payload) => {
        setEntities(prev => prev.filter(e => e.id !== payload.old.id));
      })
      .subscribe();

    return () => { supabase.removeChannel(subscription); };
  }, [role]);

  const fetchData = async () => {
    await Promise.all([fetchEntities(), fetchCharacters(), fetchMonsters()]);
  };

  const fetchEntities = async () => {
    const { data } = await supabase.from('board_entities').select('*, character:characters(*, attributes(*)), monster:monsters(*)');
    if (data) setEntities(data);
  };

  const fetchCharacters = async () => {
    const { data } = await supabase.from('characters').select('*, attributes(*)');
    if (data) setCharacters(data);
  };

  const fetchMonsters = async () => {
    const { data } = await supabase.from('monsters').select('*');
    if (data) setMonsters(data);
  };

  const fetchSkillsForEntity = async (entity: BoardEntity) => {
    const query = supabase.from('skills').select('*');
    if (entity.character_id) query.eq('character_id', entity.character_id);
    else if (entity.monster_id) query.eq('monster_id', entity.monster_id);
    else return;
    const { data } = await query;
    if (data) setEntitySkills(data);
  };

  const canControl = (entity: BoardEntity) => {
    if (role === 'admin') return true;
    if (entity.entity_type === 'character' && entity.character?.user_id === currentUserId) return true;
    return false;
  };

  const isAdjacent = (r1: string, c1: number, r2: string, c2: number) => {
    const rowIdx1 = rows.indexOf(r1);
    const rowIdx2 = rows.indexOf(r2);
    return Math.abs(rowIdx1 - rowIdx2) <= 1 && Math.abs(c1 - c2) <= 1 && !(r1 === r2 && c1 === c2);
  };

  const handleCellClick = async (row: string, col: number) => {
    const existing = entities.find(e => e.pos_row === row && e.pos_col === col);

    if (attackingEntity && selectedSkill) {
      if (!existing || existing.id === attackingEntity.id) return;
      if (!isAdjacent(attackingEntity.pos_row, attackingEntity.pos_col, row, col)) {
        alert('Alvo deve estar adjacente!');
        return;
      }
      executeAttack(existing);
      return;
    }

    if (movingEntity) {
      if (existing) { alert('Ocupado!'); return; }
      if (!isAdjacent(movingEntity.pos_row, movingEntity.pos_col, row, col)) { alert('Movimento inválido!'); return; }
      setEntities(prev => prev.map(e => e.id === movingEntity.id ? { ...e, pos_row: row, pos_col: col } : e));
      const { error } = await supabase.from('board_entities').update({ pos_row: row, pos_col: col }).eq('id', movingEntity.id);
      if (error) fetchEntities();
      setMovingEntity(null);
      return;
    }

    if (!selectedEntity && existing && existing.entity_type !== 'obstacle') {
      if (!canControl(existing)) {
        alert('Você não tem permissão para controlar esta unidade.');
        return;
      }
      setActionMenuEntity(existing);
      fetchSkillsForEntity(existing);
      return;
    }

    if (!selectedEntity) return;
    if (role !== 'admin') {
      alert('Apenas o Mestre pode posicionar novas unidades.');
      return;
    }

    if (existing) await supabase.from('board_entities').delete().eq('id', existing.id);
    
    let hp = 0, mana = 0, mHp = 100, mMana = 100;
    if (selectedEntity.type === 'character') {
      const char = selectedEntity.data;
      const attrs = char.attributes?.[0] || {};
      mHp = (attrs.hp_base || 0) + (attrs.hp_achiev || 0);
      mMana = (attrs.aus_base || 0) + (attrs.aus_achiev || 0);
      hp = char.current_hp;
      mana = char.current_mana;
    } else if (selectedEntity.type === 'monster') {
      const mon = selectedEntity.data;
      mHp = (mon.hp_base || 0) + (mon.hp_achiev || 0);
      mMana = (mon.aus_base || 0) + (mon.aus_achiev || 0);
      hp = mHp; mana = mMana;
    }

    await supabase.from('board_entities').insert({
      entity_type: selectedEntity.type,
      character_id: selectedEntity.type === 'character' ? selectedEntity.id : null,
      monster_id: selectedEntity.type === 'monster' ? selectedEntity.id : null,
      pos_row: row,
      pos_col: col,
      name: selectedEntity.name, // Now storing name for characters and monsters too
      current_hp: hp,
      current_mana: mana,
      max_hp: mHp,
      max_mana: mMana
    });
    setSelectedEntity(null);
  };

  const executeAttack = async (target: BoardEntity) => {
    if (!selectedSkill) return;
    const { total, rolls } = rollDice(selectedSkill.dice_quantity || 1, selectedSkill.dice_type || 'd6');
    setDamageResult({ total, rolls });

    const newHp = Math.max(0, (target.current_hp || 0) - total);
    setEntities(prev => prev.map(e => e.id === target.id ? { ...e, current_hp: newHp } : e));
    await supabase.from('board_entities').update({ current_hp: newHp }).eq('id', target.id);

    if (target.character_id) {
      await supabase.from('characters').update({ current_hp: newHp }).eq('id', target.character_id);
    }

    if (attackingEntity) {
      const newMana = Math.max(0, (attackingEntity.current_mana || 0) - (selectedSkill.cost || 0));
      setEntities(prev => prev.map(e => e.id === attackingEntity.id ? { ...e, current_mana: newMana } : e));
      await supabase.from('board_entities').update({ current_mana: newMana }).eq('id', attackingEntity.id);
      if (attackingEntity.character_id) {
        await supabase.from('characters').update({ current_mana: newMana }).eq('id', attackingEntity.character_id);
      }
    }
  };

  const rollDice = (qty: number, type: string) => {
    const sides = parseInt(type.replace('d', '')) || 6;
    const rolls = Array.from({ length: qty }, () => Math.floor(Math.random() * sides) + 1);
    const total = rolls.reduce((a, b) => a + b, 0);
    return { total, rolls };
  };

  const resetActions = () => {
    setActionMenuEntity(null);
    setMovingEntity(null);
    setAttackingEntity(null);
    setSelectedSkill(null);
    setDamageResult(null);
  };

  const renderCellContent = (row: string, col: number) => {
    const entity = entities.find(e => e.pos_row === row && e.pos_col === col);
    if (!entity) return null;

    // Always use entity.name as fallback, which is now populated for all types
    let name = entity.name || (entity.entity_type === 'character' ? entity.character?.name : entity.monster?.name) || 'Unknown';
    let bgColor = 'rgba(255,255,255,0.1)', textColor = 'white';

    if (entity.entity_type === 'character') {
      bgColor = 'rgba(34, 197, 94, 0.2)'; textColor = '#4ade80';
    } else if (entity.entity_type === 'monster') {
      bgColor = 'rgba(239, 68, 68, 0.2)'; textColor = '#f87171';
    } else if (entity.entity_type === 'obstacle') {
      bgColor = 'rgba(59, 130, 246, 0.2)'; textColor = '#60a5fa';
    }

    const hpPercent = ((entity.current_hp || 0) / (entity.max_hp || 1)) * 100;
    const manaPercent = ((entity.current_mana || 0) / (entity.max_mana || 1)) * 100;

    const isMoving = movingEntity?.id === entity.id;
    const isAttacking = attackingEntity?.id === entity.id;
    const isMenu = actionMenuEntity?.id === entity.id;
    const isMine = entity.character?.user_id === currentUserId;

    return (
      <div style={{ 
        position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2px',
        background: isMoving ? 'rgba(147, 51, 234, 0.4)' : (isAttacking ? 'rgba(239, 68, 68, 0.4)' : (isMenu ? 'rgba(255,255,255,0.2)' : bgColor)),
        borderRadius: '4px', border: (isMoving || isAttacking || isMenu) ? '2px solid var(--primary)' : (isMine ? '1px solid rgba(255,255,255,0.3)' : 'none'), zIndex: (isMoving || isAttacking || isMenu) ? 5 : 1
      }}>
        {role === 'admin' && (
          <button onClick={(e) => { e.stopPropagation(); supabase.from('board_entities').delete().eq('id', entity.id); }}
            style={{ position: 'absolute', top: '2px', right: '2px', background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', color: 'white', width: '14px', height: '14px', fontSize: '10px', cursor: 'pointer', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            ×
          </button>
        )}
        <div style={{ fontWeight: '900', fontSize: '1.1rem', color: textColor }}>{name.substring(0, 3).toUpperCase()}</div>
        <div style={{ fontSize: '8px', opacity: 0.7, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%', textAlign: 'center' }}>{name}</div>
        {entity.entity_type !== 'obstacle' && (
          <div style={{ width: '90%', marginTop: 'auto', paddingBottom: '4px' }}>
            <div className="status-bar-container" style={{ height: '4px', border: 'none', background: 'rgba(0,0,0,0.5)' }}>
              <div className="status-bar-fill health-fill" style={{ width: `${hpPercent}%` }}></div>
            </div>
            <div className="status-bar-container" style={{ height: '4px', border: 'none', background: 'rgba(0,0,0,0.5)', marginTop: '1px' }}>
              <div className="status-bar-fill mana-fill" style={{ width: `${manaPercent}%` }}></div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="container" style={{ maxWidth: '100%' }}>
      <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <h1 className="title-glow">Tabuleiro de Combate</h1>
          {role === 'admin' && <span style={{ background: 'var(--accent)', color: 'black', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><ShieldCheck size={14}/> MESTRE</span>}
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', background: 'rgba(0,0,0,0.3)', padding: '0.5rem 1rem', borderRadius: '20px', border: '1px solid var(--border-subtle)' }}>
          {movingEntity ? `Movendo: clique adjacente` : 
           attackingEntity ? (selectedSkill ? `Atacando com ${selectedSkill.name}` : 'Selecione habilidade') :
           selectedEntity ? `Colocando ${selectedEntity.name}` : 'Clique em sua unidade para agir'}
        </div>
      </div>

      <div className="responsive-grid" style={{ gridTemplateColumns: '1fr 320px' }}>
        <div className="glass-panel" style={{ padding: '1rem', overflowX: 'auto', position: 'relative' }}>
          <div style={{ display: 'inline-grid', gridTemplateColumns: `40px repeat(12, 60px)`, gap: '2px', background: 'var(--border-subtle)', padding: '2px', borderRadius: '8px' }}>
            <div style={{ height: '40px' }}></div>
            {cols.map(c => <div key={c} style={{ height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: 'var(--text-muted)' }}>{c}</div>)}
            {rows.map(r => (
              <React.Fragment key={r}>
                <div style={{ width: '40px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: 'var(--text-muted)' }}>{r}</div>
                {cols.map(c => {
                  const isMoveTarget = movingEntity && isAdjacent(movingEntity.pos_row, movingEntity.pos_col, r, c);
                  const isAttackTarget = attackingEntity && selectedSkill && isAdjacent(attackingEntity.pos_row, attackingEntity.pos_col, r, c);
                  return (
                    <div key={`${r}${c}`} onClick={() => handleCellClick(r, c)} className="glass-panel board-cell" 
                      style={{ width: '60px', height: '60px', padding: '0', borderRadius: '4px', cursor: 'pointer',
                        background: isMoveTarget ? 'rgba(34, 197, 94, 0.15)' : (isAttackTarget ? 'rgba(239, 68, 68, 0.15)' : 'rgba(0,0,0,0.2)'),
                        border: isMoveTarget ? '1px dashed #22c55e' : (isAttackTarget ? '1px dashed #ef4444' : '1px solid var(--border-subtle)') }}>
                      {renderCellContent(r, c)}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>

          {actionMenuEntity && (
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 100, background: 'var(--bg-panel-solid)', padding: '1.5rem', borderRadius: '12px', border: '2px solid var(--primary)', boxShadow: '0 0 30px rgba(0,0,0,0.8)', textAlign: 'center' }}>
              <h3 style={{ marginBottom: '1rem' }}>Ações de {actionMenuEntity.character?.name || actionMenuEntity.monster?.name}</h3>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button className="btn btn-primary" onClick={() => { setMovingEntity(actionMenuEntity); setActionMenuEntity(null); }}>Movimentar</button>
                <button className="btn" style={{ background: 'var(--health-bg)' }} onClick={() => { setAttackingEntity(actionMenuEntity); setActionMenuEntity(null); }}>Atacar</button>
              </div>
              <button className="btn btn-secondary" style={{ marginTop: '1rem', width: '100%' }} onClick={() => setActionMenuEntity(null)}>Cancelar</button>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {attackingEntity ? (
            <div className="glass-panel animate-fade-in" style={{ border: '1px solid #ef4444' }}>
              <h3 style={{ marginBottom: '1rem', color: '#ef4444' }}><Sword size={20} /> Habilidades</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {entitySkills.map(skill => (
                  <button key={skill.id} className={`btn ${selectedSkill?.id === skill.id ? 'btn-primary' : 'btn-secondary'}`} style={{ textAlign: 'left', flexDirection: 'column', alignItems: 'flex-start' }} onClick={() => setSelectedSkill(skill)}>
                    <div style={{ fontWeight: 'bold' }}>{skill.name} ({skill.dice_quantity}{skill.dice_type})</div>
                    <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>Custo: {skill.cost} Mana</div>
                  </button>
                ))}
              </div>
              {damageResult && (
                <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(0,0,0,0.4)', borderRadius: '8px', textAlign: 'center', border: '1px solid var(--accent)' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--accent)' }}>{damageResult.total}</div>
                  <div style={{ fontSize: '0.75rem' }}>Dados: {damageResult.rolls.join(' + ')}</div>
                </div>
              )}
              <button className="btn btn-danger" style={{ marginTop: '1rem', width: '100%' }} onClick={resetActions}>Encerrar Turno</button>
            </div>
          ) : (
            <>
              {role === 'admin' ? (
                <>
                  <div className="glass-panel" style={{ border: '1px solid var(--primary)' }}>
                    <h3 style={{ marginBottom: '1rem' }}>Painel do Mestre</h3>
                    <h4 style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>Personagens</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '150px', overflowY: 'auto', marginBottom: '1rem' }}>
                      {characters.map(char => <button key={char.id} className={`btn ${selectedEntity?.id === char.id ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setSelectedEntity({ type: 'character', id: char.id, name: char.name, data: char }); resetActions(); }}>{char.name}</button>)}
                    </div>
                    <h4 style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>Monstros</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '150px', overflowY: 'auto' }}>
                      {monsters.map(m => <button key={m.id} className={`btn ${selectedEntity?.id === m.id ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setSelectedEntity({ type: 'monster', id: m.id, name: m.name, data: m }); resetActions(); }}>{m.name}</button>)}
                    </div>
                  </div>
                  <div className="glass-panel"><h3>Obstáculos</h3>
                    <button className={`btn ${selectedEntity?.type === 'obstacle' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setSelectedEntity({ type: 'obstacle', id: 'obs', name: 'Obstáculo', data: null }); resetActions(); }}>Obstáculo</button>
                  </div>
                </>
              ) : (
                <div className="glass-panel" style={{ textAlign: 'center' }}>
                  <ShieldCheck size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem', opacity: 0.5 }} />
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Apenas o mestre pode posicionar novas unidades e remover elementos do tabuleiro.</p>
                  <p style={{ color: 'var(--accent)', fontSize: '0.75rem', marginTop: '0.5rem' }}>Você pode controlar seus próprios personagens já posicionados.</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
