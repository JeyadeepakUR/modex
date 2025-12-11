import { useEffect, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api';

interface MLSuggestion {
  suggested_ttl: number;
  anomaly_score: number;
}

interface Props {
  resourceId: string;
}

export default function TTLInsight({ resourceId }: Props) {
  const [suggestion, setSuggestion] = useState<MLSuggestion | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSuggestion();
  }, [resourceId]);

  const fetchSuggestion = async () => {
    try {
      const res = await fetch(`${API_BASE}/ml/suggest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resource_id: resourceId, owner_id: 'ui-insight' })
      });
      const data = await res.json();
      setSuggestion(data);
    } catch (error) {
      console.error('Failed to fetch ML suggestion:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading ML insights...</div>;
  if (!suggestion) return <div>No ML insights available</div>;

  return (
    <div style={{ padding: '1rem', border: '1px solid #ccc', borderRadius: '4px', backgroundColor: '#f9f9f9' }}>
      <h3>ML-Based TTL Insight</h3>
      <p><strong>Suggested TTL:</strong> {suggestion.suggested_ttl} seconds</p>
      <p>
        <strong>Anomaly Score:</strong>{' '}
        <span style={{
          padding: '0.25rem 0.5rem',
          borderRadius: '4px',
          backgroundColor: suggestion.anomaly_score > 0.5 ? '#f44336' : suggestion.anomaly_score > 0.2 ? '#ff9800' : '#4CAF50',
          color: 'white',
          fontSize: '0.85rem'
        }}>
          {suggestion.anomaly_score.toFixed(3)}
        </span>
      </p>
      <p style={{ fontSize: '0.9rem', color: '#666', marginTop: '0.5rem' }}>
        {suggestion.anomaly_score > 0.5 
          ? '⚠️ High variance detected - lock usage pattern is inconsistent'
          : suggestion.anomaly_score > 0.2
          ? '⚡ Moderate variance - consider reviewing lock duration'
          : '✓ Stable lock usage pattern'}
      </p>
    </div>
  );
}
