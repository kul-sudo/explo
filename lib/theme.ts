import { extendTheme } from '@chakra-ui/react'
import type { GlobalStyleProps } from '@chakra-ui/theme-tools'
import { mode } from '@chakra-ui/theme-tools'
import { Inter } from 'next/font/google'

const font = Inter({ subsets: ['latin'] })

const styles = {
  global: (props: GlobalStyleProps) => ({
    body: {
      bg: mode('#fff', '#18181b')(props),
      transitionProperty: 'all',
      transitionDuration: 'normal'
    }
  })
}

const fonts = {
  body: font.style.fontFamily
}

const config = {
  initialColorMode: 'dark',
  useSystemColorMode: false,
  disableTransitionOnChange: false
}

const theme = {
  styles,
  fonts,
  config
}

export default extendTheme(theme)
