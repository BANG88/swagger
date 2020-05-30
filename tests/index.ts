// https://api.apis.guru/v2/list.json
import test from 'ava'
import fs from 'fs-extra'
import { generateDefinitions, generatePaths } from '../index'
import { quicktypeJSONSchema } from '../lib/quicktype'
test('quicktype', async t => {
  const jsonSchemaString = {
    $schema: 'http://json-schema.org/draft-06/schema#',
    description: 'result.summary',
  }
  const { lines } = await quicktypeJSONSchema({
    typeName: 'TEST',
    jsonSchemaString: jsonSchemaString,
  })
  fs.writeFile(__dirname + '/json/test.ts', lines.join('\n'), 'utf-8', err => {
    if (err) {
      console.log(`err: %s`, err)
    }
  })
})
test('resolver', async t => {
  const result = await generateDefinitions({
    api: __dirname + '/swagger.yml',
  })
  for (const key in result) {
    if (result.hasOwnProperty(key)) {
      const element = result[key]
      console.log(`handle file: %s`, key)
      fs.writeFile(
        __dirname + '/json' + `/${key}.ts`,
        element,
        'utf-8',
        err => {
          if (err) {
            console.log(`err: %s`, err)
          }
        }
      )
    }
  }
})
