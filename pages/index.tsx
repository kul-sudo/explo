import type { FC } from 'react'
import type { FileEntry } from '@tauri-apps/api/fs'
import { useState, useEffect } from 'react'
import { Box, Button, HStack, Input, Text, VStack } from '@chakra-ui/react'
import { path } from '@tauri-apps/api'
import { readDir } from '@tauri-apps/api/fs'
import { invoke } from '@tauri-apps/api/tauri'
import useUndoRedo from '@/lib/useUndoRedo'
import { ArrowLeft, ArrowRight, File, Folder } from '../node_modules/lucide-react'

const MAX_FILE_NAME_LENGTH = 20

type folderReferencesProps = {
  name: 'Desktop' | 'Home' | 'Documents' | 'Downloads' | 'Pictures' | 'Music' | 'Videos'
  directory: () => Promise<string>
}

const Home: FC = () => {
  const [apiPath, setApiPath] = useState<typeof path>()
  const [readDirArray, setReadDirArray] = useState<FileEntry[]>([])

  const [searchText, setSearchText] = useState<string>('')

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
    const toDo = async () => {
      setReadDirArray(await readDir(currentDirectory))
    }

    toDo()
  }, [currentDirectory])

  return (
    <>
      <VStack position="fixed" top="2" right="2">
        <Input placeholder="Directory" width="10rem" variant="filled" />
        <Input placeholder="Search" width="10rem" variant="filled" onChange={event => {
          setSearchText(event.target.value)
        }} />
        <HStack>
          <Button rounded="full" variant="outline" onClick={undoCurrentDirectory}><ArrowLeft /></Button>
          <Button rounded="full" variant="outline" onClick={redoCurrentDirectory}><ArrowRight /></Button>
        </HStack>
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

        <VStack alignItems="left">
          {Array.from(readDirArray.sort((a, b) => {
            if (Object.keys(a).length > Object.keys(b).length) {
              return -1
            } else {
              return 1
            }
          }).map((fileOrFolder, index) => {
              if (fileOrFolder.name!.includes(searchText)) {
                const isFolder = Object.keys(fileOrFolder).length === 3
                return (
                  <Button position="relative" left="9rem" width="15rem" variant="outline" key={index} onDoubleClick={async () => {
                    if (isFolder) {
                      setCurrentDirectory(fileOrFolder.path)
                    } else {
                      await invoke('open_file_in_default_application', { fileName: fileOrFolder.path })
                    }
                  }}>
                    <Box position="absolute" left="0.5rem">
                      {isFolder ? (
                        <Folder />
                      ): (
                          <File />
                        )}
                    </Box>
                    <Text position="absolute" right="0.5rem">
                      {fileOrFolder.name!.length > MAX_FILE_NAME_LENGTH ? (
                        <Text>
                          {fileOrFolder.name!.slice(0, MAX_FILE_NAME_LENGTH).concat('...')}
                        </Text>
                      ) : (
                          <Text>
                            {fileOrFolder.name}
                          </Text>
                        )}
                    </Text>
                  </Button>
                )
              }
            }))}
        </VStack>
      </HStack>
    </>
  )
}

export default Home
