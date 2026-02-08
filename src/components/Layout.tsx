import { Link, useLocation } from 'react-router-dom'
import { useTheme } from '../ThemeContext'
import { Sun, Moon, CarFront } from 'lucide-react'

export default function Layout({ children }: { children: React.ReactNode }) {
  const { darkMode, setDarkMode } = useTheme()
  const location = useLocation()

  return (
    <div className={darkMode ? 'dark bg-slate-950' : 'bg-slate-50 text-slate-900'}>
      <div className="min-h-screen flex flex-col">
        <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 text-brand">
              <CarFront className="w-6 h-6" />
              <span className="font-semibold tracking-wide">Dan&apos;s Car Lot</span>
            </Link>
            <nav className="flex items-center gap-4 text-sm">
              <Link
                to="/"
                className={location.pathname === '/' ? 'text-brand font-medium' : 'text-slate-300'}
              >
                Inventory
              </Link>
              <Link
                to="/add"
                className={
                  location.pathname === '/add' ? 'text-brand font-medium' : 'text-slate-300'
                }
              >
                Add Car
              </Link>
              <button
                type="button"
                onClick={() => setDarkMode(!darkMode)}
                className="ml-4 inline-flex items-center justify-center rounded-full border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-200 hover:bg-slate-700"
              >
                {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            </nav>
          </div>
        </header>
        <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">{children}</main>
        <footer className="border-t border-slate-800 text-xs text-slate-400 py-3 text-center">
          © {new Date().getFullYear()} Dan&apos;s Car Lot Manager
        </footer>
      </div>
    </div>
  )
}
