'use client';
import Link from 'next/link';

export default function AdminLayout({

}: {
  children: React.ReactNode;
}) {

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content */}
      <div className="py-8 max-w-4xl mx-auto">
        <Link href="/admin/transactions">Transactions</Link>
      </div>
    </div>
  );
}