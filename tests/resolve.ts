// https://api.apis.guru/v2/list.json
import test from 'ava'
import fs from 'fs'
import { generateDefinitions } from '../index'

test('resolver', async t => {
  const result = await generateDefinitions({
    api: __dirname + '/swagger.json',
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
