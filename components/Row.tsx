import type { FC } from 'react'
import type { RowProps } from '@/types/types'
import { Box, Button, Text, Tooltip } from '@chakra-ui/react'
import { fileOrFolderOnDoubleClick } from '@/lib/events'
import FileOrFolderItem from './FileOrFolderItem'

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

export default Row
