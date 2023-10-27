import type { GlobalStyleProps } from '@chakra-ui/theme-tools'
import type { ThemeOverride } from '@chakra-ui/react'
import { extendTheme } from '@chakra-ui/react'
import { mode } from '@chakra-ui/theme-tools'
import { Inter } from 'next/font/google'

const font = Inter({ subsets: ['latin'] })

const styles: ThemeOverride['styles'] = {
  global: (props: GlobalStyleProps) => ({
    body: {
      bg: mode('#fff', '#202023')(props)
    }
  })
}

const fonts: ThemeOverride['fonts'] = {
  body: font.style.fontFamily
}

const config: ThemeOverride['config'] = {
  initialColorMode: 'dark',
  useSystemColorMode: false
}

export default extendTheme({ styles, fonts, config })
