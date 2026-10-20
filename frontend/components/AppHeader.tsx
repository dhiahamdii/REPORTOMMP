'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AppHeader() {
  const pathname = usePathname();
  const onManage = pathname === '/manage';

  return (
    <header className="border-b border-slate-200 bg-white shadow-sm">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4 sm:px-6 sm:py-5">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl md:text-3xl">
            Maintenance Report System
          </h1>
        </div>
        <nav className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-3">
          <Link
            href="/"
            className={`rounded-lg px-4 py-2 text-center text-sm font-semibold transition-colors ${
              !onManage
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
            }`}
          >
            Nouveau rapport
          </Link>
          
        </nav>
      </div>
    </header>
  );
}
