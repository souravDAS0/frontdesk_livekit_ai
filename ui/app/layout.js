import './globals.css'
import Navigation from '@/components/Navigation'
import { ToastProvider } from '@/components/Toast'

export const metadata = {
  title: 'Frontdesk Supervisor Dashboard',
  description: 'Human-in-the-loop AI receptionist supervisor interface',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-gray-50">
        <ToastProvider>
          <div className="min-h-screen">
            {/* Header */}
            <header className="bg-white shadow">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                <div className="flex items-center justify-between">
                  <h1 className="text-2xl font-bold text-gray-900">
                    Frontdesk Supervisor
                  </h1>
                  <div className="text-sm text-gray-600">
                    AI Receptionist Management
                  </div>
                </div>
              </div>
            </header>

            {/* Navigation Tabs */}
            <Navigation />

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              {children}
            </main>
          </div>
        </ToastProvider>
      </body>
    </html>
  )
}
