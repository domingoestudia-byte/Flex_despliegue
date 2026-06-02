import './globals.css'
import Shell from '@/components/Shell'
import IniciarSesion from './IniciarSesion'

export const metadata = {
  title: 'Flex — Live Sessions',
  description: 'Tu noche, tu ritmo',
}

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garant:ital,wght@0,400;0,600;0,700;1,400;1,600;1,700&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <IniciarSesion />
        <Shell>{children}</Shell>
      </body>
    </html>
  )
}
