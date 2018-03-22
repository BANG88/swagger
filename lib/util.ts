import prettier, { Options } from 'prettier'
export const format = async (contents: string, options: Options = {}) => {
  const config = (await prettier.resolveConfig(process.cwd())) || {}
  const result = prettier.format(contents, {
    parser: 'typescript',
    ...config,
    ...options,
  })
  return result
}
