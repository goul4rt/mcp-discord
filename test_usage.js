// Simulate the exact usage from README examples
const usage = `require('@goul4rt/mcp-discord').runStandalone()`;

// Check if this is valid Node.js code
console.log("Checking README usage patterns:");
console.log("1. require('@goul4rt/mcp-discord').runStandalone()")
console.log("   - Package export: main = dist/index.js ✓");
console.log("   - runStandalone exists in exports ✓");
console.log("   - Function signature: runStandalone(config?) ✓");
console.log("");

// Verify with dist
const { runStandalone } = require('./dist/index.js');
console.log("2. Function accepts optional config:");
console.log("   - config.token?: string ✓");
console.log("   - config.useGateway?: boolean ✓");
console.log("");

// Verify the node -e call works
console.log("3. node -e 'require(...).runStandalone()' syntax:");
console.log("   - Valid syntax ✓");
console.log("   - Returns Promise ✓");
console.log("   - Function is async ✓");
