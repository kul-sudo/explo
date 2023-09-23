import type { AppProps } from 'next/app'
import { useState, type FC, type ReactNode, useEffect } from 'react'
import { ChakraProvider } from '@chakra-ui/react'
import theme from '@/lib/theme'
import '@/styles/globals.css'

const Hydrated: FC<{children: ReactNode}> = ({ children }) => {
  const [hydration, setHydration] = useState<boolean>(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setHydration(true)
    }
  }, [])

  return hydration ? children : null
}

const App: FC<AppProps> = ({ Component, pageProps }) => {
  return (
    <Hydrated>
      <ChakraProvider theme={theme}>
        <Component {...pageProps} />
      </ChakraProvider>
    </Hydrated>
  )
}

export default App
