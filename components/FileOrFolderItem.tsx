import type { FC } from 'react'
import type { AddEventProps } from '@/types/types'
import { AiOutlineHtml5 as HTMLIcon } from 'react-icons/ai'
import {
  BiLogoPython as PythonIcon,
  BiLogoCss3 as CSSIcon
} from 'react-icons/bi'
import { TbBrandTypescript as TypeScriptIcon } from 'react-icons/tb'
import { RiJavascriptLine as JavaScriptIcon } from 'react-icons/ri'
import {
  BsFileEarmarkZip as ZipIcon,
  BsFileEarmarkPdf as PDFIcon,
  BsMarkdown as MDIcon,
  BsFileEarmarkText as TXTIcon,
  BsFileEarmarkPlay as VideoIcon
} from 'react-icons/bs'
import { SiLua as LuaIcon, SiBun as BunIcon } from 'react-icons/si'
import { FaRust as RustIcon } from 'react-icons/fa'
import { VscJson as JsonIcon } from 'react-icons/vsc'
import { HiOutlinePhotograph as ImageIcon } from 'react-icons/hi'
import { FileIcon, FolderIcon } from 'lucide-react'

const iconsForExtensions = Object.freeze({
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
})

const FileOrFolderItem: FC<{ fileOrFolder: AddEventProps }> = ({
  fileOrFolder
}) => {
  return fileOrFolder[0] ? (
    <FolderIcon />
  ) : (
    iconsForExtensions[fileOrFolder[3] as keyof typeof iconsForExtensions] || (
      <FileIcon />
    )
  )
}

export default FileOrFolderItem
