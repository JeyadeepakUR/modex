import { useEffect, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api';

interface Resource {
  id: string;
  type: string;
  identifier: string;
}

interface MLSuggestion {
  suggested_ttl: number;
  anomaly_score: number;
}

export default function Analytics() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [insights, setInsights] = useState<Record<string, MLSuggestion>>({});

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const resData = await fetch(`${API_BASE}/resources`).then(r => r.json());
      setResources(resData);

      const insightPromises = resData.map(async (res: Resource) => {
        try {
          const ml = await fetch(`${API_BASE}/ml/suggest`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ resource_id: res.id, owner_id: 'analytics' })
          }).then(r => r.json());
          return [res.id, ml];
        } catch {
          return [res.id, null];
        }
      });

      const results = await Promise.all(insightPromises);
      const insightsMap = Object.fromEntries(results.filter(([_, ml]) => ml));
      setInsights(insightsMap);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>Analytics Dashboard</h1>
      <p>ML-based anomaly detection and TTL suggestions</p>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '2rem' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #333' }}>
            <th style={{ padding: '0.5rem', textAlign: 'left' }}>Resource</th>
            <th style={{ padding: '0.5rem', textAlign: 'left' }}>Type</th>
            <th style={{ padding: '0.5rem', textAlign: 'left' }}>Suggested TTL (s)</th>
            <th style={{ padding: '0.5rem', textAlign: 'left' }}>Anomaly Score</th>
          </tr>
        </thead>
        <tbody>
          {resources.map(res => {
            const insight = insights[res.id];
            return (
              <tr key={res.id} style={{ borderBottom: '1px solid #ddd' }}>
                <td style={{ padding: '0.5rem' }}>{res.identifier}</td>
                <td style={{ padding: '0.5rem' }}>{res.type}</td>
                <td style={{ padding: '0.5rem' }}>
                  {insight ? insight.suggested_ttl : 'N/A'}
                </td>
                <td style={{ padding: '0.5rem' }}>
                  {insight ? (
                    <span style={{
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      backgroundColor: insight.anomaly_score > 0.5 ? '#f44336' : insight.anomaly_score > 0.2 ? '#ff9800' : '#4CAF50',
                      color: 'white',
                      fontSize: '0.85rem'
                    }}>
                      {insight.anomaly_score.toFixed(3)}
                    </span>
                  ) : 'N/A'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
