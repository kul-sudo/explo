import type { FC } from 'react'
import type { AppProps } from 'next/app'
import { ChakraProvider, extendTheme } from '@chakra-ui/react'
import { currentSettingsAtom } from '@/lib/atoms'
import { useAtom } from 'jotai'
import theme from '@/lib/theme'
import '@/styles/globals.css'

const App: FC<AppProps> = ({ Component, pageProps }) => {
  const [currentSettings] = useAtom(currentSettingsAtom)

  return (
    <ChakraProvider
      theme={
        currentSettings['Show animations']
          ? extendTheme(theme)
          : extendTheme({
              ...theme,
              transition: {
                property: 'none'
              }
            })
      }
    >
      <Component {...pageProps} />
    </ChakraProvider>
  )
}

export default App
