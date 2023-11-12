import type { FC } from 'react'
import type {
  AddEventProps,
  SearchingModeValue,
  VolumesListProps
} from '@/types/types'
import { path, window } from '@tauri-apps/api'
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
  Center,
  Checkbox,
  Divider,
  HStack,
  IconButton,
  Input,
  Link,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Progress,
  Radio,
  RadioGroup,
  Spinner,
  Switch,
  Text,
  Tooltip,
  VStack,
  useColorMode,
  useColorModeValue,
  useDisclosure,
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
  volumesListAtom,
  currentSettingsAtom,
  searchingStoppedAtom,
  selectedEntriesAtom,
  copiedEntriesAtom,
  showCopyAtom
} from '@/lib/atoms'
import { AiFillUsb as UsbIcon } from 'react-icons/ai'
import {
  ArrowBigDownDashIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckCheckIcon,
  Copy,
  CopyIcon,
  CopyXIcon,
  HardDriveIcon,
  InfoIcon,
  MoonIcon,
  MoveRightIcon,
  RotateCw,
  SearchIcon,
  SettingsIcon,
  SunIcon,
  Trash2Icon,
  XIcon
} from 'lucide-react'
import { exists } from '@tauri-apps/api/fs'
import { open } from '@tauri-apps/api/shell'
import { Virtuoso } from 'react-virtuoso'
import useUndoRedo from '@/lib/useUndoRedo'
import FileOrFolderItem from '@/components/FileOrFolderItem'
import WordWhenSearching from '@/components/WordWhenSearching'

const Home: FC = () => {
  // Checkbox states
  const [isIncludeHiddenFoldersChecked, setIsIncludeHiddenFoldersChecked] =
    useAtom(isIncludeHiddenFoldersCheckedAtom)
  const [isIncludeFileExtensionsChecked, setIsIncludeFileExtensionsChecked] =
    useAtom(isIncludeFileExtensionCheckedAtom)
  const [isSortFromFoldersToFilesChecked, setIsSortFromFoldersToFilesChecked] =
    useAtom(isSortFromFoldersToFilesCheckedAtom)

  // The state of the array of files and folders shown to the user
  const [readDirArray, setReadDirArray] = useAtom(readDirArrayAtom)

  // This variable stores the sorted version of 'readDirArray' when it needs to be sorted
  const readDirArrayMaybeSorted = isSortFromFoldersToFilesChecked
    ? readDirArray.slice().sort((a, b) => {
        if (a.is_folder && !b.is_folder) {
          return -1
        } else {
          return 1
        }
      })
    : readDirArray

  const [currentSettings, setCurrentSettings] = useAtom(currentSettingsAtom)

  const [searchInDirectory, setSearchInDirectory] = useAtom(
    searchingInDirectoryAtom
  )

  const [isSearching, setIsSearching] = useAtom(isSearchingAtom)
  const [isLoading, setIsLoading] = useAtom(isLoadingAtom)

  const [searchingMode, setSearchingMode] = useAtom(searchingModeAtom)

  const [lastTime, setLastTime] = useAtom(lastTimeAtom)
  const [isLoadingVolumes, setIsLoadingVolumes] = useAtom(isLoadingVolumesAtom)

  const [apiPath, setApiPath] = useState<typeof path>()
  const [apiWindow, setApiWindow] = useState<typeof window>()

  const setupApi = async () => {
    const imported = await import('@tauri-apps/api')

    setApiPath(imported.path)
    setApiWindow(imported.window)
  }

  useEffect(() => {
    setupApi()
  }, [])

  useEffect(() => {
    apiWindow?.appWindow.setFullscreen(currentSettings.Fullscreen.isChecked)
  }, [currentSettings.Fullscreen, apiWindow?.appWindow])

  const {
    state: currentDirectory,
    setState: setCurrentDirectory,
    undo: undoCurrentDirectory,
    redo: redoCurrentDirectory,
    removeAllHistory: undoRedoRemoveAllHistory,
    isUndoPossible: isCurrentDirectoryUndoPossible,
    isRedoPossible: isCurrentDirectoryRedoPossible
  } = useUndoRedo(currentDirectoryAtom)

  // Preventing re-rendering
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

  const [showCopy, setShowCopy] = useAtom(showCopyAtom)
  const [searchingStopped, setSearchingStopped] = useAtom(searchingStoppedAtom)
  const [selectedEntries, setSelectedEntries] = useAtom(selectedEntriesAtom)
  const [copiedEntries, setCopiedEntries] = useAtom(copiedEntriesAtom)

  // Listening for the event that adds files and folders to the array shown to the user
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
    setSelectedEntries([])

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
  }, [
    currentDirectory,
    setIsLoading,
    setLastTime,
    setReadDirArray,
    setSelectedEntries
  ])

  const directoryRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    invoke('get_volumes').then(volumes => {
      setVolumesList(volumes as VolumesListProps)
      setIsLoadingVolumes(false)
    })
  }, [setVolumesList, setIsLoadingVolumes])

  const toast = useToast()

  const { colorMode: currentColorMode, setColorMode } = useColorMode()

  const themeIconButtonBackgroundColor = useColorModeValue('black', 'white')
  const themeOptionsButtonBackgroundColor = useColorModeValue(
    'blackAlpha.200',
    'whiteAlpha.200'
  )

  const {
    isOpen: isSettingsOpen,
    onOpen: onSettingsOpen,
    onClose: onSettingsClose
  } = useDisclosure()

  const foundInSeconds = (lastTime.found - lastTime.launched) / 1000
  const hidden = isSearching || currentDirectory.length === 0
  const entrySelected = selectedEntries.length > 0
  const noEntrySelected = selectedEntries.length === 0
  const searchBarHidden = entrySelected || hidden

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
  ] as const)

  return (
    <>
      <VStack position="fixed" top="2" right="2">
        <VStack>
          <Tooltip label="Type the directory you need" placement="left">
            <Input
              ref={directoryRef}
              isDisabled={searchBarHidden}
              placeholder="Directory"
              width="10rem"
              variant="filled"
              onKeyDown={async event => {
                if (event.key === 'Enter') {
                  if (directoryRef.current) {
                    if (directoryRef.current.value !== currentDirectory) {
                      if (await exists(directoryRef.current.value)) {
                        setCurrentDirectory(directoryRef.current.value)
                      } else {
                        toast({
                          title: 'Error',
                          description: 'The directory is invalid.',
                          status: 'error',
                          duration: 9000,
                          isClosable: true
                        })
                      }
                    }
                  }
                }
              }}
            />
          </Tooltip>

          <Tooltip
            label="What to search for in current directory"
            placement="left"
          >
            <Input
              isDisabled={searchBarHidden}
              placeholder="Search"
              width="10rem"
              variant="filled"
              onChange={event => setSearchInDirectory(event.target.value)}
            />
          </Tooltip>
        </VStack>

        <VStack alignItems="start">
          <Checkbox
            isDisabled={searchBarHidden}
            defaultChecked={false}
            onChange={event =>
              setIsIncludeHiddenFoldersChecked(event.target.checked)
            }
          >
            Include hidden folders
          </Checkbox>
          <Checkbox
            isDisabled={searchBarHidden}
            defaultChecked={false}
            onChange={event =>
              setIsIncludeFileExtensionsChecked(event.target.checked)
            }
          >
            Include file extensions
          </Checkbox>
          <Checkbox
            isDisabled={searchBarHidden}
            defaultChecked={true}
            onChange={event =>
              setIsSortFromFoldersToFilesChecked(event.target.checked)
            }
          >
            Sort from folders to files
          </Checkbox>
        </VStack>

        <Divider />

        <RadioGroup
          isDisabled={searchBarHidden}
          value={searchingMode.toString()}
          onChange={event => {
            setSearchingMode(parseInt(event) as SearchingModeValue)
          }}
        >
          <VStack alignItems="start">
            <Tooltip
              label="Whether the name of the file or folder contains the string you're searching for"
              placement="left"
              shouldWrapChildren
            >
              <Radio value="0">Pure text</Radio>
            </Tooltip>

            <Tooltip
              label={
                <VStack alignItems="start">
                  <Text>* replaces any string</Text>
                  <Text>? replaces any character</Text>
                </VStack>
              }
              placement="left"
              shouldWrapChildren
            >
              <Radio value="1">Mask</Radio>
            </Tooltip>

            <Radio value="2">
              <Link
                onClick={async () =>
                  await open('https://docs.rs/regex/latest/regex/#syntax')
                }
                isExternal
              >
                Regex
              </Link>
            </Radio>
          </VStack>
        </RadioGroup>

        <IconButton
          aria-label="Search"
          icon={<SearchIcon />}
          isDisabled={searchBarHidden}
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
              setSearchingStopped(false)

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
        />

        {isSearching && (
          <Button
            variant="outline"
            onClick={() => {
              setSearchingStopped(true)
              invoke('stop_finding')
            }}
          >
            Stop
          </Button>
        )}
      </VStack>

      <HStack position="fixed" top="0" left="0" alignItems="start">
        <VStack px="0.5rem" height="100vh" spacing="0.3rem">
          {currentSettings['Show base directories'].isChecked && (
            <VStack>
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
                      {'children' in section &&
                        section.children.map(child => (
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
            </VStack>
          )}

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
              <VStack key={volume.mountpoint} _first={{ marginTop: '0.5rem' }}>
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
                      <Text>Available: ~{volume.available_gb} GB</Text>
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

        <VStack alignItems="start">
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

            <Modal isCentered isOpen={isSettingsOpen} onClose={onSettingsClose}>
              <ModalOverlay backdropFilter="blur(5px)" />
              <ModalContent pb="2">
                <ModalHeader>Settings</ModalHeader>
                <ModalCloseButton />
                <ModalBody>
                  <VStack spacing="2" alignItems="start">
                    {Object.entries(currentSettings).map(setting => (
                      <HStack key={setting[0]}>
                        <Switch
                          isChecked={setting[1].isChecked}
                          onChange={event =>
                            setCurrentSettings(prevValue => ({
                              ...prevValue,
                              [setting[0]]: {
                                isChecked: event?.currentTarget.checked,
                                description: setting[1].description
                              }
                            }))
                          }
                        />
                        <Text fontWeight="semibold">{setting[0]}</Text>
                        <Tooltip label={setting[1].description}>
                          <InfoIcon />
                        </Tooltip>
                      </HStack>
                    ))}
                  </VStack>
                </ModalBody>
              </ModalContent>
            </Modal>
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

            <Tooltip label="Copy path">
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
            </Tooltip>
          </HStack>

          <HStack>
            {isLoading && readDirArray.length > 0 && <Spinner />}

            {currentDirectory.length > 0 && (
              <>
                {isSearching ? (
                  <WordWhenSearching />
                ) : (
                  <HStack spacing="0.2em">
                    <Text fontWeight="bold">{readDirArray.length}</Text>
                    <Text> found in</Text>
                    <Text fontWeight="bold">
                      {foundInSeconds >= 1
                        ? Math.round(foundInSeconds)
                        : foundInSeconds.toPrecision(1)}
                    </Text>
                    <Text fontWeight="bold"> seconds</Text>
                    {searchingStopped && (
                      <Text fontWeight="bold">(stopped)</Text>
                    )}
                  </HStack>
                )}
              </>
            )}
          </HStack>

          <HStack alignItems="start">
            <Virtuoso
              style={{ height: 750, width: '16rem' }}
              data={readDirArrayMaybeSorted}
              totalCount={readDirArray.length}
              itemContent={index => {
                const fileOrFolder = readDirArrayMaybeSorted[index]

                return (
                  <Tooltip
                    key={index}
                    label={fileOrFolder.path}
                    placement="top"
                  >
                    <Button
                      width="15rem"
                      variant="outline"
                      onDoubleClick={() => {
                        if (fileOrFolder.is_folder) {
                          setCurrentDirectory(fileOrFolder.path)
                        } else {
                          invoke('open_file_in_default_application', {
                            fileName: fileOrFolder.path
                          })
                        }
                      }}
                    >
                      <Box position="absolute" left="0.5rem">
                        <FileOrFolderItem fileOrFolder={fileOrFolder} />
                      </Box>

                      <HStack position="absolute" right="0.5rem">
                        <Text
                          width="7rem"
                          whiteSpace="nowrap"
                          overflow="hidden"
                          textOverflow="ellipsis"
                          textAlign="right"
                          mr="0.3rem"
                        >
                          {fileOrFolder.name}
                        </Text>

                        <Checkbox
                          isChecked={selectedEntries.includes(
                            fileOrFolder.path
                          )}
                          onChange={event => {
                            if (event.target.checked) {
                              setSelectedEntries(prevValue => [
                                ...prevValue,
                                fileOrFolder.path
                              ])
                            } else {
                              setSelectedEntries(
                                selectedEntries.filter(
                                  item => item !== fileOrFolder.path
                                )
                              )
                            }
                          }}
                        ></Checkbox>
                      </HStack>
                    </Button>
                  </Tooltip>
                )
              }}
            />

            <VStack>
              <ButtonGroup isAttached orientation="vertical">
                <Tooltip label="Select all files and folders" placement="right">
                  <IconButton
                    aria-label="Select all"
                    isDisabled={readDirArray.length === selectedEntries.length}
                    icon={<CheckCheckIcon />}
                    colorScheme="linkedin"
                    onClick={() => {
                      setSelectedEntries([])

                      setSelectedEntries(readDirArray.map(({ path }) => path))
                    }}
                  />
                </Tooltip>

                <Tooltip
                  label="Unselect all files and folders"
                  placement="right"
                >
                  <IconButton
                    aria-label="Unselect all"
                    isDisabled={noEntrySelected}
                    icon={<XIcon />}
                    colorScheme="red"
                    onClick={() => setSelectedEntries([])}
                  />
                </Tooltip>
              </ButtonGroup>

              <ButtonGroup
                pt="2"
                isAttached
                orientation="vertical"
                isDisabled={noEntrySelected}
              >
                {showCopy ? (
                  <Tooltip label="Copy" placement="right">
                    <IconButton
                      aria-label="Copy"
                      icon={<Copy />}
                      colorScheme="blue"
                      onClick={() => {
                        setShowCopy(false)
                        setCopiedEntries(selectedEntries)
                      }}
                    />
                  </Tooltip>
                ) : (
                  <Tooltip
                    label="Uncopy all copied files/folders"
                    placement="right"
                  >
                    <IconButton
                      aria-label="Uncopy"
                      icon={<CopyXIcon />}
                      colorScheme="blue"
                      isDisabled={false}
                      onClick={() => {
                        setShowCopy(true)
                        setCopiedEntries([])
                      }}
                    />
                  </Tooltip>
                )}

                <Tooltip label="Move" placement="right">
                  <IconButton
                    aria-label="Move"
                    icon={<MoveRightIcon />}
                    colorScheme="orange"
                  />
                </Tooltip>

                <Tooltip label="Paste" placement="right">
                  <IconButton
                    aria-label="Paste"
                    isDisabled={copiedEntries.length === 0}
                    icon={<ArrowBigDownDashIcon />}
                    colorScheme="green"
                  />
                </Tooltip>

                <Tooltip label="Delete" placement="right">
                  <IconButton
                    aria-label="Delete"
                    icon={<Trash2Icon />}
                    colorScheme="red"
                    onClick={() => {
                      setReadDirArray(
                        readDirArray.filter(
                          entry => !selectedEntries.includes(entry.path)
                        )
                      )

                      setSelectedEntries([])
                      setCopiedEntries([])

                      invoke('delete_entry', { entryPaths: selectedEntries })
                    }}
                  />
                </Tooltip>
              </ButtonGroup>
            </VStack>
          </HStack>
        </VStack>
      </HStack>

      <HStack position="fixed" bottom="5" right="5">
        {currentSettings['Show theme options'].isChecked && (
          <ButtonGroup
            spacing="1px"
            backgroundColor={themeOptionsButtonBackgroundColor}
            rounded="full"
          >
            {Object.freeze(['dark', 'light'] as const).map(colorMode => (
              <IconButton
                aria-label="Set theme"
                key={colorMode}
                rounded="full"
                variant="unstyled"
                backgroundColor={
                  colorMode === currentColorMode
                    ? themeIconButtonBackgroundColor
                    : 'transparent'
                }
                icon={
                  colorMode === 'dark' ? (
                    <Center>
                      <MoonIcon color="black" />
                    </Center>
                  ) : (
                    <Center>
                      <SunIcon color="white" />
                    </Center>
                  )
                }
                onClick={() => {
                  if (colorMode !== currentColorMode) setColorMode(colorMode)
                }}
              />
            ))}
          </ButtonGroup>
        )}

        <IconButton
          aria-label="Settings"
          icon={<SettingsIcon />}
          rounded="full"
          onClick={onSettingsOpen}
        />
      </HStack>
    </>
  )
}

export default Home
