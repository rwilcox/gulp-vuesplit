import test from "ava"
import "babel-register"

import plugin from "./src"
import { generateScopedName } from "./src"

test("Successfully loaded", (api) =>
{
  api.is(typeof plugin, "function")
})

test("Successfully executing without data", () =>
{
  plugin()
})

test("Successfully executing without data", (api) =>
{
  var scoped = generateScopedName(".box", "my/components/filename.vue")
  api.is(scoped, ".box-d5326d39")
})
