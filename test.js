import test from "ava"
import "babel-register"

import plugin from "./src"

test("Successfully loaded", (t) => {
  t.same(typeof plugin, "function")
})
