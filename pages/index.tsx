import type { CSSProperties, FC } from 'react'
import { useState, useEffect, useRef } from 'react'
import { Alert, AlertDescription, AlertIcon, Box, Button, Checkbox, HStack, Input, Progress, Spinner, Text, Tooltip, VStack } from '@chakra-ui/react'
import { path } from '@tauri-apps/api'
import { exists } from '@tauri-apps/api/fs'
import { invoke } from '@tauri-apps/api/tauri'
import { listen } from '@tauri-apps/api/event'
import { ArrowLeft, ArrowRight, File, Folder, HardDriveIcon } from 'lucide-react'
import { FixedSizeList } from 'react-window'
import useUndoRedo from '@/lib/useUndoRedo'

const MAX_FILE_NAME_LENGTH = 18

type FolderReferencesProps = {
  name: 'Desktop' | 'Home' | 'Documents' | 'Downloads' | 'Pictures' | 'Music' | 'Videos'
  directory: () => Promise<string>
}

type AddEventProps = {
  isFolder: boolean
  name: string
  path: string
}

type RowProps = {
  data: AddEventProps[]
  index: number
  style: CSSProperties
}

type VolumesListProps = {
  is_removable: boolean
  kind: 'HDD' | 'SSD'
  mountpoint: string
  available_gb: number
  used_gb: number
  total_gb: number
}[]

const Home: FC = () => {
  const [apiPath, setApiPath] = useState<typeof path>()
  const [readDirArray, setReadDirArray] = useState<AddEventProps[]>([])
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
    const unlisten = listen('add', (event: { payload: AddEventProps }) => {
      setReadDirArray(prevValue => [...prevValue, event.payload])
    })

    return () => {
      unlisten.then(remove => remove())
    }
  }, [])

  useEffect(() => {
    setIsLoading(true)
    setReadDirArray([])

    if (currentDirectory !== '') {
      invoke('read_directory', { directory: currentDirectory }).then(() => {
        setIsLoading(false)
      })
    }
  }, [currentDirectory])


  const [volumesList, setVolumesList] = useState<VolumesListProps>([])

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
        <Input ref={directoryRef} isDisabled={isSearching} placeholder="Directory" width="10rem" variant="filled" onKeyDown={async event => {
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
            invoke('stop_finding')
          }}>Stop</Button>
        )}
      </VStack>

      <HStack>
        <VStack pt="0.5rem" px="0.5rem" height="100vh" position="fixed" top="0" left="0" backgroundColor="blackAlpha.400" overflowY="scroll">
          {([
            { name: 'Desktop', directory: apiPath?.desktopDir },
            { name: 'Home', directory: apiPath?.homeDir },
            { name: 'Documents', directory: apiPath?.documentDir },
            { name: 'Downloads', directory: apiPath?.downloadDir },
            { name: 'Pictures', directory: apiPath?.pictureDir },
            { name: 'Music', directory: apiPath?.audioDir },
            { name: 'Videos', directory: apiPath?.videoDir }
          ] as FolderReferencesProps[]).map((section, index) => {
              return (
                <Button
                  key={index}
                  isDisabled={isSearching}
                  width="7rem"
                  rounded="full"
                  onClick={async () => {
                    setCurrentDirectory(await section.directory())
                  }}
                >{section.name}</Button>
              )
            })}

          <Button width="7rem" variant="outline" onClick={() => {
            invoke('get_volumes').then(volumes => {
              const volumesWithTypes = volumes as VolumesListProps

              setVolumesList(volumesWithTypes)
            })
          }}>
            <HStack>
              <Text>Load</Text>
              <HardDriveIcon />
            </HStack>
          </Button>

          {volumesList.map((volume, index) => (
            <VStack key={index}>
              <Tooltip label={`${(volume.is_removable ? 'Removable': (volume.kind === 'SSD' ? 'SSD' : 'HDD'))} ${volume.mountpoint}`} placement="top">
                <Button variant="outline" rounded="full" onClick={() => {
                  setCurrentDirectory(volume.mountpoint)
                }}>
                  <HardDriveIcon />
                </Button>
              </Tooltip>
              <Progress value={volume.used_gb / volume.total_gb * 100} width="5rem" />
            </VStack>
          ))}
        </VStack>

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
