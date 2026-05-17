import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Map as MapIcon, ZoomIn, ZoomOut, Maximize } from 'lucide-react';

interface GameMap {
  id: string;
  name: string;
  description: string;
  image_url: string;
}

export const Maps: React.FC = () => {
  const [maps, setMaps] = useState<GameMap[]>([]);
  const [selectedMap, setSelectedMap] = useState<GameMap | null>(null);
  const [loading, setLoading] = useState(true);

  // Pan and Zoom state
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMaps();
  }, []);

  const fetchMaps = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('maps')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setMaps(data);
      if (data.length > 0) {
        setSelectedMap(data[0]);
      }
    }
    setLoading(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomSensitivity = 0.001;
    const delta = -e.deltaY * zoomSensitivity;
    const newScale = Math.min(Math.max(0.5, scale + delta), 4);
    setScale(newScale);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  const resetView = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.2, 4));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.5));

  return (
    <div className="container" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="flex-between" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <h1 className="title-glow">Mapas de Austrum</h1>
        </div>
        
        {maps.length > 0 && (
          <select 
            className="input" 
            style={{ width: 'auto', minWidth: '200px' }}
            value={selectedMap?.id || ''}
            onChange={(e) => {
              const map = maps.find(m => m.id === e.target.value);
              setSelectedMap(map || null);
              resetView();
            }}
          >
            {maps.map(map => (
              <option key={map.id} value={map.id}>{map.name}</option>
            ))}
          </select>
        )}
      </div>

      <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '1rem', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <MapIcon size={48} className="animate-spin" style={{ opacity: 0.5 }} />
          </div>
        ) : selectedMap ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', alignItems: 'center' }}>
              <p style={{ color: 'var(--text-muted)' }}>{selectedMap.description}</p>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-secondary" style={{ padding: '0.5rem' }} onClick={handleZoomOut} title="Afastar">
                  <ZoomOut size={18} />
                </button>
                <button className="btn btn-secondary" style={{ padding: '0.5rem' }} onClick={resetView} title="Centralizar">
                  <Maximize size={18} />
                </button>
                <button className="btn btn-secondary" style={{ padding: '0.5rem' }} onClick={handleZoomIn} title="Aproximar">
                  <ZoomIn size={18} />
                </button>
              </div>
            </div>

            <div 
              ref={containerRef}
              style={{ 
                flex: 1, 
                background: 'rgba(0,0,0,0.5)', 
                borderRadius: '8px', 
                overflow: 'hidden',
                position: 'relative',
                cursor: isDragging ? 'grabbing' : 'grab',
                border: '1px solid var(--border-subtle)'
              }}
              onWheel={handleWheel}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
            >
              <div 
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px)) scale(${scale})`,
                  transformOrigin: 'center',
                  transition: isDragging ? 'none' : 'transform 0.1s ease-out'
                }}
              >
                <img 
                  src={selectedMap.image_url} 
                  alt={selectedMap.name} 
                  style={{ 
                    display: 'block',
                    maxWidth: 'none',
                    userSelect: 'none',
                    pointerEvents: 'none',
                    border: '4px solid var(--bg-panel-solid)',
                    boxShadow: '0 0 20px rgba(0,0,0,0.8)'
                  }} 
                  draggable={false}
                />
              </div>
            </div>
            <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
              Use o scroll do mouse para dar zoom, e clique e arraste para mover o mapa.
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-muted)' }}>
            <MapIcon size={64} style={{ opacity: 0.2, marginBottom: '1rem' }} />
            <p>Nenhum mapa disponível no momento.</p>
          </div>
        )}
      </div>
    </div>
  );
};
