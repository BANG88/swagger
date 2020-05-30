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
import { format, getActionsByOperation } from './util'
import { quicktypeJSONSchema } from './quicktype'
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
    schema.required === undefined
      ? true
      : typeof schema.required === 'boolean'
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
export interface SchemaDefinitionsRoot {
  [key: string]: string
}
/**
 * get definitions by scheme
 * @param schema
 */
const getSchemaDefinitions = (
  schema: Schema,
  root?: SchemaDefinitionsRoot,
  key: string = ''
): string => {
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
            )}: ${getSchemaDefinitions(prop, root, key)}\n`
          }
        }
      }
      return res + '}'
    case 'array':
      if (Array.isArray(schema.items)) {
        const d = schema.items
          .map(item => getSchemaDefinitions(item, root))
          .join(',')
        if (key && root) {
          root[key] = `export interface ${key}=${d}`
          return `${key}[]`
        }
        return 'Array<' + d + '>'
      }
      if (schema.items) {
        const d = getSchemaDefinitions(schema.items, root)
        if (key && root) {
          if (
            schema.items.type === 'number' ||
            schema.items.type === 'string'
          ) {
            return schema.items.type + '[]'
          }
          root[key] = `export interface ${key} ${d}`
          return `${key}[]`
        }
        return 'Array<' + d + '>'
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
  const ifsResults: SchemaDefinitionsRoot = {}
  const ifs = getSchemaDefinitions(element, ifsResults, def + 'Item')
  let result = ''
  try {
    const contents =
      element.type === element.enum || element.type === 'array'
        ? `${getComments(element)}export type ${def} = ${ifs}`
        : `${getComments(element)}export interface ${def} ${ifs}`
    let preDefined = '\n'
    for (const key in ifsResults) {
      if (ifsResults.hasOwnProperty(key)) {
        const element = ifsResults[key]
        preDefined += element + '\n'
      }
    }
    result = await format(preDefined + contents)
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
/**
 * Generate by paths
 * @param api
 * @param options
 */
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
  rules: Array<{
    message: string
    required: boolean
  }>
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
  /**
   * Generate json schema too.
   */
  schema?: boolean
}
export interface GenerateResult {
  responses: string
  parameters: string
  path: string
  summary?: string
  definitionEntityName?: string
  definitionParamsName?: string
  operation: string
  isArrayEntity: boolean
}
export type GenerateResults = Array<GenerateResult>
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

      const actions = getActionsByOperation(op)
      const operations = path.split('/')
      const operationStr = operations[operations.length - 1]
      const successRes = operation.responses['200']
      const isArrayEntity = !!(
        successRes &&
        successRes.schema &&
        successRes.schema.type === 'array'
      )
      const result: GenerateResult & typeof actions = {
        responses: '',
        parameters: '',
        // operation,
        ...actions,
        path,
        operation: operationStr,
        summary: operation.summary,
        isArrayEntity,
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
              result.definitionEntityName = `${baseDefinitionName}Entity`.replace(
                'Api',
                'API'
              )
              const json = {
                ...res.schema,
                id: operationStr,
                $schema: 'http://json-schema.org/draft-06/schema#',
                description: result.summary,
              }

              result.responses = (await quicktypeJSONSchema({
                typeName: result.definitionEntityName,
                jsonSchemaString: json,
              })).lines
                .join('\n')
                .replace(/\?\:/gi, ':')

              // if (options.schema) {
              //   const json = {
              //     ...res.schema,
              //     id: operationStr,
              //     $schema: 'http://json-schema.org/draft-06/schema#',
              //     description: result.summary,
              //   }
              //   result.responses = JSON.stringify(json)
              // } else {
              //   result.responses = await toInterface(
              //     res.schema,
              //     `${baseDefinitionName}Entity`
              //   )
              // }
            }
          }
        }
      }
      if (operation.parameters) {
        const def = `${baseDefinitionName}Params`
        result.definitionParamsName = `${baseDefinitionName}Params`
        // const json = {
        //   ...res.schema,
        //   id: operationStr,
        //   $schema: 'http://json-schema.org/draft-06/schema#',
        //   description: result.summary,
        // }

        // result.responses = (await quicktypeJSONSchema({
        //   typeName: result.definitionEntityName,
        //   jsonSchemaString: json,
        // })).lines.join('\n')
        if (options.schema) {
          const j: any = {}
          operation.parameters.forEach(p => {
            j[p.name] = p
          })
          const json = {
            id: operationStr,
            $schema: 'http://json-schema.org/draft-06/schema#',
            description: result.summary,
            properties: j,
          }
          result.parameters = JSON.stringify(json)
        } else {
          const types = await format(
            `${getComments(operation)}export interface ${def} {\n${getInterface(
              operation.parameters
            )}\n}`
          )
          result.parameters = types
        }
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
  // fix: dot net post request has a parameter doest not work
  // parameters : { user: { id: 1 } } =>  parameters: { id: 1}
  if (parameters.length === 1 && isBodyParameter(parameters[0])) {
    return getParameterDefinitions(parameters[0])
      .replace(/^{/, '')
      .replace(/}$/, '')
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
