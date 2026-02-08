import { createContext, useContext } from 'react'

interface ThemeContextValue {
  darkMode: boolean
  setDarkMode: (value: boolean) => void
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

export function ThemeProvider({
  darkMode,
  setDarkMode,
  children
}: {
  darkMode: boolean
  setDarkMode: (value: boolean) => void
  children: React.ReactNode
}) {
  return (
    <ThemeContext.Provider value={{ darkMode, setDarkMode }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
