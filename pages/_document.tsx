import { ColorModeScript, extendTheme } from '@chakra-ui/react'
import { Html, Head, Main, NextScript } from 'next/document'
import theme from '@/lib/theme'

export default function Document() {
  return (
    <Html lang="en">
      <Head />
      <body>
        <ColorModeScript
          initialColorMode={extendTheme(theme).config.initialColorMode}
        />
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
