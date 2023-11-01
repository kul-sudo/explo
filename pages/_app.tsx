import type { FC } from 'react'
import type { AppProps } from 'next/app'
import { ChakraProvider, extendTheme } from '@chakra-ui/react'
import { useAtom } from 'jotai'
import { currentSettingsAtom } from '@/lib/atoms'
import theme from '@/lib/theme'
import '@/styles/globals.css'

const App: FC<AppProps> = ({ Component, pageProps }) => {
  const [currentSettings] = useAtom(currentSettingsAtom)

  return (
    <ChakraProvider
      theme={extendTheme(
        currentSettings['Partially disable animations']
          ? {
              ...theme,
              transition: {
                property: 'none'
              }
            }
          : theme
      )}
    >
      <Component {...pageProps} />
    </ChakraProvider>
  )
}

export default App
