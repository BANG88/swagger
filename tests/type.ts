// https://api.apis.guru/v2/list.json
import test from 'ava'
import { isBodyParameter } from '..'

test('#isBodyParameter', async t => {
  t.true(
    isBodyParameter({
      description: 'The updated AgentStatus.',
      in: 'body',
      name: 'agentStatus',
      required: true,
      schema: {
        $ref: '#/definitions/BuildSystem.Shared.DTO.AgentStatus',
      },
    })
  )
})
