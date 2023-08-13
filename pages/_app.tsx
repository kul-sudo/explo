import type { AppProps } from 'next/app'
import type { FC } from 'react'
import { ChakraProvider } from '@chakra-ui/react'
import theme from '@/lib/theme'
import '@/styles/globals.css'

const App: FC<AppProps> = ({ Component, pageProps }) => {
  return (
    <ChakraProvider theme={theme}>
      <Component {...pageProps} />
    </ChakraProvider>
  )
}

export default App
