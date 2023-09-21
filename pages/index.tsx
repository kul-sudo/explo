import type { FC, KeyboardEvent, ReactNode, RefObject } from 'react'
import type { AddEventProps, FolderReferencesProps, RowProps, VolumesListProps } from '@/types/types'
import {
  Alert,
  AlertDescription,
  AlertIcon,
  Box,
  Button,
  Checkbox,
  HStack,
  IconButton,
  Input,
  Progress,
  Spinner,
  Text,
  Tooltip,
  VStack
} from '@chakra-ui/react'
import { useState, useEffect, useRef, useMemo } from 'react'
import { path } from '@tauri-apps/api'
import { exists } from '@tauri-apps/api/fs'
import { invoke } from '@tauri-apps/api/tauri'
import { listen } from '@tauri-apps/api/event'
import { ArrowLeftIcon, ArrowRightIcon, FileIcon, FolderIcon, HardDriveIcon, RotateCw } from 'lucide-react'
import {
  AiFillUsb as UsbIcon,
  AiFillHtml5 as HTMLIcon
} from 'react-icons/ai'
import {
  BiLogoTypescript as TypeScriptIcon,
  BiLogoJavascript as JavaScriptIcon,
  BiLogoPython as PythonIcon,
  BiSolidFileJson as JsonIcon,
  BiSolidFileTxt as TXTIcon,
  BiSolidFileCss as CSSIcon
} from 'react-icons/bi'
import {
  BsFileEarmarkZipFill as ZipIcon,
  BsImageFill as ImageIcon,
  BsFillFileEarmarkPdfFill as PDFIcon
} from 'react-icons/bs'
import {
  SiLua as LuaIcon
} from 'react-icons/si'
import {
  FaRust as RustIcon
} from 'react-icons/fa'
import { FixedSizeList } from 'react-window'
import useUndoRedo from '@/lib/useUndoRedo'
import { isEqual } from 'lodash'

const directoryInputOnKeyDown = async (
  event: KeyboardEvent<HTMLInputElement>,
  directoryRef: RefObject<HTMLInputElement>,
  currentDirectory: string,
  setCurrentDirectory: (newState: string) => void
) => {
  if (event.key === 'Enter') {
    if (directoryRef.current) {
      if (directoryRef.current.value !== currentDirectory) {
        if (await exists(directoryRef.current.value)) {
          setCurrentDirectory(directoryRef.current.value)
        }
      }
    }
  }
}

const searchButtonOnClick = (
  currentDirectory: string,
  searchInDirectory: string,
  isIncludeHiddenFoldersChecked: boolean,
  setIsLoading: (newState: boolean) => void,
  setReadDirArray: (newState: AddEventProps[]) => void,
  setIsSearching: (newState: boolean) => void
) => {
  setIsLoading(true)
  setReadDirArray([])
  setIsSearching(true)

  invoke('find_files_and_folders', { command: `${currentDirectory},${searchInDirectory.toLowerCase()},${isIncludeHiddenFoldersChecked}` }).then(() => {
    setIsLoading(false)
    setIsSearching(false)
  })
}

const fileOrFolderDoubleClick = (
  fileOrFolder: AddEventProps,
  setCurrentDirectory: (newState: string) => void
) => {
  if (fileOrFolder.isFolder) {
    setCurrentDirectory(fileOrFolder.path)
  } else {
    invoke('open_file_in_default_application', { fileName: fileOrFolder.path })
  }
}

let fileOrFolderKey = 0

const iconsForExtensions: Record<string, ReactNode> = {
  'ts': <TypeScriptIcon size={25} />,
  'tsx': <TypeScriptIcon size={25} />,
  'js': <JavaScriptIcon size={25} />,
  'jsx': <JavaScriptIcon size={25} />,
  'py': <PythonIcon size={25} />,
  'json': <JsonIcon size={25} />,
  'zip': <ZipIcon size={25} />,
  'html': <HTMLIcon size={25} />,
  'png': <ImageIcon size={25} />,
  'jpg': <ImageIcon size={25} />,
  'jpeg': <ImageIcon size={25} />,
  'svg': <ImageIcon size={25} />,
  'ico': <ImageIcon size={25} />,
  'txt': <TXTIcon size={25} />,
  'pdf': <PDFIcon size={25} />,
  'lua': <LuaIcon size={25} />,
  'rs': <RustIcon size={25} />,
  'css': <CSSIcon size={25} />
}

const FileOrFolderItem: FC<{fileOrFolder: AddEventProps}> = ({ fileOrFolder }) => {
  if (typeof iconsForExtensions[fileOrFolder.extension] === 'object') {
    return (
      iconsForExtensions[fileOrFolder.extension]
    )
  } else if (fileOrFolder.isFolder) {
    return (
      <FolderIcon />
    )
  } else {
    return (
      <FileIcon />
    )
  }
}

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
      fileOrFolderKey++
      setReadDirArray(prevValue => [...prevValue, event.payload])
    })

    return () => {
      unlisten.then(remove => remove())
    }
  }, [])

  useEffect(() => {
    setIsLoading(true)
    setReadDirArray([])
    fileOrFolderKey = 0

    if (currentDirectory !== '') {
      invoke('read_directory', { directory: currentDirectory }).then(() => {
        setIsLoading(false)
      })
    }
  }, [currentDirectory])

  const sortedReadDirArray = useMemo(() => {
    return readDirArray.slice().sort((a, b) => {
      if (a.isFolder && !b.isFolder) {
        return -1
      } else if (b.isFolder && !a.isFolder) {
        return 1
      } else {
        return 0
      }
    })
  }, [readDirArray])

  const [volumesList, setVolumesList] = useState<VolumesListProps>([])

  useEffect(() => {
    invoke('get_volumes').then(volumes => {
      setVolumesList(volumes as VolumesListProps)
    })
  }, [])

  const Row: FC<RowProps> = ({ data, index, style }) => {
    const fileOrFolder = data[index]

    return (
      <Tooltip key={index} label={fileOrFolder.path} placement="top">
        <Button width="15rem" variant="outline" onDoubleClick={() => fileOrFolderDoubleClick(fileOrFolder, setCurrentDirectory)} style={style}>
          <Box position="absolute" left="0.5rem">
            <FileOrFolderItem fileOrFolder={fileOrFolder} />
          </Box>
          <Box position="absolute" right="0.5rem">
            <Text width="10rem" whiteSpace="nowrap" overflow="hidden" textOverflow="ellipsis" textAlign="right" mr="0.3rem">
              {fileOrFolder.name}
            </Text>
          </Box>
        </Button>
      </Tooltip>
    )
  }

  const directoryRef = useRef<HTMLInputElement>(null)

  const baseDirectories: FolderReferencesProps = [
    { name: 'Desktop', directory: apiPath?.desktopDir! },
    { name: 'Home', directory: apiPath?.homeDir! },
    { name: 'Documents', directory: apiPath?.documentDir! },
    { name: 'Downloads', directory: apiPath?.downloadDir! },
    { name: 'Pictures', directory: apiPath?.pictureDir! },
    { name: 'Music', directory: apiPath?.audioDir! },
    { name: 'Videos', directory: apiPath?.videoDir! }
  ]
  
  useEffect(() => {
    const findVolumesIntervalRef = setInterval(() => {
      invoke('get_volumes').then(volumes => {
        if (!isEqual(volumes, volumesList)) {
          setVolumesList(volumes as VolumesListProps)
        }
      })
    }, 5000)

    return () => clearInterval(findVolumesIntervalRef)
  }, [volumesList])

  return (
    <>
      <VStack position="fixed" top="2" right="2">
        <Input ref={directoryRef} isDisabled={isSearching} placeholder="Directory" width="10rem" variant="filled" onKeyDown={event => {
          directoryInputOnKeyDown(event, directoryRef, currentDirectory, setCurrentDirectory)
        }} />

        <Input isDisabled={isSearching} placeholder="Search in current directory" width="10rem" variant="filled" onChange={event => setSearchInDirectory(event.target.value)} />

        <Checkbox isDisabled={isSearching} defaultChecked={false} onChange={event => setIsIncludeHiddenFoldersChecked(event.target.checked)}>Include hidden folders</Checkbox>

        <Button isDisabled={isSearching} onClick={() => {
          searchButtonOnClick(
            currentDirectory,
            searchInDirectory,
            isIncludeHiddenFoldersChecked,
            setIsLoading,
            setReadDirArray,
            setIsSearching
          )
        }}>Search</Button>

        {isSearching && (
          <Button variant="outline" onClick={() => {
            invoke('stop_finding')
          }}>Stop</Button>
        )}
      </VStack>

      <HStack>
        <VStack pt="0.5rem" px="0.5rem" height="100vh" position="fixed" top="0" left="0" backgroundColor="blackAlpha.400">
          {baseDirectories.map((section, index) => (
            <Button
              key={index}
              isDisabled={isSearching}
              width="7rem"
              rounded="full"
              onClick={async () => {
                setCurrentDirectory(await section.directory())
              }}
            >{section.name}</Button>
          ))}

          <Button isDisabled={isSearching} width="7rem" variant="outline" onClick={() => {
            invoke('get_volumes').then(volumes => {
              setVolumesList(volumes as VolumesListProps)
            })
          }}>
            <HStack>
              <Text>Load</Text>
              <HardDriveIcon />
            </HStack>
          </Button>

          {volumesList.map((volume, index) => (
            <VStack key={index}>
              <Tooltip label={`${(volume.is_removable ? 'Removable': (volume.kind === 'SSD' ? 'SSD' : 'HDD'))} ${volume.mountpoint}`} placement="top" shouldWrapChildren>
                <Button isDisabled={isSearching} variant="outline" rounded="full" onClick={() => {
                  setCurrentDirectory(volume.mountpoint)
                }}>
                  {volume.is_removable ? (
                    <UsbIcon />
                  ) : (
                    <HardDriveIcon />
                  )}
                </Button>
              </Tooltip>
              <Progress value={volume.used_gb / volume.total_gb * 100} width="5rem" colorScheme={isSearching ? 'blackAlpha' : 'cyan'} />
            </VStack>
          ))}
        </VStack>

        <VStack alignItems="start" position="relative" left="9rem">
          <HStack mt="1rem">
            <IconButton aria-label="Go back" icon={<ArrowLeftIcon />} isDisabled={isSearching || !isCurrentDirectoryUndoPossible} rounded="full" onClick={() => {
              if (isCurrentDirectoryUndoPossible) {
                undoCurrentDirectory()
                setReadDirArray([])
              }
            }} />
            <IconButton aria-label="Go forward" icon={<ArrowRightIcon />} isDisabled={isSearching || !isCurrentDirectoryRedoPossible} rounded="full" onClick={() => {
              if (isCurrentDirectoryRedoPossible) {
                redoCurrentDirectory()
                setReadDirArray([])
              }
            }} />
            <IconButton aria-label="Refresh" icon={<RotateCw />} isDisabled={isSearching} rounded="full" variant="outline" onClick={() => {
              setIsLoading(true)
              setReadDirArray([])
              fileOrFolderKey = 0

              if (currentDirectory !== '') {
                invoke('read_directory', { directory: currentDirectory }).then(() => {
                  setIsLoading(false)
                })
              }
            }} />
          </HStack>

          <Alert status="success" rounded="xl">
            <AlertIcon />
            <AlertDescription fontWeight="medium">{currentDirectory}</AlertDescription>
          </Alert>

          {isLoading && readDirArray.length !== 0 && (
            <Spinner />
          )}

          <Text>{readDirArray.length} file{readDirArray.length !== 1 && 's'} found</Text>

          <FixedSizeList
            key={fileOrFolderKey}
            itemCount={sortedReadDirArray.length}
            itemData={sortedReadDirArray}
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
