import type { NextPage } from 'next'
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

const ICON_SIZE = 25

const iconsForExtensions = Object.freeze({
  ts: <TypeScriptIcon size={ICON_SIZE} />,
  tsx: <TypeScriptIcon size={ICON_SIZE} />,
  js: <JavaScriptIcon size={ICON_SIZE} />,
  jsx: <JavaScriptIcon size={ICON_SIZE} />,
  py: <PythonIcon size={ICON_SIZE} />,
  json: <JsonIcon size={ICON_SIZE} />,
  zip: <ZipIcon size={ICON_SIZE} />,
  html: <HTMLIcon size={ICON_SIZE} />,
  png: <ImageIcon size={ICON_SIZE} />,
  jpg: <ImageIcon size={ICON_SIZE} />,
  jpeg: <ImageIcon size={ICON_SIZE} />,
  svg: <ImageIcon size={ICON_SIZE} />,
  ico: <ImageIcon size={ICON_SIZE} />,
  txt: <TXTIcon size={ICON_SIZE} />,
  pdf: <PDFIcon size={ICON_SIZE} />,
  lua: <LuaIcon size={ICON_SIZE} />,
  rs: <RustIcon size={ICON_SIZE} />,
  css: <CSSIcon size={ICON_SIZE} />,
  md: <MDIcon size={ICON_SIZE} />,
  mp4: <VideoIcon size={ICON_SIZE} />,
  avi: <VideoIcon size={ICON_SIZE} />,
  mkv: <VideoIcon size={ICON_SIZE} />,
  webm: <VideoIcon size={ICON_SIZE} />,
  lockb: <BunIcon size={ICON_SIZE} />
} as const)

const FileOrFolderItem: NextPage<{ fileOrFolder: AddEventProps }> = ({
  fileOrFolder
}) => {
  return fileOrFolder.is_folder ? (
    <FolderIcon />
  ) : (
    iconsForExtensions[
      fileOrFolder.extension as keyof typeof iconsForExtensions
    ] || <FileIcon />
  )
}

export default FileOrFolderItem
