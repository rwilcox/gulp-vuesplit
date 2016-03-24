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
import posthtmlCssModules from "posthtml-css-modules"
import templateValidate from "vue-template-validator"
import htmlMinifier from "html-minifier"


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

export default function vueSplitPlugin()
{
  var processStyle = function(done, text, path)
  {
    if (!text)
      return done()

    console.log("Processing STYLE...")

    var moduleMapping = null
    postcss([
      postcssModules({
        getJSON: function(cssFileName, json) {
          moduleMapping = json
        }
      })
    ]).
    process(text).
    then(function(result) {
      var cssObj = new File({
        contents: new Buffer(result.css),
        path: path.replace(".vue", ".css")
      })

      /*
      var mappingObj = new File({
        contents: new Buffer(JSON.stringify(moduleMapping)),
        path: path.replace(".vue", ".css.json")
      })
      */

      // We need to write this file directly to have it available for posthtml-css-modules
      // Unfortunately the API there does not seem to support using a JS object instead.
      fs.writeFileSync(path.replace(".vue", ".css.json"), JSON.stringify(moduleMapping))

      done(null, cssObj)
    }).
    catch(function(ex) {
      done("Error while transforming style: " + ex)
    })
  }

  var minifyTemplate = true

  var processTemplate = function(done, text, path)
  {
    if (!text) {
      return done()
    }

    var warnings = templateValidate(text)
    warnings.forEach((msg) => {
      console.warn(msg)
    })

    console.log("Processing TEMPLATE...")
    posthtml([
      posthtmlCssModules(path.replace(".vue", ".css.json"))
    ]).
    process(text).
    then((result) => {
      var html = minifyTemplate ? htmlMinifier.minify(result.html, templateMinifyOptions) : cleanTemplateText(result.html)
      var htmlObj = new File({
        contents: new Buffer(html),
        path: path.replace(".vue", ".html")
      })

      var js = `export default ${JSON.stringify(html)}`
      var jsObj = new File({
        contents: new Buffer(js),
        path: path.replace(".vue", ".html.js")
      })

      done(null, htmlObj, jsObj)
    }).
    catch(function(ex) {
      done("Error while transforming template: ", ex)
    })
  }

  var processScript = function(done, text, path)
  {
    if (!text) {
      return done()
    }

    console.log("Processing SCRIPT...")

    var fileObj = new File({
      contents: new Buffer(text),
      path: path.replace(".vue", ".js")
    })

    done(null, fileObj)
  }


  var transform = function(file, encoding, callback)
  {
    if (file.isNull()) {
      return callback(null, file)
    }

    if (file.isStream())
    {
      this.emit("error", new util.PluginError("gulp-vuesplit", "Streams are not supported"))
      return callback()
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
      function(done)
      {
        processStyle(done, nodes.style, filePath)
      },
      function(done, ...files)
      {
        files.forEach((file) => stream.push(file))
        processTemplate(done, nodes.template, filePath)
      },
      function(done, ...files)
      {
        files.forEach((file) => stream.push(file))
        processScript(done, nodes.script, filePath)
      },
      function(done, ...files)
      {
        files.forEach((file) => stream.push(file))
        done(null)
      }
    ],
    function(err, results)
    {
      if (err)
      {
        console.error(err)
      }
      else
      {
        console.log("ALL DONE")
        callback()
      }
    })
  }

  return through.obj(transform)
}
