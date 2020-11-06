const {
  quicktype,
  InputData,
  jsonInputForTargetLanguage,
  JSONSchemaInput,
  Parser,
} = require('quicktype-core')

export async function quicktypeJSONSchema({
  targetLanguage = 'TypeScript',
  typeName,
  jsonSchemaString,
}: {
  targetLanguage?: any
  typeName: any
  jsonSchemaString: any
}) {
  const schemaInput = new JSONSchemaInput()

  // We could add multiple schemas for multiple types,
  // but here we're just making one type from JSON schema.
  await schemaInput.addSource({
    name: typeName,
    schema: JSON.stringify(jsonSchemaString),
  })
  const inputData = new InputData()
  inputData.addInput(schemaInput)
  return await quicktype({
    inputData,
    lang: targetLanguage,
    rendererOptions: {
      'just-types': true,
      'runtime-typecheck': false,
      'date-times': false,
      'nice-property-names': false,
      'acronym-style': 'original',
    },
  })
}
