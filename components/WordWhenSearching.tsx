import type { FC } from 'react'
import { useCallback, useEffect, useState } from 'react'
import { Text } from '@chakra-ui/react'
import { wordsWhenSearching } from '@/lib/consts'

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

  return <Text>{word}</Text>
}

export default WordWhenSearching
