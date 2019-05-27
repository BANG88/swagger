// https://api.apis.guru/v2/list.json
import test from 'ava'
import fs from 'fs-extra'
import { generateDefinitions, generatePaths } from '../index'

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

test('generatePaths', async t => {
  const result = await generatePaths(__dirname + '/swagger.yml')
  for (const key in result) {
    if (result.hasOwnProperty(key)) {
      const element = result[key]
      console.log(`handle file: %s`, key)
      const dist = __dirname + '/json' + `/${key}.ts`
      fs.ensureFileSync(dist)
      fs.writeFile(dist, element, 'utf-8', err => {
        if (err) {
          console.log(`err: %s`, err)
        }
      })
    }
  }
})

test('generatePaths with schema', async t => {
  const result = await generatePaths(__dirname + '/swagger.yml', {
    schema: true,
    definitionName: '{path}{operationId}',
  })
  for (const key in result) {
    if (result.hasOwnProperty(key)) {
      const element = result[key]
      console.log(`handle file: %s`, key)
      const dist = __dirname + '/json' + `/${key}.ts`
      fs.ensureFileSync(dist)
      fs.writeFile(dist, element, 'utf-8', err => {
        if (err) {
          console.log(`err: %s`, err)
        }
      })
    }
  }
})
