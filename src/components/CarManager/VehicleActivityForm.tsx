import type { FormEvent } from 'react';
import type { VehicleActivityCategory, VehicleCostActivityInput } from '../../types/vehicleActivity';

export const vehicleActivityCategories: VehicleActivityCategory[] = [
  'Cleanup / Detail',
  'Repair',
  'Service / Maintenance',
  'Parts',
  'Transport / Tow',
  'Inspection',
  'Title / Registration',
  'Auction / Purchase Fee',
  'Marketing / Advertising',
  'Photography',
  'Other',
];

export function VehicleActivityForm({
  initialValue,
  onSubmit,
}: {
  initialValue?: Partial<VehicleCostActivityInput>;
  onSubmit: (value: VehicleCostActivityInput) => Promise<void> | void;
}) {
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const amount = Number(form.get('amount'));
    if (!Number.isFinite(amount) || amount <= 0) return;

    await onSubmit({
      activityDate: String(form.get('activityDate')),
      category: String(form.get('category')) as VehicleActivityCategory,
      description: String(form.get('description')).trim(),
      vendor: String(form.get('vendor')).trim() || null,
      amount,
      fundingSource: String(form.get('fundingSource')).trim() || null,
      receiptReference: String(form.get('receiptReference')).trim() || null,
      notes: String(form.get('notes')).trim() || null,
    });

    event.currentTarget.reset();
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <input name="activityDate" type="date" required defaultValue={initialValue?.activityDate} />
      <select name="category" required defaultValue={initialValue?.category ?? 'Repair'}>
        {vehicleActivityCategories.map((category) => <option key={category}>{category}</option>)}
      </select>
      <input name="description" required placeholder="Description" defaultValue={initialValue?.description} />
      <input name="vendor" placeholder="Vendor / payee" defaultValue={initialValue?.vendor ?? ''} />
      <input name="amount" type="number" min="0.01" step="0.01" required placeholder="Cost amount" defaultValue={initialValue?.amount} />
      <input name="fundingSource" placeholder="Paid by / funding source" defaultValue={initialValue?.fundingSource ?? ''} />
      <input name="receiptReference" placeholder="Receipt / invoice reference" defaultValue={initialValue?.receiptReference ?? ''} />
      <textarea name="notes" placeholder="Notes" defaultValue={initialValue?.notes ?? ''} />
      <button type="submit">Save Cost Activity</button>
    </form>
  );
}
