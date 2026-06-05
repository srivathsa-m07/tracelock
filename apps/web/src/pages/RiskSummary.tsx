
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import Card from '../ui/Card';
import Chart from '../ui/Chart';

export default function RiskSummary() {
  const { scanId } = useParams();
  const { data } = useQuery(['risk', scanId], () => api.getRiskSummary(scanId as string), { enabled: !!scanId });

  if (!data) return <div>Loading...</div>;

  return (
    <div>
      <h1>Risk Summary</h1>
      <div className="grid">
        <div className="grid-col-6">
          <Card title="Top Risk">
            <ul>
              {data.top.map((t: any) => (
                <li key={t.id}>{t.id} — {t.riskScore}</li>
              ))}
            </ul>
          </Card>
        </div>
        <div className="grid-col-6">
          <Card title="Distribution">
            <Chart data={[]} />
          </Card>
        </div>
      </div>
    </div>
  );
}
