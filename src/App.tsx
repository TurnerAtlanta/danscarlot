import { useState, useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import Layout from './components/Layout'
import { CarList, AddCar, EditCar } from './components/CarManager'
import { ThemeProvider } from './ThemeContext'

const queryClient = new QueryClient()

function AppContent() {
  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const stored = localStorage.getItem('theme')

    if (stored === 'dark' || (!stored && prefersDark)) {
      setDarkMode(true)
    }
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
    localStorage.setItem('theme', darkMode ? 'dark' : 'light')
  }, [darkMode])

  return (
    <ThemeProvider darkMode={darkMode} setDarkMode={setDarkMode}>
      <Layout>
        <Routes>
          <Route path="/" element={<CarList />} />
          <Route path="/add" element={<AddCar />} />
          <Route path="/edit/:id" element={<EditCar />} />
        </Routes>
        <Toaster position="top-right" />
      </Layout>
    </ThemeProvider>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  )
}
