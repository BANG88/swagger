// https://api.apis.guru/v2/list.json
import test from 'ava'
import { generateDefinitions } from '../index'
test('resolver', async t => {
  generateDefinitions({
    api: __dirname + '/swagger.json',
    dist: __dirname + '/json',
  })
})
