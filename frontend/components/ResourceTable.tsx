import Link from 'next/link';

interface Resource {
  id: string;
  type: string;
  identifier: string;
}

interface Props {
  resources: Resource[];
}

export default function ResourceTable({ resources }: Props) {
  if (!resources || !Array.isArray(resources)) {
    return <p>No resources available.</p>;
  }

  if (resources.length === 0) {
    return <p>No resources found.</p>;
  }

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr style={{ borderBottom: '2px solid #333' }}>
          <th style={{ padding: '0.5rem', textAlign: 'left' }}>Type</th>
          <th style={{ padding: '0.5rem', textAlign: 'left' }}>Identifier</th>
          <th style={{ padding: '0.5rem', textAlign: 'left' }}>Actions</th>
        </tr>
      </thead>
      <tbody>
        {resources.map(resource => (
          <tr key={resource.id} style={{ borderBottom: '1px solid #ddd' }}>
            <td style={{ padding: '0.5rem' }}>{resource.type}</td>
            <td style={{ padding: '0.5rem' }}>{resource.identifier}</td>
            <td style={{ padding: '0.5rem' }}>
              <Link href={`/resource/${resource.id}`} style={{ color: '#0070f3' }}>
                View Details
              </Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
