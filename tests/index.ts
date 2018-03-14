// https://api.apis.guru/v2/list.json
import test from 'ava'
import { Spec, Operation } from 'swagger-schema-official'

import fs from 'fs'
import { parse } from '../index'

test('local json file', async t => {
  const res: Spec = await parse(__dirname + '/swagger.json')
  t.is(res.info.version, 'v1')
  t.is(res.info.title, 'AGCO API')
  fs.writeFileSync(
    __dirname + '/json/swagger.json.json',
    JSON.stringify(res, null, 2),
    'utf-8'
  )
})

test('local yaml file', async t => {
  const res: Spec = await parse(__dirname + '/swagger.yml')
  t.is(res.info.version, '1.0.0')
  t.is(res.info.title, 'Swagger Petstore')
  fs.writeFileSync(
    __dirname + '/json/swagger.yml.json',
    JSON.stringify(res, null, 2),
    'utf-8'
  )
})

test('remote file', async t => {
  const res: Spec = await parse(
    'https://api.apis.guru/v2/specs/adafruit.com/2.0.0/swagger.json'
  )
  t.is(res.info.title, 'Adafruit IO')
  fs.writeFileSync(
    __dirname + '/json/adafruit.json',
    JSON.stringify(res, null, 2),
    'utf-8'
  )
})
