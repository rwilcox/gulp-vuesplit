/*
===============================================================================
  Gulp Vue-Split
  Copyright 2016 Sebastian Software GmbH <https://www.sebastian-software.de>
===============================================================================
*/

import fs from "fs"
import through from "through2"
import parse5 from "parse5"
import deindent from "de-indent"
import File from "vinyl"
import postcss from "postcss"
import series from "async/series"
import posthtml from "posthtml"
import postcssModules from "postcss-modules"
import templateValidate from "vue-template-validator"
import htmlMinifier from "html-minifier"
import path from "path"
import objectGet from "lodash/get"
import parseAttrs from "posthtml-attrs-parser"
import crc from "crc"
import gutil from "gulp-util"

var memCache =
{
  css : {},
  html : {},
  js : {}
}

function posthtmlCssModules(moduleMapping)
{
  return function(tree)
  {
    tree.match({ attrs: {"css-module": /\w+/ } }, node =>
    {
      var attrs = parseAttrs(node.attrs)
      var cssModuleName = attrs["css-module"]
      delete attrs["css-module"]

      attrs.class = attrs.class || []
      attrs.class.push(getCssClassName(moduleMapping, cssModuleName))
      node.attrs = attrs.compose()

      return node
    })
  }
}

function getCssClassName(moduleMapping, cssModuleName)
{
  var cssClassName = objectGet(moduleMapping, cssModuleName)
  if (!cssClassName)
    throw new Error('CSS module "' + cssModuleName + '" is not found')

  if (typeof cssClassName !== "string")
    throw new Error('CSS module "' + cssModuleName + '" is not a string')

  return cssClassName
}


// required for Vue 1.0 shorthand syntax
var templateMinifyOptions =
{
  customAttrSurround: [ [ /@/, new RegExp("") ], [ /:/, new RegExp("") ] ],
  collapseWhitespace: true,
  removeComments: true,
  collapseBooleanAttributes: true,
  removeAttributeQuotes: true,
  // this is disabled by default to avoid removing
  // "type" on <input type="text">
  removeRedundantAttributes: false,
  useShortDoctype: true,
  removeEmptyAttributes: true,
  removeOptionalTags: true
}

function convertFragmentIntoNodeMap(fragment)
{
  var nodes = {}
  fragment.childNodes.forEach((child) =>
  {
    // Ignore text (typically just white space) and comment nodes
    if (child.nodeName === "#text" || child.nodeName === "#comment") {
      return
    }

    var content = deindent(parse5.serialize(child.content || child)).trim()
    nodes[child.nodeName] = content
  })

  return nodes
}

function getContentFromNode(node) {
  return deindent(parse5.serialize(node.content || node))
}

function cleanTemplateText(text) {
  return text.split("\n").map((line) => line.trim()).join("\n")
}

export function generateScopedName(name, filename, css)
{
  // var baseName = path.basename(filename, '.css');
  var hashedPath = crc.crc32(filename).toString(16)

  return `${name}-${hashedPath}`
}

export default function vueSplitPlugin()
{
  var moduleMapping = null

  var processStyle = function(done, text, path)
  {
    if (!text)
      return done()

    postcss([
      postcssModules({
        generateScopedName: generateScopedName,
        getJSON: function(cssFileName, json) {
          moduleMapping = json
        }
      })
    ]).
    process(text, {
      from: path
    }).
    then(function(result)
    {
      if (memCache.css[path] === result.css)
        return done()

      memCache.css[path] = result.css

      var cssObj = new File({
        contents: new Buffer(result.css),
        path: path.replace(".vue", ".css")
      })

      done(null, cssObj)
    })
  }

  var minifyTemplate = true

  var processTemplate = function(done, text, path)
  {
    if (!text)
      return done()

    var warnings = templateValidate(text)
    warnings.forEach((msg) => {
      console.warn(msg)
    })

    posthtml([
      posthtmlCssModules(moduleMapping)
    ]).
    process(text).
    then((result) => {
      if (memCache.html[path] === result.html)
        return done()

      memCache.html[path] = result.html

      try
      {
        var html = minifyTemplate ? htmlMinifier.minify(result.html, templateMinifyOptions) : cleanTemplateText(result.html)
        var htmlObj = new File({
          contents: new Buffer(html),
          path: path.replace(".vue", ".html")
        })
      }
      catch (ex)
      {
        console.error("Problem during template processing: " + ex)
        return done(ex)
      }

      var js = `export default ${JSON.stringify(html)}`
      var jsObj = new File({
        contents: new Buffer(js),
        path: path.replace(".vue", ".html.js")
      })

      done(null, jsObj)
    })
  }

  var processScript = function(done, text, path)
  {
    if (!text)
      return done()

    if (memCache.js[path] === text)
      return done()

    memCache.js[path] = text

    var fileObj = new File({
      contents: new Buffer(text),
      path: path.replace(".vue", ".js")
    })

    done(null, fileObj)
  }


  var transform = function(file, encoding, callback)
  {
    var main = this

    if (file.isNull()) {
      return callback(null, file)
    }

    if (file.isStream()) {
      return callback(new gutil.PluginError("gulp-vuesplit", "Streams are not supported"))
    }

    var content = file.contents.toString("utf8")
    var fragment = parse5.parseFragment(content, {
      locationInfo: true
    })
    var nodes = convertFragmentIntoNodeMap(fragment)
    var stream = this
    var filePath = file.path
    var moduleMapping = null

    var styleNode = nodes.style
    var htmlNode = nodes.html
    var scriptNode = nodes.script

    series(
    [
      function(done) {
        processStyle(done, nodes.style, filePath)
      },
      function(done) {
        processTemplate(done, nodes.template, filePath)
      },
      function(done) {
        processScript(done, nodes.script, filePath)
      }
    ],
    function(err, results)
    {
      if (err)
      {
        callback(new gutil.PluginError("gulp-vuesplit", err))
      }
      else
      {
        results.forEach((file) => file && stream.push(file))
        return callback()
      }
    })
  }

  return through.obj(transform)
}
