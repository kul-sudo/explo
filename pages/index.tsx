import type { CSSProperties, FC } from 'react'
import { useState, useEffect, useRef } from 'react'
import { Alert, AlertDescription, AlertIcon, Box, Button, Checkbox, HStack, Input, Spinner, Text, Tooltip, VStack } from '@chakra-ui/react'
import { path } from '@tauri-apps/api'
import { exists } from '@tauri-apps/api/fs'
import { invoke } from '@tauri-apps/api/tauri'
import { listen } from '@tauri-apps/api/event'
import { ArrowLeft, ArrowRight, File, Folder } from '../node_modules/lucide-react'
import { FixedSizeList } from 'react-window'
import useUndoRedo from '@/lib/useUndoRedo'

const MAX_FILE_NAME_LENGTH = 18

type folderReferencesProps = {
  name: 'Desktop' | 'Home' | 'Documents' | 'Downloads' | 'Pictures' | 'Music' | 'Videos'
  directory: () => Promise<string>
}

type addEventProps = {
  isFolder: boolean
  name: string
  path: string
}

type RowProps = {
  data: addEventProps[]
  index: number
  style: CSSProperties
}

const Home: FC = () => {
  const [apiPath, setApiPath] = useState<typeof path>()
  const [readDirArray, setReadDirArray] = useState<addEventProps[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(false)

  const [searchInDirectory, setSearchInDirectory] = useState<string>('')
  const [isIncludeHiddenFoldersChecked, setIsIncludeHiddenFoldersChecked] = useState<boolean>(false)
  const [isSearching, setIsSearching] = useState<boolean>(false)

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
      console.log(event)
      setReadDirArray(prevValue => [...prevValue, event.payload])
    })

    return () => {
      unlisten.then(remove => remove())
    }
  }, [])

  useEffect(() => {
    setIsLoading(true)
    setReadDirArray([])

    invoke('read_directory', { directory: currentDirectory }).then(() => {
      setIsLoading(false)
    })
  }, [currentDirectory])

  const Row: FC<RowProps> = ({ data, index, style }) => {
    const fileOrFolder = data[index]
    
    return (
      <Tooltip key={index} label={fileOrFolder.path} placement="top">
        <Button width="15rem" variant="outline" onDoubleClick={async () => {
          if (fileOrFolder.isFolder) {
            setCurrentDirectory(fileOrFolder.path)
          } else {
            invoke('open_file_in_default_application', { fileName: fileOrFolder.path })
          }
        }} style={style}>
          <Box position="absolute" left="0.5rem">
            {fileOrFolder.isFolder ? (
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
  }

  const directoryRef = useRef<HTMLInputElement>(null)

  return (
    <>
      <VStack position="fixed" top="2" right="2">
        <Input isDisabled={isSearching} placeholder="Directory" width="10rem" variant="filled" ref={directoryRef} onKeyDown={async event => {
          if (event.key === 'Enter') {
            if (directoryRef.current) {
              if (directoryRef.current.value !== currentDirectory) {
                if (await exists(directoryRef.current.value)) {
                  setCurrentDirectory(directoryRef.current.value)
                }
              }
            }
          }
        }} />

        <Input isDisabled={isSearching} placeholder="Search in current directory" width="10rem" variant="filled" onChange={event => setSearchInDirectory(event.target.value)} />

        <Checkbox isDisabled={isSearching} defaultChecked={false} onChange={event => setIsIncludeHiddenFoldersChecked(event.target.checked)}>Include hidden folders</Checkbox>

        <Button isDisabled={isSearching} onClick={() => {
          setIsLoading(true)
          setReadDirArray([])
          setIsSearching(true)

          invoke('find_files_and_folders', { command: `${currentDirectory},${searchInDirectory},${isIncludeHiddenFoldersChecked}` }).then(() => {
            setIsLoading(false)
            setIsSearching(false)
          })
        }}>Search</Button>

        {isSearching && (
          <Button variant="outline" onClick={() => {
            invoke('set_stop', { value: true })
          }}>Stop</Button>
        )}
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
                    isDisabled={isSearching}
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
          <HStack mt="1rem">
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

          <Alert status="success" rounded="xl">
            <AlertIcon />
            <AlertDescription fontWeight="medium">{currentDirectory}</AlertDescription>
          </Alert>

          {isLoading && readDirArray.length !== 0 && (
            <Spinner />
          )}

          <FixedSizeList
            itemCount={readDirArray.length}
            itemData={readDirArray.sort((a) => {
              if (a.isFolder) {
                return -1
              } else {
                return 1
              }
            })}
            itemSize={40}
            width={300}
            height={900}
          >
            {Row}
          </FixedSizeList>
        </VStack>
      </HStack>
    </>
  )
}

export default Home
