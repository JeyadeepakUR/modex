import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import LockPanel from '../../components/LockPanel';
import TTLInsight from '../../components/TTLInsight';

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

export default function ResourcePage() {
  const router = useRouter();
  const { id } = router.query;
  const [resource, setResource] = useState<Resource | null>(null);
  const [lock, setLock] = useState<Lock | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetchData();
    const interval = setInterval(fetchData, 2000);
    return () => clearInterval(interval);
  }, [id]);

  const fetchData = async () => {
    try {
      const resData = await fetch(`${API_BASE}/resources/${id}`).then(r => r.json());
      setResource(resData);
      
      try {
        const lockData = await fetch(`${API_BASE}/locks/${id}`).then(r => r.json());
        setLock(lockData);
      } catch {
        setLock(null);
      }
    } catch (error) {
      console.error('Failed to fetch resource:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div style={{ padding: '2rem' }}>Loading...</div>;
  if (!resource) return <div style={{ padding: '2rem' }}>Resource not found</div>;

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <button onClick={() => router.back()} style={{ marginBottom: '1rem', padding: '0.5rem 1rem' }}>
        ← Back
      </button>
      
      <h1>Resource: {resource.type} / {resource.identifier}</h1>
      <p>ID: {resource.id}</p>

      <div style={{ marginTop: '2rem' }}>
        <LockPanel resourceId={resource.id} currentLock={lock} onUpdate={fetchData} />
      </div>

      <div style={{ marginTop: '2rem' }}>
        <TTLInsight resourceId={resource.id} />
      </div>
    </div>
  );
}
