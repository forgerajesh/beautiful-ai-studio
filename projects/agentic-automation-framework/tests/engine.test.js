import assert from "assert";
import fs from "fs";
import path from "path";
import { loadWorkflow } from "../src/agent/engine.js";

const wf = loadWorkflow(path.resolve("examples/saucedemo-login.json"));
assert.equal(wf.name, "SauceDemo login smoke");
assert.ok(Array.isArray(wf.steps));
assert.ok(wf.steps.length > 0);

console.log("engine.test.js passed");
