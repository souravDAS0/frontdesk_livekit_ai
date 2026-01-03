'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Navigation() {
  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-8">
          <NavLink href="/">Dashboard</NavLink>
          <NavLink href="/pending">Pending Requests</NavLink>
          <NavLink href="/history">Request History</NavLink>
          <NavLink href="/knowledge">Knowledge Base</NavLink>
          <NavLink href="/learned">Learned Answers</NavLink>
        </div>
      </div>
    </nav>
  )
}

function NavLink({ href, children }) {
  const pathname = usePathname()
  const isActive = pathname === href

  return (
    <Link
      href={href}
      className={`border-b-2 py-4 px-1 text-sm font-medium transition-colors ${
        isActive
          ? 'border-blue-500 text-blue-600'
          : 'border-transparent text-gray-700 hover:border-blue-500 hover:text-gray-900'
      }`}
    >
      {children}
    </Link>
  )
}
