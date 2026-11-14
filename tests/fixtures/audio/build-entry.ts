// A tiny entry that pulls in all of src/audio. The build-trace test builds it and searches the output.
const modules = import.meta.glob('../../../src/audio/**/*.{ts,json}', { eager: true });
console.log(Object.keys(modules).length, modules);
