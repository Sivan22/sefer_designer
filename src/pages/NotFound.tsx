import { useNavigate } from 'react-router-dom'
import { Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <h1 className="text-6xl font-bold text-foreground">404</h1>
      <p className="font-hebrew text-lg text-muted-foreground">Oops! Page not found</p>
      <Button onClick={() => navigate('/')} className="font-hebrew gap-2 mt-4">
        <Upload className="w-4 h-4" />
        Return to Home
      </Button>
    </div>
  )
}
