/**
 * generate interfaces from definitions
 */
import { parse } from './normalizer'
import { Spec, Schema, Operation } from 'swagger-schema-official'
import { API } from './type'
import fs from 'fs'
import prettier from 'prettier'
import changeCase from 'change-case'

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
const isRequired = (schema: Schema, key: string) => {
  const required = schema.required && schema.required.includes(key)
  return required ? '' : '?'
}
/**
 * get definitions by scheme
 * @param schema
 */
const getDefinitions = (schema: Schema): string => {
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
            )}: ${getDefinitions(prop)}\n`
          }
        }
      }
      return res + '}'
    case 'array':
      if (Array.isArray(schema.items)) {
        return schema.items.map(item => getDefinitions(item)).join(',') + '[]'
      }
      if (schema.items) {
        return getDefinitions(schema.items) + '[]'
      }
      return 'any[]'

    default:
      if (schema.enum) {
        return schema.enum
          .map(e => {
            if (schema.type === 'string') {
              return `"${e}"`
            }
            return e
          })
          .join('|')
      }
      return schema.type || 'any'
  }
}

/**
 * options for generate
 */
export interface GenerateOptions {
  api: API
}
const toInterface = async (element: Schema, def: string) => {
  const ifs = getDefinitions(element)
  let result = ''
  try {
    const config = (await prettier.resolveConfig(process.cwd())) || {}
    const contents =
      element.type === 'array'
        ? `${getComments(element)}export type ${def} = ${ifs}`
        : `${getComments(element)}export interface ${def} ${ifs}`

    result = prettier.format(contents, {
      parser: 'typescript',
      ...config,
    })
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
export const generatePaths = async (api: API) => {
  const res = await parse(api)
  const results: {
    [key: string]: string
  } = {}
  if (!res.paths) {
    return results
  }
  // paths
  for (const path in res.paths) {
    if (res.paths.hasOwnProperty(path)) {
      const element = res.paths[path]
      // verb
      for (const op in element) {
        if (element.hasOwnProperty(op)) {
          const operation: Operation = (element as any)[op]
          // responses
          for (const response in operation.responses) {
            if (operation.responses.hasOwnProperty(response)) {
              const res = operation.responses[response]
              if (res.schema && res.schema.type) {
                if (
                  res.schema.type === 'object' ||
                  res.schema.type === 'array'
                ) {
                  const def = changeCase.pascalCase(
                    path + operation.operationId
                  )
                  results[def] = await toInterface(res.schema, def)
                }
              }
            }
          }
        }
      }
    }
  }
  return results
}
