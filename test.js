import test from "ava"
import "babel-register"

import plugin from "./src"

test("Dummy", (t) => {
  t.same(2, 2)
})
