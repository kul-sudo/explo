import type { ComponentType, FC, KeyboardEvent, RefObject } from 'react'
import type {
  AddEventProps,
  FolderReferencesProps,
  LastTimeProps,
  RowProps,
  SearchingModeValue,
  VolumesListProps
} from '@/types/types'
import type { path } from '@tauri-apps/api'
import type { FixedSizeListProps } from 'react-window'
import { useState, useEffect, useRef } from 'react'
import { invoke } from '@tauri-apps/api/tauri'
import { listen } from '@tauri-apps/api/event'
import { useAtom } from 'jotai'
import {
  Alert,
  AlertDescription,
  AlertIcon,
  Box,
  Button,
  Checkbox,
  Divider,
  HStack,
  IconButton,
  Input,
  Progress,
  Radio,
  RadioGroup,
  Spinner,
  Text,
  Tooltip,
  VStack,
  useColorMode,
  useColorModeValue,
  useToast
} from '@chakra-ui/react'
import {
  currentDirectoryAtom,
  isIncludeHiddenFoldersCheckedAtom,
  isLoadingAtom,
  isLoadingVolumesAtom,
  isSearchingAtom,
  isSortFromFoldersToFilesCheckedAtom,
  lastTimeAtom,
  readDirArrayAtom,
  searchingInDirectoryAtom,
  searchingModeAtom,
  volumesListAtom
} from '@/lib/atoms'
import { FixedSizeList as FixedSizeList_ } from 'react-window'
import { AiFillUsb as UsbIcon } from 'react-icons/ai'
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CopyIcon,
  HardDriveIcon,
  MoonIcon,
  RotateCw,
  SunIcon
} from 'lucide-react'
import { exists } from '@tauri-apps/api/fs'
import useUndoRedo from '@/lib/useUndoRedo'
import FileOrFolderItem from '@/components/FileOrFolderItem'

const FixedSizeList = FixedSizeList_ as ComponentType<FixedSizeListProps>

const searchButtonOnClick = (
  currentDirectory: string,
  searchInDirectory: string,
  isIncludeHiddenFoldersChecked: boolean,
  isIncludeFileExtensionChecked: boolean,
  searchingMode: SearchingModeValue,
  setIsLoading: (newState: boolean) => void,
  setIsSearching: (newState: boolean) => void,
  setReadDirArray: (newState: AddEventProps[]) => void,
  setLastTime: (newState: LastTimeProps) => void
) => {
  setIsLoading(true)
  setIsSearching(true)
  setReadDirArray([])

  const lastTimeLaunched = Date.now()

  invoke('find_files_and_folders', {
    current_directory: currentDirectory,
    search_in_directory: (searchInDirectory || '').toLowerCase(),
    include_hidden_folders: isIncludeHiddenFoldersChecked,
    include_file_extension: isIncludeFileExtensionChecked,
    searching_mode: searchingMode
  }).then(() => {
    setIsLoading(false)
    setIsSearching(false)

    setLastTime({
      launched: lastTimeLaunched,
      found: Date.now()
    })
  })
}

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

const fileOrFolderOnDoubleClick = (
  fileOrFolder: AddEventProps,
  setCurrentDirectory: (newState: string) => void
) => {
  if (fileOrFolder[0]) {
    setCurrentDirectory(fileOrFolder[2])
  } else {
    invoke('open_file_in_default_application', { fileName: fileOrFolder[2] })
  }
}

const Row: FC<RowProps> = ({ data, index, style, setCurrentDirectory }) => {
  const fileOrFolder = data[index]

  return (
    <Tooltip key={index} label={fileOrFolder[2]} placement="top">
      <Button
        width="15rem"
        variant="outline"
        onDoubleClick={() =>
          fileOrFolderOnDoubleClick(fileOrFolder, setCurrentDirectory)
        }
        style={style}
      >
        <Box position="absolute" left="0.5rem">
          <FileOrFolderItem fileOrFolder={fileOrFolder} />
        </Box>
        <Box position="absolute" right="0.5rem">
          <Text
            width="10rem"
            whiteSpace="nowrap"
            overflow="hidden"
            textOverflow="ellipsis"
            textAlign="right"
            mr="0.3rem"
          >
            {fileOrFolder[1]}
          </Text>
        </Box>
      </Button>
    </Tooltip>
  )
}

const Home: FC = () => {
  const [apiPath, setApiPath] = useState<typeof path>()
  const [readDirArray, setReadDirArray] = useAtom(readDirArrayAtom)
  const [searchInDirectory, setSearchInDirectory] = useAtom(
    searchingInDirectoryAtom
  )
  const [isSearching, setIsSearching] = useAtom(isSearchingAtom)
  const [isLoading, setIsLoading] = useAtom(isLoadingAtom)

  const [isIncludeHiddenFoldersChecked, setIsIncludeHiddenFoldersChecked] =
    useAtom(isIncludeHiddenFoldersCheckedAtom)
  const [isIncludeFileExtensionChecked, setIsIncludeFileExtensionChecked] =
    useAtom(isIncludeHiddenFoldersCheckedAtom)
  const [isSortFromFoldersToFilesChecked, setIsSortFromFoldersToFilesChecked] =
    useAtom(isSortFromFoldersToFilesCheckedAtom)

  const [searchingMode, setSearchingMode] = useAtom(searchingModeAtom)

  const [lastTime, setLastTime] = useAtom(lastTimeAtom)
  const [isLoadingVolumes, setIsLoadingVolumes] = useAtom(isLoadingVolumesAtom)

  const setupAppWindow = async () =>
    setApiPath((await import('@tauri-apps/api')).path)

  useEffect(() => {
    setupAppWindow()
  }, [])

  const {
    state: currentDirectory,
    setState: setCurrentDirectory,
    undo: undoCurrentDirectory,
    redo: redoCurrentDirectory,
    removeAllHistory: undoRedoRemoveAllHistory,
    isUndoPossible: isCurrentDirectoryUndoPossible,
    isRedoPossible: isCurrentDirectoryRedoPossible
  } = useUndoRedo(currentDirectoryAtom)

  useEffect(() => {
    const unlisten = listen('add', (event: { payload: AddEventProps }) => {
      setReadDirArray(prevValue => [...prevValue, event.payload])
    })

    return () => {
      unlisten.then(remove => remove())
    }
  }, [setReadDirArray])

  const [volumesList, setVolumesList] = useAtom(volumesListAtom)

  useEffect(() => {
    const unlisten = listen(
      'volumes',
      (event: { payload: [VolumesListProps, VolumesListProps] }) => {
        const payload = event.payload

        if (
          Array.from(payload[0]).some(volume =>
            currentDirectory.startsWith(volume.mountpoint)
          )
        ) {
          setCurrentDirectory('')
          undoRedoRemoveAllHistory()
        }

        setVolumesList(payload[1])
      }
    )

    return () => {
      unlisten.then(remove => remove())
    }
  }, [
    currentDirectory,
    setCurrentDirectory,
    setVolumesList,
    undoRedoRemoveAllHistory
  ])

  useEffect(() => {
    setIsLoading(true)
    setReadDirArray([])

    const lastTimeLaunched = Date.now()

    if (currentDirectory.length > 0) {
      invoke('read_directory', { directory: currentDirectory }).then(() => {
        setIsLoading(false)

        setLastTime({
          launched: lastTimeLaunched,
          found: Date.now()
        })
      })
    }
  }, [currentDirectory, setIsLoading, setLastTime, setReadDirArray])

  const directoryRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    invoke('get_volumes').then(volumes => {
      setVolumesList(volumes as VolumesListProps)
      setIsLoadingVolumes(false)
    })
  }, [setVolumesList, setIsLoadingVolumes])

  const toast = useToast()

  const hidden = isSearching || currentDirectory.length === 0

  const baseDirectories: Readonly<FolderReferencesProps> = [
    { name: 'Desktop', directory: apiPath?.desktopDir! },
    {
      name: 'User',
      directory: apiPath?.homeDir!,
      children: [
        { name: 'Documents', directory: apiPath?.documentDir! },
        { name: 'Downloads', directory: apiPath?.downloadDir! },
        { name: 'Pictures', directory: apiPath?.pictureDir! },
        { name: 'Music', directory: apiPath?.audioDir! },
        { name: 'Videos', directory: apiPath?.videoDir! }
      ]
    }
  ]

  const { colorMode, toggleColorMode } = useColorMode()

  return (
    <>
      <VStack position="fixed" top="2" right="2">
        <Input
          ref={directoryRef}
          isDisabled={hidden}
          placeholder="Directory"
          width="10rem"
          variant="filled"
          onKeyDown={event =>
            directoryInputOnKeyDown(
              event,
              directoryRef,
              currentDirectory,
              setCurrentDirectory
            )
          }
        />

        <Input
          isDisabled={hidden}
          placeholder="Search in current directory"
          width="10rem"
          variant="filled"
          onChange={event => setSearchInDirectory(event.target.value)}
        />

        <VStack alignItems="start">
          <Checkbox
            isDisabled={hidden}
            defaultChecked={false}
            onChange={event =>
              setIsIncludeHiddenFoldersChecked(event.target.checked)
            }
          >
            Include hidden folders
          </Checkbox>
          <Checkbox
            isDisabled={hidden}
            defaultChecked={false}
            onChange={event =>
              setIsIncludeFileExtensionChecked(event.target.checked)
            }
          >
            Include file extension
          </Checkbox>
          <Checkbox
            isDisabled={hidden}
            defaultChecked={true}
            onChange={event =>
              setIsSortFromFoldersToFilesChecked(event.target.checked)
            }
          >
            Sort from folders to files
          </Checkbox>
        </VStack>

        <RadioGroup
          isDisabled={hidden}
          value={searchingMode.toString()}
          onChange={event => {
            setSearchingMode(parseInt(event) as SearchingModeValue)
          }}
        >
          <VStack alignItems="start">
            <Radio value="0">Pure text</Radio>
            <Radio value="1">Mask</Radio>
            <Radio value="2">Regex</Radio>
          </VStack>
        </RadioGroup>

        <Button
          isDisabled={hidden}
          onClick={() => {
            if (searchingMode === 2) {
              try {
                new RegExp(searchInDirectory)
              } catch (e) {
                toast({
                  title: 'Error',
                  description: 'The regex is invalid.',
                  status: 'error',
                  duration: 9000,
                  isClosable: true
                })

                return
              }
            }

            if (searchInDirectory.length > 0) {
              searchButtonOnClick(
                currentDirectory,
                searchInDirectory,
                isIncludeHiddenFoldersChecked,
                isIncludeFileExtensionChecked,
                searchingMode,
                setIsLoading,
                setIsSearching,
                setReadDirArray,
                setLastTime
              )
            } else {
              toast({
                title: 'Error',
                description: 'Nothing to search for has been chosen.',
                status: 'error',
                duration: 9000,
                isClosable: true
              })
            }
          }}
        >
          Search
        </Button>

        {isSearching && (
          <Button
            variant="outline"
            onClick={() => {
              invoke('stop_finding')
            }}
          >
            Stop
          </Button>
        )}
      </VStack>

      <HStack>
        <VStack
          px="0.5rem"
          height="100vh"
          position="fixed"
          top="0"
          left="0"
          spacing="0.3rem"
        >
          {baseDirectories.map(section => (
            <>
              <Button
                _first={{
                  marginTop: '0.5rem'
                }}
                key={section.name}
                isDisabled={isSearching}
                width="7rem"
                rounded="2xl"
                onClick={async () => {
                  setCurrentDirectory(await section.directory())
                }}
              >
                {section.name}
              </Button>

              <HStack ml="0.5rem">
                <Divider orientation="vertical" />
                <VStack>
                  {section.children?.map(child => (
                    <Button
                      _first={{ marginTop: '0.2rem' }}
                      _last={{ marginBottom: '0.4rem' }}
                      key={child.name}
                      isDisabled={isSearching}
                      width="7rem"
                      roundedLeft="3xl"
                      roundedRight="xl"
                      onClick={async () => {
                        setCurrentDirectory(await child.directory())
                      }}
                    >
                      {child.name}
                    </Button>
                  ))}
                </VStack>
              </HStack>
            </>
          ))}

          {isLoadingVolumes && <Spinner />}

          {volumesList
            .slice()
            .sort((a, b) => {
              if (a.used_gb / a.total_gb > b.used_gb / b.total_gb) {
                return 1
              }

              return -1
            })
            .map(volume => (
              <VStack key={volume.mountpoint}>
                <Tooltip
                  hasArrow
                  label={
                    <VStack>
                      <Text>
                        {`${volume.is_removable ? 'Removable' : volume.kind} ${
                          volume.mountpoint
                        }`}
                      </Text>

                      <Text>Total: ~{volume.total_gb} GB</Text>
                      <Text>Used: ~{volume.used_gb} GB</Text>
                    </VStack>
                  }
                  placement="right"
                >
                  <Button
                    isDisabled={isSearching}
                    variant="outline"
                    rounded="full"
                    onClick={() => setCurrentDirectory(volume.mountpoint)}
                  >
                    {volume.is_removable ? <UsbIcon /> : <HardDriveIcon />}
                  </Button>
                </Tooltip>
                <Progress
                  value={(volume.used_gb / volume.total_gb) * 100}
                  width="5rem"
                  colorScheme={isSearching ? 'blackAlpha' : 'cyan'}
                />
              </VStack>
            ))}
        </VStack>

        <VStack alignItems="start" position="relative" left="10rem">
          <HStack mt="1rem">
            <IconButton
              aria-label="Go back"
              icon={<ArrowLeftIcon />}
              isDisabled={isSearching || !isCurrentDirectoryUndoPossible}
              rounded="full"
              onClick={() => {
                if (isCurrentDirectoryUndoPossible) {
                  undoCurrentDirectory()
                  setReadDirArray([])
                }
              }}
            />
            <IconButton
              aria-label="Go forward"
              icon={<ArrowRightIcon />}
              isDisabled={isSearching || !isCurrentDirectoryRedoPossible}
              rounded="full"
              onClick={() => {
                if (isCurrentDirectoryRedoPossible) {
                  redoCurrentDirectory()
                  setReadDirArray([])
                }
              }}
            />
            <IconButton
              aria-label="Refresh"
              icon={<RotateCw />}
              isDisabled={hidden}
              rounded="full"
              variant="outline"
              onClick={() => {
                setIsLoading(true)
                setReadDirArray([])

                invoke('read_directory', { directory: currentDirectory }).then(
                  () => setIsLoading(false)
                )
              }}
            />
            <IconButton
              aria-label="Switch theme"
              colorScheme={useColorModeValue('teal', 'purple')}
              icon={colorMode === 'dark' ? <SunIcon /> : <MoonIcon />}
              rounded="full"
              onClick={toggleColorMode}
            />
          </HStack>

          <HStack spacing="0rem">
            <Alert
              status={currentDirectory.length === 0 ? 'info' : 'success'}
              roundedLeft="xl"
              roundedRight="none"
              height="3rem"
            >
              <AlertIcon />
              <AlertDescription
                fontWeight="medium"
                width="15rem"
                whiteSpace="nowrap"
                overflow="hidden"
                textOverflow="ellipsis"
              >
                {currentDirectory.length === 0
                  ? 'No directory chosen'
                  : currentDirectory}
              </AlertDescription>
            </Alert>

            <IconButton
              aria-label="Copy"
              icon={<CopyIcon />}
              height="3rem"
              variant="outline"
              roundedRight="2xl"
              roundedLeft="none"
              onClick={() => {
                navigator.clipboard.writeText(currentDirectory).then(() => {
                  toast({
                    title: 'Copied',
                    description: 'The path has been copied to the clipboard.',
                    status: 'success',
                    duration: 7000,
                    isClosable: true
                  })
                })
              }}
            />
          </HStack>

          {isLoading && readDirArray.length > 0 && <Spinner />}

          {currentDirectory.length > 0 && (
            <Text>
              <Text display="inline" fontWeight="bold">
                {readDirArray.length}
              </Text>
              <Text display="inline"> found in</Text>
              <Text display="inline" fontWeight="bold">
                {' '}
                {isSearching
                  ? '*searching*'
                  : (lastTime.found - lastTime.launched) / 1000}
              </Text>
              {!isSearching && <Text display="inline"> seconds</Text>}
            </Text>
          )}

          <FixedSizeList
            itemCount={readDirArray.length}
            itemData={
              isSortFromFoldersToFilesChecked
                ? readDirArray.slice().sort((a, b) => {
                    if (a[0] && !b[0]) {
                      return -1
                    } else {
                      return 1
                    }
                  })
                : readDirArray
            }
            itemSize={40}
            width={350}
            height={1000}
            style={{ overflowY: 'scroll' }}
          >
            {({ data, index, style }) => (
              <Row
                index={index}
                style={style}
                data={data}
                setCurrentDirectory={setCurrentDirectory}
              />
            )}
          </FixedSizeList>
        </VStack>
      </HStack>
    </>
  )
}

export default Home
