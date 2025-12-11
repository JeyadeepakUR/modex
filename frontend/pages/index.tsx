import { useEffect, useState } from 'react';
import Link from 'next/link';
import ResourceTable from '../components/ResourceTable';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api';

interface Resource {
  id: string;
  type: string;
  identifier: string;
}

export default function Home() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchResources();
  }, []);

  const fetchResources = async () => {
    try {
      const res = await fetch(`${API_BASE}/resources`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setResources(data);
      } else {
        console.error('Invalid data format:', data);
        setResources([]);
      }
    } catch (error) {
      console.error('Failed to fetch resources:', error);
      setResources([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>Hospital Hold System</h1>
      <div style={{ marginTop: '1rem', marginBottom: '2rem' }}>
        <Link href="/admin" style={{ marginRight: '1rem' }}>Admin</Link>
        <Link href="/analytics">Analytics</Link>
      </div>
      
      {loading ? (
        <p>Loading...</p>
      ) : (
        <ResourceTable resources={resources} />
      )}
    </div>
  );
}
