interface StatsCardProps {
  title: string;
  value: number | string;
}

export function StatsCard({ title, value }: StatsCardProps) {
  return (
    <div className="stats-card">
      <h3 className="stats-card-title">{title}</h3>
      <p className="stats-card-value">{value}</p>
    </div>
  );
}
