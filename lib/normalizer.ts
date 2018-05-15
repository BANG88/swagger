import { Operation, Spec } from 'swagger-schema-official'

import { API, typeOfSchema, typeOfParameter } from './type'
import parser from 'swagger-parser'

/**
 * parse all types in schemas|parameters|responses
 * @param api
 */
export const parse = async (api: API) => {
  const res: Spec = await parser.dereference(api, {
    dereference: {
      circular: 'ignore',
    },
  } as any)

  for (const key in res.paths) {
    if (res.paths.hasOwnProperty(key)) {
      const element = res.paths[key]
      for (const ac in element) {
        if (element.hasOwnProperty(ac)) {
          const el: Operation = (element as any)[ac]
          // parser parameters
          let parameters = el.parameters
          if (parameters) {
            parameters = parameters.map(p => {
              return typeOfParameter(p)
            })
          }
          // parse responses
          if (el.responses) {
            for (const response in el.responses) {
              if (el.responses.hasOwnProperty(response)) {
                const res = el.responses[response]
                if (res.schema) {
                  res.schema = typeOfSchema(res.schema)
                }
              }
            }
          }
        }
      }
    }
    // parse definitions
    if (res.definitions) {
      for (const def in res.definitions) {
        if (res.definitions.hasOwnProperty(def)) {
          let schema = res.definitions[def]
          schema = typeOfSchema(schema)
        }
      }
    }
  }
  return res
}
