import { useEffect, useState } from 'react';
import ResourceTable from '../components/ResourceTable';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api';

interface Resource {
  id: string;
  type: string;
  identifier: string;
}

interface Lock {
  id: string;
  resource_id: string;
  owner_id: string;
  status: string;
  ttl_seconds: number;
  created_at: string;
  last_heartbeat: string;
}

export default function Admin() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [locks, setLocks] = useState<Lock[]>([]);
  const [type, setType] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [resData, lockData] = await Promise.all([
        fetch(`${API_BASE}/resources`).then(r => r.json()),
        fetch(`${API_BASE}/locks`).then(r => r.json())
      ]);
      setResources(Array.isArray(resData) ? resData : []);
      setLocks(Array.isArray(lockData) ? lockData : []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      setResources([]);
      setLocks([]);
    }
  };

  const createResource = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/resources`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, identifier })
      });
      if (res.ok) {
        setMessage('Resource created');
        setType('');
        setIdentifier('');
        fetchData();
      } else {
        const err = await res.json();
        setMessage(`Error: ${err.detail}`);
      }
    } catch (error) {
      setMessage('Failed to create resource');
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>Admin Panel</h1>
      
      <div style={{ marginBottom: '2rem', padding: '1rem', border: '1px solid #ccc', borderRadius: '4px' }}>
        <h2>Create Resource</h2>
        <form onSubmit={createResource}>
          <input
            type="text"
            placeholder="Type"
            value={type}
            onChange={e => setType(e.target.value)}
            required
            style={{ marginRight: '0.5rem', padding: '0.5rem' }}
          />
          <input
            type="text"
            placeholder="Identifier"
            value={identifier}
            onChange={e => setIdentifier(e.target.value)}
            required
            style={{ marginRight: '0.5rem', padding: '0.5rem' }}
          />
          <button type="submit" style={{ padding: '0.5rem 1rem' }}>Create</button>
        </form>
        {message && <p style={{ marginTop: '0.5rem', color: message.startsWith('Error') ? 'red' : 'green' }}>{message}</p>}
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <h2>Resources</h2>
        <ResourceTable resources={resources} />
      </div>

      <div>
        <h2>Active Locks</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #333' }}>
              <th style={{ padding: '0.5rem', textAlign: 'left' }}>Resource ID</th>
              <th style={{ padding: '0.5rem', textAlign: 'left' }}>Owner</th>
              <th style={{ padding: '0.5rem', textAlign: 'left' }}>Status</th>
              <th style={{ padding: '0.5rem', textAlign: 'left' }}>TTL (s)</th>
              <th style={{ padding: '0.5rem', textAlign: 'left' }}>Last Heartbeat</th>
            </tr>
          </thead>
          <tbody>
            {Array.isArray(locks) && locks.length > 0 ? (
              locks.map(lock => (
                <tr key={lock.id} style={{ borderBottom: '1px solid #ddd' }}>
                  <td style={{ padding: '0.5rem' }}>{lock.resource_id}</td>
                  <td style={{ padding: '0.5rem' }}>{lock.owner_id}</td>
                  <td style={{ padding: '0.5rem' }}>
                    <span style={{
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      backgroundColor: lock.status === 'HELD' ? '#4CAF50' : lock.status === 'EXPIRED' ? '#f44336' : '#999',
                      color: 'white',
                      fontSize: '0.85rem'
                    }}>
                      {lock.status}
                    </span>
                  </td>
                  <td style={{ padding: '0.5rem' }}>{lock.ttl_seconds}</td>
                  <td style={{ padding: '0.5rem' }}>{new Date(lock.last_heartbeat).toLocaleString()}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} style={{ padding: '1rem', textAlign: 'center', color: '#666' }}>
                  No locks found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
