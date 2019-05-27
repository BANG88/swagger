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

export const getActionsByOperation = (op: string) => {
  const isGet = op === 'get'
  const isPut = op === 'put'
  const isPost = op === 'post'
  const isDelete = op === 'delete'
  const isOptions = op === 'options'
  const isHead = op === 'head'
  const isPatch = op === 'patch'
  const actions = {
    isGet,
    isPut,
    isPost,
    isDelete,
    isOptions,
    isHead,
    isPatch,
  }
  return actions
}
