import { useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api';

interface Lock {
  id: string;
  resource_id: string;
  owner_id: string;
  status: string;
  ttl_seconds: number;
  created_at: string;
  last_heartbeat: string;
}

interface Props {
  resourceId: string;
  currentLock: Lock | null;
  onUpdate: () => void;
}

export default function LockPanel({ resourceId, currentLock, onUpdate }: Props) {
  const [ownerId, setOwnerId] = useState('');
  const [ttl, setTtl] = useState(300);
  const [message, setMessage] = useState('');

  const acquireLock = async () => {
    if (!ownerId) {
      setMessage('Please enter an owner ID');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/locks/acquire`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resource_id: resourceId, owner_id: ownerId, ttl_seconds: ttl })
      });
      
      if (res.ok) {
        setMessage('Lock acquired successfully');
        onUpdate();
      } else {
        const err = await res.json();
        setMessage(`Failed: ${err.detail}`);
      }
    } catch (error) {
      setMessage('Network error');
    }
  };

  const releaseLock = async () => {
    if (!ownerId) {
      setMessage('Please enter an owner ID');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/locks/release`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resource_id: resourceId, owner_id: ownerId })
      });
      
      if (res.ok) {
        setMessage('Lock released successfully');
        onUpdate();
      } else {
        const err = await res.json();
        setMessage(`Failed: ${err.detail}`);
      }
    } catch (error) {
      setMessage('Network error');
    }
  };

  const heartbeat = async () => {
    if (!ownerId) {
      setMessage('Please enter an owner ID');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/locks/heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resource_id: resourceId, owner_id: ownerId })
      });
      
      if (res.ok) {
        setMessage('Heartbeat sent');
        onUpdate();
      } else {
        const err = await res.json();
        setMessage(`Failed: ${err.detail}`);
      }
    } catch (error) {
      setMessage('Network error');
    }
  };

  return (
    <div style={{ padding: '1rem', border: '1px solid #ccc', borderRadius: '4px' }}>
      <h2>Lock Management</h2>

      {currentLock ? (
        <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
          <p><strong>Status:</strong> <span style={{
            padding: '0.25rem 0.5rem',
            borderRadius: '4px',
            backgroundColor: currentLock.status === 'HELD' ? '#4CAF50' : currentLock.status === 'EXPIRED' ? '#f44336' : '#999',
            color: 'white',
            fontSize: '0.85rem'
          }}>{currentLock.status}</span></p>
          <p><strong>Owner:</strong> {currentLock.owner_id}</p>
          <p><strong>TTL:</strong> {currentLock.ttl_seconds}s</p>
          <p><strong>Last Heartbeat:</strong> {new Date(currentLock.last_heartbeat).toLocaleString()}</p>
        </div>
      ) : (
        <p style={{ marginBottom: '1rem', color: '#666' }}>No active lock</p>
      )}

      <div style={{ marginBottom: '1rem' }}>
        <input
          type="text"
          placeholder="Owner ID"
          value={ownerId}
          onChange={e => setOwnerId(e.target.value)}
          style={{ marginRight: '0.5rem', padding: '0.5rem', width: '200px' }}
        />
        <input
          type="number"
          placeholder="TTL (seconds)"
          value={ttl}
          onChange={e => setTtl(Number(e.target.value))}
          style={{ padding: '0.5rem', width: '120px' }}
        />
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <button onClick={acquireLock} style={{ marginRight: '0.5rem', padding: '0.5rem 1rem', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          Acquire Lock
        </button>
        <button onClick={releaseLock} style={{ marginRight: '0.5rem', padding: '0.5rem 1rem', backgroundColor: '#f44336', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          Release Lock
        </button>
        <button onClick={heartbeat} style={{ padding: '0.5rem 1rem', backgroundColor: '#2196F3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          Send Heartbeat
        </button>
      </div>

      {message && <p style={{ color: message.includes('success') ? 'green' : 'red' }}>{message}</p>}
    </div>
  );
}
