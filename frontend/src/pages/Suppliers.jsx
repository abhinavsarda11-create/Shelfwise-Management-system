import Resource from '../components/Resource';

const fields = [
  { name: 'name', label: 'Supplier name', span: 2 },
  { name: 'phone', label: 'Phone' },
  { name: 'email', label: 'Email', type: 'email' },
  { name: 'city', label: 'City', type: 'city', span: 2 },
  { name: 'address', label: 'Address', span: 2 },
];

const columns = [
  { label: 'Supplier', sort: (r) => r.name.toLowerCase(), render: (r) => <strong>{r.name}</strong> },
  { label: 'Phone', render: (r) => r.phone || '—' },
  { label: 'Email', render: (r) => r.email || '—' },
  { label: 'Location', sort: (r) => r.city || '', render: (r) => (r.city ? `${r.city}, ${r.state}` : '—') },
];

export default function Suppliers() {
  return (
    <Resource
      title="Suppliers"
      noun="Supplier"
      endpoint="/suppliers"
      columns={columns}
      fields={fields}
      search={(r) => [r.name, r.phone, r.email, r.city, r.state].join(' ')}
      exportName="suppliers.csv"
      exportRow={(r) => ({ Name: r.name, Phone: r.phone, Email: r.email, City: r.city, State: r.state, Address: r.address })}
    />
  );
}
