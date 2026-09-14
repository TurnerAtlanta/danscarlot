import { formatCurrency } from '../../lib/currency';
import type { VehicleCostActivity } from '../../types/vehicleActivity';

export function VehicleActivityList({ activities }: { activities: VehicleCostActivity[] }) {
  if (activities.length === 0) return <p>No maintenance, repair, cleanup, or marketing costs entered.</p>;

  return (
    <div className="space-y-2">
      {activities.map((activity) => (
        <article key={activity.id} className="rounded border p-3">
          <div className="flex justify-between gap-3">
            <div>
              <p className="font-medium">{activity.category}: {activity.description}</p>
              <p className="text-sm text-gray-500">{activity.activityDate}{activity.vendor ? ` · ${activity.vendor}` : ''}</p>
            </div>
            <p className="font-semibold">{formatCurrency(activity.amount)}</p>
          </div>
        </article>
      ))}
    </div>
  );
}
