# Swagger

> Lets say we want generate codes from swagger api. but the scheme's type is different with `JavaScript`.
> so we need convert it to `JavaScript` type

## Installation

```sh
yarn add @merryjs/swagger # or
npm install @merryjs/swagger --save
```

## Usage

```ts
import { parseAll } from '@merryjs/swagger'
;(async function() {
  const api = await parseAll('path/to/your/swagger.json')
  // modified version.
  console.log(api)
})()
```
