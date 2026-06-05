import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

export default function RiskPriorities() {
  const { data, isLoading } = useQuery(['priorities'], () => api.getPrioritizedRisks((window.location.pathname.split('/')[2]) || ''), { enabled: true });
  const items = data?.items ?? [];

  const top5 = items.slice(0,5);

  return (
    <div>
      <h3>Risk priorities</h3>
      {isLoading ? <p>Loading…</p> : (
        <div className="priority-list">
          {top5.map((it: any) => (
            <div className={`priority-card priority-${it.level.toLowerCase()}`} key={`${it.package.id}-${it.vulnerability.id}`}>
              <div className="priority-header">
                <strong>{it.package.name}@{it.package.version}</strong>
                <span className="pill pill-small">{it.level}</span>
              </div>
              <div className="priority-body">
                <div className="priority-score">Score: {it.score}</div>
                <div className="priority-reason">Why: {it.reasons.join('; ')}</div>
                <div className="priority-action">Action: {it.recommendedAction}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
