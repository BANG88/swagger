# Swagger [![Build Status](https://travis-ci.org/bang88/swagger.svg?branch=master)](https://travis-ci.org/bang88/swagger)

> Lets say we want generate codes from swagger api. but the scheme's type is different with `JavaScript`.
> so we need convert it to `JavaScript` type

_TODO_:

* [x] convert schema type to `TypeScript` type
* [x] generate `TypeScript` type definitions from swagger definitions
* [ ] generate a readable data format from swagger api that we can use it in handlebar templates easier
* [ ] write a plugin for `@merryjs/cli` so we can generate `React` or `React Native` project
* [ ] write a plugin fro `@merryjs/cli` so we can generate console projects that using `Ant-Design` as UI framework
* [ ] write tests

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
