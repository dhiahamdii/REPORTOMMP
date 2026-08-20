'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AppHeader() {
  const pathname = usePathname();
  const isManage = pathname?.startsWith('/manage');

  return (
    <header className="border-b border-slate-200 bg-white shadow-sm">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">
            Maintenance Report System
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Rapports d&apos;intervention OMMP / Huawei-Waycon
          </p>
        </div>
        <nav className="flex flex-wrap gap-2">
          <Link
            href="/"
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              !isManage
                ? 'bg-blue-600 text-white'
                : 'border border-slate-300 bg-white text-slate-800 hover:border-blue-500'
            }`}
          >
            Rapports
          </Link>
          <Link
            href="/manage"
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              isManage
                ? 'bg-blue-600 text-white'
                : 'border border-slate-300 bg-white text-slate-800 hover:border-blue-500'
            }`}
          >
            Ports &amp; contacts
          </Link>
        </nav>
      </div>
    </header>
  );
}
