import { formatCurrency } from '../../lib/currency';
import type { VehicleFinancialSummary as Summary } from '../../lib/vehicleFinancials';

export function VehicleFinancialSummary({ summary }: { summary: Summary }) {
  const items = [
    ['Purchase Cost', summary.acquisitionCost],
    ['Added Costs', summary.addedCosts],
    ['Total Invested', summary.totalInvested],
    ['Projected Gross Profit', summary.projectedGrossProfit],
  ] as const;

  return (
    <section aria-label="Vehicle financial summary" className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {items.map(([label, amount]) => (
        <div key={label} className="rounded border p-3">
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-lg font-semibold">{formatCurrency(amount)}</p>
        </div>
      ))}
    </section>
  );
}
