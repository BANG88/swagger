/**
 * generate interfaces from definitions
 */
import { parse } from './normalizer'
import { Spec, Schema } from 'swagger-schema-official'
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
        const ifs = getDefinitions(element)
        def = changeCase.pascalCase(def)
        try {
          const config = (await prettier.resolveConfig(process.cwd())) || {}
          const result = prettier.format(
            `${getComments(element)}export interface ${def} ${ifs}`,
            {
              parser: 'typescript',
              ...config,
            }
          )
          definitions[def] = result
        } catch (error) {
          console.log(`err: %s`, error)
        }
      }
    }
  }
  return definitions
}
