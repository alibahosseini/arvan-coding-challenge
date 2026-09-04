import defaultFileIcon from '../../assets/FormatIcons/default_file.svg'
import cIcon from '../../assets/FormatIcons/file_type_c.svg'
import cppIcon from '../../assets/FormatIcons/file_type_cpp.svg'
import csharpIcon from '../../assets/FormatIcons/file_type_csharp.svg'
import cssIcon from '../../assets/FormatIcons/file_type_css.svg'
import dartIcon from '../../assets/FormatIcons/file_type_dartlang.svg'
import dockerIcon from '../../assets/FormatIcons/file_type_docker.svg'
import gitIcon from '../../assets/FormatIcons/file_type_git.svg'
import goIcon from '../../assets/FormatIcons/file_type_go.svg'
import graphqlIcon from '../../assets/FormatIcons/file_type_graphql.svg'
import htmlIcon from '../../assets/FormatIcons/file_type_html.svg'
import javaIcon from '../../assets/FormatIcons/file_type_java.svg'
import jsIcon from '../../assets/FormatIcons/file_type_js.svg'
import jsonIcon from '../../assets/FormatIcons/file_type_json.svg'
import kotlinIcon from '../../assets/FormatIcons/file_type_kotlin.svg'
import luaIcon from '../../assets/FormatIcons/file_type_lua.svg'
import markdownIcon from '../../assets/FormatIcons/file_type_markdown.svg'
import perlIcon from '../../assets/FormatIcons/file_type_perl.svg'
import phpIcon from '../../assets/FormatIcons/file_type_php.svg'
import pythonIcon from '../../assets/FormatIcons/file_type_python.svg'
import reactJsIcon from '../../assets/FormatIcons/file_type_reactjs.svg'
import reactTsIcon from '../../assets/FormatIcons/file_type_reactts.svg'
import rubyIcon from '../../assets/FormatIcons/file_type_ruby.svg'
import rustIcon from '../../assets/FormatIcons/file_type_rust.svg'
import scalaIcon from '../../assets/FormatIcons/file_type_scala.svg'
import scssIcon from '../../assets/FormatIcons/file_type_scss.svg'
import shellIcon from '../../assets/FormatIcons/file_type_shell.svg'
import sqlIcon from '../../assets/FormatIcons/file_type_sql.svg'
import swiftIcon from '../../assets/FormatIcons/file_type_swift.svg'
import tomlIcon from '../../assets/FormatIcons/file_type_toml.svg'
import typescriptIcon from '../../assets/FormatIcons/file_type_typescript.svg'
import vueIcon from '../../assets/FormatIcons/file_type_vue.svg'
import xmlIcon from '../../assets/FormatIcons/file_type_xml.svg'
import yamlIcon from '../../assets/FormatIcons/file_type_yaml.svg'

const FILE_ICON_MAP: Record<string, string> = {
  js: jsIcon,
  mjs: jsIcon,
  cjs: jsIcon,
  jsx: reactJsIcon,
  ts: typescriptIcon,
  mts: typescriptIcon,
  tsx: reactTsIcon,
  html: htmlIcon,
  htm: htmlIcon,
  css: cssIcon,
  scss: scssIcon,
  sass: scssIcon,
  json: jsonIcon,
  jsonc: jsonIcon,
  md: markdownIcon,
  markdown: markdownIcon,
  vue: vueIcon,
  py: pythonIcon,
  pyw: pythonIcon,
  go: goIcon,
  rs: rustIcon,
  java: javaIcon,
  c: cIcon,
  h: cIcon,
  cpp: cppIcon,
  cc: cppIcon,
  cxx: cppIcon,
  hpp: cppIcon,
  cs: csharpIcon,
  php: phpIcon,
  rb: rubyIcon,
  swift: swiftIcon,
  kt: kotlinIcon,
  kts: kotlinIcon,
  dart: dartIcon,
  sql: sqlIcon,
  yaml: yamlIcon,
  yml: yamlIcon,
  xml: xmlIcon,
  sh: shellIcon,
  bash: shellIcon,
  zsh: shellIcon,
  toml: tomlIcon,
  lua: luaIcon,
  scala: scalaIcon,
  pl: perlIcon,
  graphql: graphqlIcon,
  gql: graphqlIcon,
  dockerfile: dockerIcon,
  gitignore: gitIcon,
  gitattributes: gitIcon,
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
