import type { FC } from 'react'
import { useCallback, useEffect, useState } from 'react'
import { colors, wordsWhenSearching } from '@/lib/consts'
import { Text } from '@chakra-ui/react'

const WordWhenSearching: FC = () => {
  const [word, setWord] = useState<string>(
    wordsWhenSearching[~~(Math.random() * wordsWhenSearching.length)]
  )

  const memorisedSetWord = useCallback(() => {
    setWord(wordsWhenSearching[~~(Math.random() * wordsWhenSearching.length)])
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      memorisedSetWord()
    }, 1000)

    return () => clearInterval(interval)
  }, [memorisedSetWord])

  return (
    <Text
      p="1"
      rounded="lg"
      backgroundColor={colors[~~(colors.length * Math.random())]}
    >
      {word}
    </Text>
  )
}

export default WordWhenSearching
