import Resource from '../components/Resource';
import { shortDate } from '../format';
import { useAuth } from '../auth';

const fields = [
  { name: 'name', label: 'Full name', span: 2 },
  { name: 'phone', label: 'Phone (10 digits)' },
  { name: 'email', label: 'Email', type: 'email' },
  { name: 'city', label: 'City', type: 'city', span: 2 },
  { name: 'pincode', label: 'Pincode' },
  { name: 'address', label: 'Address' },
];

const columns = [
  { label: 'Customer', sort: (r) => r.name.toLowerCase(), render: (r) => (<><strong>{r.name}</strong><small className="sub">{r.email || '—'}</small></>) },
  { label: 'Phone', render: (r) => r.phone || '—' },
  { label: 'Location', sort: (r) => r.city || '', render: (r) => (r.city ? `${r.city}, ${r.state || r.country || ''}` : r.country || '—') },
  { label: 'Pincode', render: (r) => r.pincode || '—' },
  { label: 'Joined', sort: (r) => r.createdAt, render: (r) => shortDate(r.createdAt) },
];

export default function Customers() {
  const { can } = useAuth();
  return (
    <Resource
      title="Customers"
      noun="Customer"
      endpoint="/customers"
      columns={columns}
      fields={fields}
      canWrite={can('customers:write')}
      canDelete={can('customers:delete')}
      search={(r) => [r.name, r.phone, r.email, r.city, r.state, r.pincode].join(' ')}
      exportName="customers.csv"
      exportRow={(r) => ({ Name: r.name, Phone: r.phone, Email: r.email, City: r.city, State: r.state, Pincode: r.pincode, Address: r.address })}
    />
  );
}
