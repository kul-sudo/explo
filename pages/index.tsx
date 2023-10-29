import type { FC } from 'react'
import type {
  AddEventProps,
  SearchingModeValue,
  VolumesListProps
} from '@/types/types'
import type { path } from '@tauri-apps/api'
import { useState, useEffect, useRef, useCallback } from 'react'
import { invoke } from '@tauri-apps/api/tauri'
import { listen } from '@tauri-apps/api/event'
import { useAtom } from 'jotai'
import {
  Alert,
  AlertDescription,
  AlertIcon,
  Box,
  Button,
  ButtonGroup,
  Checkbox,
  Divider,
  HStack,
  IconButton,
  Input,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Progress,
  Radio,
  RadioGroup,
  Spinner,
  Text,
  Tooltip,
  VStack,
  useColorMode,
  useToast
} from '@chakra-ui/react'
import {
  currentDirectoryAtom,
  isIncludeHiddenFoldersCheckedAtom,
  isIncludeFileExtensionCheckedAtom,
  isSortFromFoldersToFilesCheckedAtom,
  isLoadingAtom,
  isLoadingVolumesAtom,
  isSearchingAtom,
  lastTimeAtom,
  readDirArrayAtom,
  searchingInDirectoryAtom,
  searchingModeAtom,
  volumesListAtom
} from '@/lib/atoms'
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
import { Virtuoso } from 'react-virtuoso'
import { exists } from '@tauri-apps/api/fs'
import useUndoRedo from '@/lib/useUndoRedo'
import FileOrFolderItem from '@/components/FileOrFolderItem'

const Home: FC = () => {
  const [isIncludeHiddenFoldersChecked, setIsIncludeHiddenFoldersChecked] =
    useAtom(isIncludeHiddenFoldersCheckedAtom)
  const [isIncludeFileExtensionsChecked, setIsIncludeFileExtensionsChecked] =
    useAtom(isIncludeFileExtensionCheckedAtom)
  const [isSortFromFoldersToFilesChecked, setIsSortFromFoldersToFilesChecked] =
    useAtom(isSortFromFoldersToFilesCheckedAtom)
  const [apiPath, setApiPath] = useState<typeof path>()
  const [readDirArray, setReadDirArray] = useAtom(readDirArrayAtom)

  const readDirArrayMaybeSorted = isSortFromFoldersToFilesChecked
    ? readDirArray.slice().sort((a, b) => {
        if (a[0] && !b[0]) {
          return -1
        } else {
          return 1
        }
      })
    : readDirArray

  const [searchInDirectory, setSearchInDirectory] = useAtom(
    searchingInDirectoryAtom
  )
  const [isSearching, setIsSearching] = useAtom(isSearchingAtom)
  const [isLoading, setIsLoading] = useAtom(isLoadingAtom)

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

  const memorisedSetReadDirArray = useCallback(() => {
    const unlisten = listen('add', (event: { payload: AddEventProps }) => {
      setReadDirArray(prevValue => [...prevValue, event.payload])
    })

    return () => {
      unlisten.then(remove => remove())
    }
  }, [setReadDirArray])

  useEffect(memorisedSetReadDirArray, [memorisedSetReadDirArray])

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

  const baseDirectories = Object.freeze([
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
  ])

  const { colorMode, setColorMode } = useColorMode()

  return (
    <>
      <VStack position="fixed" top="2" right="2">
        <Input
          ref={directoryRef}
          isDisabled={hidden}
          placeholder="Directory"
          width="10rem"
          variant="filled"
          onKeyDown={async event => {
            if (event.key === 'Enter') {
              if (directoryRef.current) {
                if (directoryRef.current.value !== currentDirectory) {
                  if (await exists(directoryRef.current.value)) {
                    setCurrentDirectory(directoryRef.current.value)
                  }
                }
              }
            }
          }}
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
              setIsIncludeFileExtensionsChecked(event.target.checked)
            }
          >
            Include file extensions
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
              setIsLoading(true)
              setIsSearching(true)
              setReadDirArray([])

              const lastTimeLaunched = Date.now()

              invoke('find_files_and_folders', {
                current_directory: currentDirectory,
                search_in_directory: searchInDirectory.toLowerCase(),
                include_hidden_folders: isIncludeHiddenFoldersChecked,
                include_file_extension: isIncludeFileExtensionsChecked,
                searching_mode: searchingMode
              }).then(() => {
                setIsLoading(false)
                setIsSearching(false)

                setLastTime({
                  launched: lastTimeLaunched,
                  found: Date.now()
                })
              })
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
            <ButtonGroup isAttached>
              <Tooltip label="Go back">
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
              </Tooltip>
              <Tooltip label="Update">
                <IconButton
                  aria-label="Refresh"
                  icon={<RotateCw />}
                  isDisabled={hidden}
                  rounded="full"
                  onClick={() => {
                    setIsLoading(true)
                    setReadDirArray([])

                    invoke('read_directory', {
                      directory: currentDirectory
                    }).then(() => setIsLoading(false))
                  }}
                />
              </Tooltip>
              <Tooltip label="Go forward">
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
              </Tooltip>
            </ButtonGroup>
            <Menu isLazy>
              <MenuButton
                as={IconButton}
                aria-label="Options"
                colorScheme={colorMode === 'dark' ? 'purple' : 'teal'}
                icon={colorMode === 'dark' ? <MoonIcon /> : <SunIcon />}
                rounded="full"
              />
              <MenuList>
                {Object.freeze(['dark', 'light', 'system']).map(colorMode => (
                  <MenuItem
                    key={colorMode}
                    as={Button}
                    colorScheme={
                      colorMode === 'dark'
                        ? 'purple'
                        : colorMode === 'light'
                        ? 'teal'
                        : 'facebook'
                    }
                    rounded="none"
                    icon={
                      colorMode === 'dark' ? (
                        <MoonIcon />
                      ) : colorMode === 'light' ? (
                        <SunIcon />
                      ) : (
                        <HStack>
                          <MoonIcon />
                          <Text fontSize="1rem">/</Text>
                          <SunIcon />
                        </HStack>
                      )
                    }
                    onClick={() => setColorMode(colorMode)}
                  >
                    {colorMode.charAt(0).toUpperCase() + colorMode.slice(1)}
                  </MenuItem>
                ))}
              </MenuList>
            </Menu>
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
              isDisabled={currentDirectory.length === 0}
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

          <Virtuoso
            style={{ height: 750, width: '16rem' }}
            totalCount={readDirArray.length}
            data={
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
            itemContent={index => {
              const fileOrFolder = readDirArrayMaybeSorted[index]

              return (
                <Tooltip key={index} label={fileOrFolder[2]} placement="top">
                  <Button
                    width="15rem"
                    variant="outline"
                    onDoubleClick={() => {
                      if (fileOrFolder[0]) {
                        setCurrentDirectory(fileOrFolder[2])
                      } else {
                        invoke('open_file_in_default_application', {
                          fileName: fileOrFolder[2]
                        })
                      }
                    }}
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
            }}
          />
        </VStack>
      </HStack>
    </>
  )
}

export default Home
