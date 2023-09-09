import type { FC } from 'react'
import { useState, useEffect, useRef } from 'react'
import { Alert, AlertDescription, AlertIcon, Box, Button, HStack, Input, Spinner, Text, Tooltip, VStack } from '@chakra-ui/react'
import { path } from '@tauri-apps/api'
import { exists } from '@tauri-apps/api/fs'
import { invoke } from '@tauri-apps/api/tauri'
import { listen } from '@tauri-apps/api/event'
import { ArrowLeft, ArrowRight, File, Folder } from '../node_modules/lucide-react'
import useUndoRedo from '@/lib/useUndoRedo'

const MAX_FILE_NAME_LENGTH = 18

type folderReferencesProps = {
  name: 'Desktop' | 'Home' | 'Documents' | 'Downloads' | 'Pictures' | 'Music' | 'Videos'
  directory: () => Promise<string>
}

type addEventProps = {
  isFolder: 'yes' | 'no'
  name: string
  path: string
}

const TIMEOUT_SLEEP_TO_ADD = 600
let timeoutSleep = TIMEOUT_SLEEP_TO_ADD

let timeoutIds: ReturnType<typeof setTimeout>[] = []

const Home: FC = () => {
  const [apiPath, setApiPath] = useState<typeof path>()
  const [readDirArray, setReadDirArray] = useState<addEventProps[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(false)

  const [directoryIssue, setDirectoryIssue] = useState<boolean>(false)
  const [searchInDirectory, setSearchInDirectory] = useState<string>('')

  const setupAppWindow = async () => {
    setApiPath((await import('@tauri-apps/api')).path)
  }

  useEffect(() => {
    setupAppWindow()
  }, [])

  const {
    state: currentDirectory,
    setState: setCurrentDirectory,
    undo: undoCurrentDirectory,
    redo: redoCurrentDirectory,
    isUndoPossible: isCurrentDirectoryUndoPossible,
    isRedoPossible: isCurrentDirectoryRedoPossible
  } = useUndoRedo('')

  useEffect(() => {
    const unlisten = listen('add', (event: { payload: addEventProps }) => {
      const timeoutId = setTimeout(() => {
        setReadDirArray(prevValue => [...prevValue, event.payload])
      }, timeoutSleep)

      timeoutIds.push(timeoutId)

      timeoutSleep = timeoutSleep + TIMEOUT_SLEEP_TO_ADD
    })

    return () => {
      unlisten.then(remove => remove())
    }
  }, [])

  useEffect(() => {
    const unlisten = listen('add_found', (event: { payload: addEventProps }) => {
      setReadDirArray(prevValue => [...prevValue, event.payload])
    })

    return () => {
      unlisten.then(f => f())
    }
  }, [])

  useEffect(() => {
    setIsLoading(true)
    setReadDirArray([])

    timeoutSleep = TIMEOUT_SLEEP_TO_ADD

    timeoutIds.forEach(timeoutId => {
      clearTimeout(timeoutId)
    })

    timeoutIds = []

    if (currentDirectory !== '') {
      invoke('read_directory', { directory: currentDirectory }).then(() => {
        setIsLoading(false)
      })
    }
  }, [currentDirectory])

  const directoryRef = useRef<HTMLInputElement>(null)

  return (
    <>
      <VStack position="fixed" top="2" right="2">
        <Input placeholder="Directory" width="10rem" variant="filled" ref={directoryRef} onKeyDown={async event => {
          if (event.key === 'Enter') {
            if (directoryRef.current) {
              if (directoryRef.current.value !== currentDirectory) {
                if (await exists(currentDirectory)) {
                  setDirectoryIssue(true)

                  setReadDirArray([])

                  timeoutSleep = TIMEOUT_SLEEP_TO_ADD

                  timeoutIds.forEach(timeoutId => {
                    clearTimeout(timeoutId)
                  })

                  timeoutIds = []
                }

                setCurrentDirectory(directoryRef.current.value)
              }
            }
          }
        }} />

        <VStack>
        <Input placeholder="Search in current directory" width="10rem" variant="filled" onChange={event => setSearchInDirectory(event.target.value)} />
          <Button onClick={() => {
            setIsLoading(true)
            setReadDirArray([])
            
            timeoutSleep = TIMEOUT_SLEEP_TO_ADD

            timeoutIds.forEach(timeoutId => {
              clearTimeout(timeoutId)
            })
            
            timeoutIds = []

            if (searchInDirectory === '' && currentDirectory !== '') {
              invoke('read_directory', { directory: currentDirectory }).then(() => {
                setIsLoading(false)
              })
            } else {
              invoke('find_files_and_folders', { command: `${currentDirectory},${searchInDirectory}` }).then(() => {
                setIsLoading(false)
              })
            }
          }}>Search</Button>
        </VStack>
      </VStack>

      <HStack>
        <Box height="100vh" position="fixed" top="0" left="0" backgroundColor="blackAlpha.400">
          <VStack pt="0.5rem" px="0.5rem">
            {Array.from([
              { name: 'Desktop', directory: apiPath?.desktopDir },
              { name: 'Home', directory: apiPath?.homeDir },
              { name: 'Documents', directory: apiPath?.documentDir },
              { name: 'Downloads', directory: apiPath?.downloadDir },
              { name: 'Pictures', directory: apiPath?.pictureDir },
              { name: 'Music', directory: apiPath?.audioDir },
              { name: 'Videos', directory: apiPath?.videoDir }
            ] as folderReferencesProps[]).map((section, index) => {
                return (
                  <Button
                    width="7rem"
                    rounded="3xl"
                    key={index}
                    onClick={async () => {
                      setCurrentDirectory(await section.directory())
                    }}
                  >{section.name}</Button>
                )
              })}
          </VStack>
        </Box>

        <VStack alignItems="start" position="relative" left="9rem">
          <HStack mt={((currentDirectory === '') && !directoryIssue && readDirArray.length !== 0) ? '0rem' : '1rem'}>
            <Button isDisabled={!isCurrentDirectoryUndoPossible} rounded="full" onClick={() => {
              if (isCurrentDirectoryUndoPossible) {
                undoCurrentDirectory()
                setReadDirArray([])
              }

            }}><ArrowLeft /></Button>
            <Button isDisabled={!isCurrentDirectoryRedoPossible} rounded="full" onClick={() => {
              if (isCurrentDirectoryRedoPossible) {
                redoCurrentDirectory()
                setReadDirArray([])
              }
            }}><ArrowRight /></Button>
          </HStack>

          <Box>
            {(directoryIssue && readDirArray.length === 0) ? (
              <Alert status="error" rounded="xl">
                <AlertIcon />
                <AlertDescription fontWeight="medium">{currentDirectory}</AlertDescription>
              </Alert>
            ): (
                <Alert status="success" rounded="xl">
                  <AlertIcon />
                  <AlertDescription fontWeight="medium">{currentDirectory}</AlertDescription>
                </Alert>
              )}
          </Box>

          {isLoading && readDirArray.length !== 0 && (
            <Spinner />
          )}

          {readDirArray.length === 0 && !directoryIssue && (
            <Alert status="warning" rounded="xl">
              <AlertIcon />
              <AlertDescription fontWeight="medium">No files found 🤔</AlertDescription>
            </Alert>
          )}

          {Array.from(readDirArray.sort((a, b) => {
            if (a.isFolder === 'yes') {
              return -1
            } else {
              return 1
            }
          }).map((fileOrFolder, index) => {
              const isFolder = fileOrFolder.isFolder === 'yes'

              return (
                <Tooltip key={index} label={fileOrFolder.path} placement="top">
                  <Button width="15rem" variant="outline" onDoubleClick={async () => {
                    if (isFolder) {
                      setCurrentDirectory(fileOrFolder.path)
                    } else {
                      invoke('open_file_in_default_application', { fileName: fileOrFolder.path })
                    }
                  }}>
                    <Box position="absolute" left="0.5rem">
                      {isFolder ? (
                        <Folder />
                      ): (
                          <File />
                        )}
                    </Box>
                    <Box position="absolute" right="0.5rem">
                      <Text>
                        {fileOrFolder.name?.slice(0, MAX_FILE_NAME_LENGTH).concat('...')}
                      </Text>
                    </Box>
                  </Button>
                </Tooltip>
              )
          }))}
        </VStack>
      </HStack>
    </>
  )
}

export default Home
