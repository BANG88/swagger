/**
 * generate interfaces from definitions
 */
import { parse } from './normalizer'
import {
  Spec,
  Schema,
  Operation,
  Parameter,
  HeaderParameter,
  QueryParameter,
  BodyParameter,
  PathParameter,
  FormDataParameter,
  Path,
} from 'swagger-schema-official'
import { API, isBodyParameter } from './type'
import fs from 'fs'
import prettier from 'prettier'
import changeCase from 'change-case'
import { format } from './util'

/**
 * get comments from schema
 * @param schema
 */
const getComments = (schema: Schema) => {
  let comments = schema.description || schema.title || ''
  if (comments) {
    comments = `
/**
* ${comments}
*/\n`
  }
  return comments
}
/**
 * check a field is required
 * @param schema schema
 * @param key the key you want check
 */
const isRequired = (schema: Schema | Parameter, key: string) => {
  const required =
    typeof schema.required === 'boolean'
      ? schema.required
      : schema.required && schema.required.includes(key)
  return required ? '' : '?'
}
/**
 * get enum type
 * @param schema
 */
const getEnumType = (schema: Schema) => {
  return schema
    .enum!.map(e => {
      if (schema.type === 'string') {
        return `"${e}"`
      }
      return e
    })
    .join('|')
}

/**
 * get definitions by scheme
 * @param schema
 */
const getSchemaDefinitions = (schema: Schema): string => {
  switch (schema.type) {
    case 'object':
      let res = `{`

      if (schema.properties) {
        for (const key in schema.properties) {
          if (schema.properties.hasOwnProperty(key)) {
            const prop = schema.properties[key]
            res += `${getComments(prop)}${key}${isRequired(
              schema,
              key
            )}: ${getSchemaDefinitions(prop)}\n`
          }
        }
      }
      return res + '}'
    case 'array':
      if (Array.isArray(schema.items)) {
        return (
          schema.items.map(item => getSchemaDefinitions(item)).join(',') + '[]'
        )
      }
      if (schema.items) {
        return getSchemaDefinitions(schema.items) + '[]'
      }
      return 'any[]'

    default:
      if (schema.enum) {
        return getEnumType(schema)
      }
      return schema.type || 'any'
  }
}

export const getParameterDefinitions = (parameter: Parameter) => {
  if (isBodyParameter(parameter)) {
    return getSchemaDefinitions(parameter.schema!)
  }
  if (parameter.enum) {
    return getEnumType(parameter as any)
  }
  return parameter.type
}
/**
 * options for generate
 */
export interface GenerateOptions {
  api: API
}
const toInterface = async (element: Schema, def: string) => {
  const ifs = getSchemaDefinitions(element)
  let result = ''
  try {
    const contents =
      element.type === element.enum || element.type === 'array'
        ? `${getComments(element)}export type ${def} = ${ifs}`
        : `${getComments(element)}export interface ${def} ${ifs}`

    result = await format(contents)
  } catch (error) {
    console.log(`err: %s`, error)
  }
  return result
}
/**
 * generate interfaces
 * @param options
 */
export const generateDefinitions = async (options: GenerateOptions) => {
  const res = await parse(options.api)
  const definitions: {
    [key: string]: string
  } = {}
  if (res.definitions) {
    let defs = ''
    for (let def in res.definitions) {
      if (res.definitions.hasOwnProperty(def)) {
        const element = res.definitions[def]
        def = changeCase.pascalCase(def)
        definitions[def] = await toInterface(element, def)
      }
    }
  }
  return definitions
}
// TODO
export const generatePaths = async (
  api: API,
  options?: GenerateByPathOptions
) => {
  const res = await parse(api)
  const results: {
    [key: string]: GenerateResults
  } = {}
  if (!res.paths) {
    return results
  }
  // paths
  for (const path in res.paths) {
    if (res.paths.hasOwnProperty(path)) {
      const resultsArr = await generateByPath(path, res.paths[path], options)
      results[path] = resultsArr
    }
  }
  return results
}

export interface FormatterOptions {
  library: string
  elements: {
    [key: string]: string
  }
  fallback: string
}
/**
 * default formatter
 */
export const defaultFormatter: FormatterOptions = {
  library: 'antd',
  elements: {
    number: 'InputNumber',
    string: 'Input',
    boolean: 'Switch',
    datetime: 'DatePicker',
  },
  fallback: 'Input',
}
export interface FormatResult {
  label: string
  rules: {
    message: string
    required: boolean
  }[]
  name: string
  type: string
  rulesRaw: string
}
/**
 * formatter
 * @param name
 * @param parameter
 * @param options
 */
export const formatter = (
  name: string,
  parameter: Parameter | Schema,
  options = defaultFormatter
): FormatResult => {
  let schema: Schema
  if (isBodyParameter(parameter as Parameter)) {
    schema = (parameter as BodyParameter).schema!
  } else {
    schema = parameter as Schema
  }
  const rules = []
  const label = parameter.description
    ? parameter.description.replace(/\t|\n|\r/g, '')
    : ''
  if (parameter.required) {
    rules.push({
      required: true,
      message: label,
    })
  }

  // 对应antd组件
  let type = schema.type
    ? options.elements[schema.type] || options.fallback
    : options.fallback

  return {
    label,
    rules,
    name,
    type,
    rulesRaw: JSON.stringify(rules, null, 2),
  }
}
export interface GenerateByPathOptions {
  /**
   * '{path}{operationId}'
   */
  definitionName: string
}
export type GenerateResults = Array<{
  responses: string
  parameters: string
  path: string
  summary?: string
}>
/**
 * generate interface and form by path
 * @param path
 */
export const generateByPath = async (
  path: string,
  element: Path,
  options: GenerateByPathOptions = {
    definitionName: '{path}{operationId}',
  }
) => {
  const results: GenerateResults = []
  // verb
  for (const op in element) {
    if (element.hasOwnProperty(op)) {
      const operation: Operation = (element as any)[op]

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
      const result: {
        responses: string
        parameters: string
        // operation: Operation
        path: string
        summary?: string
      } & typeof actions = {
        responses: '',
        parameters: '',
        // operation,
        ...actions,
        path,
        summary: operation.summary,
      }

      const baseDefinitionName = changeCase.pascalCase(
        options.definitionName
          .replace('{path}', path)
          .replace('{operationId}', operation.operationId || '')
      )

      // responses
      for (const response in operation.responses) {
        if (operation.responses.hasOwnProperty(response)) {
          const res = operation.responses[response]
          if (res.schema && res.schema.type) {
            if (
              (response === '200' && res.schema.type === 'object') ||
              res.schema.type === 'array'
            ) {
              result.responses = await toInterface(
                res.schema,
                `${baseDefinitionName}Entity`
              )
            }
          }
        }
      }
      if (operation.parameters) {
        const def = `${baseDefinitionName}Params`
        const types = await format(
          `${getComments(operation)}export interface ${def} {\n${getInterface(
            operation.parameters
          )}\n}`
        )
        result.parameters = types
        // for (const parameter in operation.parameters) {
        //   if (operation.parameters.hasOwnProperty(parameter)) {
        //     const element = operation.parameters[parameter]
        // 		const def = changeCase.pascalCase(path + operation.operationId)
        // 		let ifs = ''
        //     if (isBodyParameter(element) && element.schema) {
        //       ifs = await toInterface(element.schema, def)
        //     }else{

        // 			console.log('ele: ',  await toInterface(element as any, def))
        // 		}
        // 		result.parameters = ifs
        //   }
        // }
      }

      results.push(result)
    }
  }
  return results
}

export const getInterface = (parameters?: Parameter[]) => {
  if (!parameters) {
    return ''
  }
  return parameters
    .map(p => {
      return `${getComments(p as any)}${p.name}${isRequired(
        p,
        p.name
      )}: ${getParameterDefinitions(p)}`
    })
    .join('\n')
}
/**
 * get data by ii
 * @param operationId
 * @param path
 */
export const getDataByOperationId = (
  parameters?: Parameter[],
  options = defaultFormatter
) => {
  if (parameters) {
    const a = parameters.map(p => formatter(p.name, p, options))
    return a
  }
  return []
}
/**
 * get imports
 * @param results
 * @param library
 */
export const getImports = (
  results: FormatResult[],
  library: string = defaultFormatter.library
) => {
  const types = [...new Set(results.map(_ => _.type))]
  return {
    raw: `import { ${types.join(', ')} } from '${library}'`,
    types,
  }
}

export interface TypeDetails {
  parameters: FormatResult[]
  imports: {
    raw: string
    types: string[]
  }
  types: string
  definitionName: string
}
/**
 * get all
 * @param operationId
 * @param path
 * @param options
 */
export const getDetails = async (
  operationId: string,
  path: Path,
  interfaceName: string,
  options = defaultFormatter
): Promise<TypeDetails> => {
  const op: Operation = (path as any)[operationId]
  if (!op) {
    return {} as any
  }
  const parameters = getDataByOperationId(op.parameters, options)
  const imports = getImports(parameters, options.library)
  const definitionName = changeCase.pascalCase(interfaceName)
  const types = await format(
    `${getComments(op)}export interface ${definitionName} {\n${getInterface(
      op.parameters
    )}\n}`
  )
  return {
    parameters,
    imports,
    types,
    definitionName,
  }
}
