/**
 * **NOTE**: Its recommended that you should dereference your api definitions at first
 * you can checkout the `parse` function defined in normalizer.ts
 * which use `swagger-parser` dereference the definition references
 * and then you can use theses methods simply
 */

import { Schema, Parameter, BodyParameter } from 'swagger-schema-official'

/**
 * check current parameter is BodyParameter
 * @param parameter
 */
export const isBodyParameter = (
  parameter: Parameter
): parameter is BodyParameter => {
  return (<BodyParameter>parameter).schema !== undefined
}

/**
 * format parameter's type
 * @param parameter parameters
 */
export const typeOfParameter = (parameter: Parameter): any => {
  if (isBodyParameter(parameter)) {
    return typeOfSchema(parameter.schema!)
  }
  return typeOfSchema(parameter as any)
}

/**
 * get schema
 * @param schema
 */
export const typeOfSchema = (schema: Schema) => {
  switch (schema.type) {
    case 'object':
      if (schema.properties) {
        for (const prop in schema.properties) {
          if (schema.properties.hasOwnProperty(prop)) {
            let element = schema.properties[prop]
            element = typeOfSchema(element)
          }
        }
      }
      break
    case 'array':
      if (Array.isArray(schema.items)) {
        schema.items.map(item => typeOfSchema(item))
      } else if (schema.items) {
        schema.items = typeOfSchema(schema.items)
      }
    default:
      schema.type = formatType(schema)
      break
  }
  return schema
}
/**
 * format type
 * @param schema
 */
export const formatType = (schema: Schema): string => {
  switch (schema.type) {
    case 'string':
      return 'string'
    case 'integer':
    case 'number':
      return 'number'
    case 'boolean':
      return 'boolean'
    case 'object':
      return 'object'
    case 'array':
      return 'array'
    case 'null':
      return 'null'
    case 'any':
      return 'any'
  }

  switch (typeof schema.default) {
    case 'boolean':
      return 'boolean'
    case 'number':
      return 'number'
    case 'string':
      return 'string'
  }

  return 'any'
}
