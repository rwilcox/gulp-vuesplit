<img src="assets/vuejs.png" alt="VueJS Logo" width="200" height="200"/>
<img src="assets/gulp.png" alt="Gulp Logo" width="91" height="200"/>

# Gulp Vue Split<br/>[![Sponsored by][sponsor-img]][sponsor] [![Downloads][npm-version-img]][npm] [![Downloads][npm-downloads-img]][npm] [![Build Status][ci-img]][ci] [![Dependencies][deps-img]][deps]

[sponsor-img]: https://img.shields.io/badge/Sponsored%20by-Sebastian%20Software-692446.svg
[sponsor]: https://www.sebastian-software.de
[ci-img]:  https://travis-ci.org/sebastian-software/gulp-vuesplit.svg
[ci]:      https://travis-ci.org/sebastian-software/gulp-vuesplit
[deps]: https://david-dm.org/sebastian-software/gulp-vuesplit
[deps-img]: https://david-dm.org/sebastian-software/gulp-vuesplit.svg
[npm]: https://www.npmjs.com/package/gulp-vuesplit
[npm-downloads-img]: https://img.shields.io/npm/dm/gulp-vuesplit.svg
[npm-version-img]: https://img.shields.io/npm/v/gulp-vuesplit.svg

A trivial solution for splitting `.vue` files for [VueJS](http://vuejs.org) at compile time for later processing using "normal" CSS and JavaScript tools.

Supports CSS module preprocessing for prevention of naming conflicts between components.

Uses a memory cache during runtime to omit regenerating files with probably unchanged content.

## Links

- [GitHub](https://github.com/sebastian-software/gulp-vuesplit)
- [NPM](https://www.npmjs.com/package/gulp-vuesplit)


## Installation

Should be installed locally in your project source code:

```bash
npm install gulp-vuesplit --save-dev
```


## Usage with Gulp

```js
import vueSplit from "gulp-vuesplit"

gulp.task("vuesplit", function() {
  return gulp.src("src/**/*.vue").
    pipe(vueSplit()).
    pipe(gulp.dest("."))
})
```

This generates the extract/processed `.html`, `.css`, `.js` files to the same folder as the source `.vue` file.


## Example Vue-File

```vue
<style>
  .message{
    border: 2px solid red;
  }

  .title {
    font-size: 3em;
  }

  .buttonbar{
    width: auto;
  }

  .cancel{
    background: red;
  }

  .okay{
    background: green;
  }
</style>

<template>
  <div css-module="message">
    <h1 css-module="title">{{msg}}</h1>
    <p>Intro text</p>
    <div css-module="buttonbar">
      <button css-module="cancel">Cancel</button>
      <button css-module="okay">Save</button>
    </div>
  </div>
</template>

<script>
  import template from "./Test.html";
  export default {
    template: template,
    data: function () {
      return {
        msg: "Hello world!"
      }
    }
  }
</script>
```



## Copyright

<img src="https://raw.githubusercontent.com/sebastian-software/s15e-javascript/master/assets/sebastiansoftware.png" alt="Sebastian Software GmbH Logo" width="250" height="200"/>

Copyright 2016<br/>[Sebastian Software GmbH][sponsor]
