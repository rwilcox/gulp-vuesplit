import test from "ava"
import "babel-register"

import plugin from "./src"
import { generateScopedName } from "./src"

test("Successfully loaded", (t) => {
  t.is(typeof plugin, "function")
})

test("Successfully executing without data", (t) => {
  plugin()
})

test("Successfully executing without data", (t) => {
  var scoped = generateScopedName(".box", "my/components/filename.vue")
  t.is(scoped, ".box-d5326d39")
})
