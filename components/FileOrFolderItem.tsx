import type { FC, ReactNode } from 'react'
import type { AddEventProps } from '@/types/types'
import {
  AiFillHtml5 as HTMLIcon
} from 'react-icons/ai'
import {
  BiLogoTypescript as TypeScriptIcon,
  BiLogoJavascript as JavaScriptIcon,
  BiLogoPython as PythonIcon,
  BiSolidFileJson as JsonIcon,
  BiSolidFileTxt as TXTIcon,
  BiLogoCss3 as CSSIcon
} from 'react-icons/bi'
import {
  BsFileEarmarkZipFill as ZipIcon,
  BsImageFill as ImageIcon,
  BsFillFileEarmarkPdfFill as PDFIcon,
  BsFillMarkdownFill as MDIcon
} from 'react-icons/bs'
import {
  SiLua as LuaIcon,
  SiBun as BunIcon
} from 'react-icons/si'
import {
  FaRust as RustIcon
} from 'react-icons/fa'
import {
  MdVideoLibrary as VideoIcon
} from 'react-icons/md'
import { FileIcon, FolderIcon } from 'lucide-react'

const iconsForExtensions: Readonly<Record<string, ReactNode>> = {
  ts: <TypeScriptIcon size={25} />,
  tsx: <TypeScriptIcon size={25} />,
  js: <JavaScriptIcon size={25} />,
  jsx: <JavaScriptIcon size={25} />,
  py: <PythonIcon size={25} />,
  json: <JsonIcon size={25} />,
  zip: <ZipIcon size={25} />,
  html: <HTMLIcon size={25} />,
  png: <ImageIcon size={25} />,
  jpg: <ImageIcon size={25} />,
  jpeg: <ImageIcon size={25} />,
  svg: <ImageIcon size={25} />,
  ico: <ImageIcon size={25} />,
  txt: <TXTIcon size={25} />,
  pdf: <PDFIcon size={25} />,
  lua: <LuaIcon size={25} />,
  rs: <RustIcon size={25} />,
  css: <CSSIcon size={25} />,
  md: <MDIcon size={25} />,
  mp4: <VideoIcon size={25} />,
  avi: <VideoIcon size={25} />,
  mkv: <VideoIcon size={25} />,
  webm: <VideoIcon size={25} />,
  lockb: <BunIcon size={25} />
} as const

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

export default FileOrFolderItem
