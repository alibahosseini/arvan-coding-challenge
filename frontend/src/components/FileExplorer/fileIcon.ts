import defaultFileIcon from '../../assets/FormatIcons/default_file.svg'
import cssIcon from '../../assets/FormatIcons/file_type_css.svg'
import htmlIcon from '../../assets/FormatIcons/file_type_html.svg'
import jsIcon from '../../assets/FormatIcons/file_type_js.svg'
import jsonIcon from '../../assets/FormatIcons/file_type_json.svg'
import markdownIcon from '../../assets/FormatIcons/file_type_markdown.svg'
import reactJsIcon from '../../assets/FormatIcons/file_type_reactjs.svg'
import reactTsIcon from '../../assets/FormatIcons/file_type_reactts.svg'
import scssIcon from '../../assets/FormatIcons/file_type_scss.svg'
import typescriptIcon from '../../assets/FormatIcons/file_type_typescript.svg'
import vueIcon from '../../assets/FormatIcons/file_type_vue.svg'

const FILE_ICON_MAP: Record<string, string> = {
  js: jsIcon,
  jsx: reactJsIcon,
  ts: typescriptIcon,
  tsx: reactTsIcon,
  html: htmlIcon,
  css: cssIcon,
  scss: scssIcon,
  json: jsonIcon,
  md: markdownIcon,
  vue: vueIcon,
}

/**
 * Resolves a file's icon URL from its current filename/extension. Never
 * stored on the file itself, so renaming a file (or typing a new extension
 * live) always reflects the current name.
 */
export function getFileIcon(filename: string): string {
  const extension = filename.split('.').pop()?.toLowerCase() ?? ''
  return FILE_ICON_MAP[extension] ?? defaultFileIcon
}
