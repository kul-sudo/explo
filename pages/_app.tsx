import type { FC } from 'react'
import type { AppProps } from 'next/app'
import { ChakraProvider, extendTheme } from '@chakra-ui/react'
import { useAtomValue } from 'jotai'
import { currentSettingsAtom } from '@/lib/atoms'
import theme from '@/lib/theme'
import '@/styles/globals.css'

const App: FC<AppProps> = ({ Component, pageProps }) => {
  const currentSettings = useAtomValue(currentSettingsAtom)

  return (
    <ChakraProvider
      theme={extendTheme(
        currentSettings['Partially disable animations'].isChecked
          ? {
              ...theme,
              transition: {
                property: 'none'
              },
              config: {
                initialColorMode: 'dark',
                useSystemColorMode: false,
                disableTransitionOnChange: true
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
